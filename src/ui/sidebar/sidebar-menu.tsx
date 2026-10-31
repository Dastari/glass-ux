/**
 * The sidebar's items: Menu (a list), MenuItem (one entry), MenuButton (the link or button),
 * MenuAction (a trailing ⋯ button), MenuBadge (a count), MenuSub with MenuSubItem and
 * MenuSubButton (nested pages), and MenuSkeleton (a loading row of the same geometry).
 *
 * In icon mode a MenuButton keeps its accessible name (its label stays in the DOM, faded)
 * and shows it as a tooltip; a count moves onto the icon's corner; and a sub-menu opens as a
 * flyout menu from the icon, by pointer hover or press and by Enter, Space or ↓. The flyout's
 * menu parts (sidebar-flyout.tsx) load once an icon-mode sidebar with sub-menus has mounted.
 */
import { Collapsible } from "@base-ui/react/collapsible"
import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useState,
  type ComponentProps,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from "react"
import { IconChevronDown, IconMoreHorizontal } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { useMessages } from "../../lib/i18n/index.js"
import { numberFormat } from "../../lib/locale/intl.js"
import { useLocale } from "../../lib/locale/use-locale.js"
import { CountBadge, type CountBadgeProps } from "../badge/index.js"
import { Button, type ButtonProps } from "../button/index.js"
import { Highlight } from "../combobox/option-row.js"
import { Skeleton } from "../skeleton/index.js"
import { Tooltip } from "../tooltip/index.js"
import { SidebarConfig, SidebarIconMode, SidebarPartClasses, SidebarPlacement, useSidebarInternal } from "./context.js"
import { sidebarMessages } from "./messages.js"
import type { SidebarFlyoutParts } from "./sidebar-flyout.js"

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect

let flyoutParts: SidebarFlyoutParts | null = null
let flyoutLoad: Promise<SidebarFlyoutParts> | null = null
/** Loads the flyout's menu parts once for the page. */
const loadFlyout = () =>
  (flyoutLoad ??= import("./sidebar-flyout.js").then((module) => (flyoutParts = module.flyoutParts)))

/** The flyout's menu parts once loaded; asks for them while `wanted` (an icon-strip sidebar's sub-menu item). */
function useFlyoutParts(wanted: boolean): SidebarFlyoutParts | null {
  const [parts, setParts] = useState(flyoutParts)
  useEffect(() => {
    if (!wanted || parts) return
    let live = true
    void loadFlyout().then((loaded) => {
      if (live) setParts(loaded)
    })
    return () => {
      live = false
    }
  }, [wanted, parts])
  return parts ?? flyoutParts
}

/** A row's height: `sm` compact rows, `md` the default, `lg` for an avatar with two lines (the account). */
export type SidebarMenuButtonSize = "sm" | "md" | "lg"

/** The list of items. */
function SidebarMenu({ className, ...rest }: ComponentProps<"ul">) {
  return <ul {...rest} className={cx("fa-sidebar-menu", className)} />
}

interface ItemValue {
  /** A stable key for the item's button, so focus survives it changing form. */
  key: string
  hasSub: boolean
  subOpen: boolean
  setSubOpen: (open: boolean) => void
  subPanelId: string
  /** The sub-menu opens as a flyout (icon mode). */
  flyout: boolean
  /** The flyout's menu parts, once loaded. */
  parts: SidebarFlyoutParts | null
  /** The parent's label, shown as the flyout's heading. */
  label: ReactNode
  badgeId: string
  hasBadge: boolean
  setHasBadge: (has: boolean) => void
}
const ItemContext = /* @__PURE__ */ createContext<ItemValue | null>(null)

/** One entry: a MenuButton, optionally with a MenuAction, a MenuBadge and a MenuSub. */
function SidebarMenuItem({ className, children, ...rest }: ComponentProps<"li">) {
  const ctx = useSidebarInternal()
  const iconMode = useContext(SidebarIconMode)
  const placement = useContext(SidebarPlacement)
  const config = useContext(SidebarConfig)
  const key = useId()
  const [hasBadge, setHasBadge] = useState(false)
  const [flyoutOpen, setFlyoutOpen] = useState(false)
  // The sub-menu and the button are found among the direct children, so the button knows
  // on the server already that it discloses a sub-menu.
  let sub: SidebarMenuSubProps | undefined
  let button: SidebarMenuButtonProps | undefined
  for (const child of Children.toArray(children)) {
    if (!isValidElement(child)) continue
    if (child.type === SidebarMenuSub) sub = child.props as SidebarMenuSubProps
    else if (child.type === SidebarMenuButton) button = child.props as SidebarMenuButtonProps
  }
  const hasSub = sub !== undefined
  const [localSub, setLocalSub] = useState(() => ctx.groupOpen(sub?.id, sub?.defaultOpen ?? false))
  const remembered = sub?.id !== undefined && ctx.storageKey !== null
  const subOpen = sub?.open ?? (remembered ? ctx.groupOpen(sub?.id, sub?.defaultOpen ?? false) : localSub)
  const setSubOpen = (next: boolean) => {
    if (sub?.open === undefined) {
      if (remembered) ctx.setGroupOpen(sub?.id, next)
      else setLocalSub(next)
    }
    sub?.onOpenChange?.(next)
  }
  // Only an icon strip's sub-menus fly out; their menu parts load after the sidebar mounts.
  const parts = useFlyoutParts(hasSub && config?.collapsible === "icon" && placement === "pane")
  const flyout = hasSub && iconMode && placement === "pane"
  const value: ItemValue = {
    key,
    hasSub,
    subOpen,
    setSubOpen,
    subPanelId: `${key}sub`,
    flyout,
    parts,
    label: button?.tooltip ?? button?.children,
    badgeId: `${key}badge`,
    hasBadge,
    setHasBadge,
  }
  const item = (
    <li
      {...rest}
      className={cx("fa-sidebar-menu-item", className)}
      data-size={button?.size ?? "md"}
      data-has-sub={hasSub ? "" : undefined}
    />
  )
  if (!hasSub)
    return (
      <ItemContext.Provider value={value}>
        <li {...item.props}>{children}</li>
      </ItemContext.Provider>
    )
  const disclosure = (
    <Collapsible.Root open={subOpen && !iconMode} onOpenChange={(next) => !iconMode && setSubOpen(next)} render={item}>
      {children}
    </Collapsible.Root>
  )
  return (
    <ItemContext.Provider value={value}>
      {parts ? (
        <parts.Root open={flyout && flyoutOpen} onOpenChange={(next) => setFlyoutOpen(flyout && next)} modal={false}>
          {disclosure}
        </parts.Root>
      ) : (
        disclosure
      )}
    </ItemContext.Provider>
  )
}

export interface SidebarMenuButtonProps extends Omit<ComponentProps<"button">, "children"> {
  /** The leading icon (navigation size, without a size of its own), or an avatar on an `lg` row. It stays in icon mode. */
  icon?: ReactNode
  /** The label: the accessible name, and the tooltip in icon mode. An `lg` row can hold a name and a detail line. */
  children: ReactNode
  /** The current page: `aria-current="page"` and the selected fill. */
  active?: boolean
  /** Render a link to this address instead of a button. */
  href?: string
  /** Render your router's link instead: `render={<Link to="/projects" />}`. */
  render?: ReactElement
  /** The tooltip in icon mode, when it should differ from the label. */
  tooltip?: ReactNode
  /** The row height. @defaultValue "md" */
  size?: SidebarMenuButtonSize
  /** Dims the item and ignores presses; it stays focusable (aria-disabled) so its name is still read. */
  disabled?: boolean
  /** Data on a second line under the label, read with it: a path, an owner, a last message. */
  detail?: ReactNode
  /**
   * A quiet tabular count at the trailing edge, inside the button and read as part of its name
   * (locale digits): items in a folder. For a count that asks for attention, use MenuBadge.
   */
  count?: number
  /**
   * The row's face, drawn instead of `icon`, the label and `detail`: an entity identity at its
   * row size (an organisation or device identity), so the sidebar shows the entity as a table
   * does. The face then names the button; `children` stays its plain name for the icon-mode
   * tooltip.
   */
  face?: ReactNode
}

/**
 * The item's link or button. With a MenuSub beside it, a button discloses the sub-menu
 * (aria-expanded); a link keeps navigating and gets a chevron button of its own. In the
 * phone sheet, choosing a destination closes the sheet unless the click handler calls
 * `event.preventDefault()`.
 */
function SidebarMenuButton({
  icon,
  children,
  active = false,
  href,
  render,
  tooltip,
  size = "md",
  disabled = false,
  detail,
  count,
  face,
  className,
  onClick,
  ...rest
}: SidebarMenuButtonProps) {
  const messages = useMessages(sidebarMessages)
  const ctx = useSidebarInternal()
  const item = useContext(ItemContext)
  const iconMode = useContext(SidebarIconMode)
  const placement = useContext(SidebarPlacement)
  const config = useContext(SidebarConfig)
  const classes = useContext(SidebarPartClasses)
  const locale = useLocale()
  const link = Boolean(href || render)
  const discloses = Boolean(item?.hasSub && !link && !item.flyout)
  const flyout = Boolean(item?.flyout)
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (disabled) {
      event.preventDefault()
      return
    }
    onClick?.(event)
    if (event.defaultPrevented || flyout) return
    if (discloses) {
      item?.setSubOpen(!item.subOpen)
      return
    }
    if (placement === "sheet") ctx.changeMobile(false, "navigation", event.nativeEvent)
  }
  const element = useRender({
    defaultTagName: link ? "a" : "button",
    render,
    props: mergeProps<"button">(
      {
        className: cx("fa-item fa-sidebar-menu-button", className),
        type: link ? undefined : "button",
        "aria-current": active ? "page" : undefined,
        "aria-disabled": disabled ? true : undefined,
        "aria-describedby": item?.hasBadge ? item.badgeId : undefined,
        "aria-expanded": discloses ? item?.subOpen : undefined,
        "aria-controls": discloses ? item?.subPanelId : undefined,
        onClick: handleClick,
        children: (
          <>
            {face ? (
              <span className={cx("fa-sidebar-menu-face", classes.face)}>{face}</span>
            ) : (
              <>
                {icon ? <span className="fa-sidebar-menu-icon">{icon}</span> : null}
                {detail ? (
                  <span className={cx("fa-sidebar-menu-text", classes.text)}>
                    <span className={cx("fa-sidebar-menu-label", classes.label)}>{children}</span>
                    <span className={cx("fa-sidebar-menu-detail", classes.detail)}>{detail}</span>
                  </span>
                ) : (
                  <span className={cx("fa-sidebar-menu-label", classes.label)}>{children}</span>
                )}
              </>
            )}
            {count !== undefined ? <span className={cx("fa-item-trail fa-sidebar-menu-count", classes.count)}>{numberFormat(locale).format(count)}</span> : null}
            {discloses ? <IconChevronDown className={cx("fa-sidebar-chevron", classes.chevron)} aria-hidden /> : null}
          </>
        ),
      },
      {
        ...rest,
        ...(href ? { href } : {}),
        "data-active": active ? "" : undefined,
        "data-disabled": disabled ? "" : undefined,
        "data-size": size,
        "data-detail": detail || face ? "" : undefined,
        "data-sidebar-key": item?.key,
      } as ComponentProps<"button">
    ),
  })
  const labelText = typeof children === "string" ? children : typeof tooltip === "string" ? tooltip : (rest["aria-label"] ?? "")
  const side = ctx.side === "end" ? "inline-start" : "inline-end"
  const Trigger = flyout ? item?.parts?.Trigger : undefined
  const trigger = Trigger ? <Trigger openOnHover delay={80} closeDelay={160} render={element} /> : element
  // Only an icon strip shows labels as tooltips; other sidebars skip the tooltip entirely.
  const tips = config?.collapsible === "icon" && placement === "pane"
  return (
    <>
      {tips ? (
        <Tooltip content={tooltip ?? children} side={side} enabled={iconMode && !flyout} describe={tooltip !== undefined && tooltip !== children ? undefined : false}>
          {trigger}
        </Tooltip>
      ) : (
        trigger
      )}
      {item?.hasSub && link && !flyout ? (
        <Button
          variant="ghost"
          size="xs"
          className="fa-sidebar-menu-sub-toggle"
          icon={<IconChevronDown className="fa-sidebar-chevron" />}
          aria-label={item.subOpen ? messages.collapseGroup({ group: labelText }) : messages.expandGroup({ group: labelText })}
          aria-expanded={item.subOpen}
          aria-controls={item.subPanelId}
          onClick={() => item.setSubOpen(!item.subOpen)}
        />
      ) : null}
    </>
  )
}

export interface SidebarMenuActionProps extends Omit<ButtonProps, "variant" | "size" | "children"> {
  /** The action's name and tooltip. @defaultValue "More actions" */
  "aria-label"?: string
  /** Show only while the item is hovered or holds focus (always on touch screens, R11.7). */
  showOnHover?: boolean
}

/**
 * A small icon button at the item's trailing edge (⋯ by default), beside the MenuButton rather
 * than inside it. Use it as a menu's trigger: `<Menu.Trigger render={<Sidebar.MenuAction />} />`.
 * Hidden in icon mode.
 */
function SidebarMenuAction({ showOnHover = false, icon, className, "aria-label": ariaLabel, ...rest }: SidebarMenuActionProps) {
  const messages = useMessages(sidebarMessages)
  return (
    <Button
      variant="ghost"
      size="xs"
      {...rest}
      icon={icon ?? <IconMoreHorizontal />}
      aria-label={ariaLabel ?? messages.moreActions}
      className={cx("fa-sidebar-menu-action", className)}
      data-show-on-hover={showOnHover ? "" : undefined}
    />
  )
}

export type SidebarMenuBadgeProps = CountBadgeProps

/**
 * A count at the item's trailing edge (locale digits, tabular figures), read with the item as
 * its description. In icon mode it moves onto the icon's corner.
 */
function SidebarMenuBadge({ className, overlay, ...rest }: SidebarMenuBadgeProps) {
  const item = useContext(ItemContext)
  const iconMode = useContext(SidebarIconMode)
  const { setHasBadge } = item ?? {}
  useIsoLayoutEffect(() => {
    setHasBadge?.(true)
    return () => setHasBadge?.(false)
  }, [setHasBadge])
  return <CountBadge {...rest} id={item?.badgeId} overlay={overlay ?? iconMode} className={cx("fa-sidebar-menu-badge", className)} />
}

/** Where sub-menu items render: in the disclosed list, or in the icon-mode flyout menu. */
const SubPlacement = /* @__PURE__ */ createContext<"inline" | "flyout">("inline")

export interface SidebarMenuSubProps extends Omit<ComponentProps<"ul">, "id"> {
  /** Remembers whether the sub-menu is open under this key (with the provider's storageKey). Unique within the sidebar. */
  id?: string
  /** Whether the sub-menu is open (controlled). Pair with `onOpenChange`. */
  open?: boolean
  /** Whether it starts open when nothing is remembered. @defaultValue false */
  defaultOpen?: boolean
  /** Called with the next open state when the person toggles it. */
  onOpenChange?: (open: boolean) => void
}

/** Nested items under a MenuItem (a direct child of it). Disclosed by the parent's button; a flyout menu from the icon in icon mode. */
function SidebarMenuSub({ id: _id, open: _open, defaultOpen: _defaultOpen, onOpenChange: _onOpenChange, className, children, ...rest }: SidebarMenuSubProps) {
  const item = useContext(ItemContext)
  const ctx = useSidebarInternal()
  const Popup = item?.flyout ? item.parts?.Popup : undefined
  return (
    <>
      <Collapsible.Panel id={item?.subPanelId} keepMounted className="fa-collapse fa-sidebar-menu-sub-panel">
        <SubPlacement.Provider value="inline">
          <ul {...rest} className={cx("fa-sidebar-menu-sub", className)}>
            {children}
          </ul>
        </SubPlacement.Provider>
      </Collapsible.Panel>
      {Popup ? (
        <Popup side={ctx.side} label={item?.label}>
          <SubPlacement.Provider value="flyout">{children}</SubPlacement.Provider>
        </Popup>
      ) : null}
    </>
  )
}

/** One nested entry. */
function SidebarMenuSubItem({ className, children, ...rest }: ComponentProps<"li">) {
  const placement = useContext(SubPlacement)
  if (placement === "flyout") return <>{children}</>
  return (
    <li {...rest} className={cx("fa-sidebar-menu-sub-item", className)}>
      {children}
    </li>
  )
}

export interface SidebarMenuSubButtonProps extends Omit<ComponentProps<"a">, "children"> {
  /** The label. */
  children: ReactNode
  /** The current page: `aria-current="page"` and the selected fill. */
  active?: boolean
  /** Render your router's link instead: `render={<Link to="/projects/atlas" />}`. Without `href` or `render`, a button. */
  render?: ReactElement
  /** The row height. @defaultValue "md" */
  size?: "sm" | "md"
}

/** A nested link or button: a row in the disclosed list, or a link item in the icon-mode flyout. */
function SidebarMenuSubButton({ children, active = false, render, size = "md", className, onClick, href, ...rest }: SidebarMenuSubButtonProps) {
  const ctx = useSidebarInternal()
  const placement = useContext(SubPlacement)
  const parts = useContext(ItemContext)?.parts
  const sheet = useContext(SidebarPlacement) === "sheet"
  const link = Boolean(href || render)
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event)
    if (!event.defaultPrevented && sheet) ctx.changeMobile(false, "navigation", event.nativeEvent)
  }
  const inline = useRender({
    defaultTagName: link ? "a" : "button",
    render,
    props: mergeProps<"a">(
      {
        className: cx("fa-item fa-sidebar-menu-sub-button", className),
        "aria-current": active ? "page" : undefined,
        onClick: handleClick,
        children: <span className="fa-sidebar-menu-label">{children}</span>,
      },
      { ...rest, ...(href ? { href } : { type: link ? undefined : "button" }), "data-active": active ? "" : undefined, "data-size": size } as unknown as ComponentProps<"a">
    ),
  })
  if (placement === "inline" || !parts) return inline
  const itemProps = {
    className: cx("fa-item fa-menu-item fa-sidebar-flyout-item", className),
    "aria-current": active ? ("page" as const) : undefined,
    "data-active": active ? "" : undefined,
  }
  return link ? (
    <parts.LinkItem {...itemProps} href={href} render={render} closeOnClick onClick={handleClick}>
      <span className="fa-item-label">{children}</span>
    </parts.LinkItem>
  ) : (
    <parts.Item {...itemProps} onClick={handleClick as unknown as ComponentProps<typeof parts.Item>["onClick"]}>
      <span className="fa-item-label">{children}</span>
    </parts.Item>
  )
}

export interface SidebarMatchProps {
  /** The text to show: an item's label. */
  text: string
  /** The filter's query: its matches in `text` are marked, ignoring case and accents. Blank marks nothing. */
  query: string
}

/**
 * An item's label with the filter's matches marked, for a sidebar whose Search filters its
 * items: `<Sidebar.MenuButton><Sidebar.Match text={label} query={query} /></Sidebar.MenuButton>`.
 * The marks are a visual aid; the label reads as plain text.
 */
function SidebarMatch({ text, query }: SidebarMatchProps) {
  return <Highlight text={text} query={query} />
}

export interface SidebarMenuSkeletonProps extends Omit<ComponentProps<"li">, "children"> {
  /** Reserve the icon's box, as the loaded item will have. */
  icon?: boolean
  /** The label placeholder's width: a length or percentage. @defaultValue "62%" */
  width?: string
  /** The row height of the item it stands for. @defaultValue "md" */
  size?: SidebarMenuButtonSize
}

/** A loading row with the same box as a MenuButton of the same size, so the loaded item replaces it in place (R9.3). */
function SidebarMenuSkeleton({ icon = false, width = "62%", size = "md", className, ...rest }: SidebarMenuSkeletonProps) {
  return (
    <li {...rest} aria-hidden className={cx("fa-sidebar-menu-item", className)} data-size={size}>
      <div className="fa-sidebar-menu-skeleton" data-size={size}>
        {icon ? (
          <span className="fa-sidebar-menu-icon">
            <Skeleton.Block className="fa-sidebar-skeleton-icon" radius="check" />
          </span>
        ) : null}
        <Skeleton.Text type="body" width={width} className="fa-sidebar-menu-label" />
      </div>
    </li>
  )
}

export {
  SidebarMatch,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarMenuSkeleton,
}
