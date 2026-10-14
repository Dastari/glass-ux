/**
 * The router adapter for link-mode tabs: the only part of the tab components that knows
 * about TanStack Router. Core tabs (`Tabs`, `TabNav`, `VerticalTabNav`) stay router-agnostic.
 */
import { Link, useMatchRoute, useRouterState, type LinkProps } from "@tanstack/react-router"
import { TabNav, type TabItem, type TabLinkRenderProps } from "./tabs.js"

export interface RouteTabItem extends TabItem {
  /** Where the tab goes: TanStack Router link options (`to`, `params`, `search`). */
  link: LinkProps
  /**
   * Active only on exactly this route (an Overview index tab). By default a tab is active on
   * its route and every child route beneath it (`/endpoints/A/performance/cpu` is inside
   * Performance).
   */
  exact?: boolean
}

export interface RouteMatchQuery {
  /** Match the route and every child route beneath it. */
  fuzzy: boolean
  /** Also require the link's search params. */
  includeSearch: boolean
}

/**
 * Pick the tab the location is inside, given a matcher for one link. Every tab is matched
 * fuzzily (its child routes count) unless it is `exact`; a tab that names search params
 * must match them; the most specific match (longest path, then search) wins. Pure, so it is
 * tested without a router.
 */
export function pickRouteTab<T extends { value: string; link: { to?: unknown; search?: unknown }; exact?: boolean }>(
  items: readonly T[],
  matches: (item: T, query: RouteMatchQuery) => boolean
): string | null {
  let best: string | null = null
  let bestScore = -1
  for (const item of items) {
    const search = typeof item.link.search === "object" && item.link.search !== null ? item.link.search : undefined
    const bySearch = search !== undefined && Object.keys(search).length > 0
    if (!matches(item, { fuzzy: !item.exact, includeSearch: bySearch })) continue
    const score = String(item.link.to ?? "").length * 2 + (bySearch ? 1 : 0)
    if (score > bestScore) {
      best = item.value
      bestScore = score
    }
  }
  return best
}

/** The value of the tab the current location is inside (see pickRouteTab). */
export function useRouteTab(items: readonly RouteTabItem[]): string | null {
  const matchRoute = useMatchRoute()
  // Subscribing to the location re-renders (and re-matches) on every navigation.
  useRouterState({ select: (state) => state.location.href })
  return pickRouteTab(items, (item, query) => matchRoute({ ...item.link, ...query } as Parameters<typeof matchRoute>[0]) !== false)
}

/** Render a tab (or a More-menu row) as a router link. Active state comes from TabNav. */
export function renderRouteTabLink(item: RouteTabItem, props: TabLinkRenderProps) {
  return (
    <Link
      {...item.link}
      {...props}
      // TabNav owns aria-current; keep Link from marking other tabs active by its own rules.
      activeOptions={{ exact: true, includeSearch: true }}
      activeProps={{}}
      inactiveProps={{}}
    />
  )
}

export interface RouteTabsProps {
  items: RouteTabItem[]
  /** Accessible name when a visible label does not name the control. */
  "aria-label": string
  className?: string
}

/**
 * L2 tabs as routes — the default (R6.2). Identical to `Tabs` in look and keyboard; the
 * active tab is read from the location and every tab, including those in More, is a link.
 */
export function RouteTabs({ items, ...rest }: RouteTabsProps) {
  const value = useRouteTab(items)
  return <TabNav {...rest} items={items} value={value} renderLink={renderRouteTabLink} />
}
