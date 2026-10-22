/**
 * The window manager store. Framework-agnostic: plain state, plain listeners. React binds
 * to it with useSyncExternalStore (react.tsx); the store never imports React.
 *
 *   state        windows (insertion order = dock order), per-tab focus, tile splits, revision
 *   persistence  localStorage under a per-user key, debounced, flushed on pagehide
 *   sync         BroadcastChannel (storage events when unavailable); newest revision wins
 *   pop-out      window.open to the pop-out route; the popup is a full participant in sync
 *                and hands the window back when it closes. A popup without storage asks
 *                the workspace for its state when it connects
 *   events       open, focus, beforeclose (cancellable), close, minimise, restore,
 *                maximise, layout, popout, return, sync
 *
 * See docs/windows.md for the architecture.
 */
import {
  DEFAULT_SPLITS,
  defaultFloatingRect,
  isSnapZone,
  normaliseSplits,
  type SnapZone,
} from "./geometry.js"
import { DEFAULT_WINDOW_SIZE, getWindowKind } from "./registry.js"
import {
  PRIMARY_WINDOW_ID,
  type CloseGuard,
  type OpenWindowInput,
  type Rect,
  type WindowEntry,
  type WindowEvent,
  type WindowEventListener,
  type WindowEventType,
  type WindowIndicator,
  type WindowLayout,
  type WindowManagerState,
  type WindowParams,
} from "./types.js"

export interface WindowManagerOptions {
  /** localStorage key. Namespace it per user. null disables persistence. */
  storageKey?: string | null
  /** BroadcastChannel name. Defaults to the storage key; null disables cross-tab sync. */
  channelName?: string | null
  /** Follow storage and other tabs but never write or broadcast (live previews). */
  readOnly?: boolean
  /**
   * "popout" when this document hosts a single popped-out window. A popout manager without
   * storage (`storageKey: null`) asks the workspace on the channel for its state when it
   * connects, so pop-out works with a channel alone.
   */
  role?: "workspace" | "popout"
  /** Layout for a newly opened window, evaluated at open time. */
  defaultLayout?: () => Exclude<WindowLayout, "maximised">
  /** URL of the pop-out route for a window id. Omit to disable pop-out. */
  popoutUrl?: (id: string) => string
}

export interface WindowManager {
  readonly options: Readonly<WindowManagerOptions>
  getState(): WindowManagerState
  getServerState(): WindowManagerState
  subscribe(listener: () => void): () => void
  on(type: WindowEventType, listener: WindowEventListener): () => void
  /** Load persisted state and start syncing. Returns a disconnect function. Client only. */
  connect(): () => void
  /** The workspace reports its size so new windows are placed inside it. */
  setWorkspaceSize(width: number, height: number): void
  getWorkspaceSize(): { width: number; height: number }

  get(id: string): WindowEntry | undefined
  open(input: OpenWindowInput): string
  focus(id: string): void
  close(id: string): Promise<boolean>
  minimise(id: string): void
  /** Show a minimised window (and focus it). */
  restore(id: string): void
  maximise(id: string): void
  /** Return a maximised window to where it was. */
  unmaximise(id: string): void
  toggleMaximise(id: string): void
  tile(id: string): void
  /** Float a window, optionally at a free rectangle. */
  float(id: string, rect?: Rect): void
  snap(id: string, zone: SnapZone): void
  setSplits(columns: 2 | 3, splits: readonly number[]): void
  /**
   * Replace a window's params: a view that follows something elsewhere (the dashboard's
   * selected site). Persisted and synced like any change, so a popped-out window and other
   * tabs follow; the body re-renders with the new params. The id and the scope are unchanged.
   */
  setParams(id: string, params: WindowParams): void
  cycleFocus(direction: 1 | -1): void

  canPopOut(id: string): boolean
  popOut(id: string, screenRect?: { left: number; top: number; width: number; height: number }): void
  returnToWorkspace(id: string): void
  /** Called by the pop-out route: this document now hosts the window. */
  hostPopout(id: string): () => void
  /** Bring a popped-out window's browser window to the front. */
  focusPopout(id: string): void

  addCloseGuard(id: string, guard: CloseGuard): () => void
  setIndicator(id: string, indicator: WindowIndicator | null): void
  getIndicator(id: string): WindowIndicator | undefined
  subscribeIndicators(listener: () => void): () => void
}

const EMPTY_STATE: WindowManagerState = Object.freeze({
  windows: Object.freeze([]) as readonly WindowEntry[],
  focusedId: PRIMARY_WINDOW_ID,
  splits: DEFAULT_SPLITS,
  rev: 0,
})

const PERSIST_DELAY = 150
const PING_TIMEOUT = 700
const POPUP_POLL = 800
const MIN_SPLIT_FRACTION = 0.18

type SyncMessage =
  | { type: "state"; origin: string; rev: number; windows: unknown; splits: unknown }
  | { type: "ping"; origin: string }
  | { type: "pong"; origin: string; ids: string[] }
  | { type: "indicator"; origin: string; id: string; indicator: WindowIndicator | null }
  | { type: "focus-popout"; origin: string; id: string }
  | { type: "request-state"; origin: string }

interface PersistedState {
  v: 1
  origin: string
  rev: number
  windows: unknown
  splits: unknown
  focusedId: unknown
}

function randomId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID().slice(0, 8)
  return Math.random().toString(36).slice(2, 10)
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value)

function sameParams(a: WindowParams, b: WindowParams) {
  const keys = Object.keys(a)
  return keys.length === Object.keys(b).length && keys.every((key) => a[key] === b[key])
}

function parseParams(value: unknown): WindowParams | null {
  if (!isRecord(value)) return null
  for (const item of Object.values(value)) {
    if (!["string", "number", "boolean"].includes(typeof item)) return null
  }
  return value as WindowParams
}

function parseRect(value: unknown): Rect | null {
  if (!isRecord(value)) return null
  const { x, y, w, h } = value
  if (![x, y, w, h].every(isFiniteNumber)) return null
  return { x: x as number, y: y as number, w: Math.max(1, w as number), h: Math.max(1, h as number) }
}

const LAYOUTS = new Set<WindowLayout>(["tiled", "floating", "maximised"])

/** Validate one stored or broadcast window. Anything malformed is dropped, never trusted. */
export function parseEntry(value: unknown): WindowEntry | null {
  if (!isRecord(value)) return null
  const params = parseParams(value.params)
  const rect = parseRect(value.rect)
  if (typeof value.id !== "string" || !value.id || typeof value.kind !== "string" || !params || !rect) return null
  const layout = LAYOUTS.has(value.layout as WindowLayout) ? (value.layout as WindowLayout) : "floating"
  const restoreLayout = value.restoreLayout === "tiled" ? "tiled" : "floating"
  return {
    id: value.id,
    kind: value.kind,
    params,
    scope: typeof value.scope === "string" && value.scope ? value.scope : null,
    layout,
    restoreLayout,
    snap: isSnapZone(value.snap) ? value.snap : null,
    rect,
    minimised: value.minimised === true,
    poppedOut: value.poppedOut === true,
    z: isFiniteNumber(value.z) ? value.z : 0,
    openedAt: isFiniteNumber(value.openedAt) ? value.openedAt : 0,
  }
}

export function parseWindows(value: unknown): WindowEntry[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const result: WindowEntry[] = []
  for (const item of value) {
    const entry = parseEntry(item)
    if (entry && !seen.has(entry.id)) {
      seen.add(entry.id)
      result.push(entry)
    }
  }
  return result
}

export function parseSplits(value: unknown): WindowManagerState["splits"] {
  const raw = isRecord(value) ? value : {}
  const read = (columns: 2 | 3) => {
    const list = Array.isArray(raw[String(columns)]) ? (raw[String(columns)] as unknown[]).filter(isFiniteNumber) : []
    return normaliseSplits(list, columns, MIN_SPLIT_FRACTION)
  }
  return { "2": read(2), "3": read(3) }
}

/** Visible windows (not minimised, not popped out), topmost first. */
function visibleByRecency(windows: readonly WindowEntry[]) {
  return windows.filter((entry) => !entry.minimised && !entry.poppedOut).toSorted((a, b) => b.z - a.z)
}

function nextFocus(windows: readonly WindowEntry[], exclude?: string) {
  return visibleByRecency(windows).find((entry) => entry.id !== exclude)?.id ?? PRIMARY_WINDOW_ID
}

/**
 * Creates a window manager store: open windows, focus, layout and close guards, with
 * optional localStorage persistence (`storageKey`) and cross-tab sync over a
 * BroadcastChannel. Nothing is loaded or synced until `connect()`, which
 * `WindowManagerProvider` calls on the client.
 */
export function createWindowManager(options: WindowManagerOptions = {}): WindowManager {
  const storageKey = options.storageKey ?? null
  const channelName = options.channelName === undefined ? storageKey : options.channelName
  const readOnly = options.readOnly === true
  const role = options.role ?? "workspace"
  const origin = randomId()

  let state: WindowManagerState = EMPTY_STATE
  let workspace = { width: 0, height: 0 }
  let channel: BroadcastChannel | null = null
  let persistTimer: ReturnType<typeof setTimeout> | undefined
  let popupPoll: ReturnType<typeof setInterval> | undefined

  const listeners = new Set<() => void>()
  const eventListeners = new Map<WindowEventType, Set<WindowEventListener>>()
  const guards = new Map<string, Set<CloseGuard>>()
  const indicators = new Map<string, WindowIndicator>()
  const indicatorListeners = new Set<() => void>()
  const popups = new Map<string, Window>()
  const hosted = new Set<string>()

  /* ── Core plumbing ─────────────────────────────────────────────────────── */

  const notify = () => {
    for (const listener of listeners) listener()
  }

  function emit(type: WindowEventType, id: string, source: "local" | "remote" = "local") {
    let prevented = false
    const event: WindowEvent = {
      type,
      id,
      entry: state.windows.find((entry) => entry.id === id) ?? null,
      source,
      preventDefault: () => {
        prevented = true
      },
      get defaultPrevented() {
        return prevented
      },
    }
    for (const listener of eventListeners.get(type) ?? []) {
      try {
        listener(event)
      } catch (error) {
        console.error(`Window ${type} listener failed`, error)
      }
    }
    return event
  }

  function post(message: SyncMessage) {
    if (readOnly || !channel) return
    try {
      // oxlint-disable-next-line unicorn/require-post-message-target-origin -- a BroadcastChannel has no target origin
      channel.postMessage(message)
    } catch {
      // A closed channel (page teardown) has nothing left to tell.
    }
  }

  function flushPersist() {
    clearTimeout(persistTimer)
    persistTimer = undefined
    if (readOnly || !storageKey || typeof localStorage === "undefined") return
    const payload: PersistedState = {
      v: 1,
      origin,
      rev: state.rev,
      windows: state.windows,
      splits: state.splits,
      focusedId: state.focusedId,
    }
    try {
      localStorage.setItem(storageKey, JSON.stringify(payload))
    } catch {
      // Storage full or blocked: layout persistence is best effort.
    }
  }

  function schedulePersist() {
    if (readOnly || !storageKey) return
    clearTimeout(persistTimer)
    persistTimer = setTimeout(flushPersist, PERSIST_DELAY)
  }

  /** Apply a local change: bump the revision, notify, persist and broadcast. */
  function commit(next: Omit<WindowManagerState, "rev">, shared = true) {
    state = { ...next, rev: shared ? state.rev + 1 : state.rev }
    notify()
    if (!shared) return
    schedulePersist()
    post({ type: "state", origin, rev: state.rev, windows: state.windows, splits: state.splits })
  }

  function get(id: string) {
    return state.windows.find((entry) => entry.id === id)
  }

  function topZ() {
    return state.windows.reduce((max, entry) => Math.max(max, entry.z), 0)
  }

  /** Replace one window. Optionally raise it and/or focus it. */
  function patch(
    id: string,
    change: Partial<WindowEntry>,
    { raise = false, focus }: { raise?: boolean; focus?: string | null } = {}
  ) {
    const current = get(id)
    if (!current) return null
    const z = raise ? (current.z === topZ() && current.z > 0 ? current.z : topZ() + 1) : current.z
    const updated: WindowEntry = { ...current, ...change, z }
    const windows = state.windows.map((entry) => (entry.id === id ? updated : entry))
    const focusedId = focus === undefined ? state.focusedId : focus
    commit({ ...state, windows: renormalise(windows), focusedId })
    return updated
  }

  /** Keep z small: re-rank once it grows large. Order is all that matters. */
  function renormalise(windows: WindowEntry[]) {
    if (windows.every((entry) => entry.z < 10_000)) return windows
    const ranks = new Map(windows.toSorted((a, b) => a.z - b.z).map((entry, index) => [entry.id, index + 1]))
    return windows.map((entry) => ({ ...entry, z: ranks.get(entry.id) ?? entry.z }))
  }

  /* ── Remote state ──────────────────────────────────────────────────────── */

  function applySnapshot(snapshot: { origin: string; rev: number; windows: unknown; splits: unknown }) {
    if (!(snapshot.rev > state.rev || (snapshot.rev === state.rev && snapshot.origin > origin))) return
    const before = new Set(state.windows.map((entry) => entry.id))
    const windows = parseWindows(snapshot.windows)
    const after = new Set(windows.map((entry) => entry.id))
    const focusedStillVisible = windows.some(
      (entry) => entry.id === state.focusedId && !entry.minimised && !entry.poppedOut
    )
    state = {
      windows,
      splits: parseSplits(snapshot.splits),
      focusedId:
        state.focusedId === PRIMARY_WINDOW_ID || focusedStillVisible ? state.focusedId : nextFocus(windows),
      rev: snapshot.rev,
    }
    for (const id of before) if (!after.has(id)) indicators.delete(id)
    // A popup focuses the window it hosts, whatever the workspace has focused.
    const hostedId = [...hosted].find((id) => after.has(id))
    if (role === "popout" && hostedId) state = { ...state, focusedId: hostedId }
    notify()
    for (const id of after) if (!before.has(id)) emit("open", id, "remote")
    for (const id of before) if (!after.has(id)) emit("close", id, "remote")
    emit("sync", "", "remote")
  }

  function onMessage(message: SyncMessage) {
    if (!isRecord(message) || message.origin === origin) return
    switch (message.type) {
      case "state":
        applySnapshot(message)
        break
      case "ping":
        if (hosted.size) post({ type: "pong", origin, ids: [...hosted] })
        break
      case "pong":
        for (const id of message.ids) pendingPing?.delete(id)
        break
      case "indicator":
        if (message.indicator) indicators.set(message.id, message.indicator)
        else indicators.delete(message.id)
        for (const listener of indicatorListeners) listener()
        break
      case "focus-popout":
        if (hosted.has(message.id)) window.focus()
        break
      case "request-state":
        // A popup without storage has just connected: tell it what is open.
        if (role === "workspace") post({ type: "state", origin, rev: state.rev, windows: state.windows, splits: state.splits })
        break
    }
  }

  let pendingPing: Set<string> | null = null

  /** After a reload, windows marked popped out may have lost their popup. Ask; reclaim the silent. */
  function reclaimOrphanedPopouts() {
    if (readOnly || role !== "workspace") return
    const orphans = state.windows.filter((entry) => entry.poppedOut).map((entry) => entry.id)
    if (!orphans.length) return
    if (!channel) {
      for (const id of orphans) manager.returnToWorkspace(id)
      return
    }
    pendingPing = new Set(orphans)
    post({ type: "ping", origin })
    setTimeout(() => {
      const silent = pendingPing
      pendingPing = null
      for (const id of silent ?? []) if (get(id)?.poppedOut) manager.returnToWorkspace(id)
    }, PING_TIMEOUT)
  }

  function watchPopups() {
    if (popupPoll || typeof window === "undefined") return
    popupPoll = setInterval(() => {
      for (const [id, handle] of popups) {
        if (!handle.closed) continue
        popups.delete(id)
        if (get(id)?.poppedOut) manager.returnToWorkspace(id)
      }
      if (!popups.size) {
        clearInterval(popupPoll)
        popupPoll = undefined
      }
    }, POPUP_POLL)
  }

  /* ── Public API ────────────────────────────────────────────────────────── */

  const manager: WindowManager = {
    options,
    getState: () => state,
    getServerState: () => EMPTY_STATE,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    on(type, listener) {
      let set = eventListeners.get(type)
      if (!set) eventListeners.set(type, (set = new Set()))
      set.add(listener)
      return () => set.delete(listener)
    },

    connect() {
      if (typeof window === "undefined") return () => {}
      if (storageKey) {
        try {
          const raw = localStorage.getItem(storageKey)
          const stored = raw ? (JSON.parse(raw) as Partial<PersistedState>) : null
          if (stored && isRecord(stored)) {
            const windows = parseWindows(stored.windows)
            const focused = typeof stored.focusedId === "string" ? stored.focusedId : PRIMARY_WINDOW_ID
            state = {
              windows,
              splits: parseSplits(stored.splits),
              focusedId:
                focused === PRIMARY_WINDOW_ID ||
                windows.some((entry) => entry.id === focused && !entry.minimised && !entry.poppedOut)
                  ? focused
                  : nextFocus(windows),
              rev: isFiniteNumber(stored.rev) ? stored.rev : 0,
            }
            notify()
          }
        } catch {
          // Corrupt layout: start clean rather than fail the shell.
        }
      }

      const cleanups: Array<() => void> = []
      if (channelName && typeof BroadcastChannel !== "undefined") {
        channel = new BroadcastChannel(channelName)
        channel.addEventListener("message", (event: MessageEvent<SyncMessage>) => onMessage(event.data))
        cleanups.push(() => {
          channel?.close()
          channel = null
        })
      } else if (storageKey) {
        const onStorage = (event: StorageEvent) => {
          if (event.key !== storageKey || !event.newValue) return
          try {
            const stored = JSON.parse(event.newValue) as Partial<PersistedState>
            if (isRecord(stored) && typeof stored.origin === "string" && isFiniteNumber(stored.rev)) {
              applySnapshot({ origin: stored.origin, rev: stored.rev, windows: stored.windows, splits: stored.splits })
            }
          } catch {
            // Ignore values written by older or unrelated clients.
          }
        }
        window.addEventListener("storage", onStorage)
        cleanups.push(() => window.removeEventListener("storage", onStorage))
      }

      const onPageHide = () => {
        for (const id of hosted) {
          if (get(id)?.poppedOut) manager.returnToWorkspace(id)
        }
        flushPersist()
      }
      const onVisibility = () => {
        if (document.visibilityState === "hidden") flushPersist()
      }
      window.addEventListener("pagehide", onPageHide)
      document.addEventListener("visibilitychange", onVisibility)
      cleanups.push(() => {
        window.removeEventListener("pagehide", onPageHide)
        document.removeEventListener("visibilitychange", onVisibility)
      })

      // A popup that reloaded handed its window back on pagehide; take it again.
      for (const id of hosted) {
        const entry = get(id)
        if (entry && !entry.poppedOut) patch(id, { poppedOut: true, minimised: false }, { focus: id })
        else if (entry) commit({ ...state, focusedId: id }, false)
      }
      reclaimOrphanedPopouts()
      // Without storage a popup starts empty: ask the workspace for its state.
      if (role === "popout" && !storageKey) post({ type: "request-state", origin })

      return () => {
        flushPersist()
        clearInterval(popupPoll)
        popupPoll = undefined
        for (const cleanup of cleanups) cleanup()
      }
    },

    setWorkspaceSize(width, height) {
      workspace = { width, height }
    },
    getWorkspaceSize: () => workspace,

    get,

    open(input) {
      const definition = getWindowKind(input.kind)
      const params = input.params ?? {}
      const key = input.id ?? (definition?.key ? `${input.kind}:${definition.key(params)}` : undefined)
      const existing = key ? get(key) : undefined
      if (existing) {
        if (existing.poppedOut) manager.focusPopout(existing.id)
        else manager.focus(existing.id)
        return existing.id
      }
      const id = key ?? `${input.kind}:${randomId()}`
      const layout = input.layout ?? options.defaultLayout?.() ?? "floating"
      const floating = state.windows.filter((entry) => entry.layout === "floating").length
      const scope = input.scope !== undefined ? input.scope : (definition?.scope?.(params) ?? null)
      const entry: WindowEntry = {
        id,
        kind: input.kind,
        params,
        scope: scope || null,
        layout,
        restoreLayout: layout === "tiled" ? "tiled" : "floating",
        snap: null,
        rect: defaultFloatingRect(input.size ?? definition?.size ?? DEFAULT_WINDOW_SIZE, workspace, floating),
        minimised: false,
        poppedOut: false,
        z: topZ() + 1,
        openedAt: Date.now(),
      }
      commit({ ...state, windows: [...state.windows, entry], focusedId: id })
      emit("open", id)
      emit("focus", id)
      return id
    },

    focus(id) {
      if (id === PRIMARY_WINDOW_ID) {
        if (state.focusedId === PRIMARY_WINDOW_ID) return
        commit({ ...state, focusedId: PRIMARY_WINDOW_ID }, false)
        emit("focus", id)
        return
      }
      const entry = get(id)
      if (!entry) return
      if (entry.poppedOut) {
        manager.focusPopout(id)
        return
      }
      const isTop = entry.z === topZ()
      if (state.focusedId === id && isTop && !entry.minimised) return
      if (isTop && !entry.minimised) commit({ ...state, focusedId: id }, false)
      else patch(id, { minimised: false }, { raise: true, focus: id })
      if (entry.minimised) emit("restore", id)
      emit("focus", id)
    },

    async close(id) {
      const entry = get(id)
      if (!entry) return true
      if (emit("beforeclose", id).defaultPrevented) return false
      for (const guard of guards.get(id) ?? []) {
        if (!(await guard())) return false
      }
      if (!get(id)) return true
      const windows = state.windows.filter((item) => item.id !== id)
      const focusedId = state.focusedId === id ? nextFocus(windows) : state.focusedId
      commit({ ...state, windows, focusedId })
      guards.delete(id)
      if (indicators.delete(id)) for (const listener of indicatorListeners) listener()
      const popup = popups.get(id)
      if (popup && !popup.closed) popup.close()
      popups.delete(id)
      emit("close", entry.id)
      if (focusedId && focusedId !== entry.id) emit("focus", focusedId)
      return true
    },

    minimise(id) {
      const entry = get(id)
      if (!entry || entry.minimised) return
      const focus = state.focusedId === id ? nextFocus(state.windows, id) : state.focusedId
      patch(id, { minimised: true }, { focus })
      emit("minimise", id)
    },

    restore(id) {
      const entry = get(id)
      if (!entry) return
      if (entry.poppedOut) {
        manager.focusPopout(id)
        return
      }
      patch(id, { minimised: false }, { raise: true, focus: id })
      emit("restore", id)
      emit("focus", id)
    },

    maximise(id) {
      const entry = get(id)
      if (!entry || entry.layout === "maximised") return
      patch(
        id,
        { layout: "maximised", restoreLayout: entry.layout === "tiled" ? "tiled" : "floating", minimised: false },
        { raise: true, focus: id }
      )
      emit("maximise", id)
    },

    unmaximise(id) {
      const entry = get(id)
      if (!entry || entry.layout !== "maximised") return
      patch(id, { layout: entry.restoreLayout }, { raise: true, focus: id })
      emit("layout", id)
    },

    toggleMaximise(id) {
      if (get(id)?.layout === "maximised") manager.unmaximise(id)
      else manager.maximise(id)
    },

    tile(id) {
      const entry = get(id)
      if (!entry) return
      patch(id, { layout: "tiled", restoreLayout: "tiled", snap: null, minimised: false }, { raise: true, focus: id })
      emit("layout", id)
    },

    float(id, rect) {
      const entry = get(id)
      if (!entry) return
      patch(
        id,
        { layout: "floating", restoreLayout: "floating", snap: null, minimised: false, rect: rect ?? entry.rect },
        { raise: true, focus: id }
      )
      emit("layout", id)
    },

    snap(id, zone) {
      const entry = get(id)
      if (!entry) return
      patch(id, { layout: "floating", restoreLayout: "floating", snap: zone, minimised: false }, { raise: true, focus: id })
      emit("layout", id)
    },

    setSplits(columns, splits) {
      const next = normaliseSplits(splits, columns, MIN_SPLIT_FRACTION)
      commit({ ...state, splits: { ...state.splits, [String(columns)]: next } })
    },

    setParams(id, params) {
      const current = get(id)
      const next = parseParams(params)
      if (!current || !next || sameParams(current.params, next)) return
      patch(id, { params: next })
    },

    cycleFocus(direction) {
      const visible = state.windows.filter((entry) => !entry.minimised && !entry.poppedOut)
      const order = [PRIMARY_WINDOW_ID, ...visible.map((entry) => entry.id)]
      const index = Math.max(0, order.indexOf(state.focusedId ?? PRIMARY_WINDOW_ID))
      const next = order[(index + direction + order.length) % order.length]
      if (next) manager.focus(next)
    },

    canPopOut(id) {
      const entry = get(id)
      if (!entry || !options.popoutUrl || role !== "workspace") return false
      return getWindowKind(entry.kind)?.popout !== false
    },

    popOut(id, screenRect) {
      const entry = get(id)
      if (!entry || !manager.canPopOut(id) || typeof window === "undefined" || !options.popoutUrl) return
      const focus = state.focusedId === id ? nextFocus(state.windows, id) : state.focusedId
      patch(id, { poppedOut: true, minimised: false }, { focus })
      // The popup reads storage as it boots, so it must see this window now.
      flushPersist()
      const width = Math.round(screenRect?.width ?? entry.rect.w)
      const height = Math.round(screenRect?.height ?? entry.rect.h)
      const left = Math.round(screenRect?.left ?? window.screenX + 80)
      const top = Math.round(screenRect?.top ?? window.screenY + 80)
      const handle = window.open(
        options.popoutUrl(id),
        `workspace-window-${id}`,
        `popup,width=${width},height=${height},left=${left},top=${top}`
      )
      if (!handle) {
        // Blocked: keep the window where it was.
        patch(id, { poppedOut: false }, { focus: id })
        return
      }
      popups.set(id, handle)
      watchPopups()
      emit("popout", id)
    },

    returnToWorkspace(id) {
      const entry = get(id)
      if (!entry || !entry.poppedOut) return
      popups.delete(id)
      const focus = role === "popout" ? state.focusedId : id
      patch(id, { poppedOut: false, minimised: false }, { raise: true, focus })
      if (role === "popout") flushPersist()
      emit("return", id)
    },

    hostPopout(id) {
      hosted.add(id)
      const entry = get(id)
      if (entry && !entry.poppedOut) patch(id, { poppedOut: true, minimised: false }, { focus: id })
      else if (entry) commit({ ...state, focusedId: id }, false)
      return () => {
        hosted.delete(id)
      }
    },

    focusPopout(id) {
      const handle = popups.get(id)
      if (handle && !handle.closed) {
        handle.focus()
        return
      }
      post({ type: "focus-popout", origin, id })
    },

    addCloseGuard(id, guard) {
      let set = guards.get(id)
      if (!set) guards.set(id, (set = new Set()))
      set.add(guard)
      return () => set.delete(guard)
    },

    setIndicator(id, indicator) {
      const current = indicators.get(id)
      if (current?.tone === indicator?.tone && current?.label === indicator?.label) return
      if (indicator) indicators.set(id, indicator)
      else indicators.delete(id)
      for (const listener of indicatorListeners) listener()
      post({ type: "indicator", origin, id, indicator })
    },
    getIndicator: (id) => indicators.get(id),
    subscribeIndicators(listener) {
      indicatorListeners.add(listener)
      return () => indicatorListeners.delete(listener)
    },
  }

  return manager
}

/** The per-user storage key for the workspace layout, e.g. "glass-ux.windows.v1:avery.quinn". */
export function windowStorageKey(userId: string, namespace = "workspace") {
  return `${namespace}.windows.v1:${userId}`
}
