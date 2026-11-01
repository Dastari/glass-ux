import { createContext, use, useCallback, useEffect, useLayoutEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react"
import { useMessages } from "../../lib/i18n/index.js"
import { useControllable } from "../../lib/use-controllable.js"
import { Kbd, usePlatform } from "../kbd/kbd.js"
import { formatShortcut } from "../kbd/shortcut.js"
import { kbdMessages } from "../kbd/messages.js"
import { Portal } from "../portal/index.js"
import { KeymapContext } from "./context.js"
import { ShortcutDispatcher, type Keymap, type ShortcutCommand, type ShortcutConflict, type ShortcutPendingState } from "./dispatcher.js"
import { keymapMessages } from "./messages.js"

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect
const EMPTY: Keymap = {}
const IDLE: ShortcutPendingState = { keys: null }

export interface KeymapProviderProps {
  children: ReactNode
  /** The person's changed keys. Controlled while defined; JSON-safe, so store it anywhere. */
  keymap?: Keymap
  /** The changed keys at first when uncontrolled, from wherever the host keeps them. */
  defaultKeymap?: Keymap
  /** Called with the whole keymap after each change. Save it here: the library stores nothing. */
  onKeymapChange?: (keymap: Keymap) => void
  /**
   * How long a chord waits for its next step, in milliseconds. Default 3000. 0 waits until
   * Escape or another key, for people who need longer (WCAG 2.2.1).
   */
  chordTimeout?: number
  /**
   * How the chord in progress shows. `float` (default): a small label above the foot of the
   * screen. `none`: place `ShortcutPending` yourself, such as in a StatusBar.
   */
  pendingDisplay?: "float" | "none"
}

/**
 * The central keyboard dispatcher for an application: register commands with
 * `useShortcutCommands` (or `useActionShortcuts`, from an action definition) and it runs
 * their keys, chords included, from one listener. Rebinding is a serialisable `keymap` that
 * the host stores; the library never decides where preferences live.
 *
 * Mount it once near the root. A widget that handles a key first keeps it, so rich text keeps
 * its keys, and the palette leaves alone any key the keymap holds; single-character shortcuts
 * obey `configureShortcuts`. `useHotkeys` is separate and unchanged.
 */
export function KeymapProvider({ children, keymap: keymapProp, defaultKeymap, onKeymapChange, chordTimeout = 3000, pendingDisplay = "float" }: KeymapProviderProps) {
  const platform = usePlatform()
  const [dispatcher, setDispatcher] = useState(() => new ShortcutDispatcher(platform))
  const [keymap, setKeymap] = useControllable<Keymap>(keymapProp, defaultKeymap ?? EMPTY, onKeymapChange)
  useIsomorphicLayoutEffect(() => {
    if (dispatcher.platform !== platform) setDispatcher(new ShortcutDispatcher(platform))
  }, [dispatcher, platform])
  useIsomorphicLayoutEffect(() => {
    dispatcher.timeout = chordTimeout
    dispatcher.setKeymap(keymap)
  }, [dispatcher, chordTimeout, keymap])
  useEffect(() => dispatcher.attach(document), [dispatcher])
  const update = useMemo(() => ({ setKeymap }), [setKeymap])
  return (
    <KeymapContext value={dispatcher}>
      <KeymapUpdateContext value={update}>
        {children}
        <ChordAnnouncer />
        {pendingDisplay === "float" ? <FloatingPending /> : null}
      </KeymapUpdateContext>
    </KeymapContext>
  )
}

const KeymapUpdateContext = /* @__PURE__ */ createContext<{ setKeymap: (update: (keymap: Keymap) => Keymap) => void } | null>(null)

function useDispatcher(name: string): ShortcutDispatcher {
  const dispatcher = use(KeymapContext)
  if (!dispatcher) throw new Error(`${name} must be inside a KeymapProvider.`)
  return dispatcher
}

/**
 * Register commands while the caller is mounted. Memoise the list: a new array registers
 * again. Commands may read current state through `when` and `disabledReason` set at render.
 */
export function useShortcutCommands(commands: readonly ShortcutCommand[]): void {
  const dispatcher = useDispatcher("useShortcutCommands")
  useEffect(() => dispatcher.register(commands), [dispatcher, commands])
}

/** What {@link useKeymap} returns. */
export interface UseKeymapResult {
  /** Every registered command. */
  commands: ShortcutCommand[]
  /** The keys in effect for a command. */
  keysFor: (id: string) => readonly string[]
  /** Collisions among the keys in effect. */
  conflicts: ShortcutConflict[]
  /** Replace a command's keys; an empty list unbinds it. Keys held by `release`'s commands are taken from them. */
  rebind: (id: string, keys: readonly string[], release?: readonly { id: string; keys: string }[]) => void
  /** Back to a command's default keys. */
  reset: (id: string) => void
  /** Back to every default. */
  resetAll: () => void
}

/** Read the commands and keys, and change them, for a settings screen of the host's own. */
export function useKeymap(): UseKeymapResult {
  const dispatcher = useDispatcher("useKeymap")
  const update = use(KeymapUpdateContext)
  const setKeymap = update?.setKeymap
  useSyncExternalStore(dispatcher.subscribe, dispatcher.getVersion, dispatcher.getVersion)
  const rebind = useCallback<UseKeymapResult["rebind"]>(
    (id, keys, release = []) =>
      setKeymap?.((current) => {
        const next: Record<string, readonly string[]> = { ...current, [id]: [...keys] }
        for (const held of release) next[held.id] = dispatcher.keysFor(held.id).filter((value) => value !== held.keys)
        return next
      }),
    [dispatcher, setKeymap]
  )
  const reset = useCallback(
    (id: string) =>
      setKeymap?.((current) => {
        const next = { ...current }
        delete next[id]
        return next
      }),
    [setKeymap]
  )
  const resetAll = useCallback(() => setKeymap?.(() => EMPTY), [setKeymap])
  return {
    commands: dispatcher.commands(),
    keysFor: (id) => dispatcher.keysFor(id),
    conflicts: dispatcher.conflicts(),
    rebind,
    reset,
    resetAll,
  }
}

/** The chord in progress, for a display of the host's own. */
export function useShortcutPending(): ShortcutPendingState {
  const dispatcher = useDispatcher("useShortcutPending")
  return useSyncExternalStore(dispatcher.subscribe, dispatcher.getPending, () => IDLE)
}

/** The polite announcement, always mounted so the first one is not lost (R20.9). */
function ChordAnnouncer() {
  const messages = useMessages(keymapMessages)
  const kbd = useMessages(kbdMessages)
  const platform = usePlatform()
  const { keys } = useShortcutPending()
  return (
    <span className="fa-keymap-announcer" aria-live="polite" aria-atomic="true">
      {keys ? messages.chordStarted(formatShortcut(keys, platform, kbd)) : null}
    </span>
  )
}

export interface ShortcutPendingProps {
  className?: string
}

/**
 * The keys of a chord in progress and that it waits for the next one. It renders nothing
 * until then, so put it where it can appear without moving anything: `StatusBar.End`, or a
 * slot with its width reserved. Announcing is the provider's.
 */
export function ShortcutPending({ className }: ShortcutPendingProps) {
  const messages = useMessages(keymapMessages)
  const { keys } = useShortcutPending()
  if (!keys) return null
  return (
    <span className={className ? `fa-keymap-pending ${className}` : "fa-keymap-pending"} data-pending="">
      <Kbd keys={keys} size="sm" />
      <span>{messages.waitingForNextKey}</span>
    </span>
  )
}

function FloatingPending() {
  const { keys } = useShortcutPending()
  if (!keys) return null
  return (
    <Portal>
      <div className="fa-keymap-float glass-float">
        <ShortcutPending />
      </div>
    </Portal>
  )
}
