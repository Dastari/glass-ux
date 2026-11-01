/**
 * The central keyboard dispatcher behind KeymapProvider: commands, a serialisable keymap,
 * chords, conflict detection. Plain data and one document listener, with no React here, so
 * menus can read a command's keys without loading the provider or its dialog.
 */
import type { RefObject } from "react"
import { isTextEntryTarget, isRichTextTarget } from "../../lib/text-entry.js"
import { canonicalShortcut, canonicalStep, detectPlatform, shortcutAllowed, shortcutFromEvent, shortcutSteps, type Platform } from "../kbd/shortcut.js"

/**
 * Where a binding runs when focus is in text entry. `none` (the default): not there.
 * `inputs`: also in inputs, textareas and selects. `all`: in rich text as well, though an
 * editor that handles the key first keeps it.
 */
export type ShortcutTextEntry = "none" | "inputs" | "all"

/** A command the dispatcher can run. Register with `useShortcutCommands`. */
export interface ShortcutCommand {
  /** Stable across sessions: the key in a saved keymap ("editor.save"). */
  id: string
  /** What it does, in the help dialog. */
  label: string
  /** The help dialog group. Default: the dialog's "General". */
  group?: string
  /** Extra words the help dialog's search finds it by. */
  keywords?: readonly string[]
  /** Its default keys: one shortcut or several, each may be a chord ("mod+k mod+s"). */
  keys?: string | readonly string[]
  /** Where it runs while focus is in text entry. Default `none`. */
  textEntry?: ShortcutTextEntry
  /**
   * The part of the application it belongs to ("editor", "list"). Commands in different
   * contexts may share keys without being reported as a conflict; use `when` to say which
   * applies at the moment.
   */
  context?: string
  /**
   * Run only while focus is inside this element (tool keys in an editor). Inside it, a scoped
   * command wins over a page-wide one with the same keys. Scoped keys are active only while
   * that element has focus, so single-character ones stay on under `configureShortcuts`
   * (WCAG 2.1.4). Set `context` too, so they are not reported against page-wide keys.
   */
  scope?: RefObject<HTMLElement | null>
  /** Checked on each press. False: the command does not take the key. */
  when?: () => boolean
  /** Why it cannot run now. The key is not taken, and help shows the reason. */
  disabledReason?: string | null
  /** False keeps it out of rebinding. Default true. */
  rebindable?: boolean
  /**
   * Runs the command. `event` is the key press that finished the shortcut. Leave it out to
   * declare a binding that something else handles (an editor's own key handling, a command
   * mounted later): it is listed in help, can be rebound and is looked up like any other,
   * and the dispatcher never takes its keys.
   */
  run?: (event: KeyboardEvent) => void
}

/** A command's keys as they stand, from `useCommandBinding`. */
export interface CommandBinding {
  /** Every shortcut in effect; each may be a chord. Empty when unbound. */
  keys: readonly string[]
  /** The first of them: what a menu row shows. */
  primary: string | undefined
  /** The person changed it. */
  rebound: boolean
  /** It works only in part of the page: show it read-only, and do not expect it to run from here. */
  scoped: boolean
}

/**
 * A person's changes to the default keys, as JSON-safe data: a command id with the shortcuts
 * that replace its defaults; an empty list unbinds it. Ids with no registered command are
 * kept, so a preference survives a feature that is not mounted at the moment. The host
 * decides where it is stored.
 */
export type Keymap = Readonly<Record<string, readonly string[]>>

/** How two bindings collide, or why one cannot work. */
export type ShortcutConflictKind =
  /** Two commands have the same keys in the same context. The last registered runs. */
  | "same"
  /** A shortcut is the first step of a chord: the chord waits, so the shorter one never runs. */
  | "prefix"
  /** The browser keeps these keys for itself, so a page never receives them. */
  | "reserved"

/** One collision between bindings, from {@link findConflicts}. */
export interface ShortcutConflict {
  /** See {@link ShortcutConflictKind}. */
  kind: ShortcutConflictKind
  /** The keys in question, as written on the first command. */
  keys: string
  /** The command ids involved, the holder of `keys` first. */
  commands: string[]
}

/** The state of a chord in progress. */
export interface ShortcutPendingState {
  /** The steps pressed so far as one shortcut ("mod+k"), or null with no chord in progress. */
  keys: string | null
}

const IDLE: ShortcutPendingState = { keys: null }

/** Keys that browsers do not let a page take. */
const RESERVED = ["mod+w", "mod+t", "mod+n", "mod+shift+n", "mod+shift+t", "mod+shift+w"]

/** A command's default keys as a list. */
export const defaultKeys = (command: Pick<ShortcutCommand, "keys">): readonly string[] => (command.keys === undefined ? [] : typeof command.keys === "string" ? [command.keys] : command.keys)

/**
 * A keymap from stored JSON: keeps entries that are lists of non-empty strings, and drops
 * anything else, so a damaged preference never reaches the dispatcher.
 */
export function normaliseKeymap(value: unknown): Keymap {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {}
  const keymap: Record<string, readonly string[]> = {}
  for (const [id, keys] of Object.entries(value)) {
    if (Array.isArray(keys) && keys.every((key) => typeof key === "string" && key.trim() !== "")) keymap[id] = keys as string[]
  }
  return keymap
}

type Binding = Pick<ShortcutCommand, "id" | "context"> & { keys: readonly string[] }

/**
 * Every collision in a set of bindings: the same keys twice in a context, a shortcut that a
 * chord starts with, and keys the browser keeps. Commands in different contexts never
 * collide; one with no context collides with any.
 */
export function findConflicts(bindings: readonly Binding[], platform: Platform = detectPlatform()): ShortcutConflict[] {
  const conflicts: ShortcutConflict[] = []
  const seen = new Set<string>()
  const overlaps = (a: Binding, b: Binding) => a.context === undefined || b.context === undefined || a.context === b.context
  const add = (conflict: ShortcutConflict) => {
    const key = `${conflict.kind}:${conflict.keys}:${conflict.commands.toSorted().join()}`
    if (seen.has(key)) return
    seen.add(key)
    conflicts.push(conflict)
  }
  const reserved = new Set(RESERVED.map((keys) => canonicalShortcut(keys, platform)))
  const all = bindings.flatMap((binding) => binding.keys.map((keys) => ({ binding, keys, canonical: canonicalShortcut(keys, platform) })))
  for (const [index, entry] of all.entries()) {
    if (reserved.has(entry.canonical)) add({ kind: "reserved", keys: entry.keys, commands: [entry.binding.id] })
    for (const other of all.slice(index + 1)) {
      if (entry.binding.id === other.binding.id || !overlaps(entry.binding, other.binding)) continue
      if (entry.canonical === other.canonical) add({ kind: "same", keys: entry.keys, commands: [entry.binding.id, other.binding.id] })
      else if (other.canonical.startsWith(`${entry.canonical} `)) add({ kind: "prefix", keys: entry.keys, commands: [entry.binding.id, other.binding.id] })
      else if (entry.canonical.startsWith(`${other.canonical} `)) add({ kind: "prefix", keys: other.keys, commands: [other.binding.id, entry.binding.id] })
    }
  }
  return conflicts
}

interface Entry {
  command: ShortcutCommand
  keys: string
  steps: string[]
}

const attached = new Set<ShortcutDispatcher>()

/**
 * Whether a mounted dispatcher takes this key press, so a document listener that could get
 * there first (the palette's ⌘K) leaves it alone, wherever its provider sits in the tree.
 */
export function keymapClaims(event: KeyboardEvent): boolean {
  for (const dispatcher of attached) if (dispatcher.claims(event)) return true
  return false
}

/** The running dispatcher: what a provider owns. Read it through the hooks. */
export class ShortcutDispatcher {
  private sources = new Map<symbol, readonly ShortcutCommand[]>()
  private keymap: Keymap = {}
  private listeners = new Set<() => void>()
  private version = 0
  private index: Map<string, Entry[]> | null = null
  private prefixes: Map<string, Entry[]> | null = null
  private pendingSteps: string[] = []
  private pendingState = IDLE
  private timer: ReturnType<typeof setTimeout> | 0 = 0
  private doc: Document | null = null
  /** Milliseconds a chord waits for its next step; 0 waits until Escape or another key. */
  timeout = 3000

  constructor(readonly platform: Platform = detectPlatform()) {}

  /** Subscribe to changes of commands, keys or the pending chord. */
  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** A number that changes with commands or keys, for `useSyncExternalStore`. */
  getVersion = () => this.version

  /** The chord in progress. */
  getPending = () => this.pendingState

  private changed() {
    this.version += 1
    this.index = null
    this.prefixes = null
    for (const listener of this.listeners) listener()
  }

  /** Add commands; the returned function removes them. */
  register(commands: readonly ShortcutCommand[]): () => void {
    const source = Symbol()
    this.sources.set(source, commands)
    this.changed()
    return () => {
      this.sources.delete(source)
      this.changed()
    }
  }

  /** Replace the person's changes. */
  setKeymap(keymap: Keymap) {
    if (keymap === this.keymap) return
    this.keymap = keymap
    this.changed()
  }

  /** Every registered command, one per id (the latest registration wins). */
  commands(): ShortcutCommand[] {
    const byId = new Map<string, ShortcutCommand>()
    for (const commands of this.sources.values()) for (const command of commands) byId.set(command.id, command)
    return [...byId.values()]
  }

  /** Whether a command with this id is registered. */
  has(id: string) {
    for (const commands of this.sources.values()) if (commands.some((command) => command.id === id)) return true
    return false
  }

  /** The keys in effect for a command: the keymap's, or its defaults. */
  keysFor(id: string): readonly string[] {
    const override = this.keymap[id]
    if (override) return override
    for (const commands of [...this.sources.values()].toReversed()) {
      const command = commands.find((candidate) => candidate.id === id)
      if (command) return defaultKeys(command)
    }
    return []
  }

  /**
   * A command's binding for display. The keymap applies whether or not the command is
   * mounted, so a menu shows a rebinding of something that is not on screen. Reads only:
   * looking a binding up never registers anything.
   */
  bindingFor(id: string, fallback: readonly string[] = []): CommandBinding {
    const override = this.keymap[id]
    const command = this.commands().find((candidate) => candidate.id === id)
    const keys = override ?? (command ? defaultKeys(command) : fallback)
    return { keys, primary: keys[0], rebound: override !== undefined, scoped: command?.scope !== undefined || (command !== undefined && command.run === undefined) }
  }

  /** Collisions among the keys in effect. */
  conflicts(): ShortcutConflict[] {
    return findConflicts(
      this.commands().map((command) => ({ id: command.id, context: command.context, keys: this.keysFor(command.id) })),
      this.platform
    )
  }

  private build() {
    const index = new Map<string, Entry[]>()
    const prefixes = new Map<string, Entry[]>()
    // Registration order, so the last registered is last in each list and wins.
    for (const command of this.commands()) {
      for (const keys of this.keysFor(command.id)) {
        const steps = shortcutSteps(keys).map((step) => canonicalStep(step, this.platform))
        if (steps.length === 0) continue
        const entry = { command, keys, steps }
        const whole = steps.join(" ")
        index.set(whole, [...(index.get(whole) ?? []), entry])
        for (let length = 1; length < steps.length; length++) {
          const prefix = steps.slice(0, length).join(" ")
          prefixes.set(prefix, [...(prefixes.get(prefix) ?? []), entry])
        }
      }
    }
    this.index = index
    this.prefixes = prefixes
  }

  private usable(entry: Entry) {
    const { command } = entry
    return command.run !== undefined && !command.disabledReason && (command.scope !== undefined || shortcutAllowed(entry.keys)) && command.when?.() !== false
  }

  private inScope(entry: Entry, target: EventTarget | null) {
    const { scope } = entry.command
    return !scope || (target instanceof Node && scope.current?.contains(target) === true)
  }

  /** A scoped binding wins inside its element; among equals, the last registered. */
  private pick(entries: readonly Entry[] | undefined, fits: (entry: Entry) => boolean) {
    return entries?.findLast((entry) => entry.command.scope !== undefined && fits(entry)) ?? entries?.findLast(fits)
  }

  private allowedAt(entry: Entry, target: EventTarget | null) {
    if (!this.inScope(entry, target)) return false
    const level = entry.command.textEntry ?? "none"
    if (!isTextEntryTarget(target)) return true
    if (level === "none") return false
    return level === "all" || !isRichTextTarget(target)
  }

  /** The press as the steps it could be: a symbol typed with Shift matches with or without it. */
  private pressed(event: KeyboardEvent): string[] {
    const step = shortcutFromEvent(event, this.platform)
    if (step === null) return []
    const canonical = canonicalStep(step, this.platform)
    return event.shiftKey && !canonical.includes("shift+") ? [canonical, canonicalStep(`shift+${step}`, this.platform)] : [canonical]
  }

  private clearPending() {
    if (this.timer) clearTimeout(this.timer)
    this.timer = 0
    this.pendingSteps = []
    if (this.pendingState === IDLE) return
    this.pendingState = IDLE
    this.doc?.removeEventListener("keydown", this.onCapture, true)
    for (const listener of this.listeners) listener()
  }

  private startPending(steps: string[], keys: string) {
    const first = this.pendingSteps.length === 0
    this.pendingSteps = steps
    this.pendingState = { keys: shortcutSteps(keys).slice(0, steps.length).join(" ") }
    if (this.timer) clearTimeout(this.timer)
    if (this.timeout > 0) this.timer = setTimeout(() => this.clearPending(), this.timeout)
    // The next steps are taken before any widget sees them.
    if (first) this.doc?.addEventListener("keydown", this.onCapture, true)
    for (const listener of this.listeners) listener()
  }

  /** What a first press would do: start a chord (which wins over a shorter binding), or run. */
  private match(event: KeyboardEvent): { press: string; chord?: Entry; entry?: Entry } | null {
    if (!this.index) this.build()
    const fits = (entry: Entry) => this.usable(entry) && this.allowedAt(entry, event.target)
    for (const press of this.pressed(event)) {
      const chord = this.pick(this.prefixes?.get(press), fits)
      if (chord) return { press, chord }
      const entry = this.pick(this.index?.get(press), fits)
      if (entry) return { press, entry }
    }
    return null
  }

  /** Whether this press would start a chord or run a command. */
  claims(event: KeyboardEvent) {
    return this.pendingSteps.length > 0 || this.match(event) !== null
  }

  /** The first step: after widgets, so whatever handled the key keeps it. */
  private onBubble = (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.isComposing || this.pendingSteps.length > 0) return
    const found = this.match(event)
    if (!found) return
    event.preventDefault()
    if (found.chord) this.startPending([found.press], found.chord.keys)
    else found.entry?.command.run?.(event)
  }

  /** The next steps of a chord. Any key that does not continue it ends it and goes no further. */
  private onCapture = (event: KeyboardEvent) => {
    if (event.isComposing) return
    const presses = this.pressed(event)
    if (presses.length === 0) return
    event.preventDefault()
    event.stopPropagation()
    if (event.repeat) return
    if (event.key === "Escape") return this.clearPending()
    if (!this.index) this.build()
    const fits = (entry: Entry) => this.usable(entry) && this.inScope(entry, event.target)
    for (const press of presses) {
      const steps = [...this.pendingSteps, press]
      const whole = steps.join(" ")
      const chord = this.pick(this.prefixes?.get(whole), fits)
      if (chord) return this.startPending(steps, chord.keys)
      const entry = this.pick(this.index?.get(whole), fits)
      if (entry) {
        this.clearPending()
        entry.command.run?.(event)
        return
      }
    }
    this.clearPending()
  }

  private onLeave = () => this.clearPending()

  /** Start listening on a document; the returned function stops. */
  attach(doc: Document): () => void {
    this.doc = doc
    attached.add(this)
    const view = doc.defaultView
    doc.addEventListener("keydown", this.onBubble)
    view?.addEventListener("blur", this.onLeave)
    return () => {
      this.clearPending()
      attached.delete(this)
      doc.removeEventListener("keydown", this.onBubble)
      view?.removeEventListener("blur", this.onLeave)
      this.doc = null
    }
  }
}

