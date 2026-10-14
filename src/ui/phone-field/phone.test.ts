import * as lib from "libphonenumber-js/max"
import { describe, expect, it } from "vitest"
import { getCountries, getCountryCallingCode } from "libphonenumber-js/max"
import { callingCodeOf, PHONE_COUNTRY_CODES } from "../country-select/countries.js"
import { checkPhone, countryOfValue, examplePhone, formatPhone, isInternationalText, joinPhoneValue, parsePhone, splitPhoneValue } from "./phone.js"

describe("phone numbers to E.164", () => {
  it("reads national numbers in the chosen country", () => {
    expect(parsePhone(lib, "0412 345 678", "AU")?.e164).toBe("+61412345678")
    expect(parsePhone(lib, "(03) 6234 5678", "AU")?.e164).toBe("+61362345678")
    expect(parsePhone(lib, "021 123 4567", "NZ")?.e164).toBe("+64211234567")
  })
  it("reads international numbers on their own and reports their country", () => {
    const pasted = parsePhone(lib, "+64 21 123 4567", "AU")
    expect(pasted?.e164).toBe("+64211234567")
    expect(pasted?.country).toBe("NZ")
    expect(parsePhone(lib, "0011 61 412 345 678", "NZ")?.country).toBe("AU")
    expect(parsePhone(lib, "00 44 20 7946 0958", "AU")?.e164).toBe("+442079460958")
    expect(isInternationalText("+61 4")).toBe(true)
    expect(isInternationalText("0412")).toBe(false)
  })
  it("tells mobiles from landlines", () => {
    expect(parsePhone(lib, "0412 345 678", "AU")?.mobile).toBe(true)
    expect(parsePhone(lib, "03 6234 5678", "AU")?.mobile).toBe(false)
    expect(checkPhone("+61412345678", "mobile", lib)).toEqual({ ok: true })
    const landline = checkPhone("+61362345678", "mobile", lib)
    expect(landline.ok).toBe(false)
  })
  it("checks validity and completeness", () => {
    expect(checkPhone("+61362345678", "any", lib)).toEqual({ ok: true })
    expect(checkPhone("", "any", lib).ok).toBe(false)
    expect(checkPhone("0412", "any", lib).ok).toBe(false)
    expect(checkPhone("+6141234", "any", lib).ok).toBe(false)
  })
  it("falls back to the E.164 shape before the library loads", () => {
    expect(checkPhone("+61412345678", "any", null)).toEqual({ ok: true })
    expect(checkPhone("0412 345 678", "any", null).ok).toBe(false)
  })
  it("formats for display", () => {
    expect(formatPhone(lib, "+61412345678", "national", "AU")).toBe("0412 345 678")
    expect(formatPhone(lib, "+61412345678", "international", "AU")).toBe("+61 412 345 678")
    // A foreign number shows its international form even in national display.
    expect(formatPhone(lib, "+64211234567", "national", "AU")).toBe("+64 21 123 4567")
    expect(examplePhone(lib, "AU")).toBe("0412 345 678")
  })
  it("carries an extension as an RFC 3966 parameter", () => {
    expect(joinPhoneValue("+61362345678", "204")).toBe("+61362345678;ext=204")
    expect(joinPhoneValue("+61362345678", "")).toBe("+61362345678")
    expect(splitPhoneValue("+61362345678;ext=204")).toEqual({ number: "+61362345678", extension: "204" })
    expect(parsePhone(lib, "03 6234 5678 ext. 204", "AU")?.extension).toBe("204")
  })
  it("finds a value's country with or without the library", () => {
    expect(countryOfValue(lib, "+64211234567")).toBe("NZ")
    expect(countryOfValue(null, "+61412345678")).toBe("AU")
    expect(countryOfValue(null, "0412")).toBeUndefined()
  })
})

describe("country calling codes", () => {
  it("match libphonenumber for every country it knows", () => {
    for (const country of getCountries()) expect(callingCodeOf(country), country).toBe(getCountryCallingCode(country))
    expect(new Set(PHONE_COUNTRY_CODES)).toEqual(new Set(getCountries()))
  })
})

describe("country search", () => {
  it("puts a shared calling code's main country first", async () => {
    const { searchCountries } = await import("./phone-field.js")
    const { listCountries } = await import("../country-select/countries.js")
    const list = listCountries({ phone: true })
    expect(searchCountries(list, "+44")[0]?.code).toBe("GB")
    expect(searchCountries(list, "1")[0]?.code).toBe("US")
    expect(searchCountries(list, "+61")[0]?.code).toBe("AU")
    expect(searchCountries(list, "new z")[0]?.code).toBe("NZ")
  })
  it("knows the main country for every shared code", async () => {
    const metadata = (await import("libphonenumber-js/metadata.max.json")).default as { country_calling_codes: Record<string, string[]> }
    const { MAIN_COUNTRY_FOR_CALLING_CODE } = await import("../country-select/countries.js")
    const shared = Object.fromEntries(Object.entries(metadata.country_calling_codes).filter(([, list]) => list.length > 1).map(([code, list]) => [code, list[0]]))
    expect(MAIN_COUNTRY_FOR_CALLING_CODE).toEqual(shared)
  })
})
