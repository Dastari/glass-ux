import { describe, expect, it } from "vitest"
import { formatRange, pageCountOf } from "./range.js"

describe("pagination range", () => {
  it("formats offset and cursor ranges", () => {
    expect(formatRange(0, 25, 25, 1284)).toBe("1–25 of 1,284")
    expect(formatRange(51, 25, 9, 1284)).toBe("1,276–1,284 of 1,284")
    expect(formatRange(2, 25, 25)).toBe("51–75")
    expect(formatRange(0, 25, 0, 0)).toBe("0 of 0")
    expect(formatRange(51, 25, 9, 1284, "de-DE")).toBe("1.276–1.284 of 1.284")
  })
  it("counts pages", () => {
    expect(pageCountOf(1284, 25)).toBe(52)
    expect(pageCountOf(0, 25)).toBe(1)
    expect(pageCountOf(100, 100)).toBe(1)
  })
})
