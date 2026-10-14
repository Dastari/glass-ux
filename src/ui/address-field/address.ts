/**
 * The library's street address: what AddressInput edits and the geocoder fills. Generic — an
 * application maps it to its own model through an application-owned adapter.
 *
 *   line1     the street: "12 Example Lane", or a PO Box
 *   line2     unit, level or building: "Level 2" ("" when none)
 *   locality  suburb, town or city
 *   region    admin-1: ISO 3166-2 code and name ({ code: "AU-TAS", name: "Tasmania" }); the
 *             code is "" where the library does not know the country's subdivisions
 *   postcode
 *   country   ISO 3166-1 alpha-2 and name
 *   location  WGS 84 point from the lookup or the pin; null when not placed
 *   pinned    the point was placed by hand (the pin was moved), so a new lookup of the same
 *             address must not move it back
 */

export interface GeoPoint {
  lat: number
  lng: number
}

export interface AddressRegion {
  /** ISO 3166-2: "AU-TAS". "" when unknown. */
  code: string
  name: string
}

export interface AddressCountry {
  /** ISO 3166-1 alpha-2: "AU". "" when not chosen. */
  code: string
  name: string
}

export interface AddressValue {
  line1: string
  line2: string
  locality: string
  /** Geographical region to display. */
  region: AddressRegion
  postcode: string
  country: AddressCountry
  location: GeoPoint | null
  pinned: boolean
}

/** The text parts of an address, each its own form field. */
export const ADDRESS_TEXT_PARTS = ["line1", "line2", "locality", "postcode"] as const
export type AddressTextPart = (typeof ADDRESS_TEXT_PARTS)[number]

export function emptyAddress(country?: AddressCountry): AddressValue {
  return {
    line1: "",
    line2: "",
    locality: "",
    region: { code: "", name: "" },
    postcode: "",
    country: country ?? { code: "", name: "" },
    location: null,
    pinned: false,
  }
}

/** True when nothing a person typed or chose is set (a country alone is a default, not an address). */
export const isEmptyAddress = (value: AddressValue | null | undefined) =>
  !value || (!value.line1.trim() && !value.line2.trim() && !value.locality.trim() && !value.postcode.trim() && !value.region.name.trim() && !value.location)

/* ── Regions (admin-1) ──────────────────────────────────────────────────────── */

/**
 * The subdivisions the library knows by name, so a lookup's "Tasmania" becomes AU-TAS and the
 * region is a list rather than free text. Countries not listed keep a free-text region with an
 * empty code; a server that needs the code resolves it from the position.
 */
export const ADMIN1_REGIONS: Readonly<Record<string, ReadonlyArray<readonly [code: string, name: string]>>> = {
  AU: [
    ["AU-ACT", "Australian Capital Territory"],
    ["AU-NSW", "New South Wales"],
    ["AU-NT", "Northern Territory"],
    ["AU-QLD", "Queensland"],
    ["AU-SA", "South Australia"],
    ["AU-TAS", "Tasmania"],
    ["AU-VIC", "Victoria"],
    ["AU-WA", "Western Australia"],
  ],
  NZ: [
    ["NZ-AUK", "Auckland"],
    ["NZ-BOP", "Bay of Plenty"],
    ["NZ-CAN", "Canterbury"],
    ["NZ-CIT", "Chatham Islands"],
    ["NZ-GIS", "Gisborne"],
    ["NZ-HKB", "Hawke's Bay"],
    ["NZ-MBH", "Marlborough"],
    ["NZ-MWT", "Manawatū-Whanganui"],
    ["NZ-NSN", "Nelson"],
    ["NZ-NTL", "Northland"],
    ["NZ-OTA", "Otago"],
    ["NZ-STL", "Southland"],
    ["NZ-TAS", "Tasman"],
    ["NZ-TKI", "Taranaki"],
    ["NZ-WGN", "Wellington"],
    ["NZ-WKO", "Waikato"],
    ["NZ-WTC", "West Coast"],
  ],
  GB: [
    ["GB-ENG", "England"],
    ["GB-NIR", "Northern Ireland"],
    ["GB-SCT", "Scotland"],
    ["GB-WLS", "Wales"],
  ],
  CA: [
    ["CA-AB", "Alberta"],
    ["CA-BC", "British Columbia"],
    ["CA-MB", "Manitoba"],
    ["CA-NB", "New Brunswick"],
    ["CA-NL", "Newfoundland and Labrador"],
    ["CA-NS", "Nova Scotia"],
    ["CA-NT", "Northwest Territories"],
    ["CA-NU", "Nunavut"],
    ["CA-ON", "Ontario"],
    ["CA-PE", "Prince Edward Island"],
    ["CA-QC", "Quebec"],
    ["CA-SK", "Saskatchewan"],
    ["CA-YT", "Yukon"],
  ],
  US: [
    ["US-AL", "Alabama"], ["US-AK", "Alaska"], ["US-AZ", "Arizona"], ["US-AR", "Arkansas"], ["US-CA", "California"],
    ["US-CO", "Colorado"], ["US-CT", "Connecticut"], ["US-DE", "Delaware"], ["US-DC", "District of Columbia"], ["US-FL", "Florida"],
    ["US-GA", "Georgia"], ["US-HI", "Hawaii"], ["US-ID", "Idaho"], ["US-IL", "Illinois"], ["US-IN", "Indiana"],
    ["US-IA", "Iowa"], ["US-KS", "Kansas"], ["US-KY", "Kentucky"], ["US-LA", "Louisiana"], ["US-ME", "Maine"],
    ["US-MD", "Maryland"], ["US-MA", "Massachusetts"], ["US-MI", "Michigan"], ["US-MN", "Minnesota"], ["US-MS", "Mississippi"],
    ["US-MO", "Missouri"], ["US-MT", "Montana"], ["US-NE", "Nebraska"], ["US-NV", "Nevada"], ["US-NH", "New Hampshire"],
    ["US-NJ", "New Jersey"], ["US-NM", "New Mexico"], ["US-NY", "New York"], ["US-NC", "North Carolina"], ["US-ND", "North Dakota"],
    ["US-OH", "Ohio"], ["US-OK", "Oklahoma"], ["US-OR", "Oregon"], ["US-PA", "Pennsylvania"], ["US-RI", "Rhode Island"],
    ["US-SC", "South Carolina"], ["US-SD", "South Dakota"], ["US-TN", "Tennessee"], ["US-TX", "Texas"], ["US-UT", "Utah"],
    ["US-VT", "Vermont"], ["US-VA", "Virginia"], ["US-WA", "Washington"], ["US-WV", "West Virginia"], ["US-WI", "Wisconsin"],
    ["US-WY", "Wyoming"],
  ],
}

const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "")

/** The region a lookup named ("Tasmania", "Hawkes Bay", "TAS"), with its code when known. */
export function resolveRegion(country: string, name: string): AddressRegion {
  const regions = ADMIN1_REGIONS[country.toUpperCase()]
  const trimmed = name.trim()
  if (!regions || !trimmed) return { code: "", name: trimmed }
  const key = fold(trimmed)
  const match = regions.find(([code, regionName]) => fold(regionName) === key || fold(code.split("-")[1] ?? "") === key)
  return match ? { code: match[0], name: match[1] } : { code: "", name: trimmed }
}

/** A region by its ISO 3166-2 code. */
export function regionByCode(code: string): AddressRegion | undefined {
  const country = code.split("-")[0] ?? ""
  const match = ADMIN1_REGIONS[country]?.find(([regionCode]) => regionCode === code)
  return match ? { code: match[0], name: match[1] } : undefined
}

/* ── Per-country conventions ────────────────────────────────────────────────── */

interface Convention {
  locality: string
  /** Geographical region to display. */
  region: string
  postcode: string
  /** Region abbreviated on the locality line ("Hobart TAS 7000"); otherwise left off. */
  regionOnLine: boolean
  /** Postcode pattern for validation, and its example. */
  postcodePattern?: RegExp
  postcodeExample?: string
}

const CONVENTIONS: Readonly<Record<string, Convention>> = {
  AU: { locality: "Suburb or town", region: "State or territory", postcode: "Postcode", regionOnLine: true, postcodePattern: /^\d{4}$/, postcodeExample: "7000" },
  NZ: { locality: "Town or city", region: "Region", postcode: "Postcode", regionOnLine: false, postcodePattern: /^\d{4}$/, postcodeExample: "7273" },
  US: { locality: "City", region: "State", postcode: "ZIP code", regionOnLine: true, postcodePattern: /^\d{5}(-\d{4})?$/, postcodeExample: "94103" },
  CA: { locality: "City", region: "Province or territory", postcode: "Postal code", regionOnLine: true, postcodePattern: /^[A-Za-z]\d[A-Za-z] ?\d[A-Za-z]\d$/, postcodeExample: "K1A 0B1" },
  GB: { locality: "Town or city", region: "Nation", postcode: "Postcode", regionOnLine: false, postcodePattern: /^[A-Za-z]{1,2}\d[A-Za-z\d]? ?\d[A-Za-z]{2}$/, postcodeExample: "SW1A 2AA" },
}
const DEFAULT_CONVENTION: Convention = { locality: "Town or city", region: "State or region", postcode: "Postcode", regionOnLine: false }

/** The labels and postcode rule for a country's addresses. */
export const addressConvention = (country: string) => CONVENTIONS[country.toUpperCase()] ?? DEFAULT_CONVENTION

/** True when the postcode fits the country's pattern (or the library has none for it). */
export function isPostcode(country: string, postcode: string) {
  const pattern = addressConvention(country).postcodePattern
  return !pattern || pattern.test(postcode.trim())
}

/* ── Reading ────────────────────────────────────────────────────────────────── */

/** "Hobart TAS 7000"; "Blenheim 7273" where the region is not written. */
export function localityLine(value: AddressValue) {
  const convention = addressConvention(value.country.code)
  const region = convention.regionOnLine ? (value.region.code.split("-")[1] ?? value.region.name) : ""
  const tail = [region, value.postcode].filter(Boolean).join(" ")
  // US and Canada: "Springfield, IL 62701".
  const comma = value.country.code === "US" || value.country.code === "CA"
  return [value.locality, tail].filter(Boolean).join(comma ? ", " : " ")
}

/** Lines of a postal block. The country is added only when it is not `homeCountry`. */
export function addressLines(value: AddressValue, homeCountry?: string): string[] {
  const street = [value.line2, value.line1].map((line) => line.trim()).filter(Boolean)
  const country = value.country.code && value.country.code !== homeCountry ? value.country.name : ""
  return [...street, localityLine(value), country].filter(Boolean)
}

/** One line: "Level 2, 12 Example Lane, Hobart TAS 7000". */
export const formatAddress = (value: AddressValue, homeCountry?: string) => addressLines(value, homeCountry).join(", ")

/** Same place, as people read it (billing "Same as address"). */
export const sameAddress = (a: AddressValue, b: AddressValue) => formatAddress(a).toLowerCase() === formatAddress(b).toLowerCase()
