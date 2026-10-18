/**
 * Shell preferences: the section drawer (open, width), the inspector and collapsed
 * drawer groups. Stored per browser under SHELL_STORAGE_KEY (namespace it per user when
 * auth lands) and mirrored onto <html>:
 *
 *   data-shell-drawer="closed"        the section drawer is collapsed to the rail
 *   data-shell-inspector="open|closed" an explicit inspector choice (absent = default)
 *   --shell-drawer: <n>rem            the drawer width the user dragged to
 *
 * CSS lays the shell out from those, and a blocking boot script applies them before the
 * first paint, so a collapsed drawer never flashes open on load.
 */
import { useSyncExternalStore } from "react"

export interface ShellPrefs {
  drawer: "open" | "closed"
  /** Drawer width in rem (so it follows the UI scale); null = the default width. */
  drawerWidth: number | null
  /** null follows the default: open at 1920px and wider, closed below. */
  inspector: "open" | "closed" | null
  /** Collapsed drawer groups by id. */
  collapsed: Readonly<Record<string, boolean>>
}

/** The localStorage key the shell preferences are saved under, per browser. */
export const SHELL_STORAGE_KEY = "workspace.shell.v1"
/** Preferences before anything is saved: drawer open at the default width, inspector following its breakpoint default, no groups collapsed. */
export const DEFAULT_SHELL_PREFS: ShellPrefs = { drawer: "open", drawerWidth: null, inspector: null, collapsed: {} }

/** Drawer width limits in rem (mirrors --_drawer-min / --_drawer-max in app-shell.css). */
export const DRAWER_MIN_REM = 14
/** The widest the section drawer can be dragged, in rem; saved widths are clamped to it. */
export const DRAWER_MAX_REM = 28

export function normaliseShellPrefs(input: unknown): ShellPrefs {
  const raw = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {}
  const collapsed: Record<string, boolean> = {}
  if (typeof raw.collapsed === "object" && raw.collapsed !== null) {
    for (const [key, value] of Object.entries(raw.collapsed)) if (value === true) collapsed[key] = true
  }
  const width = typeof raw.drawerWidth === "number" && Number.isFinite(raw.drawerWidth) ? raw.drawerWidth : null
  return {
    drawer: raw.drawer === "closed" ? "closed" : "open",
    drawerWidth: width === null ? null : Math.min(DRAWER_MAX_REM, Math.max(DRAWER_MIN_REM, Math.round(width * 100) / 100)),
    inspector: raw.inspector === "open" || raw.inspector === "closed" ? raw.inspector : null,
    collapsed,
  }
}

const listeners = new Set<() => void>()
let cachedRaw: string | null | undefined
let cached = DEFAULT_SHELL_PREFS

function read(): ShellPrefs {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(SHELL_STORAGE_KEY)
  } catch {
    raw = null
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw
    try {
      cached = normaliseShellPrefs(JSON.parse(raw ?? "null"))
    } catch {
      cached = DEFAULT_SHELL_PREFS
    }
  }
  return cached
}

function subscribe(notify: () => void) {
  listeners.add(notify)
  const onStorage = (event: StorageEvent) => {
    if (event.key === SHELL_STORAGE_KEY) notify()
  }
  window.addEventListener("storage", onStorage)
  return () => {
    listeners.delete(notify)
    window.removeEventListener("storage", onStorage)
  }
}

/** Apply preferences to <html>. Pure DOM; mirrors shellBootScript exactly. */
export function applyShellAttributes(root: HTMLElement, prefs: ShellPrefs) {
  if (prefs.drawer === "closed") root.dataset.shellDrawer = "closed"
  else delete root.dataset.shellDrawer
  if (prefs.inspector) root.dataset.shellInspector = prefs.inspector
  else delete root.dataset.shellInspector
  if (prefs.drawerWidth === null) root.style.removeProperty("--shell-drawer")
  else root.style.setProperty("--shell-drawer", `${prefs.drawerWidth}rem`)
}

/**
 * Merges a patch (or the result of a function of the current preferences) into the shell
 * preferences, normalises it (clamping the drawer width), saves it to localStorage when
 * available, applies it to `<html>` and notifies `useShellPrefs` subscribers.
 */
export function updateShellPrefs(patch: Partial<ShellPrefs> | ((current: ShellPrefs) => Partial<ShellPrefs>)) {
  const current = read()
  const next = normaliseShellPrefs({ ...current, ...(typeof patch === "function" ? patch(current) : patch) })
  try {
    localStorage.setItem(SHELL_STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Preferences are best effort.
  }
  applyShellAttributes(document.documentElement, next)
  for (const notify of listeners) notify()
}

export function readShellPrefs() {
  return read()
}

/** Returns the saved shell preferences and re-renders when they change, in this tab or another. Server rendering returns `DEFAULT_SHELL_PREFS`. */
export function useShellPrefs(): ShellPrefs {
  return useSyncExternalStore(subscribe, read, () => DEFAULT_SHELL_PREFS)
}

/** The blocking boot script: the same result as applyShellAttributes, before first paint. */
export function shellBootScript() {
  return `(function(){try{var s=JSON.parse(localStorage.getItem(${JSON.stringify(SHELL_STORAGE_KEY)})||"null")||{};var d=document.documentElement;if(s.drawer==="closed")d.dataset.shellDrawer="closed";if(s.inspector==="open"||s.inspector==="closed")d.dataset.shellInspector=s.inspector;var w=s.drawerWidth;if(typeof w==="number"&&isFinite(w)){w=Math.min(${DRAWER_MAX_REM},Math.max(${DRAWER_MIN_REM},Math.round(w*100)/100));d.style.setProperty("--shell-drawer",w+"rem")}}catch(e){}})()`
}
