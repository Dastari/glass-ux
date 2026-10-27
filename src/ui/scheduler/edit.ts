/**
 * Moving and resizing events. Whole days move on the calendar, keeping the wall-clock time,
 * so an event moved across a daylight-saving change still starts at 09:00. Minutes move on
 * the wall clock too, snapped to the grid, and a move keeps the event's length.
 */
import { addDays, type IsoDate } from "../date-picker/calendar-date.js"
import type { PendingChange } from "./context.js"
import type { PlacedEvent } from "./layout.js"
import { daysBetween } from "./range.js"
import { DAY_MINUTES, zonedInstant } from "./zone.js"

/** What to do to an event. */
export interface EventEdit {
  kind: "move" | "resize"
  /** For a resize: the end to shift. Default the end. */
  edge?: "start" | "end"
  /** Whole days to shift the start (move) or the end (resize). */
  days?: number
  /** Wall-clock minutes to shift the start (move) or the end (resize). */
  minutes?: number
  /** Snap the shifted start (move) or end (resize) to this many minutes. */
  snap?: number
}

const snapTo = (minutes: number, snap: number | undefined) => (snap ? Math.round(minutes / snap) * snap : minutes)

/** The event after an edit, or null when nothing changes. Resizing never makes it shorter than one snap, or one day. */
export function editEvent(placed: PlacedEvent, edit: EventEdit, timeZone: string, input: PendingChange["input"]): PendingChange | null {
  const days = edit.days ?? 0
  const minutes = edit.minutes ?? 0
  if (edit.kind === "resize" && edit.edge === "start") return resizeStart(placed, days, timeZone, input, edit.snap)
  if (placed.allDay) {
    if (!days) return null
    const length = daysBetween(placed.startDay, placed.endDay) + 1
    const start = edit.kind === "move" ? addDays(placed.startDay, days) : placed.startDay
    const end = edit.kind === "move" ? addDays(start, length) : addDays(placed.startDay, Math.max(1, length + days))
    if (start === placed.startDay && end === addDays(placed.startDay, length)) return null
    return wholeDays(placed, edit.kind, input, start, end, timeZone)
  }
  const duration = placed.endMs - placed.startMs
  const minimum = (edit.snap ?? 15) * 60_000
  if (edit.kind === "move") {
    const day = addDays(placed.startDay, days)
    const startMs = zonedInstant(day, snapTo(placed.startMinutes + minutes, minutes ? edit.snap : undefined), timeZone)
    if (startMs === placed.startMs) return null
    return { placed, kind: "move", input, startMs, endMs: startMs + duration }
  }
  const endDay = addDays(placed.endDay, days)
  const endMs = Math.max(placed.startMs + minimum, zonedInstant(endDay, snapTo(placed.endMinutes + minutes, minutes ? edit.snap : undefined), timeZone))
  if (endMs === placed.endMs) return null
  return { placed, kind: "resize", input, startMs: placed.startMs, endMs }
}

/** A move of an event to start at a wall-clock time on a day (pointer drops), keeping its length. */
export function moveEventTo(placed: PlacedEvent, day: IsoDate, startMinutes: number | null, timeZone: string, input: PendingChange["input"]): PendingChange | null {
  if (placed.allDay) {
    const length = daysBetween(placed.startDay, placed.endDay) + 1
    if (day === placed.startDay) return null
    return wholeDays(placed, "move", input, day, addDays(day, length), timeZone)
  }
  const startMs = zonedInstant(day, startMinutes ?? placed.startMinutes, timeZone)
  if (startMs === placed.startMs) return null
  return { placed, kind: "move", input, startMs, endMs: startMs + (placed.endMs - placed.startMs) }
}

/** A resize of an event to end at a wall-clock time on a day, or after a day for all-day events. */
export function resizeEventTo(placed: PlacedEvent, day: IsoDate, endMinutes: number | null, timeZone: string, input: PendingChange["input"], snap = 15): PendingChange | null {
  if (placed.allDay) {
    const end = addDays(day < placed.startDay ? placed.startDay : day, 1)
    if (end === addDays(placed.endDay, 1)) return null
    return wholeDays(placed, "resize", input, placed.startDay, end, timeZone)
  }
  const endMs = Math.max(placed.startMs + snap * 60_000, zonedInstant(day, endMinutes ?? DAY_MINUTES, timeZone))
  if (endMs === placed.endMs) return null
  return { placed, kind: "resize", input, startMs: placed.startMs, endMs }
}

function wholeDays(placed: PlacedEvent, kind: PendingChange["kind"], input: PendingChange["input"], start: IsoDate, end: IsoDate, timeZone: string): PendingChange {
  return { placed, kind, input, startMs: zonedInstant(start, 0, timeZone), endMs: zonedInstant(end, 0, timeZone), days: { start, end } }
}

/**
 * Move an event's start by whole days, keeping its end: all-day events by calendar days,
 * timed ones at the same wall-clock time. It never passes the end, so an all-day event keeps
 * at least its last day and a timed one at least one snap.
 */
export function resizeStart(placed: PlacedEvent, days: number, timeZone: string, input: PendingChange["input"], snap = 15): PendingChange | null {
  if (!days) return null
  if (placed.allDay) {
    const start = addDays(placed.startDay, days) > placed.endDay ? placed.endDay : addDays(placed.startDay, days)
    if (start === placed.startDay) return null
    return { ...wholeDays(placed, "resize", input, start, addDays(placed.endDay, 1), timeZone), edge: "start" }
  }
  const startMs = Math.min(placed.endMs - snap * 60_000, zonedInstant(addDays(placed.startDay, days), placed.startMinutes, timeZone))
  if (startMs === placed.startMs) return null
  return { placed, kind: "resize", edge: "start", input, startMs, endMs: placed.endMs }
}
