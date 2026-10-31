import { isRtl } from "../lib/direction.js"
import { useMessages } from "../lib/i18n/index.js"
import { shellMessages } from "./messages.js"
/**
 * AppShell — the application frame (R5). It owns the viewport: the document never
 * scrolls; every pane scrolls inside itself.
 *
 *   brand │ TopBar (on the canvas): breadcrumb · search · actions · account
 *   ──────┼──────────────┬──────────────────────────────────┬────────────
 *   Rail  │ SectionDrawer│ Workspace (windows) + Dock       │ Inspector
 *   (on   │ (glass,      │ primary window on the canvas,    │ (glass)
 *   canvas)│ resizable)  │ secondary windows in glass       │
 *
 *   tablet  rail on the canvas; the drawer is a Sheet from the left
 *   phone   TopBar / Workspace; the rail becomes a floating tab bar; the drawer is a left
 *           Sheet and "More" a bottom Sheet
 *
 * Only real content sits in glass: the drawer, the inspector and secondary windows.
 * Chrome (brand, rail, top bar) and the page header sit directly on the ambient canvas.
 * Layout is CSS from viewport queries and <html> preference attributes (shell-state.ts),
 * so the first paint is right; React only drives behaviour. The section drawer's state
 * (docked open or collapsed, the slide-over sheet, the shortcut and focus return) is
 * Sidebar's (useSidebarState), kept in the shell preferences; its handle drags with
 * Sidebar's pane drag; its sheet is Sidebar's.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react"
import { cx } from "../lib/cx.js"
import { focusFirst } from "../lib/focus.js"
import type { SidebarInternal } from "../ui/sidebar/context.js"
import { resizeKeyWidth, startPaneDrag, themeSidebarRem } from "../ui/sidebar/resize.js"
import { useSidebarState } from "../ui/sidebar/sidebar-provider.js"
import { SidebarSheet } from "../ui/sidebar/sidebar-sheet.js"
import { TooltipProvider } from "../ui/tooltip/index.js"
import {
  DRAWER_MAX_REM,
  DRAWER_MIN_REM,
  applyShellAttributes,
  readShellPrefs,
  shellBootScript,
  updateShellPrefs,
  useShellPrefs,
} from "./shell-state.js"
import { useMediaQuery } from "../lib/use-media-query.js"
import { SHELL_QUERIES } from "./queries.js"

export interface ShellContextValue {
  phone: boolean
  /** Rail and drawer are docked (≥ 64rem); below that the drawer is a sheet. */
  desktop: boolean
  hasDrawer: boolean
  /** Desktop: the drawer is docked open. Tablet/phone: the drawer sheet is open. */
  drawerOpen: boolean
  setDrawerOpen: (open: boolean) => void
  toggleDrawer: () => void
  /** The keys that toggle the drawer ("mod+b"), for its buttons' tooltips and aria-keyshortcuts. */
  drawerShortcut: string
  inspectorAvailable: boolean
  /** Docked beside the workspace (≥ 80rem) or an overlay sheet (narrower). */
  inspectorDocked: boolean
  inspectorOpen: boolean
  setInspectorOpen: (open: boolean) => void
}

const ShellContext = /* @__PURE__ */ createContext<ShellContextValue | null>(null)

/** Returns the enclosing `AppShell`'s layout state: breakpoints, drawer and inspector state with their setters. Throws when used outside `AppShell`. */
export function useShell(): ShellContextValue {
  const context = useContext(ShellContext)
  if (!context) throw new Error("useShell must be used inside AppShell")
  return context
}

/** Like `useShell`, but returns `null` instead of throwing when there is no enclosing `AppShell`. */
export function useOptionalShell() {
  return useContext(ShellContext)
}

/**
 * Internal: the controls that reopen a docked pane. Hiding a pane makes its slot inert, so
 * when focus is inside it the shell first moves focus to the control that brings it back
 * (the inspector toggle; the current rail item or the drawer handle) instead of the body.
 */
export interface ShellFocusTargets {
  /** Registers the control that reopens the inspector; returns its unregistration. */
  registerInspectorReturn: (element: HTMLElement) => () => void
  /** Registers the control that reopens the section drawer; returns its unregistration. */
  registerDrawerReturn: (element: HTMLElement) => () => void
}

export const ShellFocusContext = /* @__PURE__ */ createContext<ShellFocusTargets | null>(null)

/** Where a SectionDrawer renders: docked in the shell, or in the slide-over sheet. */
export const DrawerPlacement = /* @__PURE__ */ createContext<"pane" | "sheet">("pane")

/** Internal: the section drawer's Sidebar state, which SectionDrawer's parts (Sidebar's) read. */
export const ShellSidebarContext = /* @__PURE__ */ createContext<SidebarInternal | null>(null)

/** The drawer docks at desktop width; below it, it is Sidebar's sheet. */
const DRAWER_SHEET_QUERY = "(width < 64rem)"

export interface AppShellProps {
  /** Top-left corner, above the rail: the product mark (ShellBrand). */
  brand: ReactNode
  /** L1 navigation (Rail). */
  rail: ReactNode
  /** The current section's navigation (SectionDrawer). Optional per section. */
  drawer?: ReactNode
  /** The top bar (TopBar). */
  topBar: ReactNode
  /** The workspace: normally <Workspace primary={<Outlet />} />. */
  children: ReactNode
  /** Workspace element. Use div when embedding a shell inside an existing main landmark. @defaultValue "main" */
  contentAs?: "main" | "div"
  /** Context pane (Inspector), docked beside the workspace on wide screens. */
  inspector?: ReactNode
  /** Phone navigation (TabBar). */
  tabBar?: ReactNode
  /** Toggle the drawer from the keyboard. Default mod+b. */
  drawerShortcut?: string
  className?: string
}

/** Shells mounted in this document (the gallery can show several). */
let mountedShells = 0

function markShellMounted(root: HTMLElement) {
  mountedShells += 1
  root.dataset.shell = ""
  return () => {
    mountedShells -= 1
    if (mountedShells === 0) delete root.dataset.shell
  }
}

/** Compose application navigation, a top bar and a workspace, with optional section drawer, inspector and phone navigation. */
export function AppShell({
  brand,
  rail,
  drawer,
  topBar,
  children,
  contentAs: Content = "main",
  inspector,
  tabBar,
  drawerShortcut = "mod+b",
  className,
}: AppShellProps) {
  const prefs = useShellPrefs()
  const phone = useMediaQuery(SHELL_QUERIES.phone)
  const docked = useMediaQuery(SHELL_QUERIES.dockedInspector, true)
  const wide = useMediaQuery(SHELL_QUERIES.wide, true)
  const hasDrawer = Boolean(drawer)
  // The drawer's state: docked open or collapsed (the shell preference), the sheet below
  // desktop width, and the one keyboard shortcut.
  const sidebar = useSidebarState({
    open: prefs.drawer === "open",
    onOpenChange: (open) => updateShellPrefs({ drawer: open ? "open" : "closed" }),
    shortcut: hasDrawer ? drawerShortcut : false,
    mobileQuery: DRAWER_SHEET_QUERY,
  })
  const desktop = !sidebar.isMobile
  const [overlayInspector, setOverlayInspector] = useState(false)
  const shellRef = useRef<HTMLDivElement>(null)
  const drawerSlotRef = useRef<HTMLDivElement>(null)
  const inspectorSlotRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLElement>(null)
  const handleRef = useRef<HTMLDivElement>(null)
  const inspectorReturn = useRef<HTMLElement | null>(null)
  const { registerReturn: registerDrawerReturn, returns: drawerReturns, beforeCollapse } = sidebar
  const focusTargets = useMemo<ShellFocusTargets>(
    () => ({
      registerInspectorReturn: (element: HTMLElement) => {
        inspectorReturn.current = element
        return () => {
          if (inspectorReturn.current === element) inspectorReturn.current = null
        }
      },
      registerDrawerReturn,
    }),
    [registerDrawerReturn]
  )
  /**
   * Before a docked slot turns inert, move focus out of it to the control that reopens it,
   * or to the workspace, so keyboard and screen-reader users are not dropped on the body.
   */
  const returnFocusFrom = useCallback((slot: HTMLElement | null, ...targets: (HTMLElement | null)[]) => {
    const active = typeof document === "undefined" ? null : document.activeElement
    if (!slot || !active || !slot.contains(active)) return
    focusFirst(targets, contentRef.current)
  }, [])

  // Mirror stored preferences onto <html> (the boot script did this before first paint;
  // this keeps it in step with other tabs).
  useEffect(() => applyShellAttributes(document.documentElement, prefs), [prefs])
  // <html data-shell> while a shell is mounted: the root opts out of view transitions (R6.3).
  // An attribute, not :root:has(.fa-shell), which Chromium re-checks on every DOM insertion.
  useEffect(() => markShellMounted(document.documentElement), [])

  // Collapsing the docked drawer first moves focus out of it: to the control that reopens it
  // (the current rail item, most recent first), the handle, or the workspace. The sheet
  // closes back to the dialog's own return target. (Leaving the tablet width closes the
  // sheet: Sidebar's state does that.)
  useEffect(() => {
    beforeCollapse.current = () =>
      returnFocusFrom(drawerSlotRef.current, ...[...drawerReturns].reverse(), handleRef.current)
    return () => {
      beforeCollapse.current = null
    }
  }, [beforeCollapse, drawerReturns, returnFocusFrom])

  const drawerOpen = desktop ? prefs.drawer === "open" : sidebar.openMobile
  const { change, changeMobile, toggleWith } = sidebar
  const setDrawerOpen = useCallback(
    (open: boolean) => (desktop ? change(open, "api") : changeMobile(open, "api")),
    [desktop, change, changeMobile]
  )
  const toggleDrawer = useCallback(() => toggleWith("api"), [toggleWith])

  const inspectorAvailable = Boolean(inspector)
  const inspectorOpen = docked ? (prefs.inspector === null ? wide : prefs.inspector === "open") : overlayInspector
  const setInspectorOpen = useCallback(
    (open: boolean) => {
      if (docked) {
        if (!open) returnFocusFrom(inspectorSlotRef.current, inspectorReturn.current)
        updateShellPrefs({ inspector: open ? "open" : "closed" })
      } else setOverlayInspector(open)
    },
    [docked, returnFocusFrom]
  )

  const value = useMemo<ShellContextValue>(
    () => ({
      phone,
      desktop,
      hasDrawer,
      drawerOpen,
      setDrawerOpen,
      toggleDrawer,
      drawerShortcut,
      inspectorAvailable,
      inspectorDocked: docked,
      inspectorOpen,
      setInspectorOpen,
    }),
    [phone, desktop, hasDrawer, drawerOpen, setDrawerOpen, toggleDrawer, drawerShortcut, inspectorAvailable, docked, inspectorOpen, setInspectorOpen]
  )

  return (
    <ShellContext.Provider value={value}>
      <ShellSidebarContext.Provider value={sidebar}>
      <ShellFocusContext.Provider value={focusTargets}>
      <TooltipProvider>
        <div
          ref={shellRef}
          className={cx("fa-shell", className)}
          data-has-drawer={hasDrawer ? "" : undefined}
          data-has-inspector={inspectorAvailable ? "" : undefined}
          data-has-tabbar={tabBar ? "" : undefined}
        >
          <script dangerouslySetInnerHTML={{ __html: shellBootScript() }} />
          <div className="fa-shell-slot-brand">{brand}</div>
          <div className="fa-shell-slot-top">{topBar}</div>
          <div className="fa-shell-slot-rail">{rail}</div>
          {hasDrawer && desktop ? (
            <>
              <div ref={drawerSlotRef} className="fa-shell-slot-drawer" inert={!drawerOpen}>
                <DrawerPlacement.Provider value="pane">{drawer}</DrawerPlacement.Provider>
              </div>
              <DrawerHandle ref={handleRef} shellRef={shellRef} open={drawerOpen} onToggle={toggleDrawer} />
            </>
          ) : null}
          <Content ref={contentRef as RefObject<HTMLElement & HTMLDivElement>} className="fa-shell-slot-work">{children}</Content>
          {inspector ? (
            <div ref={inspectorSlotRef} className="fa-shell-slot-inspector" inert={docked && !inspectorOpen}>
              {inspector}
            </div>
          ) : null}
          {tabBar ? <div className="fa-shell-slot-tabbar">{tabBar}</div> : null}
        </div>
        {hasDrawer ? (
          <SidebarSheet side="start" open={sidebar.openMobile && !desktop} onOpenChange={(open, event) => changeMobile(open, "dismiss", event)}>
            <DrawerPlacement.Provider value="sheet">{drawer}</DrawerPlacement.Provider>
          </SidebarSheet>
        ) : null}
      </TooltipProvider>
      </ShellFocusContext.Provider>
      </ShellSidebarContext.Provider>
    </ShellContext.Provider>
  )
}

/**
 * The drawer's inner edge. Drag to resize (14–28rem); drag below the minimum and it snaps
 * closed; drag out from the rail to open. Double-click or Enter toggles; arrow keys resize
 * (Shift for bigger steps, Home and End to the limits), as Sidebar's Rail does.
 * While dragging only a custom property on the shell changes, so nothing re-renders.
 */
function DrawerHandle({
  ref,
  shellRef,
  open,
  onToggle,
}: {
  ref?: RefObject<HTMLDivElement | null>
  shellRef: RefObject<HTMLDivElement | null>
  open: boolean
  /** Called when the person double-clicks the handle or presses Enter or Space on it, to open or close the drawer. Dragging writes the drawer preference directly instead. */
  onToggle: () => void
}) {
  const messages = useMessages(shellMessages)

  const [dragging, setDragging] = useState(false)
  const prefs = useShellPrefs()

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const shell = shellRef.current
    if (event.button !== 0 || !shell) return
    event.preventDefault()
    const pane = shell.querySelector<HTMLElement>(".fa-shell-drawer")
    setDragging(true)
    // Sidebar's pane drag, on the shell: it writes --shell-drawer and data-resizing there, and
    // previews a collapse (or a drag out from the rail) with data-drawer-preview.
    startPaneDrag({
      element: shell,
      property: "--shell-drawer",
      preview: (collapsed) => {
        if (collapsed === null) delete shell.dataset.drawerPreview
        else shell.dataset.drawerPreview = collapsed ? "closed" : "open"
      },
      handle: event.currentTarget,
      event: event.nativeEvent,
      sign: isRtl(shell) ? -1 : 1,
      open,
      startWidth: open && pane ? pane.getBoundingClientRect().width : 0,
      min: DRAWER_MIN_REM,
      max: DRAWER_MAX_REM,
      onPress: () => setDragging(false),
      onCommit: (width, nextOpen) => {
        setDragging(false)
        updateShellPrefs(nextOpen ? { drawer: "open", drawerWidth: width ?? null } : { drawer: "closed" })
      },
    })
  }

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      onToggle()
      return
    }
    const current = readShellPrefs().drawerWidth ?? themeSidebarRem()
    const next = resizeKeyWidth(event, { current, min: DRAWER_MIN_REM, max: DRAWER_MAX_REM, side: "start" })
    if (next === null) return
    event.preventDefault()
    if (!open) updateShellPrefs({ drawer: "open" })
    else updateShellPrefs({ drawerWidth: next })
  }

  const widthRem = prefs.drawerWidth ?? themeSidebarRem()
  return (
    <div
      ref={ref}
      role="separator"
      tabIndex={0}
      aria-orientation="vertical"
      aria-label={messages.resizeSectionNavigation}
      aria-valuemin={open ? DRAWER_MIN_REM : 0}
      aria-valuemax={DRAWER_MAX_REM}
      aria-valuenow={open ? Math.round(widthRem) : 0}
      className="fa-shell-drawer-handle"
      data-active={dragging ? "" : undefined}
      onPointerDown={onPointerDown}
      onDoubleClick={onToggle}
      onKeyDown={onKeyDown}
    >
      <span className="fa-shell-drawer-grip" aria-hidden />
    </div>
  )
}

