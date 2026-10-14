import { describe, expect, it } from "vitest"
import { formatMoney, fromMinor, minorDigits, parseMoney, toMinor } from "./money.js"

describe("money", () => {
  it("knows each currency's minor digits", () => {
    expect(minorDigits("AUD")).toBe(2)
    expect(minorDigits("JPY")).toBe(0)
    expect(minorDigits("KWD")).toBe(3)
  })
  it("converts to and from minor units without float drift", () => {
    expect(toMinor(12.5)).toBe(1250)
    expect(toMinor(1.005)).toBe(101)
    expect(toMinor(-0.07)).toBe(-7)
    expect(toMinor(1500, "JPY")).toBe(1500)
    expect(fromMinor(1250)).toBe(12.5)
  })
  it("parses what people type and paste", () => {
    expect(parseMoney("$1,234.5")).toBe(123450)
    expect(parseMoney("A$1,234.50")).toBe(123450)
    expect(parseMoney("AUD 99")).toBe(9900)
    expect(parseMoney("-12.30")).toBe(-1230)
    expect(parseMoney("(12.30)")).toBe(-1230)
    expect(parseMoney("1 234.00")).toBe(123400)
    expect(parseMoney("12.345")).toBe(1235)
    expect(parseMoney("abc")).toBeNull()
    expect(parseMoney("")).toBeNull()
  })
  it("formats in the locale", () => {
    expect(formatMoney(123450)).toBe("$1,234.50")
    expect(formatMoney(123450, { display: "code" })).toMatch(/^AUD\s1,234\.50$/)
    expect(formatMoney(123450, { display: "none" })).toBe("1,234.50")
    expect(formatMoney(-1230)).toBe("-$12.30")
  })
})
