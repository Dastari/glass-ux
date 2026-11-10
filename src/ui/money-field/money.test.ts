import { describe, expect, it } from "vitest"
import { currencyName, currencySymbol, formatMoney, fromMinor, minorDigits, parseMoney, toMinor, unitDigits } from "./money.js"
import { moneySchema } from "./schema.js"

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
    expect(parseMoney("1.234,50 €", "EUR", "de-DE")).toBe(123450)
    expect(parseMoney("1 234,5", "EUR", "fr-FR")).toBe(123450)
  })
  it("formats in the locale", () => {
    expect(formatMoney(123450)).toBe("$1,234.50")
    expect(formatMoney(123450, { display: "code" })).toMatch(/^AUD\s1,234\.50$/)
    expect(formatMoney(123450, { display: "none" })).toBe("1,234.50")
    expect(formatMoney(-1230)).toBe("-$12.30")
    expect(formatMoney(123450, { currency: "EUR", locale: "de-DE" })).toBe("1.234,50\u00a0€")
  })
  it("counts finer units with fractionDigits (#27)", () => {
    expect(unitDigits("AUD", 4)).toBe(4)
    expect(unitDigits("AUD", 1)).toBe(2)
    expect(toMinor(0.0525, "AUD", 4)).toBe(525)
    expect(fromMinor(525, "AUD", 4)).toBe(0.0525)
    expect(formatMoney(525, { currency: "AUD", fractionDigits: 4, locale: "en-AU" })).toBe("$0.0525")
    expect(formatMoney(12000, { currency: "AUD", fractionDigits: 4, locale: "en-AU" })).toBe("$1.20")
    expect(parseMoney("$0.05254", "AUD", "en-AU", 4)).toBe(525)
    const schema = moneySchema({ fractionDigits: 4, max: 10000, locale: "en-AU" })
    expect(schema.safeParse(525).success).toBe(true)
    expect(schema.safeParse(20000).error?.issues[0]?.message).toBe("Enter an amount from $0.00 to $1.00")
  })
  it("names and draws currencies in the locale", () => {
    expect(currencySymbol("AUD", "en-AU")).toBe("$")
    expect(currencySymbol("AUD", "en-US", "symbol")).toBe("A$")
    expect(currencySymbol("EUR", "de-DE")).toBe("€")
    expect(currencyName("JPY", "en")).toBe("Japanese Yen")
  })
})
