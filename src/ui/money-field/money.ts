/**
 * Money in minor units (cents): integers, so sums never drift. The currency decides how many
 * minor digits there are (AUD 2, JPY 0, KWD 3), read from Intl rather than a table.
 *
 *   toMinor(12.5, "AUD")    → 1250
 *   fromMinor(1250, "AUD")  → 12.5
 *   formatMoney(123450, { currency: "AUD" }) → "$1,234.50"
 *   parseMoney("$1,234.5", "AUD")            → 123450
 *
 * Amounts finer than the currency's minor unit (unit costs at $0.0525) take `fractionDigits`:
 * the value is still an integer, counted in 10^-fractionDigits of the currency.
 *
 *   toMinor(0.0525, "AUD", 4)                → 525
 *   formatMoney(525, { fractionDigits: 4 })  → "$0.0525"
 *
 * Formatting and parsing follow a BCP 47 locale; without one they use `getLocale()`
 * (`configureLocale()`, then `<html lang>`, then en-US).
 */
import { delocalizeNumber, displayNames, numberFormat } from "../../lib/locale/intl.js"
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

/**
 * The decimal places one stored unit stands for: `fractionDigits` when given (at least the
 * currency's own, so a JPY unit cost can still hold sen), else the currency's minor digits.
 */
export function unitDigits(currency: string = DEFAULT_CURRENCY, fractionDigits?: number): number {
  const own = minorDigits(currency)
  return fractionDigits === undefined ? own : Math.max(own, Math.min(20, Math.trunc(fractionDigits)))
}

/** Major units (12.5) → minor units (1250), rounded half away from zero. `fractionDigits` counts finer units (0.0525 → 525 at 4). */
export function toMinor(major: number, currency: string = DEFAULT_CURRENCY, fractionDigits?: number): number {
  const digits = unitDigits(currency, fractionDigits)
  const factor = 10 ** digits
  // Through a string, so 1.005 * 100 does not land on 100.49999.
  const shifted = Number(`${Math.abs(major)}e${digits}`)
  const rounded = Number.isFinite(shifted) ? Math.round(shifted) : Math.round(Math.abs(major) * factor)
  return major < 0 ? -rounded : rounded
}

/** Minor units (1250) → major units (12.5), in the same `fractionDigits` as `toMinor`. */
export function fromMinor(minor: number, currency: string = DEFAULT_CURRENCY, fractionDigits?: number): number {
  return minor / 10 ** unitDigits(currency, fractionDigits)
}

export interface MoneyFormatOptions {
  currency?: string
  /** BCP 47 locale for the digits, grouping and symbol position. Default `getLocale()`. */
  locale?: string
  /** "symbol" (default, "$1,234.50"), "code" ("AUD 1,234.50") or "none" ("1,234.50"). */
  display?: "symbol" | "code" | "none"
  /**
   * The value counts 10^-fractionDigits of the currency (see `toMinor`). It is shown with the
   * currency's own decimals at least and up to `fractionDigits` ("$0.0525", "$1.20").
   */
  fractionDigits?: number
}

/** Minor units as people read them, in the locale. */
export function formatMoney(minor: number, options: MoneyFormatOptions = {}): string {
  const currency = options.currency ?? DEFAULT_CURRENCY
  const major = fromMinor(minor, currency, options.fractionDigits)
  const locale = options.locale ?? getLocale()
  return numberFormat(locale, moneyFormat(currency, options.display ?? "symbol", options.fractionDigits)).format(major)
}

/** The Intl options that show an amount of `currency`, with or without its symbol or code. */
export function moneyFormat(currency: string, display: "symbol" | "code" | "none" = "symbol", fractionDigits?: number): Intl.NumberFormatOptions {
  const minimumFractionDigits = minorDigits(currency)
  const maximumFractionDigits = unitDigits(currency, fractionDigits)
  if (display === "none") return { minimumFractionDigits, maximumFractionDigits }
  return { style: "currency", currency, currencyDisplay: display === "code" ? "code" : "narrowSymbol", minimumFractionDigits, maximumFractionDigits }
}

const symbols = new Map<string, string>()

/** A currency's symbol in the locale: "$" for AUD in en-AU, "A$" with `display: "symbol"`, "€" for EUR. */
export function currencySymbol(currency: string, locale = getLocale(), display: "narrowSymbol" | "symbol" = "narrowSymbol"): string {
  const key = `${locale}|${currency}|${display}`
  let symbol = symbols.get(key)
  if (symbol === undefined) {
    try {
      symbol = numberFormat(locale, { style: "currency", currency, currencyDisplay: display }).formatToParts(0).find((part) => part.type === "currency")?.value ?? currency
    } catch {
      symbol = currency
    }
    symbols.set(key, symbol)
  }
  return symbol
}

/** A currency's name in the locale ("Australian Dollar", "Euro"), or its code when the runtime has none. */
export function currencyName(currency: string, locale = getLocale()): string {
  return displayNames(locale, { type: "currency" })?.of(currency) ?? currency
}

/**
 * Typed or pasted text → minor units, or null. Accepts a currency symbol or code, grouping
 * marks or spaces, a leading minus or accounting brackets ("(12.30)"). The decimal and grouping
 * marks are `locale`'s ("1.234,50" in de-DE; default `getLocale()`). More decimals than the
 * currency has (or than `fractionDigits`) are rounded.
 */
export function parseMoney(text: string, currency: string = DEFAULT_CURRENCY, locale = getLocale(), fractionDigits?: number): number | null {
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
  const minor = toMinor(Number(source), currency, fractionDigits)
  return negative ? -minor : minor
}
