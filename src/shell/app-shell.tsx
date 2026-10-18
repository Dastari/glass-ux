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
 * so the first paint is right; React only drives behaviour.
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
import { matchesShortcut, usePlatform } from "../ui/kbd/index.js"
import { Sheet } from "../ui/sheet/index.js"
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

const ShellContext = createContext<ShellContextValue | null>(null)

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

export const ShellFocusContext = createContext<ShellFocusTargets | null>(null)

/** Focuses the element if it can take focus (connected, not inert or hidden); reports success. */
const tryFocus = (element: HTMLElement | null | undefined) => {
  if (!element?.isConnected || element.closest("[inert], [hidden]")) return false
  element.focus()
  return document.activeElement === element
}

/** Where a SectionDrawer renders: docked in the shell, or in the slide-over sheet. */
export const DrawerPlacement = createContext<"pane" | "sheet">("pane")

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
  const desktop = useMediaQuery(SHELL_QUERIES.desktop, true)
  const docked = useMediaQuery(SHELL_QUERIES.dockedInspector, true)
  const wide = useMediaQuery(SHELL_QUERIES.wide, true)
  const platform = usePlatform()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [overlayInspector, setOverlayInspector] = useState(false)
  const shellRef = useRef<HTMLDivElement>(null)
  const drawerSlotRef = useRef<HTMLDivElement>(null)
  const inspectorSlotRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLElement>(null)
  const handleRef = useRef<HTMLDivElement>(null)
  const inspectorReturn = useRef<HTMLElement | null>(null)
  const drawerReturn = useRef<HTMLElement | null>(null)
  const focusTargets = useMemo<ShellFocusTargets>(() => {
    const register = (slot: { current: HTMLElement | null }) => (element: HTMLElement) => {
      slot.current = element
      return () => {
        if (slot.current === element) slot.current = null
      }
    }
    return { registerInspectorReturn: register(inspectorReturn), registerDrawerReturn: register(drawerReturn) }
  }, [])
  /**
   * Before a docked slot turns inert, move focus out of it to the control that reopens it,
   * or to the workspace, so keyboard and screen-reader users are not dropped on the body.
   */
  const returnFocusFrom = useCallback((slot: HTMLElement | null, ...targets: (HTMLElement | null)[]) => {
    const active = typeof document === "undefined" ? null : document.activeElement
    if (!slot || !active || !slot.contains(active)) return
    if (targets.some(tryFocus)) return
    const content = contentRef.current
    if (!content) return
    if (!content.hasAttribute("tabindex")) content.tabIndex = -1
    content.focus()
  }, [])

  // Mirror stored preferences onto <html> (the boot script did this before first paint;
  // this keeps it in step with other tabs).
  useEffect(() => applyShellAttributes(document.documentElement, prefs), [prefs])
  // <html data-shell> while a shell is mounted: the root opts out of view transitions (R6.3).
  // An attribute, not :root:has(.fa-shell), which Chromium re-checks on every DOM insertion.
  useEffect(() => markShellMounted(document.documentElement), [])
  // Reaching desktop width docks the drawer: the sheet closes (adjusting state during
  // render, as React recommends, rather than in an effect).
  const [wasDesktop, setWasDesktop] = useState(desktop)
  if (wasDesktop !== desktop) {
    setWasDesktop(desktop)
    if (desktop) setSheetOpen(false)
  }

  const hasDrawer = Boolean(drawer)
  const drawerOpen = desktop ? prefs.drawer === "open" : sheetOpen
  const returnFromDrawer = useCallback(
    () => returnFocusFrom(drawerSlotRef.current, drawerReturn.current, handleRef.current),
    [returnFocusFrom]
  )
  const setDrawerOpen = useCallback(
    (open: boolean) => {
      if (desktop) {
        if (!open) returnFromDrawer()
        updateShellPrefs({ drawer: open ? "open" : "closed" })
      } else setSheetOpen(open)
    },
    [desktop, returnFromDrawer]
  )
  const toggleDrawer = useCallback(() => {
    if (desktop) {
      if (readShellPrefs().drawer === "open") returnFromDrawer()
      updateShellPrefs((current) => ({ drawer: current.drawer === "open" ? "closed" : "open" }))
    } else setSheetOpen((open) => !open)
  }, [desktop, returnFromDrawer])

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

  useEffect(() => {
    if (!hasDrawer) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (!matchesShortcut(event, drawerShortcut, platform)) return
      event.preventDefault()
      toggleDrawer()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [hasDrawer, drawerShortcut, platform, toggleDrawer])

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
          <Sheet.Root side="left" open={sheetOpen && !desktop} onOpenChange={(open) => setSheetOpen(open)}>
            <Sheet.Popup size="sm">
              <DrawerPlacement.Provider value="sheet">{drawer}</DrawerPlacement.Provider>
            </Sheet.Popup>
          </Sheet.Root>
        ) : null}
      </TooltipProvider>
      </ShellFocusContext.Provider>
    </ShellContext.Provider>
  )
}

/**
 * The drawer's inner edge. Drag to resize (14–28rem); drag below the minimum and it snaps
 * closed; drag out from the rail to open. Double-click or Enter toggles; arrow keys resize.
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
  const [dragging, setDragging] = useState(false)
  const prefs = useShellPrefs()

  const remPx = () => Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const shell = shellRef.current
    if (event.button !== 0 || !shell) return
    event.preventDefault()
    const handle = event.currentTarget
    const pane = shell.querySelector<HTMLElement>(".fa-shell-drawer")
    const rem = remPx()
    const min = DRAWER_MIN_REM * rem
    const max = DRAWER_MAX_REM * rem
    const startX = event.clientX
    const startWidth = open && pane ? pane.getBoundingClientRect().width : 0
    let width = open ? startWidth : min
    let collapsed = !open
    let moved = false
    handle.setPointerCapture(event.pointerId)
    setDragging(true)
    shell.dataset.resizing = ""

    const setCollapsed = (next: boolean) => {
      if (next === collapsed) return
      collapsed = next
      // Crossing the threshold animates: let the grid transition run for this change.
      delete shell.dataset.resizing
      if (next) shell.dataset.drawerPreview = "closed"
      else shell.dataset.drawerPreview = "open"
      window.setTimeout(() => {
        if (handle.hasPointerCapture(event.pointerId)) shell.dataset.resizing = ""
      }, 200)
    }

    const move = (moveEvent: PointerEvent) => {
      const raw = startWidth + moveEvent.clientX - startX
      if (Math.abs(moveEvent.clientX - startX) > 2) moved = true
      if (raw < min * 0.6) {
        setCollapsed(true)
        return
      }
      setCollapsed(false)
      width = Math.min(max, Math.max(min, raw))
      shell.style.setProperty("--shell-drawer", `${(width / rem).toFixed(3)}rem`)
    }
    const up = () => {
      handle.removeEventListener("pointermove", move)
      handle.removeEventListener("pointerup", up)
      handle.removeEventListener("pointercancel", up)
      setDragging(false)
      delete shell.dataset.resizing
      delete shell.dataset.drawerPreview
      shell.style.removeProperty("--shell-drawer")
      if (!moved) return
      if (collapsed) updateShellPrefs({ drawer: "closed" })
      else updateShellPrefs({ drawer: "open", drawerWidth: width / rem })
    }
    handle.addEventListener("pointermove", move)
    handle.addEventListener("pointerup", up)
    handle.addEventListener("pointercancel", up)
  }

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      onToggle()
      return
    }
    const delta = event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0
    if (!delta) return
    event.preventDefault()
    const current = readShellPrefs().drawerWidth ?? defaultDrawerRem()
    if (!open) updateShellPrefs({ drawer: "open" })
    else updateShellPrefs({ drawerWidth: current + delta })
  }

  const widthRem = prefs.drawerWidth ?? defaultDrawerRem()
  return (
    <div
      ref={ref}
      role="separator"
      tabIndex={0}
      aria-orientation="vertical"
      aria-label="Resize section navigation"
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

/** The default drawer width (--sidebar-w) in rem. */
function defaultDrawerRem() {
  if (typeof document === "undefined") return 16.5
  const probe = getComputedStyle(document.documentElement).getPropertyValue("--sidebar-w").trim()
  const value = Number.parseFloat(probe)
  return probe.endsWith("rem") && Number.isFinite(value) ? value : 16.5
}
