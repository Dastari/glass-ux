/**
 * Money in minor units (cents): integers, so sums never drift. The currency decides how many
 * minor digits there are (AUD 2, JPY 0, KWD 3), read from Intl rather than a table.
 *
 *   toMinor(12.5, "AUD")    → 1250
 *   fromMinor(1250, "AUD")  → 12.5
 *   formatMoney(123450, { currency: "AUD" }) → "$1,234.50"
 *   parseMoney("$1,234.5", "AUD")            → 123450
 *
 * Formatting and parsing follow a BCP 47 locale; without one they use `getLocale()`
 * (`configureLocale()`, then `<html lang>`, then en-US).
 */
import { delocalizeNumber, numberFormat } from "../../lib/locale/intl.js"
import { getLocale } from "../../lib/locale/locale.js"

/** The currency used when none is given: AUD. */
export const DEFAULT_CURRENCY = "AUD"

const digitsCache = new Map<string, number>()

/** Minor digits of a currency (AUD 2, JPY 0). */
export function minorDigits(currency: string = DEFAULT_CURRENCY): number {
  const key = currency.toUpperCase()
  const cached = digitsCache.get(key)
  if (cached !== undefined) return cached
  let digits = 2
  try {
    // A currency's minor digits are the same in every locale.
    digits = new Intl.NumberFormat("en", { style: "currency", currency: key }).resolvedOptions().maximumFractionDigits ?? 2
  } catch {
    digits = 2
  }
  digitsCache.set(key, digits)
  return digits
}

/** Major units (12.5) → minor units (1250), rounded half away from zero. */
export function toMinor(major: number, currency: string = DEFAULT_CURRENCY): number {
  const factor = 10 ** minorDigits(currency)
  // Through a string, so 1.005 * 100 does not land on 100.49999.
  const shifted = Number(`${Math.abs(major)}e${minorDigits(currency)}`)
  const rounded = Number.isFinite(shifted) ? Math.round(shifted) : Math.round(Math.abs(major) * factor)
  return major < 0 ? -rounded : rounded
}

/** Minor units (1250) → major units (12.5). */
export function fromMinor(minor: number, currency: string = DEFAULT_CURRENCY): number {
  return minor / 10 ** minorDigits(currency)
}

export interface MoneyFormatOptions {
  currency?: string
  /** BCP 47 locale for the digits, grouping and symbol position. Default `getLocale()`. */
  locale?: string
  /** "symbol" (default, "$1,234.50"), "code" ("AUD 1,234.50") or "none" ("1,234.50"). */
  display?: "symbol" | "code" | "none"
}

/** Minor units as people read them, in the locale. */
export function formatMoney(minor: number, options: MoneyFormatOptions = {}): string {
  const currency = options.currency ?? DEFAULT_CURRENCY
  const digits = minorDigits(currency)
  const major = fromMinor(minor, currency)
  const locale = options.locale ?? getLocale()
  if (options.display === "none") {
    return numberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(major)
  }
  return numberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: options.display === "code" ? "code" : "narrowSymbol",
  }).format(major)
}

/**
 * Typed or pasted text → minor units, or null. Accepts a currency symbol or code, grouping
 * marks or spaces, a leading minus or accounting brackets ("(12.30)"). The decimal and grouping
 * marks are `locale`'s ("1.234,50" in de-DE; default `getLocale()`). More decimals than the
 * currency has are rounded.
 */
export function parseMoney(text: string, currency: string = DEFAULT_CURRENCY, locale = getLocale()): number | null {
  let source = text.trim()
  if (!source) return null
  let negative = false
  if (/^\(.*\)$/.test(source)) {
    negative = true
    source = source.slice(1, -1)
  }
  source = source.replace(/[A-Za-z]{3}/g, "").replace(/[$€£¥₹]|[A-Z]?\$/g, "")
  source = delocalizeNumber(source, locale)
  if (/^[-−]/.test(source)) {
    negative = !negative
    source = source.slice(1)
  }
  if (!/^\d+(\.\d*)?$|^\.\d+$/.test(source)) return null
  const minor = toMinor(Number(source), currency)
  return negative ? -minor : minor
}
