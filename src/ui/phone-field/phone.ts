/**
 * Phone numbers through libphonenumber-js, loaded on demand.
 *
 * Metadata: "max" (157 KB raw / 39 KB gzipped, about 55 KB gzipped with the code). "min"
 * (19 KB gzipped) only checks lengths and cannot tell a mobile from a landline, and
 * MobileField must; "max" also validates each country's number patterns. The library loads
 * as its own chunk the first time a phone control mounts (`loadPhoneLibrary`), so screens
 * without one never download it.
 *
 * Values are stored as E.164 ("+61412345678"). A desk phone's extension rides along as an
 * RFC 3966 parameter: "+61362345678;ext=204".
 *
 * Every function takes the loaded library as its first argument, so tests (and code that has
 * already awaited `loadPhoneLibrary()`) call them directly.
 */
import { useSyncExternalStore } from "react"
import type * as PhoneLibrary from "libphonenumber-js/max"
import { callingCodeOf, PHONE_COUNTRY_CODES } from "../country-select/countries.js"

export type PhoneLib = typeof PhoneLibrary
export type PhoneKind = "any" | "mobile"
export type PhoneDisplay = "national" | "international"

let library: PhoneLib | null = null
let loading: Promise<PhoneLib> | null = null
const listeners = new Set<() => void>()

/** Load libphonenumber-js (max metadata) once. */
export function loadPhoneLibrary(): Promise<PhoneLib> {
  loading ??= import("libphonenumber-js/max").then((module) => {
    library = module
    for (const listener of listeners) listener()
    return module
  })
  return loading
}

/** The library if it has loaded, else null (synchronous validation falls back to a shape check). */
export const phoneLibrary = () => library

function subscribe(listener: () => void) {
  listeners.add(listener)
  void loadPhoneLibrary()
  return () => listeners.delete(listener)
}

/** The library once loaded; rendering a component that calls this starts the load. */
export const usePhoneLibrary = () =>
  useSyncExternalStore(
    subscribe,
    () => library,
    () => null
  )

/* ── Value: E.164 plus an optional extension ─────────────────────────────────── */

export interface PhoneValueParts {
  /** "+61412345678", or the raw text when it is not a number yet. */
  number: string
  /** Digits of the extension, or "". */
  extension: string
}

/** "+61362345678;ext=204" → { number: "+61362345678", extension: "204" }. */
export function splitPhoneValue(value: string | null | undefined): PhoneValueParts {
  const text = value ?? ""
  const match = /^(.*?);ext=(\d*)$/.exec(text)
  return match ? { number: match[1] ?? "", extension: match[2] ?? "" } : { number: text, extension: "" }
}

/** Joins a number and an extension into one value ("+61362345678;ext=204"); non-digits in the extension are dropped, and the number is returned alone when either part is empty. */
export function joinPhoneValue(number: string, extension: string): string {
  const digits = extension.replace(/\D/g, "")
  return number && digits ? `${number};ext=${digits}` : number
}

/** A complete-looking E.164 number: + and 8 to 15 digits. Used before the library loads. */
export const E164_SHAPE = /^\+[1-9]\d{6,14}$/

/* ── Parsing and formatting ──────────────────────────────────────────────────── */

export interface ParsedPhone {
  e164: string
  /** The country the number belongs to (may differ from the one chosen: a +64 number pasted under AU). */
  country: string | undefined
  national: string
  international: string
  valid: boolean
  /** True for MOBILE and FIXED_LINE_OR_MOBILE (US and others cannot tell). */
  mobile: boolean
  extension: string
}

/** The text an international number starts with: +, 00 or Australia's 0011. */
const INTERNATIONAL = /^\s*(\+|00|0011)/

/** True when the text names its own country ("+61 4…", "0011 64…"). */
export const isInternationalText = (text: string) => INTERNATIONAL.test(text)

/**
 * Parse typed or pasted text, in the context of a country for national numbers ("0412 345 678"
 * with AU). International text ("+64 21 123 4567") parses on its own and reports its country.
 * Null when there are no digits to speak of.
 */
export function parsePhone(lib: PhoneLib, text: string, country: string | undefined): ParsedPhone | null {
  let source = text.trim()
  if (!/\d{2,}/.test(source.replace(/\D/g, ""))) return null
  // "0011 61 …" (Australia's international prefix) and "00 61 …" read as "+61 …".
  source = source.replace(/^\s*(0011|00)\s*/, "+")
  try {
    const parsed = lib.parsePhoneNumberWithError(source, source.startsWith("+") ? undefined : (country as PhoneLibrary.CountryCode | undefined))
    const type = parsed.getType()
    return {
      e164: parsed.number,
      country: parsed.country,
      national: parsed.formatNational(),
      international: parsed.formatInternational(),
      valid: parsed.isValid(),
      mobile: type === "MOBILE" || type === "FIXED_LINE_OR_MOBILE",
      extension: parsed.ext ?? "",
    }
  } catch {
    return null
  }
}

/** The text to show for a stored value, in the chosen style; the value itself when it cannot be parsed. */
export function formatPhone(lib: PhoneLib, value: string, display: PhoneDisplay, homeCountry?: string): string {
  const { number } = splitPhoneValue(value)
  const parsed = parsePhone(lib, number, homeCountry)
  if (!parsed) return number
  // A number from another country always shows its international form.
  return display === "national" && (!homeCountry || parsed.country === homeCountry) ? parsed.national : parsed.international
}

/** The country an E.164 value belongs to, or undefined. */
export function countryOfValue(lib: PhoneLib | null, value: string): string | undefined {
  const { number } = splitPhoneValue(value)
  if (!number.startsWith("+")) return undefined
  if (lib) return parsePhone(lib, number, undefined)?.country
  // Without the library: the longest calling code that matches, first country listed for it.
  const digits = number.slice(1)
  for (let length = 3; length >= 1; length--) {
    const prefix = digits.slice(0, length)
    const match = PHONE_COUNTRY_CODES.find((code) => callingCodeOf(code) === prefix)
    if (match) return match
  }
  return undefined
}

export type PhoneCheck = { ok: true } | { ok: false; error: string }

/**
 * Whether a stored value is a valid number of the kind asked for. Before the library loads,
 * only the E.164 shape is checked; the control loads it on mount, so by the time a person
 * leaves the field the full check runs.
 */
export function checkPhone(value: string, kind: PhoneKind = "any", lib: PhoneLib | null = library): PhoneCheck {
  const { number } = splitPhoneValue(value)
  const noun = kind === "mobile" ? "mobile number" : "phone number"
  if (!number.trim()) return { ok: false, error: `Enter a ${noun}` }
  if (!lib) return E164_SHAPE.test(number) ? { ok: true } : { ok: false, error: `Enter a full ${noun}, with the area code` }
  const parsed = parsePhone(lib, number, undefined)
  if (!parsed || !number.startsWith("+")) return { ok: false, error: `Enter a full ${noun}, with the area code` }
  if (!parsed.valid) return { ok: false, error: `Check the ${noun}: it isn't a valid number for ${parsed.country ?? "its country"}` }
  if (kind === "mobile" && !parsed.mobile) return { ok: false, error: "Enter a mobile number, not a landline" }
  return { ok: true }
}

/** An example mobile number for a country, as a placeholder ("0412 345 678"); undefined when none is bundled. */
export function examplePhone(lib: PhoneLib, country: string, display: PhoneDisplay = "national"): string | undefined {
  try {
    const example = lib.getExampleNumber(country as PhoneLibrary.CountryCode, EXAMPLES as never)
    if (!example) return undefined
    return display === "national" ? example.formatNational() : example.formatInternational()
  } catch {
    return undefined
  }
}

/**
 * A few example numbers per country (mobile ones). libphonenumber's full examples add 10 KB;
 * placeholders only need the shape, so the common countries are listed and others get none.
 */
const EXAMPLES: Readonly<Record<string, string>> = {
  AU: "412345678",
  NZ: "211234567",
  GB: "7400123456",
  US: "2015550123",
  CA: "5062345678",
  IE: "850123456",
  SG: "81234567",
  IN: "8123456789",
  PH: "9051234567",
  FJ: "7012345",
  PG: "70123456",
  DE: "15123456789",
  FR: "612345678",
}
