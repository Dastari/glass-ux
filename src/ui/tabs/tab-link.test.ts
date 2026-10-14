import { describe, expect, it } from "vitest"
import { pickRouteTab, type RouteMatchQuery } from "./tab-link.js"

interface Item {
  value: string
  link: { to: string; search?: Record<string, string> }
  exact?: boolean
}

/** A stand-in for the router: path prefix (fuzzy) or equality, plus partial search. */
function matcher(path: string, search: Record<string, string> = {}) {
  return (item: Item, query: RouteMatchQuery) => {
    const to = item.link.to
    const pathOk = query.fuzzy ? path === to || path.startsWith(`${to}/`) : path === to
    const searchOk = !query.includeSearch || Object.entries(item.link.search ?? {}).every(([k, v]) => search[k] === v)
    return pathOk && searchOk
  }
}

const TABS: Item[] = [
  { value: "overview", link: { to: "/endpoints/a" }, exact: true },
  { value: "performance", link: { to: "/endpoints/a/performance" } },
  { value: "software", link: { to: "/endpoints/a/software" } },
]

describe("pickRouteTab", () => {
  it("activates the tab whose route is the location", () => {
    expect(pickRouteTab(TABS, matcher("/endpoints/a/software"))).toBe("software")
    expect(pickRouteTab(TABS, matcher("/endpoints/a"))).toBe("overview")
  })

  it("keeps child routes inside their tab", () => {
    expect(pickRouteTab(TABS, matcher("/endpoints/a/performance/cpu"))).toBe("performance")
  })

  it("lets the most specific match win over a fuzzy index tab", () => {
    const fuzzyIndex = TABS.map((tab) => ({ ...tab, exact: false }))
    expect(pickRouteTab(fuzzyIndex, matcher("/endpoints/a/performance"))).toBe("performance")
  })

  it("distinguishes views of one path by search params", () => {
    const views: Item[] = [
      { value: "table", link: { to: "/tool" } },
      { value: "json", link: { to: "/tool", search: { view: "json" } } },
    ]
    expect(pickRouteTab(views, matcher("/tool", { view: "json" }))).toBe("json")
    expect(pickRouteTab(views, matcher("/tool"))).toBe("table")
  })

  it("returns null outside every tab", () => {
    expect(pickRouteTab(TABS, matcher("/organisations"))).toBeNull()
  })
})
