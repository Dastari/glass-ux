/**
 * Sizes in bytes as people write them: "500 MB", "1.5 GiB", "2TB", "750k". Decimal units
 * (kB, MB, GB, TB, PB: powers of 1000, as disks and Windows Explorer's file sizes are sold)
 * and binary units (KiB, MiB, GiB…: powers of 1024, as memory is) are both understood.
 *
 *   parseBytes("1.5 GB") → 1_500_000_000
 *   parseBytes("2 GiB")  → 2_147_483_648
 *   formatBytes(1_500_000_000) → "1.5 GB"
 *
 * Numbers and unit symbols are written and read in a BCP 47 `locale` ("1,5 GB" in de-DE, "1,5 Go"
 * in fr, Arabic-Indic digits in ar-EG); without one, in `getLocale()` (`configureLocale()`,
 * then `<html lang>`, then en-US). English unit names are always understood.
 */
import { asciiDigits } from "../../lib/locale/digits.js"
import { delocalizeNumber, numberSeparators } from "../../lib/locale/intl.js"
import { getLocale } from "../../lib/locale/locale.js"
import { byteUnitSymbols, formatByteSize } from "./units.js"

export type ByteBase = "decimal" | "binary"

const UNITS: ReadonlyArray<[RegExp, number]> = [
  [/^(b|byte|bytes)$/i, 1],
  [/^(k|kb|kilobytes?)$/i, 1e3],
  [/^(m|mb|megabytes?)$/i, 1e6],
  [/^(g|gb|gigabytes?)$/i, 1e9],
  [/^(t|tb|terabytes?)$/i, 1e12],
  [/^(p|pb|petabytes?)$/i, 1e15],
  [/^(ki|kib|kibibytes?)$/i, 1024],
  [/^(mi|mib|mebibytes?)$/i, 1024 ** 2],
  [/^(gi|gib|gibibytes?)$/i, 1024 ** 3],
  [/^(ti|tib|tebibytes?)$/i, 1024 ** 4],
  [/^(pi|pib|pebibytes?)$/i, 1024 ** 5],
]

export interface ParseBytesOptions {
  /** The unit of a bare number ("500" → 500 MB with "MB"). Default "B". */
  defaultUnit?: string
  /** BCP 47 locale whose digits, decimal and grouping marks and unit symbols the text uses. Default `getLocale()`. */
  locale?: string
}

const escapeForClass = (text: string) => text.replace(/[\\\]^-]/g, "\\$&")

/** Whole bytes, or null when the text is not a size. */
export function parseBytes(text: string, options: ParseBytesOptions = {}): number | null {
  const locale = options.locale ?? getLocale()
  const { decimal, group } = numberSeparators(locale)
  const match = /^(.*?)\s*(\p{L}*)$/u.exec(asciiDigits(text.trim(), locale))
  const written = match?.[1] ?? ""
  const marks = new RegExp(`^[0-9.,'’\\s\u00a0\u202f${escapeForClass(group)}${escapeForClass(decimal)}]+$`)
  if (!/[0-9]/.test(written) || !marks.test(written)) return null
  const number = delocalizeNumber(written, locale)
  if (!/^(\d+(\.\d+)?|\.\d+)$/.test(number)) return null
  const amount = Number(number)
  const unit = match?.[2] || options.defaultUnit || "B"
  const factor = UNITS.find(([pattern]) => pattern.test(unit))?.[1] ?? byteUnitSymbols(locale).get(unit.toLocaleLowerCase(locale))
  if (factor === undefined || !Number.isFinite(amount)) return null
  return Math.round(amount * factor)
}

export interface FormatBytesOptions {
  /** decimal (default): kB, MB, GB; binary: KiB, MiB, GiB. */
  base?: ByteBase
  /** Significant decimals kept (default 1, dropped when zero: "2 GB", "1.5 GB"). */
  decimals?: number
  /** BCP 47 locale for the number and the unit symbols. Default `getLocale()`. */
  locale?: string
}

/** "1.5 GB", with a thin space between number and unit (R2.7). The unit symbols follow the locale ("1,5 Go" in fr). */
export function formatBytes(bytes: number, options: FormatBytesOptions = {}): string {
  return formatByteSize(bytes, { base: options.base, decimals: options.decimals ?? 1, locale: options.locale })
}
