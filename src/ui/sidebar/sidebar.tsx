/**
 * Sidebar — a docked pane of navigation or details beside the content, built from parts:
 *
 *   Header   mark, title, actions and the collapse button; in icon mode only the mark
 *   Search   an optional filter field that stays put while the content scrolls
 *   Content  scrolls; the header and footer edges appear while content passes beneath (R5.8)
 *   Group    labelled (optionally collapsible, remembered) groups of Menu items
 *   Footer   pinned items (the account)
 *   Rail     the pane's edge: press to toggle, drag to resize
 *
 * Layout and the remembered state come from data attributes on `.fa-sidebar` (set before the
 * first paint by the boot script), so React only drives behaviour. Collapsing never animates
 * the content beside it: the pane slides or narrows over it, and the track it occupies
 * commits once (at once when collapsing, after the motion when expanding), as AppShell does.
 * Below the provider's mobile query the same parts render in a Sheet from the sidebar's edge.
 */
import { Collapsible } from "@base-ui/react/collapsible"
import {
  Children,
  isValidElement,
  lazy,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  createContext,
  type ComponentProps,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react"
import { IconChevronDown, IconSearch, IconSidebar } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { focusFirst } from "../../lib/focus.js"
import { isRtl } from "../../lib/direction.js"
import { useMessages } from "../../lib/i18n/index.js"
import { useScrollEdges } from "../../lib/use-scroll-edges.js"
import { remPx } from "../../lib/rem.js"
import { Button, type ButtonProps } from "../button/index.js"
import { CountBadge } from "../badge/index.js"
import { SearchField } from "../input/index.js"
import { matchesShortcut, shortcutAllowed, useAriaShortcut, usePlatform } from "../kbd/index.js"
import { Tooltip } from "../tooltip/index.js"
import {
  SidebarConfig,
  SidebarIconMode,
  SidebarPartClasses,
  SidebarPlacement,
  useSidebarInternal,
  type SidebarCollapsible,
  type SidebarConfigValue,
  type SidebarSide,
  type SidebarVariant,
} from "./context.js"
import { sidebarMessages } from "./messages.js"
import { resizeKeyWidth, startPaneDrag, themeSidebarRem } from "./resize.js"
import { SIDEBAR_MAX_REM, SIDEBAR_MIN_REM, sidebarBootScript } from "./sidebar-state.js"
import {
  SidebarMatch,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "./sidebar-menu.js"

/** The phone sheet loads when the sheet can first appear (the viewport matches the mobile query), so desktop-only use never loads it. */
const SidebarSheet = /* @__PURE__ */ lazy(() => import("./sidebar-sheet.js").then((module) => ({ default: module.SidebarSheet })))

/** A width in rem, such as `"16rem"`. Rem follows the UI scale. */
export type SidebarWidth = `${number}rem`

/** Parts that hide in icon mode; focus inside one moves to a part that stays (R20.3). */
const HIDDEN_IN_ICON_MODE =
  ".fa-sidebar-title-block, .fa-sidebar-header-actions, .fa-sidebar-search-field, .fa-sidebar-group-label, .fa-sidebar-group-action, .fa-sidebar-menu-action, .fa-sidebar-menu-sub-panel, .fa-sidebar-menu-sub-toggle"

const noopSubscribe = () => () => {}
/** False on the server and while hydrating, true afterwards (and from the start of a client render). */
const useHydrated = () =>
  useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  )

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect

const remValue = (value: SidebarWidth | undefined) => {
  if (!value) return undefined
  const number = Number.parseFloat(value)
  return Number.isFinite(number) && number > 0 ? number : undefined
}

export interface SidebarProps extends Omit<ComponentProps<"div">, "children"> {
  /** The edge it docks to, following the reading direction: `start` (left in LTR) or `end`. @defaultValue "start" */
  side?: SidebarSide
  /**
   * `sidebar`: a flush chrome pane along the edge. `floating`: a glass panel inset from the
   * edges with its own corners. `inset`: the sidebar sits on the canvas and SidebarInset is
   * drawn as the raised panel beside it.
   * @defaultValue "sidebar"
   */
  variant?: SidebarVariant
  /**
   * `offcanvas`: collapsing slides it fully away. `icon`: it narrows to a strip of icons whose
   * labels become tooltips and whose sub-menus become flyouts. `none`: always expanded, with
   * no toggle, shortcut or phone sheet.
   * @defaultValue "offcanvas"
   */
  collapsible?: SidebarCollapsible
  /** Let the person drag the Rail (or use its arrow keys) to set the width, within `minWidth` and `maxWidth`. The width is remembered with the provider's storageKey. */
  resizable?: boolean
  /** The expanded width before the person resizes it. @defaultValue the theme's `--sidebar-w` (16.5rem) */
  width?: SidebarWidth
  /** The narrowest a resize can make it. @defaultValue "14rem" */
  minWidth?: SidebarWidth
  /** The widest a resize can make it. @defaultValue "28rem" */
  maxWidth?: SidebarWidth
  /**
   * The landmark: `nav` for navigation, `aside` for complementary details (an end sidebar with
   * the selection's properties), or `div` for none.
   * @defaultValue "nav"
   */
  as?: "nav" | "aside" | "div"
  /** Names the landmark and the phone sheet: "Workspace navigation", "Ticket details". Required. */
  "aria-label": string
  /** The parts: Header, Search, Content, Footer and Rail. */
  children?: ReactNode
}

/** The pane: a landmark of parts docked beside SidebarInset, or a sheet on phones. */
function SidebarRoot({
  side = "start",
  variant = "sidebar",
  collapsible = "offcanvas",
  resizable = false,
  width,
  minWidth,
  maxWidth,
  as: Landmark = "nav",
  "aria-label": label,
  className,
  style,
  children,
  ...rest
}: SidebarProps) {
  const ctx = useSidebarInternal()
  const hydrated = useHydrated()
  const rootRef = useRef<HTMLDivElement>(null)
  const paneRef = useRef<HTMLDivElement>(null)
  const lastFocus = useRef<HTMLElement | null>(null)
  const [ready, setReady] = useState(false)
  ctx.hint.variant = variant
  const { register } = ctx
  useIsoLayoutEffect(() => register({ side, collapsible, variant }), [register, side, collapsible, variant])

  // Transitions start one frame after the first paint, so applying the remembered state on
  // load (or while hydrating) never animates.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  const mobile = ctx.isMobile && collapsible !== "none"
  const state = collapsible === "none" ? "expanded" : ctx.open ? "expanded" : "collapsed"
  const iconMode = collapsible === "icon" && state === "collapsed" && !mobile

  const rail: ReactNode[] = []
  const parts: ReactNode[] = []
  for (const child of Children.toArray(children)) (isValidElement(child) && child.type === SidebarRail ? rail : parts).push(child)

  /** Moves focus off parts that are about to hide: to the part that stays, else a trigger, the rail or the content. */
  const repairFocus = useCallback(
    (kind: "offcanvas" | "icon", active: HTMLElement | null) => {
      const pane = paneRef.current
      if (!pane || !active || !pane.contains(active)) return
      if (kind === "icon" && !active.closest(HIDDEN_IN_ICON_MODE)) return
      const outside = [...ctx.returns].reverse().filter((element) => !pane.contains(element))
      const railHandle = rootRef.current?.querySelector<HTMLElement>(".fa-sidebar-rail[tabindex]")
      const inset = rootRef.current?.parentElement?.querySelector<HTMLElement>(":scope > .fa-sidebar-inset") ?? null
      if (kind === "icon") {
        const item = active.closest(".fa-sidebar-menu-item")?.querySelector<HTMLElement>(":scope > .fa-sidebar-menu-button")
        const search = active.closest(".fa-sidebar-search")?.querySelector<HTMLElement>(".fa-sidebar-search-button")
        const toggle = pane.querySelector<HTMLElement>(".fa-sidebar-header-toggle")
        focusFirst([item, search, toggle, ...outside, railHandle], inset)
      } else focusFirst([...outside, railHandle], inset)
    },
    [ctx.returns]
  )

  // Collapsing through the provider moves focus first, before the pane turns inert.
  useEffect(() => {
    ctx.beforeCollapse.current = () => {
      if (mobile || collapsible === "none") return
      repairFocus(collapsible === "offcanvas" ? "offcanvas" : "icon", document.activeElement as HTMLElement | null)
    }
    return () => {
      ctx.beforeCollapse.current = null
    }
  }, [ctx.beforeCollapse, mobile, collapsible, repairFocus])

  // A controlled collapse, or a part re-rendered in its other form, can still drop focus:
  // restore it from the last element focused in the pane.
  useIsoLayoutEffect(() => {
    const last = lastFocus.current
    if (!last || mobile) return
    const active = document.activeElement
    if (active && active !== document.body && active !== last) return
    if (last.isConnected && !last.closest("[inert]") && active === last) {
      if (state === "collapsed") repairFocus(collapsible === "offcanvas" ? "offcanvas" : "icon", last)
      return
    }
    if (!last.isConnected) {
      // Same part, other form (a menu button becoming a flyout trigger): find it by its key.
      const key = last.getAttribute("data-sidebar-key")
      const twin = key ? paneRef.current?.querySelector<HTMLElement>(`[data-sidebar-key="${CSS.escape(key)}"]`) : null
      if (twin && focusFirst([twin])) return
    }
    if (state === "collapsed") repairFocus(collapsible === "offcanvas" ? "offcanvas" : "icon", last.isConnected ? last : paneRef.current)
  }, [state, iconMode, mobile, collapsible, repairFocus])

  const widthRem = remValue(width)
  const min = remValue(minWidth) ?? SIDEBAR_MIN_REM
  const max = remValue(maxWidth) ?? SIDEBAR_MAX_REM
  const storedWidth = resizable && ctx.width !== null ? Math.min(max, Math.max(min, ctx.width)) : null
  const rootStyle = {
    ...style,
    ...(widthRem ? { "--fa-sidebar-default": `${widthRem}rem` } : {}),
    ...(minWidth ? { "--fa-sidebar-min": `${min}rem` } : {}),
    ...(maxWidth ? { "--fa-sidebar-max": `${max}rem` } : {}),
    ...(storedWidth !== null ? { "--fa-sidebar-width": `${storedWidth}rem` } : {}),
  } as CSSProperties

  const config: SidebarConfigValue = { side, collapsible, resizable, min, max, rootRef, paneRef, label }
  const landmark = (placement: "pane" | "sheet") => (
    <SidebarPlacement.Provider value={placement}>
      <SidebarIconMode.Provider value={placement === "pane" && iconMode}>
        <SidebarConfig.Provider value={config}>
          <Landmark aria-label={label} className="fa-sidebar-nav" data-placement={placement} data-sidebar-surface="">
            <div className="fa-sidebar-inner">{parts}</div>
          </Landmark>
        </SidebarConfig.Provider>
      </SidebarIconMode.Provider>
    </SidebarPlacement.Provider>
  )

  const material = variant === "floating" ? "glass-panel" : variant === "sidebar" ? "glass-chrome" : undefined
  return (
    <>
      <div
        {...rest}
        ref={rootRef}
        className={cx("fa-sidebar", className)}
        style={rootStyle}
        data-side={side}
        data-variant={variant}
        data-collapsible={collapsible}
        data-state={state}
        data-mobile={mobile ? "" : undefined}
        data-resizable={resizable ? "" : undefined}
        data-ready={ready ? "" : undefined}
        suppressHydrationWarning
      >
        {hydrated ? null : (
          <script
            nonce={ctx.nonce}
            suppressHydrationWarning
            dangerouslySetInnerHTML={{
              __html: sidebarBootScript(ctx.storageKey, { mobileQuery: collapsible === "none" ? undefined : ctx.mobileQuery, applyOpen: !ctx.controlled }),
            }}
          />
        )}
        {mobile ? null : (
          <>
            <div
              ref={paneRef}
              id={ctx.paneId}
              className={cx("fa-sidebar-pane", material)}
              inert={collapsible === "offcanvas" && state === "collapsed"}
              onFocus={(event) => {
                lastFocus.current = event.target as HTMLElement
              }}
              onBlur={(event) => {
                const next = event.relatedTarget as Node | null
                if (next && !paneRef.current?.contains(next)) lastFocus.current = null
              }}
            >
              {landmark("pane")}
            </div>
            <SidebarConfig.Provider value={config}>{rail}</SidebarConfig.Provider>
          </>
        )}
      </div>
      {mobile ? (
        <Suspense fallback={null}>
          <SidebarSheet side={side} open={ctx.openMobile} onOpenChange={(next, event) => ctx.changeMobile(next, "dismiss", event)} label={label} className="fa-sidebar-sheet">
            {landmark("sheet")}
          </SidebarSheet>
        </Suspense>
      ) : null}
    </>
  )
}

/** The enclosing Sidebar's configuration. */
function useSidebarConfig() {
  const config = useContext(SidebarConfig)
  if (!config) throw new Error("Sidebar parts must be inside a Sidebar")
  return config
}

/* ── Header ──────────────────────────────────────────────────────────────── */

export interface SidebarHeaderProps extends Omit<ComponentProps<"div">, "title"> {
  /** The product or section mark. It stays in icon mode, where the expand button appears over it on hover and focus. */
  icon?: ReactNode
  /** The product, workspace or section name. */
  title?: ReactNode
  /** Data only, on a second line under the title: a plan, a workspace identifier (R2.2). */
  subtitle?: ReactNode
  /** Supporting buttons before the collapse button. Hidden in icon mode. */
  actions?: ReactNode
  /**
   * Show the collapse button (expand in icon mode, close in the phone sheet). Default true
   * unless the sidebar is `collapsible="none"`.
   */
  toggle?: boolean
}

/** The top of the sidebar: a mark, title and subtitle, actions and the collapse button. Free-form children follow the title. */
function SidebarHeader({ icon, title, subtitle, actions, toggle = true, className, children, ...rest }: SidebarHeaderProps) {
  const messages = useMessages(sidebarMessages)
  const ctx = useSidebarInternal()
  const { collapsible } = useSidebarConfig()
  const placement = useContext(SidebarPlacement)
  const iconMode = useContext(SidebarIconMode)
  const classes = useContext(SidebarPartClasses)
  const keys = useAriaShortcut(ctx.shortcut ?? undefined)
  const sheet = placement === "sheet"
  const showToggle = toggle && collapsible !== "none"
  const toggleLabel = sheet ? messages.closeSidebar : iconMode ? messages.expandSidebar : messages.collapseSidebar
  return (
    <div {...rest} className={cx("fa-sidebar-header", className)} data-has-mark={icon ? "" : undefined}>
      {icon ? (
        <span className={cx("fa-sidebar-mark", classes.mark)} aria-hidden={iconMode && showToggle ? true : undefined}>
          {icon}
        </span>
      ) : null}
      {title || subtitle || children ? (
        <div className={cx("fa-sidebar-title-block", classes.titleBlock)}>
          {title ? <div className="fa-sidebar-title">{title}</div> : null}
          {subtitle ? <div className={cx("fa-sidebar-subtitle", classes.subtitle)}>{subtitle}</div> : null}
          {children}
        </div>
      ) : null}
      {actions ? <div className="fa-sidebar-header-actions">{actions}</div> : null}
      {showToggle ? (
        <Button
          variant="ghost"
          size="sm"
          className="fa-sidebar-header-toggle"
          icon={<IconSidebar />}
          aria-label={toggleLabel}
          aria-controls={sheet ? undefined : ctx.paneId}
          shortcut={ctx.shortcut ?? undefined}
          aria-keyshortcuts={keys}
          data-side={ctx.side}
          onClick={(event) => (sheet ? ctx.changeMobile(false, "trigger", event.nativeEvent) : ctx.change(!ctx.open, "trigger", event.nativeEvent))}
        />
      ) : null}
    </div>
  )
}

/* ── Search ──────────────────────────────────────────────────────────────── */

export interface SidebarSearchProps {
  /** The query (controlled). The application filters its own items and passes the result. */
  value: string
  /** Called with the new query as the person types, and with "" when Esc clears the field. */
  onValueChange: (value: string) => void
  /** The field's accessible name, and the icon-mode button's tooltip. @defaultValue "Filter navigation" */
  "aria-label"?: string
  /** The prompt shown while the field is empty. @defaultValue "Filter" */
  placeholder?: string
  className?: string
}

/** The element whose keys the filter handles: the sidebar's landmark, or the dialog a host renders the parts in. */
const SURFACE = "[data-sidebar-surface], .fa-dialog"
/** Rows the arrow keys walk from the filter field: menu and sub-menu buttons, then a Tree's rows. */
const ROWS = "[data-sidebar-content] :is(.fa-sidebar-menu-button, .fa-sidebar-menu-sub-button, [role='treeitem']):not([aria-disabled='true'])"
const SEARCH_SHORTCUTS = ["/", "mod+f"]
/** A Tree's first row (level 1, first in its set): ↑ from it leaves the tree. */
const firstTreeRow = (element: Element) => element.getAttribute("aria-level") === "1" && element.getAttribute("aria-posinset") === "1"

/**
 * A filter field between the header and the content; it stays put while the content scrolls.
 * While focus is in the sidebar, / or ⌘F / Ctrl F focuses it; ↓ moves into the items, ↑ and ↓
 * walk them (and on into a Tree in the content, whose own keys then apply) and ↑ from the
 * first returns. Esc clears the field, and Esc again returns focus to where it was. In icon
 * mode it becomes a button that expands the sidebar and focuses the field.
 */
function SidebarSearch({ value, onValueChange, "aria-label": ariaLabel, placeholder, className }: SidebarSearchProps) {
  const messages = useMessages(sidebarMessages)
  const ctx = useSidebarInternal()
  const { side, collapsible } = useSidebarConfig()
  const placement = useContext(SidebarPlacement)
  const iconMode = useContext(SidebarIconMode)
  const platform = usePlatform()
  const slash = useAriaShortcut(shortcutAllowed("/") ? "/" : undefined)
  const find = useAriaShortcut("mod+f")
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const returnTo = useRef<HTMLElement | null>(null)
  const focusPending = useRef(false)
  const label = ariaLabel ?? messages.filterNavigation

  const surface = () => wrapRef.current?.closest<HTMLElement>(SURFACE) ?? null
  const visible = (row: HTMLElement) => row.offsetParent !== null || row.getClientRects().length > 0
  const rows = () => [...(surface()?.querySelectorAll<HTMLElement>(ROWS) ?? [])].filter(visible)
  const focusField = () => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }

  // The expanded field takes focus once the icon-mode button has expanded the sidebar.
  useEffect(() => {
    if (iconMode || !focusPending.current) return
    focusPending.current = false
    focusField()
  }, [iconMode])

  useEffect(() => {
    const root = surface()
    if (!root) return
    // Capture, so it runs before a Tree's own keys (its typeahead would take "/").
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      const target = event.target
      if (!(target instanceof HTMLElement) || target === inputRef.current || event.defaultPrevented) return
      const shortcut = SEARCH_SHORTCUTS.find((keys) => matchesShortcut(event, keys, platform))
      const editable = Boolean(target.closest("input, textarea, select, [contenteditable]:not([contenteditable='false'])"))
      if (shortcut && !(shortcut === "/" && (editable || !shortcutAllowed("/")))) {
        event.preventDefault()
        event.stopPropagation()
        if (wrapRef.current?.closest(".fa-sidebar[data-state='collapsed']")) {
          focusPending.current = true
          ctx.change(true, "search", event)
        } else focusField()
        return
      }
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
      const tree = target.getAttribute("role") === "treeitem"
      // Inside a Tree only ↑ from its first row is ours; the Tree moves on its own.
      if (tree && !(event.key === "ArrowUp" && firstTreeRow(target))) return
      if (!tree && (!target.matches(".fa-sidebar-menu-button, .fa-sidebar-menu-sub-button") || target.getAttribute("aria-haspopup") === "menu")) return
      // A Tree is one stop: its first row stands for it.
      const all = rows().filter((row) => row.getAttribute("role") !== "treeitem" || row === target || firstTreeRow(row))
      const index = all.indexOf(target)
      if (index < 0) return
      event.preventDefault()
      event.stopPropagation()
      if (event.key === "ArrowUp") (index === 0 ? inputRef.current : all[index - 1])?.focus()
      else all[index + 1]?.focus()
    }
    root.addEventListener("keydown", onKeyDown, true)
    return () => root.removeEventListener("keydown", onKeyDown, true)
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- the helpers read refs only
  }, [platform, ctx.change])

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" && !event.altKey) {
      const first = rows()[0]
      if (!first) return
      event.preventDefault()
      first.focus()
      return
    }
    // A filled field clears itself (SearchField); an empty one hands focus back.
    if (event.key !== "Escape" || event.currentTarget.value !== "") return
    const back = returnTo.current
    const root = surface()
    const target =
      back?.isConnected && root?.contains(back)
        ? back
        : (root?.querySelector<HTMLElement>(
            "[data-sidebar-content] :is([aria-current='page'], [aria-selected='true'], [role='treeitem'][tabindex='0'])"
          ) ?? rows()[0])
    if (!target) return
    event.preventDefault()
    event.stopPropagation()
    returnTo.current = null
    target.focus()
  }

  const change = (next: string) => {
    onValueChange(next)
    // A new query starts at the top of the list, wherever it scrolls (the content, or a sheet's body).
    const content = surface()?.querySelector<HTMLElement>("[data-sidebar-content]")
    if (content?.hasAttribute("data-scroll-container")) content.scrollTo({ top: 0 })
    content?.closest<HTMLElement>(".fa-dialog-body")?.scrollTo({ top: 0 })
  }

  return (
    <div ref={wrapRef} className={cx("fa-sidebar-search", className)} data-placement={placement}>
      <div className="fa-sidebar-search-field">
        <SearchField
          ref={inputRef}
          size="sm"
          value={value}
          onValueChange={change}
          placeholder={placeholder ?? messages.filterPlaceholder}
          aria-label={label}
          shortcut={shortcutAllowed("/") ? "/" : undefined}
          aria-keyshortcuts={[slash, find].filter(Boolean).join(" ") || undefined}
          onKeyDown={onKeyDown}
          onFocus={(event) => {
            const from = event.relatedTarget
            returnTo.current = from instanceof HTMLElement && surface()?.contains(from) && !wrapRef.current?.contains(from) ? from : null
          }}
        />
      </div>
      {collapsible === "icon" && placement === "pane" ? (
        <Tooltip content={label} side={side === "start" ? "inline-end" : "inline-start"} enabled={iconMode} describe={false}>
          <button
            type="button"
            className="fa-item fa-sidebar-search-button"
            aria-label={label}
            tabIndex={iconMode ? undefined : -1}
            data-sidebar-key="search"
            onClick={(event) => {
              focusPending.current = true
              ctx.change(true, "search", event.nativeEvent)
            }}
          >
            <IconSearch />
          </button>
        </Tooltip>
      ) : null}
    </div>
  )
}

/* ── Content, footer, separator ──────────────────────────────────────────── */

export interface SidebarContentProps extends ComponentProps<"div"> {
  /**
   * The content does not scroll; its last child fills the remaining height and scrolls itself
   * (a virtualised Tree or list), so the sidebar never shows two scrollbars.
   */
  fill?: boolean
}

/**
 * The scrolling middle of the sidebar: Groups, Menus and Separators. The header and footer show
 * an edge while content passes beneath them; the content marks its own edges too
 * (`data-scrolled-top`, `data-scrolled-bottom`).
 */
function SidebarContent({ fill = false, className, children, ...rest }: SidebarContentProps) {
  const ref = useRef<HTMLDivElement>(null)
  // The landmark mirrors the edges, so the header, search and footer select on it (R5.8).
  const edges = useScrollEdges(ref, { root: "[data-sidebar-surface]" })
  return (
    <div
      ref={ref}
      {...rest}
      className={cx("fa-sidebar-content", className)}
      data-sidebar-content=""
      data-fill={fill ? "" : undefined}
      data-scroll-container={fill ? undefined : ""}
      data-scrolled-top={edges.top ? "" : undefined}
      data-scrolled-bottom={edges.bottom ? "" : undefined}
    >
      {children}
    </div>
  )
}

/** The bottom of the sidebar: pinned items such as settings or the account menu. */
function SidebarFooter({ className, ...rest }: ComponentProps<"div">) {
  return <div {...rest} className={cx("fa-sidebar-footer", className)} />
}

/** A hairline between parts. Prefer space and group labels (R5.8); use it to set off a different kind of content. */
function SidebarSeparator({ className, ...rest }: ComponentProps<"hr">) {
  return <hr {...rest} className={cx("fa-sidebar-separator", className)} />
}

/* ── Rail ────────────────────────────────────────────────────────────────── */

export interface SidebarRailProps extends Omit<ComponentProps<"div">, "children"> {
  /** The resize handle's accessible name. @defaultValue "Resize sidebar" */
  "aria-label"?: string
}

/**
 * The sidebar's inner edge. A press toggles the sidebar. On a resizable sidebar it is also a
 * focusable separator: drag it (or use ← →, Shift for bigger steps, Home and End) to resize,
 * and Enter or Space toggles; dragging below the minimum collapses the sidebar, and dragging
 * out from a collapsed one expands it. Place it as a direct child of Sidebar.
 */
function SidebarRail({ className, "aria-label": ariaLabel, onKeyDown, ...rest }: SidebarRailProps) {
  const messages = useMessages(sidebarMessages)
  const ctx = useSidebarInternal()
  const config = useContext(SidebarConfig)
  const [dragging, setDragging] = useState(false)
  if (!config || config.collapsible === "none") return null
  const { side, resizable, min, max, rootRef, paneRef, collapsible } = config

  const currentRem = () => {
    const pane = paneRef.current
    const stored = ctx.width
    if (stored !== null) return Math.min(max, Math.max(min, stored))
    return pane ? pane.getBoundingClientRect().width / remPx() : min
  }

  const sign = (element: Element): 1 | -1 => ((side === "start") !== isRtl(element) ? 1 : -1)

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const root = rootRef.current
    if (event.button !== 0 || !root) return
    event.preventDefault()
    if (!resizable) {
      ctx.toggleWith("rail", event.nativeEvent)
      return
    }
    const open = ctx.open
    const pane = paneRef.current
    const startWidth = open && pane ? pane.getBoundingClientRect().width : collapsible === "icon" && pane ? pane.getBoundingClientRect().width : 0
    setDragging(true)
    startPaneDrag({
      element: root,
      handle: event.currentTarget,
      event: event.nativeEvent,
      sign: sign(event.currentTarget),
      open,
      startWidth,
      min,
      max,
      onPress: () => {
        setDragging(false)
        ctx.toggleWith("rail", event.nativeEvent)
      },
      onCommit: (width, nextOpen) => {
        setDragging(false)
        ctx.commitWidth(width, nextOpen)
      },
    })
  }

  const onKey = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event)
    if (event.defaultPrevented || !resizable) return
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      ctx.change(!ctx.open, "rail", event.nativeEvent)
      return
    }
    const next = resizeKeyWidth(event, { current: currentRem(), min, max, side })
    if (next === null) return
    event.preventDefault()
    if (!ctx.open) ctx.commitWidth(undefined, true)
    else ctx.commitWidth(Math.min(max, Math.max(min, Math.round(next * 100) / 100)))
  }

  const open = ctx.open
  const now = open ? Math.round(currentRemSafe(ctx.width, min, max)) : 0
  if (!resizable)
    return <div {...rest} aria-hidden className={cx("fa-sidebar-rail", className)} data-side={side} onPointerDown={onPointerDown} />
  return (
    <div
      {...rest}
      role="separator"
      tabIndex={0}
      aria-orientation="vertical"
      aria-label={ariaLabel ?? messages.resizeSidebar}
      aria-controls={ctx.paneId}
      aria-valuemin={open ? min : 0}
      aria-valuemax={max}
      aria-valuenow={now}
      className={cx("fa-sidebar-rail", className)}
      data-side={side}
      data-resizable=""
      data-active={dragging ? "" : undefined}
      onPointerDown={onPointerDown}
      onKeyDown={onKey}
    >
      <span className="fa-sidebar-rail-grip" aria-hidden />
    </div>
  )
}

/** The width to announce: the remembered width, or the theme's default clamped to the limits. */
function currentRemSafe(width: number | null, min: number, max: number) {
  return Math.min(max, Math.max(min, width ?? themeSidebarRem()))
}

/* ── Groups ──────────────────────────────────────────────────────────────── */

interface GroupValue {
  collapsible: boolean
  open: boolean
  labelId: string
  contentId: string
  setHasLabel: (has: boolean) => void
}
const GroupContext = /* @__PURE__ */ createContext<GroupValue | null>(null)

export interface SidebarGroupProps extends Omit<ComponentProps<"div">, "id"> {
  /**
   * Remembers whether the group is open under this key (with the provider's storageKey).
   * Unique within the sidebar: "projects", "favourites".
   */
  id?: string
  /** The label is a disclosure button that shows and hides the group's content. */
  collapsible?: boolean
  /** Whether a collapsible group starts open when nothing is remembered. @defaultValue true */
  defaultOpen?: boolean
  /** Whether a collapsible group is open (controlled). Pair with `onOpenChange`. */
  open?: boolean
  /** Called with the next open state when the person toggles a collapsible group. */
  onOpenChange?: (open: boolean) => void
}

/** A labelled group of items. Collapsible groups remember their state; in icon mode every group shows its items. */
function SidebarGroup({ id, collapsible = false, defaultOpen = true, open: openProp, onOpenChange, className, children, ...rest }: SidebarGroupProps) {
  const ctx = useSidebarInternal()
  const iconMode = useContext(SidebarIconMode)
  const baseId = useId()
  const [hasLabel, setHasLabel] = useState(false)
  const [localOpen, setLocalOpen] = useState(() => ctx.groupOpen(id, defaultOpen))
  const remembered = id !== undefined && ctx.storageKey !== null
  const open = openProp ?? (remembered ? ctx.groupOpen(id, defaultOpen) : localOpen)
  const shown = !collapsible || iconMode || open
  const setOpen = (next: boolean) => {
    if (iconMode) return
    if (openProp === undefined) {
      if (remembered) ctx.setGroupOpen(id, next)
      else setLocalOpen(next)
    }
    onOpenChange?.(next)
  }
  const value: GroupValue = { collapsible, open: shown, labelId: `${baseId}label`, contentId: `${baseId}content`, setHasLabel }
  const group = (
    <div
      {...rest}
      role="group"
      aria-labelledby={hasLabel ? value.labelId : undefined}
      className={cx("fa-sidebar-group", className)}
      data-collapsible={collapsible ? "" : undefined}
      data-open={shown ? "" : undefined}
    >
      {children}
    </div>
  )
  return (
    <GroupContext.Provider value={value}>
      {collapsible ? (
        <Collapsible.Root open={shown} onOpenChange={setOpen} render={group} />
      ) : (
        group
      )}
    </GroupContext.Provider>
  )
}

export interface SidebarGroupLabelProps extends ComponentProps<"div"> {
  /** How many items the group holds, after the label (locale digits, tabular figures): "Projects 12". */
  count?: number
}

/** The group's overline label; in a collapsible group, the disclosure button. Hidden in icon mode (its space stays, so items never move). */
function SidebarGroupLabel({ count, className, children, ...rest }: SidebarGroupLabelProps) {
  const group = useContext(GroupContext)
  const classes = useContext(SidebarPartClasses)
  const { setHasLabel } = group ?? {}
  useIsoLayoutEffect(() => {
    setHasLabel?.(true)
    return () => setHasLabel?.(false)
  }, [setHasLabel])
  if (group?.collapsible) {
    return (
      <div {...rest} className={cx("fa-sidebar-group-label", className)} data-collapsible="">
        <Collapsible.Trigger
          id={group.labelId}
          className={cx("fa-sidebar-group-trigger fa-pressable", classes.groupTrigger)}
          aria-controls={group.contentId}
        >
          <span className="fa-overline fa-sidebar-group-text">{children}</span>
          {count !== undefined ? <CountBadge value={count} className={cx("fa-sidebar-group-count", classes.groupCount)} /> : null}
          <IconChevronDown className={cx("fa-sidebar-chevron", classes.chevron)} />
        </Collapsible.Trigger>
      </div>
    )
  }
  return (
    <div {...rest} id={group?.labelId} className={cx("fa-sidebar-group-label", className)}>
      <span className="fa-overline fa-sidebar-group-text">{children}</span>
      {count !== undefined ? <CountBadge value={count} className={cx("fa-sidebar-group-count", classes.groupCount)} /> : null}
    </div>
  )
}

export interface SidebarGroupActionProps extends Omit<ButtonProps, "variant" | "size" | "children"> {
  /** The action's name, shown as its tooltip: "Add project". */
  "aria-label": string
}

/** A small icon button at the end of the group label: add to the group, or open its menu. Hidden in icon mode. */
function SidebarGroupAction({ className, icon, ...rest }: SidebarGroupActionProps) {
  return <Button variant="ghost" size="xs" {...rest} icon={icon} className={cx("fa-sidebar-group-action", className)} />
}

/** The group's items; the panel that opens and closes in a collapsible group. */
function SidebarGroupContent({ className, children, ...rest }: ComponentProps<"div">) {
  const group = useContext(GroupContext)
  if (group?.collapsible) {
    return (
      <Collapsible.Panel {...rest} id={group.contentId} keepMounted className={cx("fa-collapse fa-sidebar-group-content", className)}>
        {children}
      </Collapsible.Panel>
    )
  }
  return (
    <div {...rest} className={cx("fa-sidebar-group-content", className)}>
      {children}
    </div>
  )
}

/**
 * A docked pane of navigation or details, built from parts. Put it in a SidebarProvider beside
 * a SidebarInset:
 *
 * ```tsx
 * <SidebarProvider storageKey="app.sidebar">
 *   <Sidebar collapsible="icon" aria-label="Workspace">
 *     <Sidebar.Header icon={<Mark />} title="Northwind" />
 *     <Sidebar.Content>
 *       <Sidebar.Group>
 *         <Sidebar.GroupLabel>Workspace</Sidebar.GroupLabel>
 *         <Sidebar.Menu>
 *           <Sidebar.MenuItem>
 *             <Sidebar.MenuButton icon={<IconHome />} href="/" active>Home</Sidebar.MenuButton>
 *           </Sidebar.MenuItem>
 *         </Sidebar.Menu>
 *       </Sidebar.Group>
 *     </Sidebar.Content>
 *     <Sidebar.Rail />
 *   </Sidebar>
 *   <SidebarInset>…</SidebarInset>
 * </SidebarProvider>
 * ```
 *
 * Parts: `Header`, `Search`, `Content`, `Match`, `Group`, `GroupLabel`, `GroupAction`, `GroupContent`,
 * `Menu`, `MenuItem`, `MenuButton`, `MenuAction`, `MenuBadge`, `MenuSub`, `MenuSubItem`,
 * `MenuSubButton`, `MenuSkeleton`, `Separator`, `Footer` and `Rail`.
 */
export const Sidebar = /* @__PURE__ */ Object.assign(SidebarRoot, {
  Header: SidebarHeader,
  Search: SidebarSearch,
  Content: SidebarContent,
  Match: SidebarMatch,
  Group: SidebarGroup,
  GroupLabel: SidebarGroupLabel,
  GroupAction: SidebarGroupAction,
  GroupContent: SidebarGroupContent,
  Menu: SidebarMenu,
  MenuItem: SidebarMenuItem,
  MenuButton: SidebarMenuButton,
  MenuAction: SidebarMenuAction,
  MenuBadge: SidebarMenuBadge,
  MenuSub: SidebarMenuSub,
  MenuSubItem: SidebarMenuSubItem,
  MenuSubButton: SidebarMenuSubButton,
  MenuSkeleton: SidebarMenuSkeleton,
  Separator: SidebarSeparator,
  Footer: SidebarFooter,
  Rail: SidebarRail,
})
