import { Menu as BaseMenu } from "@base-ui/react/menu"
import { useId, type ComponentProps, type ReactNode } from "react"
import { IconCheck, IconChevronRight } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { usePopupMetrics } from "../../lib/popup-metrics.js"
import { Kbd, useAriaShortcut } from "../kbd/index.js"

/*
 * Positioners take px numbers, so offsets are measured from tokens by usePopupMetrics and
 * follow --ui-scale, density and line weight:
 *   offset          the space between a trigger and its menu (--popup-offset)
 *   submenuInset    --inset-overlay + --border-width, so a submenu's first row lines up
 *                   with the row that opened it
 *   collision       the distance kept from the viewport edge (--popup-collision)
 */

export type MenuItemTone = "default" | "danger"

interface ItemContentProps {
  icon?: ReactNode
  children: ReactNode
  /** Keyboard shortcut shown with the control, using the host platform’s modifier keys. */
  shortcut?: string | undefined
  /** Ancestor trail before the current item. */
  trail?: ReactNode
}

/**
 * The inside of every menu row (menu, context menu, action menus, previews): icon, label,
 * then a trailing shortcut or chevron. One layout, so every list reads the same.
 */
export function MenuItemContent({ icon, children, shortcut, trail }: ItemContentProps) {
  return (
    <>
      {icon}
      <span className="fa-item-label">{children}</span>
      {shortcut ? <Kbd keys={shortcut} variant="text" className="fa-item-trail" /> : null}
      {trail}
    </>
  )
}

function Chevron() {
  return (
    <span className="fa-item-trail fa-menu-chevron" aria-hidden>
      <IconChevronRight />
    </span>
  )
}

/** The one line under a disabled row that says why it is disabled (R12.3). */
function DisabledReason({ id, children }: { id: string; children: ReactNode }) {
  return (
    <div id={id} className="fa-menu-reason">
      {children}
    </div>
  )
}

export interface MenuPopupProps extends Omit<ComponentProps<typeof BaseMenu.Popup>, "className"> {
  className?: string
  /** Preferred side of the anchor; collision handling may choose another side. */
  side?: ComponentProps<typeof BaseMenu.Positioner>["side"]
  /** Alignment of the overlay relative to its anchor. */
  align?: ComponentProps<typeof BaseMenu.Positioner>["align"]
  /** Gap between the overlay and its anchor, in CSS pixels. Defaults to `--popup-offset`. */
  sideOffset?: number
  /** Alignment offset from the anchor, in CSS pixels. */
  alignOffset?: number
}

/** Portal + positioner + glass popup. Works for Menu, ContextMenu and submenus alike. */
function MenuPopup({ side, align = "start", sideOffset, alignOffset = 0, className, children, ...rest }: MenuPopupProps) {
  const popup = usePopupMetrics()
  return (
    <BaseMenu.Portal>
      <BaseMenu.Positioner
        className="fa-menu-positioner"
        side={side}
        align={align}
        sideOffset={sideOffset ?? popup.offset}
        alignOffset={alignOffset}
        collisionPadding={popup.collisionPadding}
      >
        <BaseMenu.Popup {...rest} className={cx("glass-overlay fa-popup fa-menu", className)}>
          {children}
        </BaseMenu.Popup>
      </BaseMenu.Positioner>
    </BaseMenu.Portal>
  )
}

export interface MenuItemProps extends Omit<ComponentProps<typeof BaseMenu.Item>, "className" | "children"> {
  className?: string
  icon?: ReactNode
  children: ReactNode
  /** e.g. "mod+shift+r". Shown in the platform's form at the trailing edge. */
  shortcut?: string | undefined
  /** A short trailing note: the current value of what the row changes ("last 7 days"). */
  trail?: ReactNode
  tone?: MenuItemTone
  /** Disable the row and say why, on a line beneath it. */
  disabledReason?: string | null | undefined
  /**
   * Consecutive rows disabled for the same reason show it once, under the last of them:
   * the others pass `reasonShown={false}` and point at that line with `reasonId`.
   */
  reasonShown?: boolean
  /** ID of the element explaining the current state. */
  reasonId?: string
}

function MenuItem({ icon, children, shortcut, trail, tone = "default", disabled, disabledReason, reasonShown = true, reasonId: sharedReasonId, className, ...rest }: MenuItemProps) {
  const ownReasonId = useId()
  const reasonId = sharedReasonId ?? ownReasonId
  const aria = useAriaShortcut(shortcut)
  const isDisabled = Boolean(disabled || disabledReason)
  return (
    <>
      <BaseMenu.Item
        {...rest}
        disabled={isDisabled}
        aria-describedby={disabledReason ? reasonId : undefined}
        aria-keyshortcuts={aria}
        className={cx("fa-item fa-menu-item", className)}
        data-tone={tone === "danger" ? "danger" : undefined}
      >
        <MenuItemContent icon={icon} shortcut={shortcut} trail={trail ? <span className="fa-item-trail fa-menu-trail">{trail}</span> : undefined}>
          {children}
        </MenuItemContent>
      </BaseMenu.Item>
      {disabledReason && reasonShown ? <DisabledReason id={reasonId}>{disabledReason}</DisabledReason> : null}
    </>
  )
}

export interface MenuLinkItemProps extends Omit<ComponentProps<typeof BaseMenu.LinkItem>, "className" | "children"> {
  className?: string
  icon?: ReactNode
  children: ReactNode
}

function MenuLinkItem({ icon, children, className, ...rest }: MenuLinkItemProps) {
  return (
    <BaseMenu.LinkItem {...rest} className={cx("fa-item fa-menu-item", className)}>
      <MenuItemContent icon={icon}>{children}</MenuItemContent>
    </BaseMenu.LinkItem>
  )
}

export interface MenuCheckboxItemProps extends Omit<ComponentProps<typeof BaseMenu.CheckboxItem>, "className" | "children"> {
  className?: string
  children: ReactNode
  /** Keyboard shortcut shown with the control, using the host platform’s modifier keys. */
  shortcut?: string
  /** A short trailing note in the trail slot, e.g. where a hidden column went ("In row details"). */
  trail?: ReactNode
}

/** A toggle. The tick takes the icon slot so labels stay aligned with icon rows. */
function MenuCheckboxItem({ children, shortcut, trail, className, ...rest }: MenuCheckboxItemProps) {
  return (
    <BaseMenu.CheckboxItem {...rest} className={cx("fa-item fa-menu-item", className)}>
      <span className="fa-item-icon fa-menu-indicator" aria-hidden>
        <BaseMenu.CheckboxItemIndicator className="fa-menu-check" keepMounted>
          <IconCheck />
        </BaseMenu.CheckboxItemIndicator>
      </span>
      <MenuItemContent shortcut={shortcut} trail={trail ? <span className="fa-item-trail">{trail}</span> : undefined}>
        {children}
      </MenuItemContent>
    </BaseMenu.CheckboxItem>
  )
}

export interface MenuRadioItemProps extends Omit<ComponentProps<typeof BaseMenu.RadioItem>, "className" | "children"> {
  className?: string
  children: ReactNode
  /** Keyboard shortcut shown with the control, using the host platform’s modifier keys. */
  shortcut?: string
}

/** One choice in a RadioGroup. The dot takes the icon slot. */
function MenuRadioItem({ children, shortcut, className, ...rest }: MenuRadioItemProps) {
  return (
    <BaseMenu.RadioItem {...rest} className={cx("fa-item fa-menu-item", className)}>
      <span className="fa-item-icon fa-menu-indicator" aria-hidden>
        <BaseMenu.RadioItemIndicator className="fa-menu-dot" keepMounted />
      </span>
      <MenuItemContent shortcut={shortcut}>{children}</MenuItemContent>
    </BaseMenu.RadioItem>
  )
}

function MenuGroupLabel({ className, ...rest }: ComponentProps<typeof BaseMenu.GroupLabel> & { className?: string }) {
  return <BaseMenu.GroupLabel {...rest} className={cx("fa-popup-group-label", className)} />
}

/** A divider between action groups. At most two per menu (R5.8); the last sets off destructive actions. */
function MenuSeparator({ className, ...rest }: ComponentProps<typeof BaseMenu.Separator> & { className?: string }) {
  return <BaseMenu.Separator {...rest} className={cx("fa-popup-separator", className)} />
}

/** Groups rows without a divider; consecutive groups are set apart by space (R5.8). */
function MenuGroup({ className, ...rest }: ComponentProps<typeof BaseMenu.Group> & { className?: string }) {
  return <BaseMenu.Group {...rest} className={cx("fa-menu-group", className)} />
}

export interface MenuSubmenuProps {
  icon?: ReactNode
  label: ReactNode
  disabled?: boolean
  /** Explains why the action is unavailable; the control remains focusable so the reason is accessible. */
  disabledReason?: string | null | undefined
  /** Whether the state’s explanation is visible. */
  reasonShown?: boolean
  /** ID of the element explaining the current state. */
  reasonId?: string
  tone?: MenuItemTone
  children: ReactNode
}

/** A row that opens a nested menu (→ / hover), with a chevron. */
function MenuSubmenu({ icon, label, disabled, disabledReason, reasonShown = true, reasonId: sharedReasonId, tone = "default", children }: MenuSubmenuProps) {
  const ownReasonId = useId()
  const reasonId = sharedReasonId ?? ownReasonId
  const isDisabled = Boolean(disabled || disabledReason)
  const { submenuInset } = usePopupMetrics()
  return (
    <>
      <BaseMenu.SubmenuRoot disabled={isDisabled}>
        <BaseMenu.SubmenuTrigger
          disabled={isDisabled}
          aria-describedby={disabledReason ? reasonId : undefined}
          className="fa-item fa-menu-item"
          data-tone={tone === "danger" ? "danger" : undefined}
        >
          <MenuItemContent icon={icon} trail={<Chevron />}>
            {label}
          </MenuItemContent>
        </BaseMenu.SubmenuTrigger>
        <MenuPopup side="inline-end" align="start" sideOffset={0} alignOffset={-submenuInset}>
          {children}
        </MenuPopup>
      </BaseMenu.SubmenuRoot>
      {disabledReason && reasonShown ? <DisabledReason id={reasonId}>{disabledReason}</DisabledReason> : null}
    </>
  )
}

/* ── Static preview ──────────────────────────────────────────────────────────
 * The gallery shows menus open without a modal popup. These render the same classes and
 * the same row content, with no behaviour.
 */

function PreviewSurface({ className, label, children }: { className?: string; label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} className={cx("glass-overlay fa-popup fa-menu fa-menu-preview", className)}>
      {children}
    </div>
  )
}

interface PreviewItemProps extends ItemContentProps {
  tone?: MenuItemTone
  /** Marks the item reached through keyboard or pointer navigation. */
  highlighted?: boolean
  open?: boolean
  /** Explains why the action is unavailable; the control remains focusable so the reason is accessible. */
  disabledReason?: string | null | undefined
  /** Whether the state’s explanation is visible. */
  reasonShown?: boolean
  /** Nested menu content. */
  submenu?: boolean
  /** Controlled checked state. The type specifies whether mixed state is supported. */
  checked?: boolean
  /** Uses mutually exclusive radio selection. */
  radio?: boolean
}

function PreviewItem({ icon, children, shortcut, tone, highlighted, open, disabledReason, reasonShown = true, submenu, checked, radio }: PreviewItemProps) {
  const indicator =
    checked === undefined ? null : (
      <span className="fa-item-icon fa-menu-indicator" aria-hidden>
        {radio ? (
          <span className="fa-menu-dot" data-checked={checked ? "" : undefined} data-unchecked={checked ? undefined : ""} />
        ) : (
          <span className="fa-menu-check" data-checked={checked ? "" : undefined} data-unchecked={checked ? undefined : ""}>
            <IconCheck />
          </span>
        )}
      </span>
    )
  return (
    <>
      <div
        className="fa-item fa-menu-item"
        data-tone={tone === "danger" ? "danger" : undefined}
        data-highlighted={highlighted ? "" : undefined}
        data-popup-open={open ? "" : undefined}
        data-disabled={disabledReason ? "" : undefined}
      >
        {indicator}
        <MenuItemContent icon={icon} shortcut={shortcut} trail={submenu ? <Chevron /> : undefined}>
          {children}
        </MenuItemContent>
      </div>
      {disabledReason && reasonShown ? <div className="fa-menu-reason">{disabledReason}</div> : null}
    </>
  )
}

/**
 * For a list of rows, whether each shows its disabled reason: only the last of a run of
 * consecutive rows with the same reason does. Returns the index of the row that shows it.
 */
export function reasonRuns(reasons: ReadonlyArray<string | null | undefined>): number[] {
  const owner: number[] = []
  for (let index = reasons.length - 1; index >= 0; index--) {
    const reason = reasons[index]
    const next = reasons[index + 1]
    owner[index] = reason && reason === next ? (owner[index + 1] ?? index) : index
  }
  return owner
}

/**
 * A dropdown menu of actions built from parts on Base UI's menu: `Root` (state), `Trigger`,
 * `Popup`, items (`Item`, `LinkItem`, `CheckboxItem`, `RadioGroup`/`RadioItem`), `Group`,
 * `GroupLabel`, `Separator` and `Submenu`. Disabled items can show their reason.
 */
export const Menu = {
  Root: BaseMenu.Root,
  Trigger: BaseMenu.Trigger,
  Popup: MenuPopup,
  Item: MenuItem,
  LinkItem: MenuLinkItem,
  CheckboxItem: MenuCheckboxItem,
  RadioGroup: BaseMenu.RadioGroup,
  RadioItem: MenuRadioItem,
  Group: MenuGroup,
  GroupLabel: MenuGroupLabel,
  Separator: MenuSeparator,
  Submenu: MenuSubmenu,
}

/** Static, non-interactive menu parts that render a menu's appearance in place, for documentation and previews. */
export const MenuPreview = {
  Surface: PreviewSurface,
  Item: PreviewItem,
  Group: ({ children }: { children: ReactNode }) => <div className="fa-menu-group">{children}</div>,
  GroupLabel: ({ children }: { children: ReactNode }) => <div className="fa-popup-group-label">{children}</div>,
  Separator: () => <div className="fa-popup-separator" />,
}

export { BaseMenu as MenuPrimitive }
