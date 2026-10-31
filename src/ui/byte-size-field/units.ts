/**
 * One byte-size formatter for every component that writes a size: file lists, the byte size
 * field and chart axes. The number is written in the locale and the unit symbol comes from
 * the `byteUnits` messages, so French shows "1,5 Go" where English shows "1.5 GB".
 */
import { numberFormat } from "../../lib/locale/intl.js"
import { getLocale } from "../../lib/locale/locale.js"
import { getByteUnitsMessages } from "./units-messages.js"

/** U+2009 THIN SPACE between a size and its unit (`7.8 GB`). */
export const BYTE_SIZE_SPACE = " "

/** Prefix letters, from kilo to peta. Kilo is lower case in SI ("kB") and upper case elsewhere. */
const PREFIXES = ["K", "M", "G", "T", "P"] as const

/** How a byte size is written: its multiples, its unit symbols and its precision. */
export interface FormatByteSizeOptions {
  /** BCP 47 locale for the number and the unit symbols. Default `getLocale()`. */
  locale?: string
  /** Powers of 1000 ("decimal", the default) or of 1024 ("binary"). */
  base?: "decimal" | "binary"
  /**
   * The unit symbols: "si" writes kB, MB, GB (the default for decimal), "iec" writes KiB, MiB,
   * GiB (the default for binary) and "windows" writes KB, MB, GB for either base, as file
   * managers do.
   */
  symbols?: "si" | "iec" | "windows"
  /** The most fraction digits kept, or "auto" for none from 100 up and one below. Default "auto". */
  decimals?: number | "auto"
  /** The largest unit used: 4 stops at terabytes, 5 (the default) goes to petabytes. */
  largestUnit?: 1 | 2 | 3 | 4 | 5
}

/** "1.5 GB": a byte count with the locale's number and unit symbol, a thin space between, and "−" for a negative count. */
export function formatByteSize(bytes: number, options: FormatByteSizeOptions = {}): string {
  const locale = options.locale ?? getLocale()
  const binary = options.base === "binary"
  const step = binary ? 1024 : 1000
  const symbols = options.symbols ?? (binary ? "iec" : "si")
  const largest = options.largestUnit ?? 5
  let value = Math.abs(bytes)
  let unit = 0
  while (value >= step && unit < largest) {
    value /= step
    unit++
  }
  const decimals = options.decimals ?? "auto"
  const digits = unit === 0 ? 0 : decimals === "auto" ? (value >= 100 ? 0 : 1) : decimals
  const text = numberFormat(locale, { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(value)
  const messages = getByteUnitsMessages(locale)
  const symbol =
    unit === 0
      ? messages.byte
      : messages.prefixedUnit({ prefix: symbols === "si" && unit === 1 ? "k" : PREFIXES[unit - 1]!, binary: symbols === "iec" })
  return `${bytes < 0 ? "−" : ""}${text}${BYTE_SIZE_SPACE}${symbol}`
}

/** Every symbol a locale writes for a size, in lower case, with its multiplier, for reading sizes back. */
export function byteUnitSymbols(locale: string): ReadonlyMap<string, number> {
  const messages = getByteUnitsMessages(locale)
  const symbols = new Map<string, number>([[messages.byte.toLocaleLowerCase(locale), 1]])
  PREFIXES.forEach((prefix, index) => {
    symbols.set(messages.prefixedUnit({ prefix, binary: false }).toLocaleLowerCase(locale), 1000 ** (index + 1))
    symbols.set(messages.prefixedUnit({ prefix, binary: true }).toLocaleLowerCase(locale), 1024 ** (index + 1))
  })
  return symbols
}
