import type { IsoDate } from "../date-picker/calendar-date.js"
import type { DragEffect, DragInput, DragItem } from "../drag-drop/types.js"

/** The scheduler's views: a month grid, a week or day of time columns, or a list by day. */
export type SchedulerView = "month" | "week" | "day" | "agenda"

/**
 * How the day, week and month views are drawn. `calendar`: hours in day columns and a month
 * grid. `timeline`: a row per resource and a column per day, with events as bars in the rows.
 */
export type SchedulerLayout = "calendar" | "timeline"

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

/** A bookable resource: named on its events, and a row of the timeline. Carry your own fields too. */
export interface SchedulerResource {
  id: string
  title: string
  /** A line under the title in the timeline's row heading. */
  description?: string
  /** Timeline: keep the row above the others, under the day headings, while they scroll ("Unassigned", "Whole team"). */
  sticky?: boolean
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
  /** Timeline: the resource whose row it was chosen in. */
  resourceId?: string
}

/** What `onSlotSelect` gets beside the slot. */
export interface SchedulerSlotDetails {
  /** The highlighted selection, to anchor a popover or a quick-add field to. */
  element: HTMLElement | null
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
  /** "move" keeps the length; "resize" changes one end (`edge`). */
  kind: "move" | "resize"
  /** For a resize: which end changed. The timeline resizes either end; the other views only the end. */
  edge?: "start" | "end"
  /** The event's resource after the change. Present when the change moved it to another timeline row. */
  resourceId?: string
  /**
   * "copy" when the person dragged an event whose `eventEffect` is "copy": it stays where it
   * is, and `start`, `end`, `days` and `resourceId` describe the new one to create.
   */
  effect?: DragEffect
  /** How it was changed. */
  input: "pointer" | "keyboard"
}

/** The days shown, for loading their events. */
export interface SchedulerRange {
  /** The first day shown. */
  first: IsoDate
  /** The last day shown (inclusive). */
  last: IsoDate
  /** Midnight starting the first day, in the scheduler's zone. */
  start: Date
  /** Midnight after the last day (exclusive). */
  end: Date
}

/** What `renderEvent` knows about the event it draws. */
export interface SchedulerEventRenderInfo {
  /** The first instant, in the scheduler's zone. */
  start: Date
  /** The instant after the last (exclusive). */
  end: Date
  allDay: boolean
  /** The bar is cut at the start or end of the days shown. */
  continuesBefore: boolean
  continuesAfter: boolean
  /** Its formatted time, or "All day": "9:00 am – 3:30 pm". */
  time: string
  /** The timeline is in its narrow form (one day, rows stacked). */
  compact: boolean
}

/** What `renderResource` knows about the row it draws. */
export interface SchedulerResourceRenderInfo {
  /** The timeline is in its narrow form: the heading sits above the row's events. */
  compact: boolean
  /** Events in the row in the days shown. */
  count: number
}

/**
 * An item from your own DragDrop zone (a list of unscheduled work) dropped on a timeline row.
 * The day is the column under the pointer, or for keyboard drops the day of the timeline's
 * cursor (else today, else the first day shown).
 */
export interface SchedulerDrop<T = unknown> {
  item: DragItem<T>
  /** The row it was dropped on. */
  resourceId: string
  /** The day it was dropped on. */
  day: IsoDate
  /** Midnight starting the day, in the scheduler's zone. */
  start: Date
  /** Midnight after it. */
  end: Date
  input: DragInput
  effect: DragEffect
}

/**
 * A stretch of time a resource is not available (leave, a holiday, a closure), drawn on its
 * timeline row as shading behind its events. It takes no clicks or drops of its own; decide
 * what it allows in `validateDrop`, which receives the blocks a drop would overlap.
 */
export interface SchedulerBlock {
  /** Unique among the blocks. */
  id: string
  /** The row it shades. */
  resourceId: string
  /** When it starts: a calendar day, or an instant for a timed block. */
  start: SchedulerTime
  /** When it ends (exclusive), as for events. */
  end?: SchedulerTime
  /** Whole days. Default true. A timed block shades the days it touches. */
  allDay?: boolean
  /** Why: shown in the shading and read with the keyboard cursor ("Annual leave"). */
  title?: string
  /** Its colour. Default "neutral". */
  tone?: SchedulerTone
}

/** Where a drop would land, for `validateDrop`: the proposed day and interval, and the blocks it would overlap. */
export interface SchedulerDropTarget {
  /** The day under the pointer, or the keyboard's day. For a moved event, its new first day. */
  day: IsoDate
  /** The proposed start: a moved event's new start, or midnight starting the day for your items. */
  start: Date
  /** The proposed end (exclusive). */
  end: Date
  allDay: boolean
  effect: DragEffect
  input: DragInput
  /** The resource's blocks that overlap [start, end). */
  blocks: SchedulerBlock[]
}
