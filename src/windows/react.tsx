/**
 * React bindings for the window manager: a provider that connects the store, selector
 * hooks over useSyncExternalStore, and the per-window context used by window bodies.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react"
import type { WindowManager } from "./store.js"
import {
  PRIMARY_WINDOW_ID,
  type CloseGuard,
  type WindowEntry,
  type WindowIndicator,
  type WindowManagerState,
  type WindowParams,
} from "./types.js"

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect

const ManagerContext = /* @__PURE__ */ createContext<WindowManager | null>(null)

/**
 * Provide a window manager to the tree and connect it (load the persisted layout, join
 * cross-tab sync) before the first paint after hydration.
 */
export function WindowManagerProvider({ manager, children }: {
  /** The store from `createWindowManager`. Create it once (module scope or a ref); a new instance reconnects. */
  manager: WindowManager
  children: ReactNode
}) {
  useIsomorphicLayoutEffect(() => manager.connect(), [manager])
  return <ManagerContext.Provider value={manager}>{children}</ManagerContext.Provider>
}

/** Returns the window manager from the enclosing `WindowManagerProvider`. Throws outside one; use `useOptionalWindowManager` where there may be none. */
export function useWindowManager(): WindowManager {
  const manager = useContext(ManagerContext)
  if (!manager) throw new Error("useWindowManager must be used inside WindowManagerProvider")
  return manager
}

/** Optional variant for components that also render outside a workspace (gallery specimens). */
export function useOptionalWindowManager(): WindowManager | null {
  return useContext(ManagerContext)
}

/** Subscribe to a slice of state. The selector must return a stable reference for equal input. */
export function useWindowState<T>(selector: (state: WindowManagerState) => T): T {
  const manager = useWindowManager()
  return useSyncExternalStore(
    manager.subscribe,
    () => selector(manager.getState()),
    () => selector(manager.getServerState())
  )
}

/** Returns the open windows in dock order, re-rendering when the list or any entry changes. */
export const useWindows = () => useWindowState((state) => state.windows)
/** Returns the id of the focused window (`PRIMARY_WINDOW_ID` for the routed view, or null), tracked per tab and re-rendering when focus moves. */
export const useFocusedWindowId = () => useWindowState((state) => state.focusedId)
/** Returns the entry for window `id`, or `undefined` when no such window is open. */
export const useWindowEntry = (id: string) =>
  useWindowState((state) => state.windows.find((entry) => entry.id === id))

/** Returns the status indicator a window body has set for window `id` (tone and label, shown on its dock item), or `undefined` when none is set. */
export function useWindowIndicator(id: string): WindowIndicator | undefined {
  const manager = useWindowManager()
  return useSyncExternalStore(
    manager.subscribeIndicators,
    () => manager.getIndicator(id),
    () => undefined
  )
}

/* ── Inside a window ─────────────────────────────────────────────────────── */

export interface WindowContextValue {
  id: string
  /** Semantic entity or content kind, used to choose labels and rendering. */
  kind: string
  /** Serialisable parameters used to reconstruct the view. */
  params: WindowParams
  /** Portal targets in the frame's app bar and status bar. */
  actionsSlot: HTMLElement | null
  statusSlot: HTMLElement | null
  /** Where the window is being rendered. */
  host: "workspace" | "popout" | "specimen"
  /**
   * The window is in full screen: its app bar and status bar are hidden and the body fills
   * the screen, so content draws its own floating tools (and, for a remote session, may
   * lock the keyboard). Set by the workspace and pop-out; undefined in a specimen.
   */
  fullscreen?: boolean
  /** Leave full screen (the person can also press Esc). Set by the workspace and pop-out. */
  exitFullscreen?: () => void
}

/** The window a body renders in: its id, kind, params, app-bar and status-bar portal slots and host. Provided by the workspace, pop-out and specimen frames; read it with `useWindow`. */
export const WindowContext = /* @__PURE__ */ createContext<WindowContextValue | null>(null)

/** The window this component renders in. Throws outside a window body. */
export function useWindow(): WindowContextValue {
  const context = useContext(WindowContext)
  if (!context) throw new Error("useWindow must be used inside a window body")
  return context
}

export interface WindowVisibility {
  /** On screen: not minimised, not handed to a popup, and the document is visible. */
  visible: boolean
  focused: boolean
  minimised: boolean
  poppedOut: boolean
}

const documentVisible = () => typeof document === "undefined" || document.visibilityState === "visible"
function subscribeDocumentVisibility(notify: () => void) {
  document.addEventListener("visibilitychange", notify)
  return () => document.removeEventListener("visibilitychange", notify)
}

/**
 * Whether this window is on screen. Bodies pause expensive work (streams, polling, canvas
 * rendering) while `visible` is false; minimised windows stay mounted, so their state
 * survives, but they must go quiet (R17.2).
 */
export function useWindowVisibility(): WindowVisibility {
  const context = useContext(WindowContext)
  const manager = useOptionalWindowManager()
  const pageVisible = useSyncExternalStore(subscribeDocumentVisibility, documentVisible, () => true)
  const id = context?.id ?? PRIMARY_WINDOW_ID
  const host = context?.host ?? "workspace"
  const entry = useSyncExternalStore(
    manager?.subscribe ?? noopSubscribe,
    () => manager?.getState().windows.find((item) => item.id === id),
    () => undefined
  ) as WindowEntry | undefined
  const focused = useSyncExternalStore(
    manager?.subscribe ?? noopSubscribe,
    () => manager?.getState().focusedId === id,
    () => false
  )
  const minimised = entry?.minimised ?? false
  // In the popup the window is on screen; in the workspace a popped-out window is not.
  const poppedOut = host === "workspace" ? (entry?.poppedOut ?? false) : false
  return { visible: pageVisible && !minimised && !poppedOut, focused, minimised, poppedOut: entry?.poppedOut ?? false }
}

const noopSubscribe = () => () => {}

/**
 * Keep the window open while there is unsaved work. The guard runs when the user closes
 * the window; return false (or resolve false after asking) to cancel.
 */
export function useCloseGuard(guard: CloseGuard | null) {
  const context = useContext(WindowContext)
  const manager = useOptionalWindowManager()
  const latest = useRef(guard)
  useEffect(() => {
    latest.current = guard
  })
  const active = guard !== null
  const run = useCallback(() => latest.current?.() ?? true, [])
  useEffect(() => {
    if (!active || !context || !manager) return
    return manager.addCloseGuard(context.id, run)
  }, [active, context, manager, run])
}
