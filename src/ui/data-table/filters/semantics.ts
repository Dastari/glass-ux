/**
 * What a filter means, in one place: unit conversion, integer rounding and time windows.
 * `matches` (local data) and server adapters both read these, so a filter selects the same
 * rows in the browser as on the server.
 */
import { addDays, isIsoDate, todayIso, type IsoDate } from "../../date-picker/calendar-date.js"
import type {
  CompareOp,
  DateFilterValue,
  DatePresetValue,
  NumberFilterSpec,
  NumberFilterValue,
} from "./types.js"

/* ── Numbers ─────────────────────────────────────────────────────────────────── */

/** Twelve significant digits: enough for any display value, and it removes binary noise (57 × 0.01). */
export const tidyNumber = (value: number) => Number(value.toPrecision(12))

/** A display value (`50` %) in stored units (`0.5`). */
export const toStored = (display: number, spec: Pick<NumberFilterSpec, "scale">) => tidyNumber(display * spec.scale)

/**
 * The stored-unit comparisons a number filter makes. An IntFilter holds whole numbers, so
 * fractional bounds are moved to the equivalent whole number (`> 2.5` is `> 2`, `≥ 2.5` is
 * `≥ 3`); `=` and `≠` round to the nearest one.
 */
export function numberComparisons(value: Exclude<NumberFilterValue, { op: "isEmpty" | "isNotEmpty" }>, spec: Pick<NumberFilterSpec, "scale" | "server">): Array<[CompareOp, number]> {
  const int = spec.server === "int"
  const convert = (display: number, round: "floor" | "ceil" | "nearest") => {
    const stored = toStored(display, spec)
    if (!int || Number.isInteger(stored)) return stored
    return round === "floor" ? Math.floor(stored) : round === "ceil" ? Math.ceil(stored) : Math.round(stored)
  }
  switch (value.op) {
    case "between":
      return [
        ["gte", convert(value.min, "ceil")],
        ["lte", convert(value.max, "floor")],
      ]
    case "gt":
    case "lte":
      return [[value.op, convert(value.value, "floor")]]
    case "gte":
    case "lt":
      return [[value.op, convert(value.value, "ceil")]]
    default:
      return [[value.op, convert(value.value, "nearest")]]
  }
}

export function compare(op: CompareOp, left: number | string, right: number | string) {
  switch (op) {
    case "eq":
      return left === right
    case "ne":
      return left !== right
    case "gt":
      return left > right
    case "gte":
      return left >= right
    case "lt":
      return left < right
    case "lte":
      return left <= right
  }
}

/* ── Time ────────────────────────────────────────────────────────────────────── */

const HOUR_MS = 3_600_000

/** Instant bounds in epoch ms, all on whole seconds. */
export interface TimeBounds {
  gte?: number
  gt?: number
  lt?: number
  lte?: number
}

const floorSecond = (ms: number) => Math.floor(ms / 1000) * 1000

/** Local midnight `offset` days from `now`'s day (calendar arithmetic, safe across DST). */
export function localDayStart(now: Date, offset = 0) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset).getTime()
}

/** A day (local midnight) or an RFC 3339 instant, in epoch ms. NaN when invalid. */
export function instantOf(text: string): number {
  if (isIsoDate(text)) {
    const [year, month, day] = text.split("-").map(Number) as [number, number, number]
    return new Date(year, month - 1, day).getTime()
  }
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})$/.test(text)) return Number.NaN
  const ms = Date.parse(text)
  return Number.isNaN(ms) ? ms : floorSecond(ms)
}

export const isInstantText = (text: string) => text.includes("T")

type TimeValue = Exclude<DateFilterValue, { op: "isEmpty" | "isNotEmpty" }>

/**
 * The window a date filter selects, computed from the user's local day boundaries at
 * `now`. Presets: today `[00:00, tomorrow)`, last 24 hours `[now − 24 h, …)`, last N days
 * `[00:00 N−1 days ago, tomorrow)`, more than N days ago `(…, 00:00 N days ago)`, in the
 * future `(now, …)`. A range of days runs from the first day's midnight up to (not
 * including) the midnight after the last; a range of instants is inclusive.
 */
export function timeBounds(value: TimeValue, now: Date): TimeBounds {
  switch (value.op) {
    case "today":
      return { gte: localDayStart(now), lt: localDayStart(now, 1) }
    case "last24h":
      return { gte: floorSecond(now.getTime() - 24 * HOUR_MS) }
    case "recent":
      return { gte: localDayStart(now, -(value.days - 1)), lt: localDayStart(now, 1) }
    case "olderThan":
      return { lt: localDayStart(now, -value.days) }
    case "future":
      return { gt: floorSecond(now.getTime()) }
    case "before":
      return { lt: instantOf(value.at) }
    case "after":
      return { gte: instantOf(value.at) }
    case "between":
      if (isInstantText(value.start) || isInstantText(value.end)) return { gte: instantOf(value.start), lte: instantOf(value.end) }
      return { gte: instantOf(value.start), lt: instantOf(addDays(value.end, 1)) }
  }
}

/** Day bounds for a calendar-date column (no time): ISO days, compared as text. */
export interface DayBounds {
  gte?: IsoDate
  lt?: IsoDate
  lte?: IsoDate
}

/**
 * The days a filter selects on a calendar-date column, relative to `today`: today, the N
 * days ending today, on or before a day, and from tomorrow. A server adapter maps them to
 * its own calendar predicates.
 */
export function dayBounds(value: Exclude<TimeValue, { op: "last24h" }>, today: IsoDate): DayBounds {
  switch (value.op) {
    case "today":
      return { gte: today, lt: addDays(today, 1) }
    case "recent":
      return { gte: addDays(today, -(value.days - 1)), lt: addDays(today, 1) }
    case "olderThan":
      return { lt: addDays(today, -value.days) }
    case "future":
      return { gte: addDays(today, 1) }
    case "before":
      return { lt: value.at.slice(0, 10) }
    case "after":
      return { gte: value.at.slice(0, 10) }
    case "between":
      return { gte: value.start.slice(0, 10), lte: value.end.slice(0, 10) }
  }
}

export const isPreset = (value: DateFilterValue): value is DatePresetValue =>
  value.op === "today" || value.op === "last24h" || value.op === "future" || value.op === "recent" || value.op === "olderThan"

export const samePreset = (a: DatePresetValue, b: DateFilterValue) =>
  a.op === b.op && ("days" in a ? "days" in b && a.days === b.days : true)

export { todayIso }
