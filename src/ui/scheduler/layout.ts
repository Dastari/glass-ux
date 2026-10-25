/**
 * Event layout. Timed events in a day column are packed as an interval graph: events that
 * overlap, directly or through others, form a cluster; each takes the first column free at
 * its start, the cluster is as wide as its most columns, and an event widens to the right
 * across columns that stay free for its whole time. Whole-day bars are packed into rows, each
 * taking the first row free across all of its days.
 */
import { addDays, type IsoDate } from "../date-picker/calendar-date.js"
import { daysBetween } from "./range.js"
import type { SchedulerEvent, SchedulerTone } from "./types.js"
import { DAY_MINUTES, toDay, toEpoch, wallPosition } from "./zone.js"

/** An interval to pack: minutes in a day for timed columns, day indexes for bars. */
export interface Interval {
  id: string
  /** Inclusive start. */
  start: number
  /** Exclusive end. */
  end: number
}

/** Where a timed segment sits across its cluster's columns. */
export interface ColumnPlacement {
  /** 0-based column. */
  column: number
  /** Columns it covers, from `column` to the right (at least 1). */
  span: number
  /** Columns in its cluster. */
  columns: number
}

const byStart = (a: Interval, b: Interval) => a.start - b.start || b.end - b.start - (a.end - a.start) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)

/**
 * Columns for overlapping intervals. Intervals that touch (one ends as the next starts) do not
 * overlap. Ties sort longer first, then by id, so the same events always lay out the same way.
 */
export function packColumns(intervals: readonly Interval[]): Map<string, ColumnPlacement> {
  const placed = new Map<string, ColumnPlacement>()
  const sorted = intervals.toSorted(byStart)
  let cluster: Array<Interval & { column: number }> = []
  let columnEnds: number[] = []
  let clusterEnd = -Infinity
  const close = () => {
    const columns = columnEnds.length
    for (const item of cluster) {
      // Widen into the columns to the right that nothing in the cluster uses during this item.
      let span = 1
      while (item.column + span < columns && !cluster.some((other) => other.column === item.column + span && other.start < item.end && other.end > item.start)) span++
      placed.set(item.id, { column: item.column, span, columns })
    }
    cluster = []
    columnEnds = []
  }
  for (const item of sorted) {
    if (item.start >= clusterEnd) close()
    let column = columnEnds.findIndex((end) => end <= item.start)
    if (column === -1) column = columnEnds.push(item.end) - 1
    else columnEnds[column] = item.end
    cluster.push({ ...item, column })
    clusterEnd = cluster.length === 1 ? item.end : Math.max(clusterEnd, item.end)
  }
  close()
  return placed
}

/** Rows for bars over day indexes (`end` exclusive): each takes the lowest row free across its days. Returns each bar's row and the row count. */
export function packRows(intervals: readonly Interval[], order: (a: Interval, b: Interval) => number = byStart): { rows: Map<string, number>; count: number } {
  const rows = new Map<string, number>()
  const taken: Array<Array<[number, number]>> = []
  for (const item of intervals.toSorted(order)) {
    let row = taken.findIndex((spans) => spans.every(([start, end]) => end <= item.start || start >= item.end))
    if (row === -1) row = taken.push([]) - 1
    taken[row]!.push([item.start, item.end])
    rows.set(item.id, row)
  }
  return { rows, count: taken.length }
}

/** An event in the scheduler's zone: timed (instants and wall-clock positions) or whole days. */
export interface PlacedEvent<E extends SchedulerEvent = SchedulerEvent> {
  event: E
  id: string
  tone: SchedulerTone
  /** Shown as a bar across days: all-day, or timed and 24 hours or longer. */
  band: boolean
  allDay: boolean
  startMs: number
  endMs: number
  /** The first day it covers. */
  startDay: IsoDate
  /** The last day it covers (inclusive). */
  endDay: IsoDate
  /** Wall-clock minutes of the start on `startDay` and of the end on `endDay` (1440 when it ends at midnight). */
  startMinutes: number
  endMinutes: number
}

/** Read an event in a zone. Null when its start is not a time. */
export function placeEvent<E extends SchedulerEvent>(event: E, timeZone: string): PlacedEvent<E> | null {
  const tone = event.tone ?? 1
  if (event.allDay) {
    const startDay = toDay(event.start, timeZone)
    const endExclusive = event.end === undefined ? startDay : toDay(event.end, timeZone)
    const length = Math.max(1, daysBetween(startDay, endExclusive))
    if (Number.isNaN(length)) return null
    const endDay = addDays(startDay, length - 1)
    return { event, id: event.id, tone, band: true, allDay: true, startMs: toEpoch(startDay, timeZone), endMs: toEpoch(addDays(startDay, length), timeZone), startDay, endDay, startMinutes: 0, endMinutes: DAY_MINUTES }
  }
  const startMs = toEpoch(event.start, timeZone)
  if (!Number.isFinite(startMs)) return null
  const rawEnd = event.end === undefined ? Number.NaN : toEpoch(event.end, timeZone)
  const endMs = Number.isFinite(rawEnd) && rawEnd > startMs ? rawEnd : startMs + 30 * 60_000
  const start = wallPosition(startMs, timeZone)
  let end = wallPosition(endMs, timeZone)
  // An end at midnight closes the previous day.
  if (end.minutes === 0 && end.day > start.day) end = { day: addDays(end.day, -1), minutes: DAY_MINUTES }
  return { event, id: event.id, tone, band: endMs - startMs >= 86_400_000, allDay: false, startMs, endMs, startDay: start.day, endDay: end.day, startMinutes: start.minutes, endMinutes: end.minutes }
}

/** A piece of a timed event inside one day column. */
export interface DaySegment<E extends SchedulerEvent = SchedulerEvent> extends ColumnPlacement {
  placed: PlacedEvent<E>
  /** Minutes since the day's midnight. */
  start: number
  end: number
  /** It began on an earlier day / carries on into a later one. */
  continuesBefore: boolean
  continuesAfter: boolean
}

/** The timed events of one day, cut to the day and packed into columns. */
export function daySegments<E extends SchedulerEvent>(events: readonly PlacedEvent<E>[], day: IsoDate): DaySegment<E>[] {
  const pieces = events
    .filter((placed) => !placed.band && placed.startDay <= day && placed.endDay >= day)
    .map((placed) => {
      const start = placed.startDay === day ? placed.startMinutes : 0
      // Keep a sliver of a zero-length or very short event visible.
      const end = Math.max(placed.endDay === day ? placed.endMinutes : DAY_MINUTES, start + 15)
      return { placed, start, end: Math.min(DAY_MINUTES, end), continuesBefore: placed.startDay < day, continuesAfter: placed.endDay > day }
    })
  const columns = packColumns(pieces.map((piece) => ({ id: piece.placed.id, start: piece.start, end: piece.end })))
  return pieces.map((piece) => ({ ...piece, ...columns.get(piece.placed.id)! }))
}

/** A bar across consecutive days of a row of `days` (a week, or the band of a week view). */
export interface BarSegment<E extends SchedulerEvent = SchedulerEvent> {
  placed: PlacedEvent<E>
  /** Index of its first day in the row. */
  first: number
  /** Days it covers in the row. */
  length: number
  row: number
  /** It began before the row / carries on after it. */
  continuesBefore: boolean
  continuesAfter: boolean
}

/**
 * Bars for a row of consecutive days. `includeTimed` adds timed events as one-day items on
 * their start day (the month grid lists them under the bars, in time order).
 */
export function barSegments<E extends SchedulerEvent>(events: readonly PlacedEvent<E>[], days: readonly IsoDate[], includeTimed = false): { bars: BarSegment<E>[]; rows: number } {
  const first = days[0]
  const last = days.at(-1)
  if (!first || !last) return { bars: [], rows: 0 }
  const items = events.filter((placed) => (placed.band ? placed.startDay <= last && placed.endDay >= first : includeTimed && placed.startDay >= first && placed.startDay <= last))
  const spans = new Map(
    items.map((placed) => {
      const start = Math.max(0, daysBetween(first, placed.startDay))
      const end = placed.band ? Math.min(days.length, daysBetween(first, placed.endDay) + 1) : start + 1
      return [placed.id, { placed, start, end }] as const
    }),
  )
  // Bars first (longest first), then timed items by their time.
  const rank = (id: string) => spans.get(id)!.placed
  const { rows, count } = packRows(
    [...spans.values()].map(({ placed, start, end }) => ({ id: placed.id, start, end })),
    (a, b) => {
      const pa = rank(a.id)
      const pb = rank(b.id)
      return Number(pb.band) - Number(pa.band) || a.start - b.start || b.end - b.start - (a.end - a.start) || pa.startMs - pb.startMs || (a.id < b.id ? -1 : 1)
    },
  )
  const bars = [...spans.values()].map(({ placed, start, end }) => ({
    placed,
    first: start,
    length: end - start,
    row: rows.get(placed.id)!,
    continuesBefore: placed.startDay < first,
    continuesAfter: placed.endDay > last,
  }))
  return { bars, rows: count }
}

/**
 * Which bars a month cell row can show when `capacity` rows fit: when any day overflows, the
 * last row is given to "+N more", and each day counts the bars it hides.
 */
export function fitBars<E extends SchedulerEvent>(bars: readonly BarSegment<E>[], days: number, capacity: number): { visible: BarSegment<E>[]; hidden: number[]; shown: number } {
  const overflow = bars.some((bar) => bar.row >= capacity)
  const shown = overflow ? Math.max(0, capacity - 1) : capacity
  const hidden = Array.from({ length: days }, () => 0)
  const visible: BarSegment<E>[] = []
  for (const bar of bars) {
    if (bar.row < shown) visible.push(bar)
    else for (let day = bar.first; day < bar.first + bar.length; day++) hidden[day]!++
  }
  return { visible, hidden, shown }
}
