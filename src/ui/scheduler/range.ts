/**
 * Which days a view shows, how previous and next move through them, and the range's title.
 * Everything is calendar arithmetic on ISO days, so daylight saving never moves a day.
 */
import { dateTimeFormat } from "../../lib/locale/intl.js"
import { addDays, addMonths, daysInMonth, fromIsoDate, gridStart, isoParts, isoWeekday, type IsoDate } from "../date-picker/calendar-date.js"
import type { SchedulerView } from "./types.js"

/** Whole calendar days from `a` to `b` (negative when `b` is earlier), whatever the clocks did between them. */
export function daysBetween(a: IsoDate, b: IsoDate): number {
  const pa = isoParts(a)
  const pb = isoParts(b)
  if (!pa || !pb) return Number.NaN
  return Math.round((Date.UTC(pb.year, pb.month - 1, pb.day) - Date.UTC(pa.year, pa.month - 1, pa.day)) / 86_400_000)
}

/** The day that starts the week holding `day`, for weeks that start on `firstDay` (1 = Monday … 7 = Sunday). */
export function startOfWeek(day: IsoDate, firstDay: number): IsoDate {
  return addDays(day, -((isoWeekday(day) - firstDay + 7) % 7))
}

/** The first and last days of the month holding `day`. */
export function monthBounds(day: IsoDate): { first: IsoDate; last: IsoDate } {
  const parts = isoParts(day) ?? { year: 1970, month: 1, day: 1 }
  const prefix = `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}`
  return { first: `${prefix}-01`, last: `${prefix}-${String(daysInMonth(parts.year, parts.month)).padStart(2, "0")}` }
}

/** Every day from `start` to `end`, both included. */
export function dayRange(start: IsoDate, end: IsoDate): IsoDate[] {
  const count = daysBetween(start, end) + 1
  return Array.from({ length: Math.max(0, count) }, (_, index) => addDays(start, index))
}

/**
 * The days a view shows around `date`. Month: whole weeks covering the month (four to six).
 * Week: seven days from the week's first day, or `date` alone when compact. Day: `date`.
 * Agenda: every day of the month.
 */
export function visibleDays(view: SchedulerView, date: IsoDate, firstDay: number, compact = false): IsoDate[] {
  if (view === "day" || (view === "week" && compact)) return [date]
  if (view === "week") return dayRange(startOfWeek(date, firstDay), addDays(startOfWeek(date, firstDay), 6))
  const { first, last } = monthBounds(date)
  if (view === "agenda") return dayRange(first, last)
  const parts = isoParts(first)!
  const start = gridStart(parts.year, parts.month, firstDay)
  return dayRange(start, addDays(startOfWeek(last, firstDay), 6))
}

/** The date previous (`-1`) or next (`1`) moves to: a month, a week, or a day (a compact week moves by days). */
export function shiftDate(view: SchedulerView, date: IsoDate, delta: number, compact = false): IsoDate {
  if (view === "month" || view === "agenda") return addMonths(date, delta)
  if (view === "week" && !compact) return addDays(date, delta * 7)
  return addDays(date, delta)
}

/** The visible range as a title: "October 2026", "26 Oct – 1 Nov 2026", "Monday 26 October 2026". */
export function rangeTitle(view: SchedulerView, date: IsoDate, days: readonly IsoDate[], locale: string): string {
  if (view === "month" || view === "agenda") return dateTimeFormat(locale, { month: "long", year: "numeric" }).format(fromIsoDate(date))
  if (days.length > 1) return dateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).formatRange(fromIsoDate(days[0]!), fromIsoDate(days.at(-1)!))
  return dateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(fromIsoDate(days[0] ?? date))
}

/** `days` without the ISO weekdays in `hidden` (1 = Monday … 7 = Sunday); all of them when that would leave none. */
export function withoutHidden(days: IsoDate[], hidden: readonly number[] | undefined): IsoDate[] {
  if (!hidden?.length) return days
  const kept = days.filter((day) => !hidden.includes(isoWeekday(day)))
  return kept.length ? kept : days
}

/**
 * The days the timeline shows around `date`: the day, the week, or the month. `continuous`
 * months run from the first day of the month before to the last day of the month after, so
 * the strip can scroll across a month's edges. Compact shows `date` alone. Hidden weekdays
 * are left out (`date` itself always shows).
 */
export function timelineDays(view: SchedulerView, date: IsoDate, firstDay: number, compact: boolean, continuous: boolean, hidden?: readonly number[]): IsoDate[] {
  if (compact || view === "day") return [date]
  if (view === "agenda") return visibleDays(view, date, firstDay)
  if (view === "week") return withoutHidden(dayRange(startOfWeek(date, firstDay), addDays(startOfWeek(date, firstDay), 6)), hidden)
  const span = continuous ? 1 : 0
  const first = monthBounds(addMonths(date, -span)).first
  const last = monthBounds(addMonths(date, span)).last
  return withoutHidden(dayRange(first, last), hidden)
}

/** The index of the first of `days` (ascending) on or after `day`, or `days.length`. */
export function indexFrom(days: readonly IsoDate[], day: IsoDate): number {
  let low = 0
  let high = days.length
  while (low < high) {
    const middle = (low + high) >> 1
    if (days[middle]! < day) low = middle + 1
    else high = middle
  }
  return low
}
