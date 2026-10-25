import type { IsoDate } from "../date-picker/calendar-date.js"

/** The scheduler's views: a month grid, a week or day of time columns, or a list by day. */
export type SchedulerView = "month" | "week" | "day" | "agenda"

/**
 * An event's colour: a categorical chart slot (1–8, `--chart-1` … `--chart-8`) for kinds of
 * work, or a status tone when the colour means a state (R3.3).
 */
export type SchedulerTone = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | "neutral" | "info" | "success" | "warning" | "danger"

/** A time as an instant (Date, epoch milliseconds or ISO text with an offset), a wall-clock string read in the scheduler's zone, or a calendar day. */
export type SchedulerTime = Date | string | number

/** One event on the scheduler. Carry your own fields on it; callbacks hand the object back unchanged. */
export interface SchedulerEvent {
  /** Unique among the events. */
  id: string
  /** What it is, as shown on the event. */
  title: string
  /**
   * When it starts. For timed events an instant, or a wall-clock string ("2026-10-26T09:00")
   * read in the scheduler's `timeZone`. For all-day events a calendar day ("2026-10-26").
   */
  start: SchedulerTime
  /** When it ends (exclusive). For all-day events the day after the last day; the same day or omitted means one day. */
  end?: SchedulerTime
  /** A whole-day event: drawn in the all-day band and as a bar in the month. */
  allDay?: boolean
  /** Its colour. Default chart slot 1. */
  tone?: SchedulerTone
  /** A line of detail shown in the agenda and the day's overflow list. */
  description?: string
  /** The resource it books (a room, a crew, a machine); its title from `resources` is shown with the event. */
  resourceId?: string
}

/** A bookable resource named on its events. */
export interface SchedulerResource {
  id: string
  title: string
}

/** An empty stretch of time chosen by click, drag or keyboard. */
export interface SchedulerSlot {
  /** The first instant. For an all-day slot, midnight starting the first day in the scheduler's zone. */
  start: Date
  /** The instant after the last (exclusive). For an all-day slot, midnight after the last day. */
  end: Date
  /** The slot is whole days (the all-day band, a month cell). */
  allDay: boolean
  /** For an all-day slot: the first day and the day after the last. */
  days?: { start: IsoDate; end: IsoDate }
  /** How it was chosen. */
  input: "pointer" | "keyboard"
}

/** A move or resize of an event the person made. */
export interface SchedulerEventChange<E extends SchedulerEvent = SchedulerEvent> {
  /** The event as you passed it. */
  event: E
  /** The new start. For an all-day event, midnight starting its first day in the scheduler's zone. */
  start: Date
  /** The new end (exclusive). For an all-day event, midnight after its last day. */
  end: Date
  /** Whether it is an all-day event. */
  allDay: boolean
  /** For an all-day event: the first day and the day after the last, as you would store them. */
  days?: { start: IsoDate; end: IsoDate }
  /** "move" keeps the length; "resize" changes the end. */
  kind: "move" | "resize"
  /** How it was changed. */
  input: "pointer" | "keyboard"
}
