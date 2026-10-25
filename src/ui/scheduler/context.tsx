import { createContext, useContext } from "react"
import { dateTimeFormat } from "../../lib/locale/intl.js"
import { fromIsoDate, type IsoDate } from "../date-picker/calendar-date.js"
import type { PlacedEvent } from "./layout.js"
import type { SchedulerMessages } from "./messages.js"
import type { SchedulerSlot, SchedulerView } from "./types.js"
import { DAY_MINUTES } from "./zone.js"

/** A change to commit: new instants (timed) or days (all-day, end exclusive). */
export interface PendingChange {
  placed: PlacedEvent
  kind: "move" | "resize"
  input: "pointer" | "keyboard"
  startMs: number
  endMs: number
  days?: { start: IsoDate; end: IsoDate }
}

/** What the views share. */
export interface SchedulerContextValue {
  locale: string
  timeZone: string
  t: SchedulerMessages
  view: SchedulerView
  date: IsoDate
  today: IsoDate
  nowMs: number
  firstDay: number
  compact: boolean
  loading: boolean
  /** Empty time can be selected (`onSlotSelect` is set). */
  selectable: boolean
  snapMinutes: number
  slotMinutes: number
  canEdit: (placed: PlacedEvent) => boolean
  resourceTitle: (id: string | undefined) => string | undefined
  openEvent: (placed: PlacedEvent, element: HTMLElement) => void
  selectSlot: (slot: SchedulerSlot) => void
  commit: (change: PendingChange) => void
  announce: (message: string) => void
  setDate: (date: IsoDate) => void
  setView: (view: SchedulerView) => void
  /** Swallow the click a pointer gesture ends with. */
  swallowClick: () => void
}

export const SchedulerContext = createContext<SchedulerContextValue | null>(null)

export function useScheduler(): SchedulerContextValue {
  const context = useContext(SchedulerContext)
  if (!context) throw new Error("Scheduler views must be inside a Scheduler.")
  return context
}

const pad = (value: number) => String(value).padStart(2, "0")

/** A wall-clock time of day in the locale's clock: "9:30 am". */
export function formatMinutes(minutes: number, locale: string): string {
  const wrapped = ((minutes % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES
  return dateTimeFormat(locale, { hour: "numeric", minute: "2-digit", timeZone: "UTC" }).format(Date.UTC(2000, 0, 1, Math.floor(wrapped / 60), wrapped % 60))
}

/** A wall-clock range in the locale's clock, sharing the day period where it can: "9:00 – 10:30 am". */
export function formatMinutesRange(start: number, end: number, locale: string): string {
  const format = dateTimeFormat(locale, { hour: "numeric", minute: "2-digit", timeZone: "UTC" })
  const at = (minutes: number) => Date.UTC(2000, 0, 1, 0, minutes)
  if (start === end) return format.format(at(start))
  // Midnight at the end is the next day's; formatRange would add the dates.
  if (end >= DAY_MINUTES) return `${format.format(at(start))} – ${format.format(at(0))}`
  return format.formatRange(at(start), at(end))
}

/** An hour label for the time gutter: "9 am", "09". */
export function formatHour(hour: number, locale: string): string {
  return dateTimeFormat(locale, { hour: "numeric", timeZone: "UTC" }).format(Date.UTC(2000, 0, 1, hour))
}

/** "Tuesday 27 October". */
export function formatDay(day: IsoDate, locale: string): string {
  return dateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }).format(fromIsoDate(day))
}

/** "Tue 27 Oct". */
export function formatDayShort(day: IsoDate, locale: string): string {
  return dateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short" }).format(fromIsoDate(day))
}

/** When an event happens, in words: "Tuesday 27 October, 9:00 am to 10:30 am". */
export function describeWhen(range: { allDay: boolean; startDay: IsoDate; endDay: IsoDate; startMinutes: number; endMinutes: number }, locale: string, t: SchedulerMessages): string {
  if (range.allDay) {
    const days = range.startDay === range.endDay ? formatDay(range.startDay, locale) : t.timeRange(formatDayShort(range.startDay, locale), formatDayShort(range.endDay, locale))
    return `${days}, ${t.allDay.toLowerCase()}`
  }
  if (range.startDay === range.endDay) return `${formatDay(range.startDay, locale)}, ${t.timeRange(formatMinutes(range.startMinutes, locale), formatMinutes(range.endMinutes, locale))}`
  return t.timeRange(`${formatDayShort(range.startDay, locale)} ${formatMinutes(range.startMinutes, locale)}`, `${formatDayShort(range.endDay, locale)} ${formatMinutes(range.endMinutes, locale)}`)
}

/** The accessible name of an event button. */
export function eventName(placed: PlacedEvent, context: Pick<SchedulerContextValue, "locale" | "t" | "resourceTitle">): string {
  return context.t.eventLabel({ title: placed.event.title, when: describeWhen(placed, context.locale, context.t), resource: context.resourceTitle(placed.event.resourceId) })
}

/** "HH:mm" for minutes since midnight. */
export const hhmm = (minutes: number) => `${pad(Math.floor(minutes / 60) % 24)}:${pad(minutes % 60)}`

/** The colour attribute for an event's tone: "1" … "8" or a status. */
export const toneAttribute = (placed: PlacedEvent) => String(placed.tone)
