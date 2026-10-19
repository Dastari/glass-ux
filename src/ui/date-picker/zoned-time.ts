/**
 * Wall-clock date-times (`2026-10-21T09:30`): what a clock on the wall reads, with no offset.
 * DateTimeField holds one, with an optional IANA zone beside it; these helpers turn the pair
 * into an instant and back without the browser's own zone. A daylight-saving change makes
 * some wall-clock times not exist (the clocks skip them) and others occur twice (the clocks
 * repeat them); `resolveWallClock` says which and resolves both the way Temporal's default
 * ("compatible") does: a skipped time moves forward by the length of the gap, and a repeated
 * time takes the earlier of its two instants.
 */
import { isIsoDate, type IsoDate } from "./calendar-date.js"
import { isTimeValue, type TimeValue } from "./time.js"

/** `YYYY-MM-DDTHH:mm`, or `…THH:mm:ss`: a local date and time with no offset. */
export type WallClock = string

const WALL = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/

/** Whether a value is a `YYYY-MM-DDTHH:mm[:ss]` wall-clock string naming a real day and time. */
export function isWallClock(value: unknown): boolean {
  if (typeof value !== "string" || !WALL.test(value)) return false
  const [date, time] = value.split("T") as [string, string]
  return isIsoDate(date) && isTimeValue(time)
}

/** The date and time of a wall-clock value: "2026-10-21T09:30" → { date: "2026-10-21", time: "09:30" }. Null when invalid. */
export function splitWallClock(value: WallClock): { date: IsoDate; time: TimeValue } | null {
  if (!isWallClock(value)) return null
  const [date, time] = value.split("T") as [string, string]
  return { date, time }
}

/** Join a day and a time into a wall-clock value. */
export const joinWallClock = (date: IsoDate, time: TimeValue): WallClock => `${date}T${time}`

const zoneFormatters = new Map<string, Intl.DateTimeFormat>()
function zoneFormatter(timeZone: string) {
  let format = zoneFormatters.get(timeZone)
  if (!format) {
    format = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
    zoneFormatters.set(timeZone, format)
  }
  return format
}

/** Whether the platform knows this IANA zone. */
function knownZone(timeZone: string) {
  try {
    zoneFormatter(timeZone)
    return true
  } catch {
    return false
  }
}

/** The wall clock at an instant in a zone, as UTC milliseconds of those fields. */
function wallMs(epochMs: number, timeZone: string) {
  const parts: Record<string, number> = {}
  for (const part of zoneFormatter(timeZone).formatToParts(epochMs)) if (part.type !== "literal") parts[part.type] = Number(part.value)
  return Date.UTC(parts.year!, parts.month! - 1, parts.day!, parts.hour! % 24, parts.minute!, parts.second!)
}

/** Minutes east of UTC for a zone at an instant (+660 for Sydney in summer). */
export function zoneOffsetMinutes(epochMs: number, timeZone: string): number {
  return Math.round((wallMs(Math.floor(epochMs / 1000) * 1000, timeZone) - Math.floor(epochMs / 1000) * 1000) / 60_000)
}

const pad = (value: number, length = 2) => String(Math.abs(value)).padStart(length, "0")

/** "+11:00", "-04:00", "+05:30". */
function offsetText(minutes: number) {
  return `${minutes < 0 ? "-" : "+"}${pad(Math.floor(Math.abs(minutes) / 60))}:${pad(Math.abs(minutes) % 60)}`
}

/** The wall-clock reading of an instant in a zone: instantToWallClock(Date.parse("2026-10-20T22:30Z"), "Australia/Sydney") → "2026-10-21T09:30". */
export function instantToWallClock(instant: number | Date | string, timeZone: string, options: { seconds?: boolean } = {}): WallClock {
  const epochMs = typeof instant === "number" ? instant : typeof instant === "string" ? Date.parse(instant) : instant.getTime()
  if (!Number.isFinite(epochMs) || !knownZone(timeZone)) return ""
  const wall = new Date(wallMs(epochMs, timeZone))
  const text = `${pad(wall.getUTCFullYear(), 4)}-${pad(wall.getUTCMonth() + 1)}-${pad(wall.getUTCDate())}T${pad(wall.getUTCHours())}:${pad(wall.getUTCMinutes())}`
  return options.seconds ? `${text}:${pad(wall.getUTCSeconds())}` : text
}

/**
 * How to resolve a wall-clock time a daylight-saving change makes ambiguous, as in Temporal:
 *   compatible (default)  a skipped time moves forward by the gap; a repeated time is the earlier
 *   earlier               both take the earlier instant (a skipped time moves back)
 *   later                 both take the later instant
 */
export type Disambiguation = "compatible" | "earlier" | "later"

export interface ZonedTime {
  /** Milliseconds since the Unix epoch. */
  epochMs: number
  /** ISO 8601 with the zone's offset: "2026-10-21T09:30:00+11:00". */
  iso: string
  /** Minutes east of UTC at that instant. */
  offsetMinutes: number
  /**
   * exact: the time occurs once. gap: the clocks skip it (spring forward), so it was moved.
   * overlap: the clocks repeat it (fall back), so one of its two instants was chosen.
   */
  kind: "exact" | "gap" | "overlap"
  /** What the clock reads at the instant: the input, except for a skipped time ("02:30" → "03:30"). */
  wallClock: WallClock
  /** For a gap or an overlap: the offsets before and after the change, in minutes. */
  transition?: { before: number; after: number }
}

/**
 * The instant a wall-clock value names in an IANA zone, with what kind of time it is. Null
 * when the value is not a wall-clock string or the zone is unknown.
 *
 *   resolveWallClock("2026-10-04T02:30", "Australia/Sydney")
 *     → kind "gap", wallClock "2026-10-04T03:30", iso "2026-10-04T03:30:00+11:00"
 *   resolveWallClock("2026-04-05T02:30", "Australia/Sydney")
 *     → kind "overlap", iso "2026-04-05T02:30:00+11:00" (the first; "later" gives +10:00)
 */
export function resolveWallClock(value: WallClock, timeZone: string, options: { disambiguation?: Disambiguation } = {}): ZonedTime | null {
  if (!isWallClock(value) || !knownZone(timeZone)) return null
  const match = WALL.exec(value)!
  const [, year, month, day, hour, minute, second] = match.map(Number)
  const wall = Date.UTC(year!, month! - 1, day!, hour!, minute!, Number.isNaN(second) ? 0 : second!)
  // Real zones change offset at most once in a day either side, so these bracket any change.
  const before = zoneOffsetMinutes(wall - 86_400_000, timeZone)
  const after = zoneOffsetMinutes(wall + 86_400_000, timeZone)
  const candidates = [...new Set([before, after])]
    .map((offset) => wall - offset * 60_000)
    .filter((epochMs) => wallMs(epochMs, timeZone) === wall)
    .toSorted((a, b) => a - b)
  const mode = options.disambiguation ?? "compatible"
  let epochMs: number
  let kind: ZonedTime["kind"] = "exact"
  if (candidates.length === 1) epochMs = candidates[0]!
  else if (candidates.length > 1) {
    kind = "overlap"
    epochMs = mode === "later" ? candidates.at(-1)! : candidates[0]!
  } else {
    kind = "gap"
    // Read with the offset from before the change, the time lands after it (02:30 → 03:30).
    epochMs = mode === "earlier" ? wall - after * 60_000 : wall - before * 60_000
  }
  const offsetMinutes = zoneOffsetMinutes(epochMs, timeZone)
  const seconds = value.length > 16
  const wallClock = instantToWallClock(epochMs, timeZone, { seconds })
  const local = instantToWallClock(epochMs, timeZone, { seconds: true })
  return {
    epochMs,
    iso: `${local}${offsetText(offsetMinutes)}`,
    offsetMinutes,
    kind,
    wallClock,
    transition: kind === "exact" ? undefined : { before, after },
  }
}

/** The instant (epoch milliseconds) a wall-clock value names in a zone, resolved as `resolveWallClock` does; null when invalid. */
export function wallClockToInstant(value: WallClock, timeZone: string, options: { disambiguation?: Disambiguation } = {}): number | null {
  return resolveWallClock(value, timeZone, options)?.epochMs ?? null
}
