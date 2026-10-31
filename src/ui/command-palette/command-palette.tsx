import { useMessages } from "../../lib/i18n/index.js"
import { commandPaletteMessages } from "./messages.js"
import { Autocomplete } from "@base-ui/react/autocomplete"
import { Dialog as BaseDialog } from "@base-ui/react/dialog"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react"
import { IconSearch } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { useLocale } from "../../lib/locale/use-locale.js"
import { DialogSurface, useDialogScrollEdges } from "../dialog/index.js"
import { Kbd, isCharacterShortcut, matchesShortcut, shortcutAllowed, useCharacterShortcuts, usePlatform } from "../kbd/index.js"
import { Skeleton } from "../skeleton/index.js"
import { useSingleton } from "../toast/index.js"
import { fuzzyMatchFields, highlightRuns } from "./fuzzy.js"

/* ── Model ──────────────────────────────────────────────────────────────────── */

export interface PaletteCommand {
  /** Unique across everything registered at once. */
  id: string
  label: string
  /** Group heading: "Navigation", "Actions", a host-defined record group, or a target's name for its actions. */
  group: string
  icon?: ReactNode
  /** Secondary data shown after the label: a hostname, a path, a parent menu. */
  detail?: string
  /** Extra words that should find it ("reboot" for Restart). */
  keywords?: readonly string[]
  /** Keyboard shortcut shown with the control, using the host platform’s modifier keys. */
  shortcut?: string
  tone?: "default" | "danger"
  /** Shown instead of the detail; the command cannot run. */
  disabledReason?: string | null
  /** Operation invoked by the component. */
  run: () => unknown
}

interface Entry {
  key: string
  group: string
  command: PaletteCommand
  indices: number[]
  score: number
}

// A type alias (not an interface) so it satisfies Autocomplete's Group<Entry> index signature.
type GroupEntry = {
  value: string
  items: Entry[]
}

const RECENT_KEY = "command-palette.recent.v1"
const RECENT_LIMIT = 5
const RECENT_GROUP = commandPaletteMessages.defaults.recent
/**
 * Default palette group order: Recent, then every group not listed (a selected target's actions
 * and host record groups, in registration order), then the generic Actions and Navigation groups.
 * Hosts extend it through `groupOrder`, e.g. `[...DEFAULT_PALETTE_GROUP_ORDER, "Projects"]`.
 */
export const DEFAULT_PALETTE_GROUP_ORDER: readonly string[] = [RECENT_GROUP, "*", commandPaletteMessages.defaults.actions, commandPaletteMessages.defaults.navigation]
const DEFAULT_ORDER = DEFAULT_PALETTE_GROUP_ORDER

/* ── Registry ───────────────────────────────────────────────────────────────── */

class PaletteStore {
  private sources = new Map<string, readonly PaletteCommand[]>()
  private loadingSources = new Set<string>()
  private listeners = new Set<() => void>()
  private snapshot: PaletteCommand[] = []
  private loading = false

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
  getSnapshot = () => this.snapshot
  getLoading = () => this.loading
  set(source: string, commands: readonly PaletteCommand[], loading = false) {
    this.sources.set(source, commands)
    if (loading) this.loadingSources.add(source)
    else this.loadingSources.delete(source)
    this.publish()
  }
  delete(source: string) {
    this.sources.delete(source)
    this.loadingSources.delete(source)
    this.publish()
  }
  private publish() {
    // Later registrations win on duplicate ids (the most specific page registers last).
    const byId = new Map<string, PaletteCommand>()
    for (const commands of this.sources.values()) for (const command of commands) byId.set(command.id, command)
    this.snapshot = [...byId.values()]
    this.loading = this.loadingSources.size > 0
    for (const listener of this.listeners) listener()
  }
}

interface PaletteContextValue {
  /** External store observed by the component. */
  store: PaletteStore
  open: () => void
  /** Closes the current overlay or view. */
  close: () => void
  toggle: () => void
}

const PaletteContext = /* @__PURE__ */ createContext<PaletteContextValue | null>(null)

export interface PaletteProviderProps {
  children: ReactNode
  /** Group order; "*" marks where unlisted groups go. Defaults to `DEFAULT_PALETTE_GROUP_ORDER`. */
  groupOrder?: readonly string[]
}

/**
 * Hosts the command palette: a registry of commands contributed by whatever is mounted,
 * ⌘K / Ctrl+K from anywhere to open it, and the registered commands' own shortcuts (a
 * single-character shortcut can be switched off for the application with `configureShortcuts`).
 * The palette shortcut also works while a focusable disabled button has focus, without
 * activating that button.
 * Mount once near the root; nested providers defer to the outer one.
 */
export function PaletteProvider({ children, groupOrder = DEFAULT_ORDER }: PaletteProviderProps) {
  const parent = useContext(PaletteContext)
  if (parent) return children
  return <PaletteHost groupOrder={groupOrder}>{children}</PaletteHost>
}

function isEditable(target: EventTarget | null) {
  const element = target as HTMLElement | null
  if (!element) return false
  return element.isContentEditable || /^(input|textarea|select)$/i.test(element.tagName)
}

function PaletteHost({ children, groupOrder }: Required<PaletteProviderProps>) {
  const [store] = useState(() => new PaletteStore())
  const [open, setOpen] = useState(false)
  const platform = usePlatform()
  const owns = useSingleton("command-palette")

  const value = useMemo<PaletteContextValue>(
    () => ({ store, open: () => setOpen(true), close: () => setOpen(false), toggle: () => setOpen((current) => !current) }),
    [store]
  )

  useEffect(() => {
    if (!owns) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return
      const paletteShortcut = matchesShortcut(event, "mod+k", platform)
      // Base UI cancels every non-Tab key on focusable disabled buttons. That blocks
      // their activation, but must not make the global palette unavailable from them.
      const disabledButton = event.target instanceof Element && event.target.closest(
        'button[aria-disabled="true"], [role="button"][aria-disabled="true"]'
      )
      if (event.defaultPrevented && !(paletteShortcut && disabledButton)) return
      if (paletteShortcut) {
        event.preventDefault()
        setOpen((current) => !current)
        return
      }
      // Registered commands' own shortcuts. Plain keys never fire while typing.
      const editable = isEditable(event.target)
      for (const command of store.getSnapshot()) {
        if (!command.shortcut || command.disabledReason) continue
        if (editable && !/(mod|ctrl|alt|meta)\+/i.test(command.shortcut)) continue
        // WCAG 2.1.4: the application can switch single-character shortcuts off (configureShortcuts).
        if (!shortcutAllowed(command.shortcut)) continue
        if (matchesShortcut(event, command.shortcut, platform)) {
          event.preventDefault()
          void command.run()
          return
        }
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [owns, platform, store])

  return (
    <PaletteContext value={value}>
      {children}
      {owns ? <CommandPalette store={store} open={open} onOpenChange={setOpen} groupOrder={groupOrder} /> : null}
    </PaletteContext>
  )
}

/** Open, close or toggle the palette (the top bar's search field calls `open`). */
export function useCommandPalette() {
  const context = useContext(PaletteContext)
  return {
    available: context !== null,
    open: context?.open ?? (() => {}),
    close: context?.close ?? (() => {}),
    toggle: context?.toggle ?? (() => {}),
  }
}

/**
 * Contribute commands while the calling component is mounted (a page, a selected row, an
 * open window). Memoise `commands`; they are replaced whenever the array changes. Pass
 * `loading` while a source is still fetching: the palette shows skeleton rows meanwhile.
 */
export function usePaletteCommands(commands: readonly PaletteCommand[], options: { loading?: boolean } = {}) {
  const context = useContext(PaletteContext)
  const source = useId()
  const loading = options.loading ?? false
  useEffect(() => {
    if (!context) return
    context.store.set(source, commands, loading)
    return () => context.store.delete(source)
  }, [context, source, commands, loading])
}

const EMPTY: PaletteCommand[] = []
const noSubscribe = () => () => {}

/** Everything registered right now (for an in-page panel that mirrors the palette). */
export function useRegisteredCommands(): { commands: readonly PaletteCommand[]; loading: boolean } {
  const store = useContext(PaletteContext)?.store
  const commands = useSyncExternalStore(store?.subscribe ?? noSubscribe, store?.getSnapshot ?? (() => EMPTY), () => EMPTY)
  const loading = useSyncExternalStore(store?.subscribe ?? noSubscribe, store?.getLoading ?? (() => false), () => false)
  return { commands, loading }
}

/* ── Recent ─────────────────────────────────────────────────────────────────── */

const NO_RECENT: string[] = []
const recentListeners = new Set<() => void>()
let recentRaw: string | null | undefined
let recentCache: string[] = NO_RECENT

function readRecent(): string[] {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(RECENT_KEY)
  } catch {
    return NO_RECENT
  }
  if (raw === recentRaw) return recentCache
  recentRaw = raw
  try {
    const parsed: unknown = JSON.parse(raw ?? "[]")
    recentCache = Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : NO_RECENT
  } catch {
    recentCache = NO_RECENT
  }
  return recentCache
}

function subscribeRecent(listener: () => void) {
  recentListeners.add(listener)
  const onStorage = (event: StorageEvent) => {
    if (event.key === RECENT_KEY) listener()
  }
  window.addEventListener("storage", onStorage)
  return () => {
    recentListeners.delete(listener)
    window.removeEventListener("storage", onStorage)
  }
}

function rememberRecent(id: string) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify([id, ...readRecent().filter((entry) => entry !== id)].slice(0, RECENT_LIMIT)))
  } catch {
    // Storage full or blocked: recents are a convenience.
  }
  for (const listener of recentListeners) listener()
}

/* ── Results ────────────────────────────────────────────────────────────────── */

function rankGroups(commands: readonly PaletteCommand[], query: string, recent: readonly string[], order: readonly string[], locale: string): GroupEntry[] {
  const trimmed = query.trim()
  const groups = new Map<string, Entry[]>()
  const push = (group: string, entry: Entry) => {
    const list = groups.get(group) ?? []
    list.push(entry)
    groups.set(group, list)
  }

  if (!trimmed) {
    const recentSet = new Set(recent)
    for (const id of recent) {
      const command = commands.find((candidate) => candidate.id === id)
      if (command) push(RECENT_GROUP, { key: `recent:${id}`, group: RECENT_GROUP, command, indices: [], score: 0 })
    }
    for (const command of commands) {
      if (recentSet.has(command.id)) continue
      push(command.group, { key: command.id, group: command.group, command, indices: [], score: 0 })
    }
  } else {
    for (const command of commands) {
      const match = fuzzyMatchFields(trimmed, command.label, [...(command.keywords ?? []), command.detail ?? "", command.group], locale)
      if (match) push(command.group, { key: command.id, group: command.group, command, indices: match.indices, score: match.score })
    }
  }

  const rank = (group: string) => {
    const index = order.indexOf(group)
    return index === -1 ? order.indexOf("*") : index
  }
  const result = [...groups.entries()].map(([value, items]) => ({
    value,
    items: trimmed ? items.toSorted((a, b) => b.score - a.score) : items,
  }))
  return trimmed
    ? result.toSorted((a, b) => (b.items[0]?.score ?? 0) - (a.items[0]?.score ?? 0) || rank(a.value) - rank(b.value))
    : result.toSorted((a, b) => rank(a.value) - rank(b.value))
}

function Label({ text, indices }: { text: string; indices: number[] }) {
  return (
    <>
      {highlightRuns(text, indices).map((run, index) =>
        run.match ? (
          <mark key={index} className="fa-palette-match">
            {run.text}
          </mark>
        ) : (
          <span key={index}>{run.text}</span>
        )
      )}
    </>
  )
}

/* ── Panel ──────────────────────────────────────────────────────────────────── */

export interface CommandPanelProps {
  /** Available slash commands and their typed arguments. */
  commands: readonly PaletteCommand[]
  /** Called with the chosen command when the person clicks it or presses Enter on it; not called for disabled commands. The panel does not call `command.run` itself. */
  onRun: (command: PaletteCommand) => void
  /** A source is still fetching: skeleton rows follow the results. */
  loading?: boolean
  /** Preferred order of command or action groups; "*" marks where unlisted groups go. Defaults to `DEFAULT_PALETTE_GROUP_ORDER`. */
  groupOrder?: readonly string[]
  /** Starting query (gallery specimens). */
  defaultQuery?: string
  className?: string
}

/**
 * The palette's contents: search field, grouped results and keyboard hints. Rendered in
 * the modal palette, and on its own in the gallery.
 */
export function CommandPanel({ commands, onRun, loading = false, groupOrder = DEFAULT_ORDER, defaultQuery = "", className }: CommandPanelProps) {
  const messages = useMessages(commandPaletteMessages)
  const characterKeys = useCharacterShortcuts()
  const locale = useLocale()

  const [query, setQuery] = useState(defaultQuery)
  // The server (and hydration) render without recents; the client reads them after.
  const recent = useSyncExternalStore(subscribeRecent, readRecent, () => NO_RECENT)
  const listRef = useRef<HTMLDivElement>(null)
  const edges = useDialogScrollEdges(listRef)
  const groups = useMemo(() => rankGroups(commands, query, recent, groupOrder, locale), [commands, query, recent, groupOrder, locale])
  const hintsId = useId()

  return (
    <div
      className={cx("fa-palette", className)}
      data-scrolled-top={edges.top ? "" : undefined}
      data-scrolled-bottom={edges.bottom ? "" : undefined}
    >
      <Autocomplete.Root
        inline
        open
        items={groups}
        filteredItems={groups}
        value={query}
        onValueChange={(next) => setQuery(next)}
        itemToStringValue={(entry: Entry) => entry.command.label}
        autoHighlight="always"
        keepHighlight
      >
        <div className="fa-palette-search">
          <IconSearch />
          <Autocomplete.Input
            className="fa-palette-input"
            placeholder={messages.typeACommandOrSearch}
            aria-label={messages.searchCommands}
            aria-describedby={hintsId}
          />
          <Kbd keys="esc" size="sm" className="fa-palette-esc" aria-hidden />
        </div>
        {/* Focusable so keyboard users can scroll long results (focus normally stays in the field). */}
        <div
          ref={listRef}
          className="fa-palette-list"
          // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrollable region must be reachable by keyboard
          tabIndex={0}
          role="group"
          aria-label={messages.results}
        >
          <Autocomplete.Status className="sr-only">{loading ? messages.searching : ""}</Autocomplete.Status>
          <Autocomplete.Empty className="fa-palette-empty">
            {query.trim() && !loading ? messages.noCommandsMatch(query.trim()) : null}
          </Autocomplete.Empty>
          <Autocomplete.List className="fa-palette-groups">
            {(group: GroupEntry) => (
              <Autocomplete.Group key={group.value} items={group.items} className="fa-palette-group">
                <Autocomplete.GroupLabel className="fa-popup-group-label">{group.value === RECENT_GROUP ? messages.recent : group.value}</Autocomplete.GroupLabel>
                <Autocomplete.Collection>
                  {(entry: Entry) => {
                    const { command } = entry
                    const disabled = Boolean(command.disabledReason)
                    return (
                      <Autocomplete.Item
                        key={entry.key}
                        value={entry}
                        disabled={disabled}
                        className="fa-item fa-palette-item"
                        data-tone={command.tone === "danger" ? "danger" : undefined}
                        onClick={() => {
                          if (!disabled) onRun(command)
                        }}
                      >
                        {command.icon}
                        <span className="fa-palette-text">
                          <span className="fa-palette-label">
                            <Label text={command.label} indices={entry.indices} />
                          </span>
                          {command.disabledReason || command.detail ? (
                            <span className="fa-palette-detail">{command.disabledReason ?? command.detail}</span>
                          ) : null}
                        </span>
                        {command.shortcut && (characterKeys || !isCharacterShortcut(command.shortcut)) ? <Kbd keys={command.shortcut} variant="text" className="fa-item-trail" /> : null}
                      </Autocomplete.Item>
                    )
                  }}
                </Autocomplete.Collection>
              </Autocomplete.Group>
            )}
          </Autocomplete.List>
          {loading ? <PaletteSkeleton /> : null}
        </div>
        <footer className="fa-palette-footer" id={hintsId}>
          <span className="fa-palette-hint">
            <Kbd keys="up" size="sm" />
            <Kbd keys="down" size="sm" />
            {messages.navigate} </span>
          <span className="fa-palette-hint">
            <Kbd keys="enter" size="sm" />
            {messages.run} </span>
          <span className="fa-palette-hint">
            <Kbd keys="esc" size="sm" />
            {messages.close} </span>
        </footer>
      </Autocomplete.Root>
    </div>
  )
}

/** Rows still loading: the exact box of a result row (icon slot + one body line). */
function PaletteSkeleton() {
  return (
    <div className="fa-palette-group" aria-hidden>
      <Skeleton.Text type="overline" width="var(--space-16)" className="fa-palette-skeleton-label" />
      {["38%", "52%", "30%"].map((width) => (
        <div key={width} className="fa-palette-skeleton-row">
          <Skeleton.Block width="var(--icon-md)" height="var(--icon-md)" radius="item" />
          <Skeleton.Text type="body" width={width} />
        </div>
      ))}
    </div>
  )
}

/* ── Modal palette ─────────────────────────────────────────────────────────── */

interface CommandPaletteProps {
  /** External store observed by the component. */
  store: PaletteStore
  open: boolean
  /** Called with the next open state when the palette is dismissed (Esc, outside press, close) or closes after a command is chosen; the command runs once closing finishes. */
  onOpenChange: (open: boolean) => void
  /** Preferred order of command or action groups. */
  groupOrder: readonly string[]
}

function CommandPalette({ store, open, onOpenChange, groupOrder }: CommandPaletteProps) {
  const messages = useMessages(commandPaletteMessages)

  const commands = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
  const loading = useSyncExternalStore(store.subscribe, store.getLoading, store.getLoading)
  const pending = useRef<PaletteCommand | null>(null)

  const run = useCallback(
    (command: PaletteCommand) => {
      rememberRecent(command.id)
      // Run once the palette has closed, so focus has returned before the command opens
      // anything of its own (a confirm, a window).
      pending.current = command
      onOpenChange(false)
    },
    [onOpenChange]
  )

  return (
    <BaseDialog.Root
      open={open}
      onOpenChange={(next) => onOpenChange(next)}
      onOpenChangeComplete={(isOpen) => {
        if (isOpen || !pending.current) return
        const command = pending.current
        pending.current = null
        void command.run()
      }}
    >
      <DialogSurface mode="dialog" kind="palette" size="md" aria-label={messages.commandPalette}>
        <BaseDialog.Title className="sr-only">{messages.commandPalette}</BaseDialog.Title>
        <CommandPanel key={open ? "open" : "closed"} commands={commands} loading={loading} onRun={run} groupOrder={groupOrder} />
        {/* Lets touch screen readers leave the modal; after the panel so the field takes focus. */}
        <BaseDialog.Close className="sr-only">{messages.closeCommandPalette}</BaseDialog.Close>
      </DialogSurface>
    </BaseDialog.Root>
  )
}
