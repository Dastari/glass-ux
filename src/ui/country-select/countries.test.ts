import { describe, expect, it } from "vitest"
import { callingCodeOf, COUNTRY_CODES, countryName, isCountryCode, listCountries } from "./countries.js"

describe("countries", () => {
  it("lists every ISO 3166-1 country plus Kosovo, without phone-only territories", () => {
    expect(COUNTRY_CODES).toHaveLength(250)
    expect(COUNTRY_CODES).toContain("XK")
    expect(COUNTRY_CODES).not.toContain("AC")
    expect(isCountryCode("au")).toBe(true)
  })
  it("names countries from the platform", () => {
    expect(countryName("AU")).toBe("Australia")
    expect(countryName("NZ")).toBe("New Zealand")
    expect(callingCodeOf("NZ")).toBe("64")
  })
  it("sorts by name with priority countries first", () => {
    const list = listCountries({ priority: ["AU", "NZ"] })
    expect(list.slice(0, 2).map((country) => country.code)).toEqual(["AU", "NZ"])
    expect(list.filter((country) => country.code === "AU")).toHaveLength(1)
    expect(listCountries({ only: ["NZ", "AU"] }).map((country) => country.code)).toEqual(["AU", "NZ"])
  })
})
