/**
 * The icon strip's flyout menus: a sub-menu opens as a menu from its parent's icon. Only a
 * `collapsible="icon"` sidebar with sub-menus needs them, so the parts load after it mounts
 * rather than with the sidebar (Base UI Menu stays out of the initial chunk).
 */
import { Menu as BaseMenu } from "@base-ui/react/menu"
import type { ReactNode } from "react"
import { usePopupMetrics } from "../../lib/popup-metrics.js"
import { Menu } from "../menu/index.js"
import type { SidebarSide } from "./context.js"

export interface SidebarFlyoutPopupProps {
  /** The sidebar's edge: the menu opens towards the content. */
  side: SidebarSide
  /** The parent item's label, shown as the menu's heading. */
  label: ReactNode
  children: ReactNode
}

/** The flyout menu beside the icon strip, headed by the parent's label. */
function FlyoutPopup({ side, label, children }: SidebarFlyoutPopupProps) {
  const popup = usePopupMetrics()
  // The flyout clears the strip: the button sits --_pad (0.75rem) and a border inside the pane's edge.
  const clearance = popup.offset + 0.75 * popup.rem + 1
  return (
    <Menu.Popup side={side === "end" ? "inline-start" : "inline-end"} align="start" sideOffset={clearance} className="fa-sidebar-flyout">
      <BaseMenu.Group>
        {label ? <BaseMenu.GroupLabel className="fa-popup-group-label">{label}</BaseMenu.GroupLabel> : null}
        {children}
      </BaseMenu.Group>
    </Menu.Popup>
  )
}

/** The menu parts a flyout item uses. */
export const flyoutParts = {
  Root: BaseMenu.Root,
  Trigger: BaseMenu.Trigger,
  Popup: FlyoutPopup,
  Item: BaseMenu.Item,
  LinkItem: BaseMenu.LinkItem,
}

export type SidebarFlyoutParts = typeof flyoutParts
