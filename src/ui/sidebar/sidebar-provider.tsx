/**
 * SidebarProvider — the state of one sidebar: expanded or collapsed on desktops, the phone
 * sheet, the remembered width and groups, and the keyboard shortcut. It renders a flex row
 * that holds the Sidebar and the SidebarInset beside it, and fills its container: give the
 * container a definite height (the whole viewport for an application frame).
 *
 * Two sidebars (navigation at the start, details at the end) are two providers, the second
 * inside the first's SidebarInset. Name them to reach either from a trigger.
 */
import {
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentProps,
} from "react"
import { cx } from "../../lib/cx.js"
import { readStored, subscribeStored, writeStored } from "../../lib/local-store.js"
import { useStorageScope } from "../../lib/storage-scope.js"
import { isRichTextTarget } from "../../lib/text-entry.js"
import { PHONE_QUERY, useMediaQuery } from "../../lib/use-media-query.js"
import { matchesShortcut, usePlatform } from "../kbd/index.js"
import { TooltipProvider } from "../tooltip/index.js"
import {
  SidebarContext,
  useSidebarInternal,
  type SidebarChangeDetails,
  type SidebarChangeReason,
  type SidebarContextValue,
  type SidebarInternal,
  type SidebarRegistration,
} from "./context.js"
import { EMPTY_SIDEBAR_PREFS, normaliseSidebarPrefs, sidebarStorageKey, type SidebarPrefs } from "./sidebar-state.js"

export interface SidebarProviderProps extends Omit<ComponentProps<"div">, "onChange"> {
  /** Whether the desktop sidebar is expanded (controlled). Pair with `onOpenChange`. */
  open?: boolean
  /** Whether the desktop sidebar starts expanded when uncontrolled and nothing is remembered. @defaultValue true */
  defaultOpen?: boolean
  /**
   * Called with the next desktop state and why it changed (a trigger, the shortcut, the
   * Rail, a drag past the minimum width). Update controlled state here.
   */
  onOpenChange?: (open: boolean, details: SidebarChangeDetails) => void
  /** Whether the phone sheet is open (controlled). Pair with `onOpenMobileChange`. */
  openMobile?: boolean
  /** Called with the next phone sheet state and why: a trigger, a destination chosen in it, or swipe, Esc or the scrim. */
  onOpenMobileChange?: (open: boolean, details: SidebarChangeDetails) => void
  /**
   * The keys that toggle the sidebar from anywhere on the page, or `false` for none. The
   * default is `"mod+b"` (⌘B, Ctrl+B) for a start sidebar and none for an end one. It is
   * ignored while focus is in rich text or a custom text box, where Ctrl+B means bold.
   * Triggers show it in their tooltips and `aria-keyshortcuts`.
   */
  shortcut?: string | false
  /**
   * Remember the open state, the dragged width and the open groups under this localStorage
   * key, so they survive a reload without a flash. Inside a storage scope (a window body) the
   * scope is appended. Absent: nothing persists.
   */
  storageKey?: string
  /** Below this media query the sidebar becomes a sheet from its edge. @defaultValue PHONE_QUERY, "(width < 48rem)" */
  mobileQuery?: string
  /** Names this provider so a SidebarTrigger or `useSidebar(name)` inside a nested provider can reach it. */
  name?: string
  /** Content-Security-Policy nonce for the inline boot script rendered during server rendering. */
  nonce?: string
}

const noopSubscribe = () => () => {}
const readEmpty = () => EMPTY_SIDEBAR_PREFS

/** The remembered prefs for `key` (or local state without one), and a patch writer. */
function useSidebarPrefs(key: string | null): [SidebarPrefs, (patch: (current: SidebarPrefs) => Partial<SidebarPrefs>) => void] {
  const [local, setLocal] = useState<SidebarPrefs>(EMPTY_SIDEBAR_PREFS)
  const subscribe = useMemo(() => (key ? (notify: () => void) => subscribeStored(key, notify) : noopSubscribe), [key])
  const snapshot = useMemo(() => (key ? () => readStored(key, normaliseSidebarPrefs) : readEmpty), [key])
  const stored = useSyncExternalStore(subscribe, snapshot, readEmpty)
  const update = useCallback(
    (patch: (current: SidebarPrefs) => Partial<SidebarPrefs>) => {
      if (key) {
        const current = readStored(key, normaliseSidebarPrefs)
        writeStored(key, normaliseSidebarPrefs({ ...current, ...patch(current) }))
      } else setLocal((current) => normaliseSidebarPrefs({ ...current, ...patch(current) }))
    },
    [key]
  )
  return [key ? stored : local, update]
}

/** What `useSidebarState` takes: the provider's state props. */
export type SidebarStateOptions = Pick<
  SidebarProviderProps,
  "open" | "defaultOpen" | "onOpenChange" | "openMobile" | "onOpenMobileChange" | "shortcut" | "storageKey" | "mobileQuery" | "name" | "nonce"
>

/**
 * Internal: one sidebar's state, shortcut and focus return, without the provider's element.
 * SidebarProvider renders it; AppShell drives its section drawer with it inside its own grid.
 */
export function useSidebarState({
  open: openProp,
  defaultOpen = true,
  onOpenChange,
  openMobile: openMobileProp,
  onOpenMobileChange,
  shortcut: shortcutProp,
  storageKey: storageKeyProp,
  mobileQuery = PHONE_QUERY,
  name,
  nonce,
}: SidebarStateOptions): SidebarInternal {
  const parent = useContext(SidebarContext)
  const scope = useStorageScope()
  const storageKey = storageKeyProp ? sidebarStorageKey(storageKeyProp, scope) : null
  const [prefs, updatePrefs] = useSidebarPrefs(storageKey)
  const isMobile = useMediaQuery(mobileQuery)
  const platform = usePlatform()
  const paneId = useId()

  const [registration, setRegistration] = useState<SidebarRegistration>({ side: "start", collapsible: "offcanvas", variant: "sidebar" })
  const register = useCallback(
    (next: SidebarRegistration) =>
      setRegistration((current) =>
        current.side === next.side && current.collapsible === next.collapsible && current.variant === next.variant ? current : next
      ),
    []
  )
  const [hint] = useState<SidebarInternal["hint"]>(() => ({ variant: null }))
  const [returns] = useState(() => new Set<HTMLElement>())
  const beforeCollapse = useRef<(() => void) | null>(null)

  // Desktop state: controlled, else remembered (with a storage key) or local.
  const [localOpen, setLocalOpen] = useState(defaultOpen)
  const controlled = openProp !== undefined
  const uncontrolledOpen = storageKey ? (prefs.open ?? defaultOpen) : localOpen
  const open = registration.collapsible === "none" ? true : controlled ? openProp : uncontrolledOpen

  const [localMobile, setLocalMobile] = useState(false)
  const openMobile = openMobileProp ?? localMobile
  // Leaving the phone layout closes the sheet (adjusting state during render, as AppShell does).
  const [wasMobile, setWasMobile] = useState(isMobile)
  if (wasMobile !== isMobile) {
    setWasMobile(isMobile)
    if (!isMobile && openMobileProp === undefined) setLocalMobile(false)
  }

  const latest = useRef({ open, openMobile, onOpenChange, onOpenMobileChange, controlled, storageKey, isMobile })
  latest.current = { open, openMobile, onOpenChange, onOpenMobileChange, controlled, storageKey, isMobile }

  const change = useCallback(
    (next: boolean, reason: SidebarChangeReason, event?: Event) => {
      const current = latest.current
      if (next === current.open) return
      if (!next) beforeCollapse.current?.()
      if (!current.controlled) {
        if (current.storageKey) updatePrefs(() => ({ open: next }))
        else setLocalOpen(next)
      }
      current.onOpenChange?.(next, { reason, event })
    },
    [updatePrefs]
  )
  const changeMobile = useCallback((next: boolean, reason: SidebarChangeReason, event?: Event) => {
    const current = latest.current
    if (next === current.openMobile) return
    setLocalMobile(next)
    current.onOpenMobileChange?.(next, { reason, event })
  }, [])
  const toggleWith = useCallback(
    (reason: SidebarChangeReason, event?: Event) => {
      const current = latest.current
      if (current.isMobile) changeMobile(!current.openMobile, reason, event)
      else change(!current.open, reason, event)
    },
    [change, changeMobile]
  )
  const commitWidth = useCallback(
    (width: number | null | undefined, nextOpen?: boolean) => {
      const current = latest.current
      const openChanged = nextOpen !== undefined && nextOpen !== current.open
      if (openChanged && !nextOpen) beforeCollapse.current?.()
      if (!current.controlled && openChanged && !current.storageKey) setLocalOpen(nextOpen)
      updatePrefs(() => ({
        ...(width === undefined ? {} : { width }),
        ...(openChanged && !current.controlled ? { open: nextOpen } : {}),
      }))
      if (openChanged) current.onOpenChange?.(nextOpen, { reason: "resize" })
    },
    [updatePrefs]
  )
  const groupOpen = useCallback(
    (id: string | undefined, fallback: boolean) => (id === undefined ? fallback : (prefs.groups[id] ?? fallback)),
    [prefs.groups]
  )
  const setGroupOpen = useCallback(
    (id: string | undefined, next: boolean) => {
      if (id === undefined) return
      updatePrefs((current) => ({ groups: { ...current.groups, [id]: next } }))
    },
    [updatePrefs]
  )
  const registerReturn = useCallback(
    (element: HTMLElement) => {
      returns.add(element)
      return () => {
        returns.delete(element)
      }
    },
    [returns]
  )

  const shortcut =
    registration.collapsible === "none" || shortcutProp === false
      ? null
      : (shortcutProp ?? (registration.side === "end" ? null : "mod+b"))

  useEffect(() => {
    if (!shortcut) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || isRichTextTarget(event.target)) return
      if (!matchesShortcut(event, shortcut, platform)) return
      event.preventDefault()
      toggleWith("shortcut", event)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [shortcut, platform, toggleWith])

  const value = useMemo<SidebarInternal>(() => {
    const internal: SidebarInternal = {
      state: open ? "expanded" : "collapsed",
      open,
      setOpen: (next) => change(next, "api"),
      toggle: () => toggleWith("api"),
      openMobile,
      setOpenMobile: (next) => changeMobile(next, "api"),
      isMobile,
      side: registration.side,
      collapsible: registration.collapsible,
      name,
      paneId,
      change,
      changeMobile,
      toggleWith,
      shortcut,
      storageKey,
      controlled,
      mobileQuery,
      width: prefs.width,
      commitWidth,
      groupOpen,
      setGroupOpen,
      register,
      hint,
      variant: registration.variant,
      registerReturn,
      returns,
      beforeCollapse,
      nonce,
      chain: [],
    }
    internal.chain = [internal, ...(parent?.chain ?? [])]
    return internal
  }, [
    open,
    openMobile,
    isMobile,
    registration,
    name,
    paneId,
    change,
    changeMobile,
    toggleWith,
    shortcut,
    storageKey,
    controlled,
    mobileQuery,
    prefs.width,
    commitWidth,
    groupOpen,
    setGroupOpen,
    register,
    hint,
    registerReturn,
    returns,
    nonce,
    parent,
  ])
  return value
}

/**
 * Holds one sidebar's state (expanded, phone sheet, width, groups and shortcut) and lays its
 * Sidebar and SidebarInset out side by side, filling the container.
 */
export function SidebarProvider({
  open,
  defaultOpen,
  onOpenChange,
  openMobile,
  onOpenMobileChange,
  shortcut,
  storageKey,
  mobileQuery,
  name,
  nonce,
  className,
  children,
  ...rest
}: SidebarProviderProps) {
  const value = useSidebarState({ open, defaultOpen, onOpenChange, openMobile, onOpenMobileChange, shortcut, storageKey, mobileQuery, name, nonce })
  return (
    <SidebarContext.Provider value={value}>
      <TooltipProvider>
        <div {...rest} className={cx("fa-sidebar-provider", className)} data-sidebar-name={name}>
          {children}
        </div>
      </TooltipProvider>
    </SidebarContext.Provider>
  )
}

/**
 * The nearest sidebar's state and controls: `state`, `open`, `setOpen`, `toggle`, `openMobile`,
 * `setOpenMobile`, `isMobile`, `side` and `collapsible`. Pass a provider's `name` to reach an
 * enclosing provider other than the nearest. Throws outside a SidebarProvider.
 *
 * @example
 * const { toggle, state } = useSidebar()
 */
export function useSidebar(name?: string): SidebarContextValue {
  const { state, open, setOpen, toggle, openMobile, setOpenMobile, isMobile, side, collapsible } = useSidebarInternal(name)
  return { state, open, setOpen, toggle, openMobile, setOpenMobile, isMobile, side, collapsible }
}
