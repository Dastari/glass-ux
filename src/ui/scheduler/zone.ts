/**
 * Wall-clock positions for the scheduler. Events are instants; the grid is drawn in one time
 * zone's wall clock (the browser's, or `timeZone`), so an event sits where a clock in that zone
 * reads its start, and a day column is that zone's calendar day. Days are counted with
 * calendar arithmetic, never by adding 24 hours, so a daylight-saving change never shifts a day.
 */
import { addDays, isIsoDate, type IsoDate } from "../date-picker/calendar-date.js"
import { resolveWallClock, zoneOffsetMinutes } from "../date-picker/zoned-time.js"

/** Minutes in a calendar day on the wall clock. */
export const DAY_MINUTES = 1440

/** A position on the wall clock: a calendar day and minutes since its midnight (0–1439). */
export interface WallPosition {
  day: IsoDate
  minutes: number
}

/** The browser's IANA time zone ("Australia/Sydney"), or UTC where the platform cannot say. */
export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
  } catch {
    return "UTC"
  }
}

const pad = (value: number, length = 2) => String(value).padStart(length, "0")

const cache = new Map<string, WallPosition>()

/** Where the wall clock in `timeZone` stands at an instant. */
export function wallPosition(epochMs: number, timeZone: string): WallPosition {
  const key = `${timeZone}|${epochMs}`
  const known = cache.get(key)
  if (known) return known
  const wall = new Date(epochMs + zoneOffsetMinutes(epochMs, timeZone) * 60_000)
  const position = {
    day: `${pad(wall.getUTCFullYear(), 4)}-${pad(wall.getUTCMonth() + 1)}-${pad(wall.getUTCDate())}`,
    minutes: wall.getUTCHours() * 60 + wall.getUTCMinutes(),
  }
  if (cache.size > 20_000) cache.clear()
  cache.set(key, position)
  return position
}

/**
 * The instant the wall clock in `timeZone` reads `minutes` after the midnight that starts
 * `day`. Minutes past the day roll into the next ones (1440 is the next midnight). A time the
 * clocks skip moves forward by the gap; a time they repeat takes the earlier instant.
 */
export function zonedInstant(day: IsoDate, minutes: number, timeZone: string): number {
  const whole = Math.floor(minutes / DAY_MINUTES)
  const rest = minutes - whole * DAY_MINUTES
  const date = whole ? addDays(day, whole) : day
  const value = `${date}T${pad(Math.floor(rest / 60))}:${pad(Math.floor(rest % 60))}`
  return resolveWallClock(value, timeZone)?.epochMs ?? Number.NaN
}

/** Today's calendar day in `timeZone`. */
export const zonedToday = (now: number, timeZone: string): IsoDate => wallPosition(now, timeZone).day

const WALL = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/

/**
 * An event time as epoch milliseconds. A Date or number is an instant; a string with an offset
 * or Z is parsed as an instant; a wall-clock string without one ("2026-10-26T09:00") is read in
 * `timeZone`; a calendar day ("2026-10-26") is its midnight in `timeZone`.
 */
export function toEpoch(value: Date | string | number, timeZone: string): number {
  if (typeof value === "number") return value
  if (value instanceof Date) return value.getTime()
  if (isIsoDate(value)) return zonedInstant(value, 0, timeZone)
  if (WALL.test(value)) return resolveWallClock(value.slice(0, 16), timeZone)?.epochMs ?? Number.NaN
  return Date.parse(value)
}

/** An event time as a calendar day in `timeZone`: a day string as given, anything else by where the wall clock stands. */
export function toDay(value: Date | string | number, timeZone: string): IsoDate {
  if (typeof value === "string" && isIsoDate(value.slice(0, 10)) && (isIsoDate(value) || WALL.test(value))) return value.slice(0, 10)
  return wallPosition(toEpoch(value, timeZone), timeZone).day
}
