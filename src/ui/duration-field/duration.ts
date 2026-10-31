import { asciiDigits } from "../../lib/locale/digits.js"
import { listFormat, numberFormat, numberSeparators } from "../../lib/locale/intl.js"
import { getLocale } from "../../lib/locale/locale.js"
import { durationFieldMessages, getDurationFieldMessages } from "./messages.js"
/**
 * Durations as people write them, to and from whole seconds.
 *
 *   parseDuration("1h 30m")      → 5400
 *   parseDuration("1:30")        → 5400 (hours:minutes; "1:30:15" adds seconds)
 *   parseDuration("1.5h")        → 5400
 *   parseDuration("90")          → 5400 with defaultUnit "m"
 *   parseDuration("2 days 4 hrs")→ 187200
 *   formatDuration(5400)         → "1h 30m"
 *
 * Other languages are read and written in their own words: with `locale: "de"`,
 * `parseDuration("1 Std. 30 Min.")` is 5400 and `formatDuration(5400)` writes "1h, 30 Min.".
 * English words and the numeric forms are understood in every locale.
 */

export type DurationUnit = "w" | "d" | "h" | "m" | "s"

/** The number of seconds in one of each duration unit (w, d, h, m, s). */
export const UNIT_SECONDS: Readonly<Record<DurationUnit, number>> = { w: 604800, d: 86400, h: 3600, m: 60, s: 1 }
const ORDER: DurationUnit[] = ["w", "d", "h", "m", "s"]

const UNIT_NAMES = { w: "week", d: "day", h: "hour", m: "minute", s: "second" } as const
const WORD = "[\\p{L}\\p{M}\\u05f3\\u05f4'’]+"

/* ── Intl.DurationFormat, where the runtime has it (minimal types: TypeScript's lib may not) ── */

type DurationRecord = Partial<Record<"weeks" | "days" | "hours" | "minutes" | "seconds", number>>
interface NativeDurationFormat {
  format(duration: DurationRecord): string
  formatToParts(duration: DurationRecord): Array<{ type: string; value: string }>
}
type NativeDurationFormatConstructor = new (locale: string, options: Record<string, string>) => NativeDurationFormat

const nativeConstructor = (): NativeDurationFormatConstructor | undefined => (Intl as unknown as { DurationFormat?: NativeDurationFormatConstructor }).DurationFormat
const nativeFormats = new Map<string, NativeDurationFormat | null>()

function nativeFormat(locale: string, style: "narrow" | "long", always?: string): NativeDurationFormat | null {
  const key = `${locale}|${style}|${always ?? ""}`
  let format = nativeFormats.get(key)
  if (format === undefined) {
    try {
      const Constructor = nativeConstructor()
      format = Constructor ? new Constructor(locale, { style, ...(always ? { [`${always}Display`]: "always" } : {}) }) : null
    } catch {
      format = null
    }
    nativeFormats.set(key, format)
  }
  return format
}

/* ── Reading ── */

const words = (list: string) => list.split(/\s+/).filter(Boolean)
const normal = (word: string, locale: string) => word.toLocaleLowerCase(locale).replace(/[.\s\u00a0\u2009\u202f]/g, "")
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

interface IntlWords {
  units: ReadonlyMap<string, DurationUnit>
  /** Words that carry their own count and are written without a number: Arabic "ساعة" (one hour), Hebrew "יומיים" (two days). */
  implied: ReadonlyMap<string, readonly [DurationUnit, number]>
}
const intlWordCache = new Map<string, IntlWords>()

/** The words the runtime itself writes for each unit in a locale (narrow, short and long; singular and plural). */
function intlWords(locale: string): IntlWords {
  let known = intlWordCache.get(locale)
  if (!known) {
    const units = new Map<string, DurationUnit>()
    const implied = new Map<string, readonly [DurationUnit, number]>()
    const add = (parts: Array<{ type: string; value: string }>, unit: DurationUnit, count: number) => {
      const numbered = parts.some((part) => part.type === "integer")
      for (const part of parts) {
        if (part.type !== "unit") continue
        const word = normal(part.value, locale)
        if (!word || /\d/.test(word)) continue
        if (!units.has(word)) units.set(word, unit)
        if (!numbered && !implied.has(word)) implied.set(word, [unit, count])
      }
    }
    try {
      const Constructor = nativeConstructor()
      for (const unit of ORDER) {
        for (const count of [1, 2, 5]) {
          for (const unitDisplay of ["narrow", "short", "long"] as const) add(numberFormat(locale, { style: "unit", unit: UNIT_NAMES[unit], unitDisplay }).formatToParts(count), unit, count)
          if (Constructor) for (const style of ["narrow", "short", "long"]) add(new Constructor(locale, { style }).formatToParts({ [`${UNIT_NAMES[unit]}s`]: count }), unit, count)
        }
      }
    } catch {
      // A locale the runtime cannot write is read with English and the pack's words.
    }
    intlWordCache.set(locale, (known = { units, implied }))
  }
  return known
}

/** The joining words of a locale's lists ("and", "und", "et"), which a spelled-out duration may contain. */
function joiningWords(locale: string): string[] {
  try {
    return listFormat(locale, { type: "conjunction" })
      .formatToParts(["1", "2", "3"])
      .filter((part) => part.type === "literal")
      .flatMap((part) => words(part.value.replace(/[,،、，;]/g, " ")))
  } catch {
    return []
  }
}

interface ReadingTable {
  units: ReadonlyMap<string, DurationUnit>
  joining: RegExp
  /** Matches words that stand for a count by themselves, or null where the locale has none. */
  implied: RegExp | null
  impliedCounts: ReadonlyMap<string, readonly [DurationUnit, number]>
}
const readingTables = new Map<string, ReadingTable>()

/** English, the pack's own words (`durationField` messages) and the runtime's, in that order of precedence. */
function readingTable(locale: string): ReadingTable {
  const own = getDurationFieldMessages(locale)
  const english = durationFieldMessages.defaults
  const key = [locale, ...[own, english].flatMap((set) => [set.weekWords, set.dayWords, set.hourWords, set.minuteWords, set.secondWords, set.joiningWords])].join("\n")
  let table = readingTables.get(key)
  if (!table) {
    const units = new Map<string, DurationUnit>()
    for (const set of [english, own]) {
      const lists: Array<[DurationUnit, string]> = [["w", set.weekWords], ["d", set.dayWords], ["h", set.hourWords], ["m", set.minuteWords], ["s", set.secondWords]]
      for (const [unit, list] of lists) for (const word of words(list)) if (!units.has(normal(word, locale))) units.set(normal(word, locale), unit)
    }
    const fromRuntime = intlWords(locale)
    for (const [word, unit] of fromRuntime.units) if (!units.has(word)) units.set(word, unit)
    const joining = new Set([...words(english.joiningWords), ...words(own.joiningWords), ...joiningWords(locale)].map((word) => normal(word, locale)))
    // A joining word stands alone, or is written against a number ("و30"), never inside a longer
    // word. Chinese, Japanese and Korean write no spaces, so theirs may touch the units; Arabic and
    // Hebrew write "and" as a one-letter prefix ("وساعتان"), so theirs may touch the next word.
    const noSpaces = /[\p{sc=Han}\p{sc=Hiragana}\p{sc=Katakana}\p{sc=Hangul}]/u
    const prefix = /^[\p{sc=Arabic}\p{sc=Hebrew}]$/u
    const kinds = { unspaced: [] as string[], prefixed: [] as string[], spaced: [] as string[] }
    for (const word of joining) (noSpaces.test(word) ? kinds.unspaced : prefix.test(word) ? kinds.prefixed : kinds.spaced).push(escapeRegExp(word))
    const alternatives = [
      kinds.spaced.length ? `(?<![\\p{L}\\p{M}])(?:${kinds.spaced.join("|")})(?![\\p{L}\\p{M}])` : "",
      kinds.prefixed.length ? `(?<![\\p{L}\\p{M}])(?:${kinds.prefixed.join("|")})` : "",
      ...kinds.unspaced,
    ].filter(Boolean).join("|")
    const pattern = alternatives ? new RegExp(alternatives, "gu") : /(?!)/g
    // "ساعة" alone is one hour; after a number it is only the unit.
    const alone = [...fromRuntime.implied.keys()].map(escapeRegExp)
    const implied = alone.length ? new RegExp(`(?<!\\d\\s*)(?<![\\p{L}\\p{M}])(?:${alone.join("|")})(?![\\p{L}\\p{M}])`, "gu") : null
    readingTables.set(key, (table = { units, joining: pattern, implied, impliedCounts: fromRuntime.implied }))
  }
  return table
}

export interface DurationParseOptions {
  /** The unit of a bare number ("90" → 90 minutes). Default "m". */
  defaultUnit?: DurationUnit
  /** BCP 47 locale whose unit words, digits and decimal mark the text may use, besides English. Default `getLocale()`. */
  locale?: string
}

/** Seconds, or null when the text is not a duration. Fractions round to the nearest second. */
export function parseDuration(text: string, options: DurationParseOptions = {}): number | null {
  const locale = options.locale ?? getLocale()
  const table = readingTable(locale)
  let source = asciiDigits(text.trim(), locale).toLocaleLowerCase(locale)
  // The locale's decimal mark between digits ("1,5 Std." in de), before commas count as spaces.
  const { decimal } = numberSeparators(locale)
  if (decimal !== ".") source = source.replace(new RegExp(`(\\d)${escapeRegExp(decimal)}(?=\\d)`, "g"), "$1.")
  source = source.replace(/(?<=[\p{L}\p{M}])\./gu, "").replace(table.joining, " ").replace(/[,،、，;]/g, " ").trim()
  if (table.implied) source = source.replace(table.implied, (word) => `${table.impliedCounts.get(normal(word, locale))?.[1] ?? 1} ${word}`)
  if (!source) return null
  // h:mm or h:mm:ss
  const clock = /^(\d+):([0-5]?\d)(?::([0-5]?\d))?$/.exec(source)
  if (clock) return Number(clock[1]) * 3600 + Number(clock[2]) * 60 + Number(clock[3] ?? 0)
  // A bare number in the default unit.
  if (/^\d+(\.\d+)?$/.test(source)) return Math.round(Number(source) * UNIT_SECONDS[options.defaultUnit ?? "m"])
  // Number–unit pairs: "1h30m", "1 h 30 m", "1.5 hours", "2d 4h".
  const pair = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(${WORD})`, "gu")
  let total = 0
  let consumed = ""
  const seen = new Set<DurationUnit>()
  for (let match = pair.exec(source); match; match = pair.exec(source)) {
    const unit = table.units.get(normal(match[2] ?? "", locale))
    if (!unit || seen.has(unit)) return null
    seen.add(unit)
    total += Number(match[1]) * UNIT_SECONDS[unit]
    consumed += match[0]
  }
  // Every character must belong to a pair ("1h foo" is not a duration).
  if (!seen.size || consumed.replace(/\s/g, "") !== source.replace(/\s/g, "")) return null
  return Math.round(total)
}

/* ── Writing ── */

export interface DurationFormatOptions {
  /** Locale for unit names (and, in other languages, the short notation). Defaults to getLocale(). */
  locale?: string
  /** Units to write, largest first. Default: weeks are not used; d, h, m and s are. */
  units?: readonly DurationUnit[]
  /**
   * "short" (default) "1h 30m"; "long" "1 hour 30 minutes". English keeps these two forms
   * exactly. Other languages use `Intl.DurationFormat` where the runtime has it ("1h, 30 Min.",
   * "1 Stunde, 30 Minuten" in de) and the English notation where it does not.
   */
  style?: "short" | "long"
}

const isEnglish = (locale: string) => /^en([-_]|$)/i.test(locale)

/** "1h 30m"; 0 → "0m" (the smallest unit allowed). Seconds below the smallest unit round. */
export function formatDuration(seconds: number, options: DurationFormatOptions = {}): string {
  const locale = options.locale ?? getLocale()
  const long = (count: number, unit: DurationUnit) => numberFormat(locale, { style: "unit", unit: UNIT_NAMES[unit], unitDisplay: "long" }).format(count)
  const units = ORDER.filter((unit) => (options.units ?? ["d", "h", "m", "s"]).includes(unit))
  const smallest = units.at(-1) ?? "s"
  let rest = Math.round(Math.abs(seconds) / UNIT_SECONDS[smallest]) * UNIT_SECONDS[smallest]
  const amounts: Array<[DurationUnit, number]> = []
  for (const unit of units) {
    const amount = Math.floor(rest / UNIT_SECONDS[unit])
    rest -= amount * UNIT_SECONDS[unit]
    if (amount) amounts.push([unit, amount])
  }
  const sign = seconds < 0 ? "−" : ""
  const style = options.style === "long" ? "long" : "narrow"
  const field = (unit: DurationUnit) => `${UNIT_NAMES[unit]}s` as const
  const native = isEnglish(locale)
    ? null
    : amounts.length
      ? nativeFormat(locale, style)?.format(Object.fromEntries(amounts.map(([unit, amount]) => [field(unit), amount])))
      : nativeFormat(locale, style, field(smallest))?.format({ [field(smallest)]: 0 })
  if (native) return sign + native
  const parts = amounts.map(([unit, amount]) => (options.style === "long" ? long(amount, unit) : `${amount}${unit}`))
  if (!parts.length) parts.push(options.style === "long" ? long(0, smallest) : `0${smallest}`)
  return sign + parts.join(" ")
}
