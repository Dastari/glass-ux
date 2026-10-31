import { describe, expect, it } from "vitest"
import { collator, dateTimeFormat, formatPercent, listFormat, numberFormat, pluralRules, relativeTimeFormat, segmenter } from "./intl.js"

describe("cached Intl formatters", () => {
  it("returns the same instance for the same locale and options", () => {
    expect(relativeTimeFormat("en", { style: "short" })).toBe(relativeTimeFormat("en", { style: "short" }))
    expect(listFormat("en", { type: "unit" })).toBe(listFormat("en", { type: "unit" }))
    expect(pluralRules("en")).toBe(pluralRules("en"))
    expect(pluralRules("en", { type: "ordinal" })).toBe(pluralRules("en", { type: "ordinal" }))
    expect(numberFormat("en", { style: "percent" })).toBe(numberFormat("en", { style: "percent" }))
    expect(dateTimeFormat("en", { month: "long" })).toBe(dateTimeFormat("en", { month: "long" }))
    expect(collator("en", { numeric: true })).toBe(collator("en", { numeric: true }))
  })

  it("returns different instances for different locales or options", () => {
    expect(relativeTimeFormat("en", { style: "short" })).not.toBe(relativeTimeFormat("en", { style: "long" }))
    expect(relativeTimeFormat("en")).not.toBe(relativeTimeFormat("de"))
    expect(listFormat("en", { type: "unit" })).not.toBe(listFormat("en", { type: "disjunction" }))
    expect(listFormat("en", { type: "unit" })).not.toBe(listFormat("fr", { type: "unit" }))
    expect(pluralRules("en")).not.toBe(pluralRules("en", { type: "ordinal" }))
    expect(pluralRules("en")).not.toBe(pluralRules("ar"))
  })

  it("formats like a fresh formatter", () => {
    expect(relativeTimeFormat("en", { numeric: "auto" }).format(-1, "day")).toBe(new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(-1, "day"))
    expect(listFormat("en", { type: "disjunction" }).format(["a", "b", "c"])).toBe("a, b, or c")
    expect(pluralRules("en").select(1)).toBe("one")
    expect(pluralRules("en").select(2)).toBe("other")
  })

  it("accepts no locale for the runtime default", () => {
    expect(listFormat(undefined, { type: "unit" })).toBe(listFormat(undefined, { type: "unit" }))
    expect(listFormat(undefined, { type: "unit" }).format(["a", "b"])).toBe(new Intl.ListFormat(undefined, { type: "unit" }).format(["a", "b"]))
  })

  it("does not cache a formatter that failed to build", () => {
    expect(() => relativeTimeFormat("not a locale!")).toThrow(RangeError)
    expect(() => relativeTimeFormat("not a locale!")).toThrow(RangeError)
  })
})

describe("formatPercent", () => {
  it("writes en percentages as before", () => {
    expect(formatPercent("en", 50)).toBe("50%")
    expect(formatPercent("en", 0)).toBe("0%")
    expect(formatPercent("en", 100)).toBe("100%")
    expect(formatPercent("en-US", 12.5, 1)).toBe("12.5%")
    expect(formatPercent("en", 1234)).toBe("1,234%")
    expect(formatPercent("en", 7, { minimumFractionDigits: 1, maximumFractionDigits: 1 })).toBe("7.0%")
  })
  it("rounds half-way values as a plain number does", () => {
    // 0.35 / 100 is 0.0034999999999999996 in binary; the digit must still round up.
    expect(formatPercent("en", 0.35, 1)).toBe("0.4%")
    expect(formatPercent("en", 4.35, 1)).toBe(`${new Intl.NumberFormat("en", { maximumFractionDigits: 1 }).format(4.35)}%`)
    expect(formatPercent("en", 2.05, 1)).toBe("2.1%")
  })
  it("follows the locale's spacing, symbol and digits", () => {
    expect(formatPercent("de", 50)).toMatch(/^50\s%$/)
    expect(formatPercent("fr", 50)).toMatch(/^50\s%$/)
    expect(formatPercent("tr", 50)).toBe("%50")
    expect(formatPercent("ar-EG", 50)).toBe("٥٠٪؜")
  })
})

describe("segmenter", () => {
  it("caches grapheme segmenters by locale and options", () => {
    expect(segmenter("en")).toBe(segmenter("en"))
    expect(segmenter("en")).not.toBe(segmenter("en", { granularity: "word" }))
    const graphemes = [...(segmenter("en")?.segment("e\u0301👩‍👩‍👧") ?? [])].map((part) => part.segment)
    expect(graphemes).toEqual(["e\u0301", "👩‍👩‍👧"])
  })
})
