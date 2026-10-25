import { addressFieldMessages, getAddressFieldMessages } from "./messages.js"
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

/** Returns a blank address with no location, set to `country` when given and an empty country otherwise. */
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
    ["AU-ACT", addressFieldMessages.defaults.regionAUACT],
    ["AU-NSW", addressFieldMessages.defaults.regionAUNSW],
    ["AU-NT", addressFieldMessages.defaults.regionAUNT],
    ["AU-QLD", addressFieldMessages.defaults.regionAUQLD],
    ["AU-SA", addressFieldMessages.defaults.regionAUSA],
    ["AU-TAS", addressFieldMessages.defaults.regionAUTAS],
    ["AU-VIC", addressFieldMessages.defaults.regionAUVIC],
    ["AU-WA", addressFieldMessages.defaults.regionAUWA],
  ],
  NZ: [
    ["NZ-AUK", addressFieldMessages.defaults.regionNZAUK],
    ["NZ-BOP", addressFieldMessages.defaults.regionNZBOP],
    ["NZ-CAN", addressFieldMessages.defaults.regionNZCAN],
    ["NZ-CIT", addressFieldMessages.defaults.regionNZCIT],
    ["NZ-GIS", addressFieldMessages.defaults.regionNZGIS],
    ["NZ-HKB", addressFieldMessages.defaults.regionNZHKB],
    ["NZ-MBH", addressFieldMessages.defaults.regionNZMBH],
    ["NZ-MWT", addressFieldMessages.defaults.regionNZMWT],
    ["NZ-NSN", addressFieldMessages.defaults.regionNZNSN],
    ["NZ-NTL", addressFieldMessages.defaults.regionNZNTL],
    ["NZ-OTA", addressFieldMessages.defaults.regionNZOTA],
    ["NZ-STL", addressFieldMessages.defaults.regionNZSTL],
    ["NZ-TAS", addressFieldMessages.defaults.regionNZTAS],
    ["NZ-TKI", addressFieldMessages.defaults.regionNZTKI],
    ["NZ-WGN", addressFieldMessages.defaults.regionNZWGN],
    ["NZ-WKO", addressFieldMessages.defaults.regionNZWKO],
    ["NZ-WTC", addressFieldMessages.defaults.regionNZWTC],
  ],
  GB: [
    ["GB-ENG", addressFieldMessages.defaults.regionGBENG],
    ["GB-NIR", addressFieldMessages.defaults.regionGBNIR],
    ["GB-SCT", addressFieldMessages.defaults.regionGBSCT],
    ["GB-WLS", addressFieldMessages.defaults.regionGBWLS],
  ],
  CA: [
    ["CA-AB", addressFieldMessages.defaults.regionCAAB],
    ["CA-BC", addressFieldMessages.defaults.regionCABC],
    ["CA-MB", addressFieldMessages.defaults.regionCAMB],
    ["CA-NB", addressFieldMessages.defaults.regionCANB],
    ["CA-NL", addressFieldMessages.defaults.regionCANL],
    ["CA-NS", addressFieldMessages.defaults.regionCANS],
    ["CA-NT", addressFieldMessages.defaults.regionCANT],
    ["CA-NU", addressFieldMessages.defaults.regionCANU],
    ["CA-ON", addressFieldMessages.defaults.regionCAON],
    ["CA-PE", addressFieldMessages.defaults.regionCAPE],
    ["CA-QC", addressFieldMessages.defaults.regionCAQC],
    ["CA-SK", addressFieldMessages.defaults.regionCASK],
    ["CA-YT", addressFieldMessages.defaults.regionCAYT],
  ],
  US: [
    ["US-AL", addressFieldMessages.defaults.regionUSAL], ["US-AK", addressFieldMessages.defaults.regionUSAK], ["US-AZ", addressFieldMessages.defaults.regionUSAZ], ["US-AR", addressFieldMessages.defaults.regionUSAR], ["US-CA", addressFieldMessages.defaults.regionUSCA],
    ["US-CO", addressFieldMessages.defaults.regionUSCO], ["US-CT", addressFieldMessages.defaults.regionUSCT], ["US-DE", addressFieldMessages.defaults.regionUSDE], ["US-DC", addressFieldMessages.defaults.regionUSDC], ["US-FL", addressFieldMessages.defaults.regionUSFL],
    ["US-GA", addressFieldMessages.defaults.regionUSGA], ["US-HI", addressFieldMessages.defaults.regionUSHI], ["US-ID", addressFieldMessages.defaults.regionUSID], ["US-IL", addressFieldMessages.defaults.regionUSIL], ["US-IN", addressFieldMessages.defaults.regionUSIN],
    ["US-IA", addressFieldMessages.defaults.regionUSIA], ["US-KS", addressFieldMessages.defaults.regionUSKS], ["US-KY", addressFieldMessages.defaults.regionUSKY], ["US-LA", addressFieldMessages.defaults.regionUSLA], ["US-ME", addressFieldMessages.defaults.regionUSME],
    ["US-MD", addressFieldMessages.defaults.regionUSMD], ["US-MA", addressFieldMessages.defaults.regionUSMA], ["US-MI", addressFieldMessages.defaults.regionUSMI], ["US-MN", addressFieldMessages.defaults.regionUSMN], ["US-MS", addressFieldMessages.defaults.regionUSMS],
    ["US-MO", addressFieldMessages.defaults.regionUSMO], ["US-MT", addressFieldMessages.defaults.regionUSMT], ["US-NE", addressFieldMessages.defaults.regionUSNE], ["US-NV", addressFieldMessages.defaults.regionUSNV], ["US-NH", addressFieldMessages.defaults.regionUSNH],
    ["US-NJ", addressFieldMessages.defaults.regionUSNJ], ["US-NM", addressFieldMessages.defaults.regionUSNM], ["US-NY", addressFieldMessages.defaults.regionUSNY], ["US-NC", addressFieldMessages.defaults.regionUSNC], ["US-ND", addressFieldMessages.defaults.regionUSND],
    ["US-OH", addressFieldMessages.defaults.regionUSOH], ["US-OK", addressFieldMessages.defaults.regionUSOK], ["US-OR", addressFieldMessages.defaults.regionUSOR], ["US-PA", addressFieldMessages.defaults.regionUSPA], ["US-RI", addressFieldMessages.defaults.regionUSRI],
    ["US-SC", addressFieldMessages.defaults.regionUSSC], ["US-SD", addressFieldMessages.defaults.regionUSSD], ["US-TN", addressFieldMessages.defaults.regionUSTN], ["US-TX", addressFieldMessages.defaults.regionUSTX], ["US-UT", addressFieldMessages.defaults.regionUSUT],
    ["US-VT", addressFieldMessages.defaults.regionUSVT], ["US-VA", addressFieldMessages.defaults.regionUSVA], ["US-WA", addressFieldMessages.defaults.regionUSWA], ["US-WV", addressFieldMessages.defaults.regionUSWV], ["US-WI", addressFieldMessages.defaults.regionUSWI],
    ["US-WY", addressFieldMessages.defaults.regionUSWY],
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

function conventions(messages: typeof addressFieldMessages.defaults): Readonly<Record<string, Convention>> { return {
  AU: { locality: messages.addressSuburbOrTown, region: messages.addressStateOrTerritory, postcode: messages.addressPostcode, regionOnLine: true, postcodePattern: /^\d{4}$/, postcodeExample: "7000" },
  NZ: { locality: messages.addressTownOrCity, region: messages.addressRegion, postcode: messages.addressPostcode, regionOnLine: false, postcodePattern: /^\d{4}$/, postcodeExample: "7273" },
  US: { locality: messages.addressCity, region: messages.addressState, postcode: messages.addressZipCode, regionOnLine: true, postcodePattern: /^\d{5}(-\d{4})?$/, postcodeExample: "94103" },
  CA: { locality: messages.addressCity, region: messages.addressProvinceOrTerritory, postcode: messages.addressPostalCode, regionOnLine: true, postcodePattern: /^[A-Za-z]\d[A-Za-z] ?\d[A-Za-z]\d$/, postcodeExample: "K1A 0B1" },
  GB: { locality: messages.addressTownOrCity, region: messages.addressNation, postcode: messages.addressPostcode, regionOnLine: false, postcodePattern: /^[A-Za-z]{1,2}\d[A-Za-z\d]? ?\d[A-Za-z]{2}$/, postcodeExample: "SW1A 2AA" },
} }
function defaultConvention(messages: typeof addressFieldMessages.defaults): Convention { return { locality: messages.addressTownOrCity, region: messages.addressStateOrRegion, postcode: messages.addressPostcode, regionOnLine: false } }

/** The labels and postcode rule for a country's addresses. */
export const addressConvention = (country: string, messages: ReturnType<typeof getAddressFieldMessages> = getAddressFieldMessages()) => conventions(messages)[country.toUpperCase()] ?? defaultConvention(messages)

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
