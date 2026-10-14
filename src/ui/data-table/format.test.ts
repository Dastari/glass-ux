import { describe, expect, it } from "vitest"
import { formatCount, formatRelative, formatWithUnit } from "./format.js"
import { pageSelection, selectRange, toggleOne, togglePage } from "./selection.js"

describe("format", () => {
  it("puts a thin space before units", () => {
    expect(formatWithUnit(7.8, "GB", 1)).toBe("7.8 GB")
    expect(formatWithUnit(42, "%")).toBe("42%")
  })

  it("formats recent times relatively", () => {
    const now = Date.UTC(2026, 9, 13, 1, 0)
    expect(formatRelative(now - 20_000, now)).toBe("just now")
    expect(formatRelative(now - 2 * 60_000, now)).toBe("2 min ago")
    expect(formatRelative(now - 3 * 3_600_000, now)).toBe("3 h ago")
    expect(formatRelative(now - 2 * 86_400_000, now)).toBe("2 days ago")
  })

  it("pluralises counts", () => {
    expect(formatCount(1, { one: "endpoint", other: "endpoints" })).toBe("1 endpoint")
    expect(formatCount(1284, { one: "endpoint", other: "endpoints" })).toBe("1,284 endpoints")
  })
})

describe("selection", () => {
  const order = ["a", "b", "c", "d", "e"]

  it("selects an inclusive range in either direction", () => {
    expect(Object.keys(selectRange({}, order, "b", "d", true))).toEqual(["b", "c", "d"])
    expect(Object.keys(selectRange({}, order, "d", "b", true))).toEqual(["b", "c", "d"])
  })

  it("clears a range and keeps selections outside it", () => {
    const next = selectRange({ a: true, b: true, c: true, x: true }, order, "a", "b", false)
    expect(next).toEqual({ c: true, x: true })
  })

  it("falls back to a single row without an anchor", () => {
    expect(selectRange({}, order, null, "c", true)).toEqual({ c: true })
  })

  it("toggles one row and whole pages", () => {
    expect(toggleOne({ a: true }, "a")).toEqual({})
    expect(togglePage({ x: true }, ["a", "b"], true)).toEqual({ x: true, a: true, b: true })
    expect(pageSelection({ a: true }, ["a", "b"])).toBe("some")
    expect(pageSelection({ a: true, b: true }, ["a", "b"])).toBe("all")
    expect(pageSelection({}, ["a", "b"])).toBe("none")
  })
})
