/**
 * The router adapter for link-mode vertical tabs. The only file of the component that knows
 * about TanStack Router; `VerticalTabNav` stays router-agnostic.
 */
import { Link } from "@tanstack/react-router"
import type { ReactNode } from "react"
import { useRouteTab, type RouteTabItem } from "../tabs/tab-link.js"
import { VerticalTabNav, type VerticalTabLinkRenderProps, type VerticalTabsLayout } from "./vertical-tabs.js"

export type RouteVerticalTabItem = RouteTabItem

function renderLink(item: RouteVerticalTabItem, props: VerticalTabLinkRenderProps) {
  return (
    <Link
      {...item.link}
      {...props}
      activeOptions={{ exact: true, includeSearch: true }}
      activeProps={{}}
      inactiveProps={{}}
    />
  )
}

export interface RouteVerticalTabsProps {
  items: RouteVerticalTabItem[]
  /** Accessible name when a visible label does not name the control. */
  "aria-label": string
  /** Layout or presentation mode. */
  layout?: VerticalTabsLayout
  /** The section's content: normally the route's `<Outlet />`. */
  children?: ReactNode
  className?: string
}

/**
 * L3 sections as routes — the default (R6.2): `/settings/security/sessions`. The current
 * section is read from the location (child routes stay inside their section); every row,
 * chip and picker entry is a link.
 */
export function RouteVerticalTabs({ items, ...rest }: RouteVerticalTabsProps) {
  const value = useRouteTab(items)
  return <VerticalTabNav {...rest} items={items} value={value} renderLink={renderLink} />
}
