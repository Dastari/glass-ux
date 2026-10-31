/**
 * What a sidebar remembers, and the boot script that applies it before the first paint.
 * Hook-free, so server components and build steps can call it.
 *
 * Stored per sidebar under its storage key as JSON:
 *
 *   { "open": false, "width": 18.5, "groups": { "projects": false } }
 *
 * `open` is the desktop expanded state, `width` the dragged width in rem (so it follows the
 * UI scale) and `groups` the open state of each persisted group or sub-menu by id. Phone
 * sheets always start closed.
 */

/** A sidebar's remembered state. `null` means "never changed": the component default applies. */
export interface SidebarPrefs {
  /** Whether the desktop sidebar was left expanded. */
  readonly open: boolean | null
  /** The width the person dragged to, in rem. */
  readonly width: number | null
  /** Open state of persisted groups and sub-menus, by their `id`. */
  readonly groups: Readonly<Record<string, boolean>>
}

/** Nothing remembered yet. */
export const EMPTY_SIDEBAR_PREFS: SidebarPrefs = Object.freeze({ open: null, width: null, groups: Object.freeze({}) })

/** The narrowest a resizable sidebar can be dragged by default, in rem. */
export const SIDEBAR_MIN_REM = 14
/** The widest a resizable sidebar can be dragged by default, in rem. */
export const SIDEBAR_MAX_REM = 28

/** Turns parsed storage into prefs, dropping anything malformed (a hand-edited or old entry). */
export function normaliseSidebarPrefs(input: unknown): SidebarPrefs {
  const raw = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {}
  const groups: Record<string, boolean> = {}
  if (typeof raw.groups === "object" && raw.groups !== null) {
    for (const [key, value] of Object.entries(raw.groups)) if (typeof value === "boolean") groups[key] = value
  }
  const width = typeof raw.width === "number" && Number.isFinite(raw.width) && raw.width > 0 ? Math.round(raw.width * 100) / 100 : null
  return { open: typeof raw.open === "boolean" ? raw.open : null, width, groups }
}

/**
 * The localStorage key a sidebar uses: its `storageKey`, followed by the storage scope when it
 * sits inside one (a window body), so the same sidebar in two kinds of window remembers two
 * things.
 */
export function sidebarStorageKey(storageKey: string, scope: string | null): string {
  return scope ? `${storageKey}:${scope}` : storageKey
}

/** Options for {@link sidebarBootScript}. */
export interface SidebarBootOptions {
  /** The provider's `mobileQuery`: when it matches, the sidebar is marked `data-mobile` so the docked pane never paints on a phone. */
  mobileQuery?: string
  /**
   * Whether to apply the remembered open state. False when the application controls `open`
   * itself (the stored width still applies). Default true.
   */
  applyOpen?: boolean
}

/**
 * The blocking script that puts a sidebar in its remembered state before the first paint, so
 * a collapsed sidebar never flashes open and a dragged width never jumps. It must be the
 * first child of the `.fa-sidebar` element: it writes `data-state`, `data-mobile` and
 * `--fa-sidebar-width` onto its parent.
 *
 * `Sidebar` renders it for you during server rendering (and leaves it out of client
 * renders, where React reads storage before painting). Call it yourself to compute a
 * Content-Security-Policy hash, or pass `nonce` to `SidebarProvider`. Pass the resolved
 * localStorage key (see `sidebarStorageKey`), or `null` to apply only the mobile query.
 *
 * @example
 * const hash = createHash("sha256").update(sidebarBootScript("app.sidebar")).digest("base64")
 */
export function sidebarBootScript(storageKey: string | null, options: SidebarBootOptions = {}): string {
  const { mobileQuery, applyOpen = true } = options
  const query = mobileQuery ? `if(matchMedia(${JSON.stringify(mobileQuery)}).matches)e.setAttribute("data-mobile","");` : ""
  const stored = storageKey
    ? `var s=JSON.parse(localStorage.getItem(${JSON.stringify(storageKey)})||"null")||{};` +
      (applyOpen ? `if(typeof s.open==="boolean"&&e.getAttribute("data-collapsible")!=="none")e.setAttribute("data-state",s.open?"expanded":"collapsed");` : "") +
      `var w=s.width;if(typeof w==="number"&&isFinite(w)&&w>0)e.style.setProperty("--fa-sidebar-width",Math.round(w*100)/100+"rem");`
    : ""
  return `(function(){try{var e=document.currentScript&&document.currentScript.parentElement;if(!e)return;${query}${stored}}catch(x){}})()`
}
