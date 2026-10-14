import { describe, expect, it } from "vitest"
import { collapseCrumbs } from "./breadcrumb.js"

// Endpoints › Northstar Studio › NST-C106 › Software
const widths = [90, 220, 120, 100]
const ellipsis = 40

describe("collapseCrumbs", () => {
  it("shows every crumb when they fit", () => {
    expect(collapseCrumbs(widths, ellipsis, 600)).toEqual({ kind: "full" })
  })

  it("collapses the middle first, keeping the longest tail that fits", () => {
    // 90 + 40 + 120 + 100 = 350
    expect(collapseCrumbs(widths, ellipsis, 400)).toEqual({ kind: "middle", suffix: 2 })
  })

  it("falls back to parent · current when even the middle form does not fit", () => {
    expect(collapseCrumbs(widths, ellipsis, 300)).toEqual({ kind: "compact" })
  })

  it("keeps parent · current while the current crumb and a readable parent fit", () => {
    // ellipsis 40 + parent at its minimum 56 + current 100 = 196
    expect(collapseCrumbs(widths, ellipsis, 196)).toEqual({ kind: "compact" })
  })

  it("folds to the current crumb alone when even that does not fit", () => {
    expect(collapseCrumbs(widths, ellipsis, 195)).toEqual({ kind: "current" })
    expect(collapseCrumbs(widths, ellipsis, 120, 20)).toEqual({ kind: "current" })
  })

  it("needs no ellipsis for a two-crumb trail before folding", () => {
    // parent min 56 + current 100
    expect(collapseCrumbs([90, 100], ellipsis, 156)).toEqual({ kind: "compact" })
    expect(collapseCrumbs([90, 100], ellipsis, 150)).toEqual({ kind: "current" })
  })

  it("never collapses a single crumb", () => {
    expect(collapseCrumbs([500], ellipsis, 100)).toEqual({ kind: "full" })
  })

  it("goes straight to compact for two or three crumbs", () => {
    expect(collapseCrumbs([200, 200, 200], ellipsis, 300)).toEqual({ kind: "compact" })
  })
})
