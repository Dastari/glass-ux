import { Menubar as BaseMenubar } from "@base-ui/react/menubar"
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentProps, type KeyboardEvent, type ReactNode, type RefObject } from "react"
import { IconMenu } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { useMessages } from "../../lib/i18n/use-messages.js"
import { observeElementSizes } from "../../lib/resize-observer.js"
import { useControllable } from "../../lib/use-controllable.js"
import { Button } from "../button/index.js"
import { Menu } from "../menu/index.js"
import { Skeleton } from "../skeleton/index.js"
import { MenubarBody, MenubarRowsContext, SubmenuRow, type MenubarRowsContextValue } from "./menubar-rows.js"
import { menubarMessages } from "./messages.js"
import type { MenubarCommandEntry, MenubarMenu } from "./types.js"

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect

/** The value of `openMenu` while the collapsed bar's one menu is open. */
export const MENUBAR_COLLAPSED_MENU = "collapsed"

export type MenubarSize = "sm" | "md"

/** Where focus goes after a command runs: a ref, or a function called at that moment. */
export type MenubarFocusTarget = RefObject<HTMLElement | null> | (() => HTMLElement | null | undefined)

type OpenChange = NonNullable<ComponentProps<typeof Menu.Root>["onOpenChange"]>
type FinalFocus = ComponentProps<typeof Menu.Popup>["finalFocus"]

export interface MenubarProps {
  /** Names the bar for assistive technology ("Application"). */
  "aria-label": string
  /** The menus, as data. */
  menus: readonly MenubarMenu[]
  /** The open menu's id, or null. Controlled while defined. While collapsed the value is `MENUBAR_COLLAPSED_MENU`. */
  openMenu?: string | null
  /** The menu open at first when uncontrolled. Default none. */
  defaultOpenMenu?: string | null
  /** Called with the menu that opened, or null when the bar closed. */
  onOpenMenuChange?: (menu: string | null) => void
  /** Called with a command row's id and row after the menu closes, after the row's own `onSelect`. */
  onCommand?: (id: string, entry: MenubarCommandEntry) => void
  /**
   * Where focus goes after a command runs, such as the document the menu acts on. Escape still
   * returns to the trigger, and an outside press leaves focus where it landed. Without it, a
   * command returns focus to the trigger like any menu.
   */
  focusAfterCommand?: MenubarFocusTarget
  /**
   * `auto` (default) folds the menus into one when they do not fit the box the bar is given,
   * whatever the viewport. `never` keeps the row; `always` keeps one menu.
   */
  collapse?: "auto" | "never" | "always"
  /** sm (default) for window and panel chrome, md for a page's top row. */
  size?: MenubarSize
  /** Disables every menu. */
  disabled?: boolean
  /** Wording overrides. */
  labels?: Partial<typeof menubarMessages.defaults>
  /** Layout only. */
  className?: string
}

interface BarMenuProps {
  label: string
  /** The collapsed bar's trigger shows an icon. */
  icon?: ReactNode
  size: MenubarSize
  disabled?: boolean
  disabledReason?: string | null | undefined
  open: boolean
  onOpenChange: OpenChange
  onOpenChangeComplete: (open: boolean) => void
  onArrowUp: () => void
  finalFocus: FinalFocus
  /** Which row takes focus when the keyboard opens this menu; read once. */
  landing: RefObject<"first" | "last" | null>
  children: ReactNode
}

/** One trigger and its popup, in either form of the bar. */
function BarMenu({ label, icon, size, disabled, disabledReason, open, onOpenChange, onOpenChangeComplete, onArrowUp, finalFocus, landing, children }: BarMenuProps) {
  const popup = useRef<HTMLDivElement>(null)
  const unavailable = Boolean(disabled || disabledReason)
  // Base UI focuses the popup when a key moves to the next menu; the pattern wants a row. Its
  // popup reads `initialFocus` but leaves it out of the types, so e2e/menubar.spec.ts guards this
  // against an upgrade (@base-ui/react is pinned exactly).
  const initialFocus = () => {
    const where = landing.current
    landing.current = null
    if (!where) return true
    const rows = popup.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]')
    return (where === "last" ? rows?.[rows.length - 1] : rows?.[0]) ?? true
  }
  return (
    <Menu.Root open={open} onOpenChange={onOpenChange} onOpenChangeComplete={onOpenChangeComplete} disabled={unavailable}>
      <Menu.Trigger
        onKeyDown={(event: KeyboardEvent) => {
          if (event.key !== "ArrowUp" || unavailable) return
          event.preventDefault()
          onArrowUp()
        }}
        render={
          <Button variant="ghost" size={size} tooltip={false} icon={icon} disabledReason={disabledReason ?? undefined}>
            {label}
          </Button>
        }
      />
      <Menu.Popup ref={popup} className="fa-menubar-popup" align="start" finalFocus={finalFocus} {...({ initialFocus } as object)}>
        {children}
      </Menu.Popup>
    </Menu.Root>
  )
}

/**
 * An application's menu bar, as data: commands, toggles, choices, groups and submenus, with the
 * WAI-ARIA menubar keyboard pattern from Base UI. Left and right arrows follow the reading
 * direction, and once a menu is open, hovering another trigger switches to it.
 *
 * Rows show keys and never listen for them, so the same definition can go to the palette and
 * the keymap (R1.2): build rows from an action set with `useMenubarActions`. A menu or submenu
 * can load its rows when it opens, with the space reserved. It folds into one menu when the box
 * it is given is too narrow (R7.6), and a menu taller than the space scrolls.
 *
 * The bar draws no surface: place it in a window's header or a panel, which owns the frame.
 */
export function Menubar({
  "aria-label": label,
  menus,
  openMenu,
  defaultOpenMenu = null,
  onOpenMenuChange,
  onCommand,
  focusAfterCommand,
  collapse = "auto",
  size = "sm",
  disabled,
  labels,
  className,
}: MenubarProps) {
  const messages = useMessages(menubarMessages, { labels })
  const [open, setOpen] = useControllable<string | null>(openMenu, defaultOpenMenu, onOpenMenuChange)
  const shown = useRef(open)
  // The host moved it. Closing a menu returns focus to its trigger, and focus on a trigger opens
  // that menu while another is open, so a host's switch would otherwise bounce back.
  const moved = useRef(false)
  if (open !== shown.current) moved.current = true
  shown.current = open
  const change = useCallback(
    (next: string | null) => {
      if (next === shown.current) return
      shown.current = next
      setOpen(next)
    },
    [setOpen]
  )

  const box = useRef<HTMLDivElement>(null)
  const row = useRef<HTMLDivElement>(null)
  const [overflowing, setOverflowing] = useState(false)
  const refocus = useRef(false)
  useIsomorphicLayoutEffect(() => {
    const element = box.current
    const needed = row.current
    if (!element || !needed || collapse !== "auto") return
    const measure = () => {
      const next = needed.getBoundingClientRect().width > element.getBoundingClientRect().width
      setOverflowing((current) => {
        if (current === next) return current
        refocus.current = element.contains(document.activeElement)
        return next
      })
    }
    measure()
    const observer = observeElementSizes(measure)
    observer.observe(element)
    observer.observe(needed)
    return () => observer.disconnect()
  }, [collapse])
  const collapsed = collapse === "always" || (collapse === "auto" && overflowing)

  // The form changed: the menu it had open is gone, and focus stays on the bar (R20.2).
  const form = useRef(collapsed)
  useIsomorphicLayoutEffect(() => {
    if (form.current === collapsed) return
    form.current = collapsed
    change(null)
    if (!refocus.current) return
    refocus.current = false
    box.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
  }, [collapsed, change])

  const commandFocus = useRef<HTMLElement | null>(null)
  const keyboard = useRef(false)
  const landing = useRef<"first" | "last" | null>(null)
  const openChange = (id: string): OpenChange => (next, details) => {
    if (next && details.reason === "trigger-focus" && moved.current) return details.cancel()
    if (focusAfterCommand && !next && details.reason === "item-press") {
      commandFocus.current = (typeof focusAfterCommand === "function" ? focusAfterCommand() : focusAfterCommand.current) ?? null
    }
    if (next && details.reason === "trigger-focus" && keyboard.current) landing.current = "first"
    change(next ? id : shown.current === id ? null : shown.current)
  }
  const openAtEnd = (id: string) => {
    landing.current = "last"
    change(id)
  }
  const finalFocus = useMemo<FinalFocus>(() => (focusAfterCommand ? () => commandFocus.current ?? true : undefined), [focusAfterCommand])
  // A submenu's own return of focus can land after the bar's, on a row about to go. Once the menu
  // has gone, finish the move, unless the command has put focus somewhere else on purpose.
  const closed = useCallback((isOpen: boolean) => {
    const target = commandFocus.current
    if (isOpen || !target) return
    setTimeout(() => {
      commandFocus.current = null
      const active = document.activeElement
      if (active === target) return
      if (!active || active === document.body || box.current?.contains(active) || active.closest(".fa-menubar-popup")) target.focus()
    })
  }, [])

  const latestCommand = useRef(onCommand)
  latestCommand.current = onCommand
  const rowCounts = useRef(new Map<string, number>())
  const [announcement, announce] = useState("")
  const rows = useMemo<MenubarRowsContextValue>(
    () => ({
      run: (entry) => {
        entry.onSelect?.()
        latestCommand.current?.(entry.id, entry)
      },
      rowCounts: rowCounts.current,
      announce,
      messages,
    }),
    [messages]
  )

  return (
    <MenubarRowsContext value={rows}>
      <div
        ref={box}
        className={cx("fa-menubar-box", className)}
        data-collapsed={collapsed ? "" : undefined}
        onKeyDownCapture={() => {
          keyboard.current = true
          moved.current = false
        }}
        onPointerDownCapture={() => {
          keyboard.current = false
          moved.current = false
        }}
      >
        <BaseMenubar aria-label={label} modal={false} disabled={disabled} className="fa-menubar">
          {collapsed ? (
            <BarMenu
              label={messages.menu}
              icon={<IconMenu />}
              size={size}
              open={open !== null}
              onOpenChange={openChange(MENUBAR_COLLAPSED_MENU)}
              onOpenChangeComplete={closed}
              onArrowUp={() => openAtEnd(MENUBAR_COLLAPSED_MENU)}
              finalFocus={finalFocus}
              landing={landing}
            >
              {menus.map((menu) => (
                <SubmenuRow key={menu.id} entry={{ ...menu, kind: "submenu" }} path="" />
              ))}
            </BarMenu>
          ) : (
            menus.map((menu) => (
              <BarMenu
                key={menu.id}
                label={menu.label}
                size={size}
                disabled={menu.disabled}
                disabledReason={menu.disabledReason}
                open={open === menu.id}
                onOpenChange={openChange(menu.id)}
                onOpenChangeComplete={closed}
                onArrowUp={() => openAtEnd(menu.id)}
                finalFocus={finalFocus}
                landing={landing}
              >
                <MenubarBody source={menu} path={`/${menu.id}`} />
              </BarMenu>
            ))
          )}
        </BaseMenubar>
        {/* Always mounted, and outside the bar and its popups: a menu may hold only rows (R20.9). */}
        <span className="sr-only" aria-live="polite">
          {announcement}
        </span>
        {/* What the row of triggers needs, whichever form shows: that is what decides the form. */}
        <div className="fa-menubar-measure" aria-hidden inert>
          <div ref={row} className="fa-menubar">
            {menus.map((menu) => (
              <Button key={menu.id} variant="ghost" size={size} tooltip={false} tabIndex={-1}>
                {menu.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </MenubarRowsContext>
  )
}

export interface MenubarSkeletonProps {
  /** The menus' labels, when they are known: each placeholder then takes that trigger's exact width. */
  labels?: readonly string[]
  /** How many menus to stand in for when the labels are not known. Default 5. */
  count?: number
  /** The size the bar will take. */
  size?: MenubarSize
  /** Layout only. */
  className?: string
}

const SKELETON_LABELS = ["Menu", "Actions", "Menu", "Items", "Menu"]

/** A placeholder bar with the same height and rhythm as the loaded bar. */
export function MenubarSkeleton({ labels, count = 5, size = "sm", className }: MenubarSkeletonProps) {
  const names = labels ?? Array.from({ length: count }, (_, index) => SKELETON_LABELS[index % SKELETON_LABELS.length]!)
  return (
    <div className={cx("fa-menubar-box", className)} aria-hidden inert data-skeleton="">
      <div className="fa-menubar">
        {names.map((name, index) => (
          <Button key={index} variant="ghost" size={size} tooltip={false} tabIndex={-1}>
            <span className="fa-menubar-skeleton-label">
              {name}
              <Skeleton.Block className="fa-menubar-skeleton-bar" radius="item" />
            </span>
          </Button>
        ))}
      </div>
    </div>
  )
}

