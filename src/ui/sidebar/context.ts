import { createContext, useContext } from "react"

/** The edge a sidebar docks to. Logical: `start` is the left in left-to-right documents and the right in right-to-left ones. */
export type SidebarSide = "start" | "end"
/**
 * How the sidebar is drawn. `sidebar`: a flush chrome pane along the edge. `floating`: a glass
 * panel inset from the edges with its own corners. `inset`: the sidebar sits on the canvas and
 * `SidebarInset` becomes the raised panel.
 */
export type SidebarVariant = "sidebar" | "floating" | "inset"
/**
 * How the sidebar collapses on desktops. `offcanvas`: it slides fully away. `icon`: it narrows
 * to a strip of icons with tooltips and flyout sub-menus. `none`: it is always expanded and has
 * no toggle, shortcut or phone sheet.
 */
export type SidebarCollapsible = "offcanvas" | "icon" | "none"
/** `expanded`, or `collapsed` (slid away or narrowed to icons). */
export type SidebarState = "expanded" | "collapsed"

/** What changed a sidebar's open state. */
export type SidebarChangeReason =
  /** A SidebarTrigger or the header's collapse button. */
  | "trigger"
  /** The keyboard shortcut. */
  | "shortcut"
  /** A press on the Rail, or Enter/Space on its resize handle. */
  | "rail"
  /** Dragging the Rail past the minimum width, or out from the edge. */
  | "resize"
  /** Choosing a destination in the phone sheet. */
  | "navigation"
  /** The phone sheet's swipe, Esc or scrim. */
  | "dismiss"
  /** The icon-mode filter button, which expands the sidebar to show its field. */
  | "search"
  /** `useSidebar().setOpen`, `toggle` or `setOpenMobile`. */
  | "api"

/** Passed with every open-state change. */
export interface SidebarChangeDetails {
  /** What asked for the change. */
  reason: SidebarChangeReason
  /** The DOM event behind it, when there is one. */
  event?: Event | undefined
}

/** The value `useSidebar()` returns. */
export interface SidebarContextValue {
  /** `expanded` or `collapsed` on desktops. A `collapsible="none"` sidebar is always `expanded`. */
  state: SidebarState
  /** Whether the desktop sidebar is expanded. */
  open: boolean
  /** Expands or collapses the desktop sidebar. */
  setOpen: (open: boolean) => void
  /** Toggles the phone sheet below the mobile query, and the desktop sidebar above it. */
  toggle: () => void
  /** Whether the phone sheet is open. */
  openMobile: boolean
  /** Opens or closes the phone sheet. */
  setOpenMobile: (open: boolean) => void
  /** Whether the viewport matches the provider's `mobileQuery`, so the sidebar is a sheet. False on the server and the first hydrating render. */
  isMobile: boolean
  /** The edge the provider's Sidebar docks to; `start` until it mounts. */
  side: SidebarSide
  /** How the provider's Sidebar collapses; `offcanvas` until it mounts. */
  collapsible: SidebarCollapsible
}

/** What a Sidebar tells its provider about itself. */
export interface SidebarRegistration {
  side: SidebarSide
  collapsible: SidebarCollapsible
  variant: SidebarVariant
}

/** Internal provider state: the public value plus what the parts need. */
export interface SidebarInternal extends SidebarContextValue {
  /** The provider's `name`, so a trigger outside the nearest provider can find it. */
  name: string | undefined
  /** The `id` of the sidebar pane, for triggers' aria-controls. */
  paneId: string
  /** Changes the desktop state, recording why. */
  change: (open: boolean, reason: SidebarChangeReason, event?: Event) => void
  /** Changes the phone sheet, recording why. */
  changeMobile: (open: boolean, reason: SidebarChangeReason, event?: Event) => void
  /** Toggles whichever applies, recording why. */
  toggleWith: (reason: SidebarChangeReason, event?: Event) => void
  /** The keys that toggle the sidebar ("mod+b"), or null. */
  shortcut: string | null
  /** The resolved localStorage key, or null when nothing persists. */
  storageKey: string | null
  /** Whether the application controls `open` (the boot script then leaves it alone). */
  controlled: boolean
  /** The media query below which the sidebar is a sheet. */
  mobileQuery: string
  /** The remembered width in rem, or null for the default. */
  width: number | null
  /** Saves a width (rem; null resets it, undefined keeps it) and, when given, the open state in one write. */
  commitWidth: (width: number | null | undefined, open?: boolean) => void
  /** A group's or sub-menu's open state: remembered when it has an id and the provider a storageKey. */
  groupOpen: (id: string | undefined, fallback: boolean) => boolean
  /** Records a group's or sub-menu's open state. */
  setGroupOpen: (id: string | undefined, open: boolean) => void
  /** The Sidebar reports its side, collapsible and variant. */
  register: (registration: SidebarRegistration) => void
  /** Synchronous render-order hint: the variant of a Sidebar rendered before SidebarInset. */
  hint: { variant: SidebarVariant | null }
  /** The registered variant (after the Sidebar mounts). */
  variant: SidebarVariant
  /** Registers a control that reopens the sidebar (a trigger); collapse moves focus to it. */
  registerReturn: (element: HTMLElement) => () => void
  /** The registered return targets, most recent last. */
  returns: Set<HTMLElement>
  /** Set by the Sidebar: moves focus off parts that are about to hide. */
  beforeCollapse: { current: (() => void) | null }
  /** CSP nonce for the boot script. */
  nonce: string | undefined
  /** The enclosing named providers, nearest first, for `useSidebar(name)`. */
  chain: SidebarInternal[]
}

export const SidebarContext = /* @__PURE__ */ createContext<SidebarInternal | null>(null)

/** What a Sidebar tells its parts about itself. Internal. */
export interface SidebarConfigValue {
  side: SidebarSide
  collapsible: SidebarCollapsible
  resizable: boolean
  min: number
  max: number
  rootRef: { current: HTMLDivElement | null }
  paneRef: { current: HTMLDivElement | null }
  label: string
}

/** The enclosing Sidebar's configuration (or a host's stand-in, such as AppShell's section drawer). Internal. */
export const SidebarConfig = /* @__PURE__ */ createContext<SidebarConfigValue | null>(null)

/**
 * Internal: extra class names for inner elements of the parts, so a host that composes the
 * parts under its own names (AppShell's SectionDrawer) keeps its styling hooks on them.
 */
export interface SidebarPartClassNames {
  /** A collapsible group's disclosure button. */
  groupTrigger?: string
  /** A disclosure chevron. */
  chevron?: string
  /** A group label's count. */
  groupCount?: string
  /** A menu button's label and detail column (rendered when it has a detail). */
  text?: string
  /** A menu button's label. */
  label?: string
  /** A menu button's detail line. */
  detail?: string
  /** A menu button's face. */
  face?: string
  /** A menu button's count. */
  count?: string
  /** The header's mark. */
  mark?: string
  /** The header's title column. */
  titleBlock?: string
  /** The header's subtitle. */
  subtitle?: string
}

export const SidebarPartClasses = /* @__PURE__ */ createContext<SidebarPartClassNames>({})

/** Where the parts render: the docked pane, or the phone sheet. */
export const SidebarPlacement = /* @__PURE__ */ createContext<"pane" | "sheet">("pane")

/** Whether the parts are drawn as an icon strip (icon mode, collapsed, docked). */
export const SidebarIconMode = /* @__PURE__ */ createContext(false)

/** The nearest provider, or the enclosing provider named `name`. Internal: throws outside one. */
export function useSidebarInternal(name?: string): SidebarInternal {
  const context = useContext(SidebarContext)
  if (!context) throw new Error("Sidebar parts must be inside a SidebarProvider")
  if (name === undefined) return context
  const named = context.chain.find((provider) => provider.name === name)
  if (!named) throw new Error(`No enclosing SidebarProvider is named "${name}"`)
  return named
}

/** Like useSidebarInternal, but null outside a provider. */
export function useOptionalSidebarInternal() {
  return useContext(SidebarContext)
}

const noop = () => {}

/**
 * Internal: a provider value for parts that render outside any SidebarProvider (AppShell's
 * SectionDrawer on its own, or in a host's dialog): nothing to open or close, nothing remembered.
 */
export function detachedSidebar(): SidebarInternal {
  const internal: SidebarInternal = {
    state: "expanded",
    open: true,
    setOpen: noop,
    toggle: noop,
    openMobile: false,
    setOpenMobile: noop,
    isMobile: false,
    side: "start",
    collapsible: "none",
    name: undefined,
    paneId: "",
    change: noop,
    changeMobile: noop,
    toggleWith: noop,
    shortcut: null,
    storageKey: null,
    controlled: true,
    mobileQuery: "",
    width: null,
    commitWidth: noop,
    groupOpen: (_id, fallback) => fallback,
    setGroupOpen: noop,
    register: noop,
    hint: { variant: null },
    variant: "sidebar",
    registerReturn: () => noop,
    returns: new Set(),
    beforeCollapse: { current: null },
    nonce: undefined,
    chain: [],
  }
  return internal
}
