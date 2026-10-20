/**
 * Number and time formatting for charts (R2.7): tabular figures, units with a space
 * ("7.8 GB", "28 ms", "34%"), dates in the resolved locale, relative time for recent
 * moments. Every helper takes an optional locale (in `LocalizedFormat.locale` or as the last
 * argument); without one it uses `getLocale()`. Charts pass their `useLocale()` result.
 */
import { dateTimeFormat, numberFormat } from "../../../lib/locale/intl.js"
import { getLocale } from "../../../lib/locale/locale.js"
import { formatMetric } from "../../metric/index.js"

/**
 * A unit: a symbol ("%", "GB", "ms") or a counted noun with its singular and plural
 * ({ one: "alert", other: "alerts" }: "1 alert", "2 alerts", "0 alerts").
 */
export type ChartUnit = string | { one: string; other: string }

export interface ValueFormat {
  /** "%", "GB", "ms", or a counted noun ({ one, other })… "%" sticks to the number; other units take a space. */
  unit?: ChartUnit
  /** Full control of the number (the unit is still appended). Receives the chart's resolved locale as its second argument. */
  format?: (value: number, locale: string) => string
}

/** A ValueFormat plus the BCP 47 locale to write numbers in (default `getLocale()`). */
export type LocalizedFormat = ValueFormat & { locale?: string }

/** The unit's text for one value: the singular only for exactly one. */
export function unitFor(unit: ChartUnit | undefined, value: number): string | undefined {
  if (unit === undefined || typeof unit === "string") return unit
  return value === 1 ? unit.one : unit.other
}

const COMPACT: Intl.NumberFormatOptions = { notation: "compact", maximumFractionDigits: 1 }
const ONE_DECIMAL: Intl.NumberFormatOptions = { maximumFractionDigits: 1 }
/** Numbers and their units are joined by a thin space (R2.7), as Metric does. */
export const THIN_SPACE = "\u2009"

/** One value as the chart shows it everywhere: tooltips, readouts, labels and the table. */
export function formatValue(value: number | null | undefined, { unit, format, locale = getLocale() }: LocalizedFormat = {}): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—"
  return formatMetric(value, unitFor(unit, value), format ? (n) => format(n, locale) : undefined, locale)
}

/** Large counts on tight labels: 1,284 → 1.3K. */
export function formatCompact(value: number, { unit, locale = getLocale() }: LocalizedFormat = {}): string {
  const text = numberFormat(locale, Math.abs(value) >= 10_000 ? COMPACT : ONE_DECIMAL).format(value)
  return unit ? formatMetric(0, unitFor(unit, value), () => text, locale) : text
}

const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB", "PB"] as const

/** Bytes the way Windows reports them (binary multiples): 1.8 GB, 640 MB, 12 KB, with the number in `locale`. */
export function formatBytes(bytes: number, locale = getLocale()): string {
  if (!Number.isFinite(bytes)) return "—"
  let value = Math.abs(bytes)
  let unit = 0
  while (value >= 1024 && unit < BYTE_UNITS.length - 1) {
    value /= 1024
    unit++
  }
  const digits = value >= 100 || unit === 0 ? 0 : 1
  const text = numberFormat(locale, { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(value)
  return `${bytes < 0 ? "−" : ""}${text}${THIN_SPACE}${BYTE_UNITS[unit]}`
}

/** A ValueFormat for byte quantities, in the chart's locale. */
export const BYTES: ValueFormat = { format: (bytes, locale) => formatBytes(bytes, locale) }

/**
 * Tick labels share one precision so a column of them aligns: 0 / 2.5 / 5 / 7.5, never
 * 0 / 2.5 / 5.0 mixed with 5. `step` is the tick spacing.
 */
export function formatTick(value: number, step: number, fmt: LocalizedFormat = {}): string {
  if (fmt.format) return formatValue(value, fmt)
  // The fewest decimals that write the step exactly: 2.5 → 1, 0.25 → 2, 20 → 0.
  let decimals = 0
  for (let d = 0; d <= 4; d++) {
    decimals = d
    if (step <= 0 || Math.abs(Math.round(step * 10 ** d) - step * 10 ** d) <= 1e-9) break
  }
  const locale = fmt.locale ?? getLocale()
  const text = numberFormat(locale, Math.abs(value) >= 10_000 ? COMPACT : { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value)
  return fmt.unit ? formatMetric(0, unitFor(fmt.unit, value), () => text, locale) : text
}

// ── Time ────────────────────────────────────────────────────────────────────────────────

const HOUR = 3_600_000
const DAY = 24 * HOUR

const CLOCK: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit", hour12: false }
const DAY_MONTH: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }
const MONTH: Intl.DateTimeFormatOptions = { month: "short" }
const MONTH_YEAR: Intl.DateTimeFormatOptions = { month: "short", year: "numeric" }
const WEEKDAY_DATE_TIME: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }
const DATE: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }

/** "10:32" — 24-hour, so an axis never needs am/pm. */
export const formatClock = (date: Date, locale = getLocale()) => dateTimeFormat(locale, CLOCK).format(date)

/**
 * Labels for time ticks, chosen by the spacing between them: clock times within a day,
 * "13 Oct" across days, "Oct" across months, and the day or year where it changes.
 */
export function formatTimeTicks(ticks: readonly Date[], locale = getLocale()): string[] {
  if (ticks.length === 0) return []
  const clock = dateTimeFormat(locale, CLOCK)
  const dayMonth = dateTimeFormat(locale, DAY_MONTH)
  const step = ticks.length > 1 ? ticks[1]!.getTime() - ticks[0]!.getTime() : HOUR
  return ticks.map((tick, index) => {
    const previous = index > 0 ? ticks[index - 1] : undefined
    if (step < DAY) {
      const dayChanged = previous && previous.getDate() !== tick.getDate()
      return dayChanged || (tick.getHours() === 0 && tick.getMinutes() === 0) ? dayMonth.format(tick) : clock.format(tick)
    }
    if (step < 28 * DAY) return dayMonth.format(tick)
    const yearChanged = previous && previous.getFullYear() !== tick.getFullYear()
    return dateTimeFormat(locale, yearChanged || tick.getMonth() === 0 ? MONTH_YEAR : MONTH).format(tick)
  })
}

/** The absolute moment in a readout: "Mon 13 Oct, 10:32" (or just "10:32" within a day). */
export function formatInstant(date: Date, spanMs = DAY, locale = getLocale()): string {
  return dateTimeFormat(locale, spanMs <= DAY ? CLOCK : WEEKDAY_DATE_TIME).format(date)
}

/** A date with year, for table cells: "13 Oct 2026". */
export const formatDate = (date: Date, locale = getLocale()) => dateTimeFormat(locale, DATE).format(date)

/** Relative time for recent moments (R2.7): "now", "2 min ago", "3 h ago", "2 days ago". */
export function formatRelative(date: Date, now: Date): string {
  const ms = now.getTime() - date.getTime()
  if (ms < 45_000 && ms > -45_000) return "now"
  const future = ms < 0
  const abs = Math.abs(ms)
  const text =
    abs < HOUR
      ? `${Math.round(abs / 60_000)} min`
      : abs < DAY
        ? `${Math.round(abs / HOUR)} h`
        : `${Math.round(abs / DAY)} ${Math.round(abs / DAY) === 1 ? "day" : "days"}`
  return future ? `in ${text}` : `${text} ago`
}

/** Share of a whole: 82%, 4.6%, <0.1%, with the number in `locale`. */
export function formatShare(part: number, whole: number, locale = getLocale()): string {
  if (whole <= 0) return "—"
  const share = (part / whole) * 100
  if (share > 0 && share < 0.1) return "<0.1%"
  return `${numberFormat(locale, { maximumFractionDigits: share < 10 ? 1 : 0 }).format(share)}%`
}

/**
 * The type role for a value centred in a ring of inner radius `radius` (px): display in a
 * pane, headline or title in a tile, label in a small ring. Captions show from "sm" up.
 */
export function centreSize(radius: number, rem: number): "xs" | "sm" | "md" | "lg" {
  if (radius >= 6 * rem) return "lg"
  if (radius >= 3.75 * rem) return "md"
  if (radius >= 2.5 * rem) return "sm"
  return "xs"
}
