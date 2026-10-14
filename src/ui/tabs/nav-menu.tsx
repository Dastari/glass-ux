import type { ComponentProps, ReactNode } from "react"
import { cx } from "../../lib/cx.js"
import { Menu } from "../menu/index.js"

export interface NavMenuPopupProps extends Omit<ComponentProps<typeof Menu.Popup>, "className" | "children"> {
  children: ReactNode
  className?: string
}

/**
 * The popup for the navigation menus (tab overflow, breadcrumb siblings and ancestors, the
 * narrow vertical-tab picker). It is the shared `Menu.Popup`, so these menus are the same
 * glass, motion and geometry as every other menu; `fa-nav-menu` only adds sizing hooks.
 */
export function NavMenuPopup({ children, className, ...rest }: NavMenuPopupProps) {
  return (
    <Menu.Popup {...rest} className={cx("fa-nav-menu", className)}>
      {children}
    </Menu.Popup>
  )
}
