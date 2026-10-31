import { describe, expect, it } from "vitest"
import { emptyAddress, formatAddress, isEmptyAddress, isPostcode, resolveRegion, type AddressValue } from "./address.js"
import { addressSchema } from "./schema.js"
import { houseNumberOf, photonToSuggestion, photonToSuggestions, type PhotonFeature } from "./geocoder.js"

const feature = (properties: PhotonFeature["properties"], coordinates: [number, number]): PhotonFeature => ({
  type: "Feature",
  geometry: { type: "Point", coordinates },
  properties,
})

// Synthetic Photon-shaped records, including numbered buildings and locality-only results.
const MURRAY_STREET = feature(
  { osm_type: "W", osm_id: 295479631, osm_key: "building", type: "house", housenumber: "12", street: "Example Lane", district: "Hobart", city: "Hobart", state: "Tasmania", country: "Australia", postcode: "7000", countrycode: "AU" },
  [147.3268831, -42.8833396]
)
const GALLERY = feature(
  { osm_type: "N", osm_id: 10657495424, type: "house", housenumber: "12", name: "The Sample Gallery", street: "Example Lane", district: "Hobart", city: "Hobart", state: "Tasmania", country: "Australia", postcode: "7000", countrycode: "AU" },
  [147.326936, -42.8833349]
)
const CROWN_STREET = feature(
  { osm_type: "W", osm_id: 1008276437, osm_key: "highway", type: "street", name: "Crown Street", locality: "Strawberry Hills", district: "Surry Hills", city: "Sydney", state: "New South Wales", country: "Australia", postcode: "2010", countrycode: "AU" },
  [151.2138348, -33.8862334]
)
const QUEEN_STREET = feature(
  { osm_type: "W", osm_id: 479667173, type: "house", housenumber: "1", street: "Queen Street", locality: "Princes Wharf", district: "City Centre", city: "Auckland", state: "Auckland", country: "New Zealand", postcode: "1010", countrycode: "NZ" },
  [174.7664887, -36.8433766]
)
const SAMPLE_DEPOT = feature({ osm_type: "R", osm_id: 1, type: "city", name: "Mossbridge", state: "Tasmania", country: "Australia", postcode: "7190", countrycode: "AU" }, [147.9103, -42.5016])

describe("Photon → address", () => {
  it("fills every part of a numbered address with its point", () => {
    const suggestion = photonToSuggestion(MURRAY_STREET)!
    expect(suggestion.kind).toBe("address")
    expect(suggestion.label).toBe("12 Example Lane")
    expect(suggestion.description).toBe("Hobart TAS 7000")
    expect(suggestion.value).toEqual<AddressValue>({
      line1: "12 Example Lane",
      line2: "",
      locality: "Hobart",
      region: { code: "AU-TAS", name: "Tasmania" },
      postcode: "7000",
      country: { code: "AU", name: "Australia" },
      location: { lat: -42.8833396, lng: 147.3268831 },
      pinned: false,
    })
  })
  it("leads with a place's name and keeps its street address", () => {
    const suggestion = photonToSuggestion(GALLERY)!
    expect(suggestion.label).toBe("The Sample Gallery")
    expect(suggestion.description).toBe("12 Example Lane, Hobart TAS 7000")
    expect(suggestion.value.line1).toBe("12 Example Lane")
  })
  it("uses the suburb in Australia and keeps a typed house number on a street match", () => {
    const suggestion = photonToSuggestion(CROWN_STREET, "120 Crown Street Surry Hills")!
    expect(suggestion.kind).toBe("street")
    expect(suggestion.value.line1).toBe("120 Crown Street")
    expect(suggestion.value.locality).toBe("Surry Hills")
    expect(suggestion.value.region).toEqual({ code: "AU-NSW", name: "New South Wales" })
  })
  it("uses the city elsewhere and resolves the region code", () => {
    const suggestion = photonToSuggestion(QUEEN_STREET)!
    expect(suggestion.value.locality).toBe("Auckland")
    expect(suggestion.value.region).toEqual({ code: "NZ-AUK", name: "Auckland" })
    expect(suggestion.value.country).toEqual({ code: "NZ", name: "New Zealand" })
  })
  it("fills a town with no street", () => {
    const suggestion = photonToSuggestion(SAMPLE_DEPOT)!
    expect(suggestion.kind).toBe("place")
    expect(suggestion.label).toBe("Mossbridge")
    expect(suggestion.value.line1).toBe("")
    expect(suggestion.value.locality).toBe("Mossbridge")
  })
  it("drops duplicates", () => {
    expect(photonToSuggestions([MURRAY_STREET, MURRAY_STREET, QUEEN_STREET])).toHaveLength(2)
  })
  it("reads the house number someone typed", () => {
    expect(houseNumberOf("120 Crown Street")).toBe("120")
    expect(houseNumberOf("3/45 Main Road")).toBe("3/45")
    expect(houseNumberOf("12A Smith St")).toBe("12A")
    expect(houseNumberOf("Crown Street")).toBeNull()
  })
})

describe("addresses", () => {
  const hobart: AddressValue = { ...photonToSuggestion(MURRAY_STREET)!.value, line2: "Level 2" }
  it("formats one line, naming the country only when foreign", () => {
    expect(formatAddress(hobart, "AU")).toBe("Level 2, 12 Example Lane, Hobart TAS 7000")
    expect(formatAddress(hobart, "NZ")).toBe("Level 2, 12 Example Lane, Hobart TAS 7000, Australia")
    expect(formatAddress(photonToSuggestion(QUEEN_STREET)!.value, "AU")).toBe("1 Queen Street, Auckland 1010, New Zealand")
  })
  it("resolves regions by name or abbreviation", () => {
    expect(resolveRegion("AU", "tasmania")).toEqual({ code: "AU-TAS", name: "Tasmania" })
    expect(resolveRegion("AU", "TAS")).toEqual({ code: "AU-TAS", name: "Tasmania" })
    expect(resolveRegion("NZ", "Hawkes Bay")).toEqual({ code: "NZ-HKB", name: "Hawke's Bay" })
    expect(resolveRegion("FR", "Bretagne")).toEqual({ code: "", name: "Bretagne" })
  })
  it("checks postcodes per country", () => {
    expect(isPostcode("AU", "7000")).toBe(true)
    expect(isPostcode("AU", "700")).toBe(false)
    expect(isPostcode("GB", "SW1A 2AA")).toBe(true)
    expect(isPostcode("FR", "anything")).toBe(true)
  })
  it("knows an empty address", () => {
    expect(isEmptyAddress(emptyAddress({ code: "AU", name: "Australia" }))).toBe(true)
    expect(isEmptyAddress(hobart)).toBe(false)
  })
})

describe("address schema messages", () => {
  const issues = (country: string, patch: Partial<AddressValue>) => {
    const value: AddressValue = { ...emptyAddress(), line1: "1 Example Lane", country: { code: country, name: country }, ...patch }
    const result = addressSchema({ required: true }).safeParse(value)
    return result.success ? [] : result.error.issues.map((issue) => issue.message)
  }
  it("name the locality and postcode in lower case in English", () => {
    expect(issues("AU", { postcode: "1" })).toContain("Enter the suburb or town")
    expect(issues("AU", { locality: "Hobart", postcode: "1" })).toContain("Check the postcode, such as 7000")
    expect(issues("US", { locality: "Austin", postcode: "1" })).toContain("Check the zip code, such as 94103")
  })
})
