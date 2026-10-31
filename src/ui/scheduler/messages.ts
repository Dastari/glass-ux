import { defineMessages } from "../../lib/i18n/catalog.js"
import type { SchedulerView } from "./types.js"

const STEP: Record<SchedulerView, string> = { month: "month", week: "week", day: "day", agenda: "month" }

/** The scheduler's English wording. Translate it with a language pack or `labels`. */
export const schedulerMessages = defineMessages("scheduler", {
  /** The view switch's name. */
  views: "View",
  month: "Month",
  week: "Week",
  day: "Day",
  agenda: "Agenda",
  today: "Today",
  /** The previous button: "Previous week". A compact week moves by days. */
  previous: (view: SchedulerView) => `Previous ${STEP[view]}`,
  next: (view: SchedulerView) => `Next ${STEP[view]}`,
  allDay: "All day",
  /** An all-day event's date in words: "Tuesday 27 October, all day". */
  allDayOn: (when: string) => `${when}, all day`,
  /** The overflow button in a month cell. */
  more: (count: number) => `+${count} more`,
  /** Its accessible name. */
  moreLabel: (count: number, day: string) => `${count} more ${count === 1 ? "event" : "events"} on ${day}`,
  /** A day in the month grid: "Tuesday 27 October 2026, 3 events". */
  dayLabel: (day: string, count: number) => (count ? `${day}, ${count} ${count === 1 ? "event" : "events"}` : day),
  /** A time range: "9:00 am to 10:30 am". */
  timeRange: (start: string, end: string) => `${start} to ${end}`,
  /** An event's accessible name: its title, when, and where. */
  eventLabel: ({ title, when, resource }: { title: string; when: string; resource?: string }) => [title, when, resource].filter(Boolean).join(", "),
  /** How to edit a focused event. */
  editHint: "Arrow keys move it, Shift and arrow keys change its end, Enter opens it",
  /** The time grid's name and how to choose a slot with the keyboard. */
  slots: (day: string) => `Times, ${day}`,
  slotsHint: "Arrow keys choose a time, Shift and arrow keys extend it, Enter selects it",
  /** Announced while choosing a slot with the keyboard. */
  slotFocused: (when: string) => when,
  moved: (title: string, when: string) => `${title} moved to ${when}`,
  resized: (title: string, when: string) => `${title} now ${when}`,
  changeFailed: (title: string) => `${title} could not be changed and is back where it was`,
  noEvents: "No events",
  /** The agenda when nothing falls in its month. */
  noEventsIn: (range: string) => `No events in ${range}`,
  /** The agenda list's name. */
  agendaLabel: (range: string) => `Events, ${range}`,
  loading: "Loading events",
  /** The line marking the current time. */
  now: (time: string) => `Now, ${time}`,
  /** The day strip of a compact week. */
  weekDays: "Days of the week",
  /** Continues from an earlier day / into a later one. */
  continues: "continues",
  /** The timeline's row headings column, when `resourceHeader` does not replace it. */
  resources: "Resources",
  /** The timeline with no rows to show. */
  noResources: "Nothing to show",
  /** The timeline's days and rows as one group, and how to choose a slot in it with the keyboard. */
  timelineSlots: (range: string) => `Days, ${range}`,
  timelineSlotsHint: "Arrow keys choose a row and a day, Shift and arrow keys extend it, Enter selects it",
  /** How to edit a focused timeline event. */
  timelineEditHint: "Arrow keys move it between days and rows, Shift and arrow keys change its end, Alt, Shift and arrow keys change its start, Space picks it up, Enter opens it",
  /** A copy was made by dragging. */
  copied: (title: string, when: string) => `${title} copied to ${when}`,
  /** A move the keyboard or a resize could not make, and why. */
  refused: (title: string, reason: string | null) => (reason ? `${title} cannot go there: ${reason}` : `${title} cannot go there`),
  /** A row and a time together: "Andrew French, Tuesday 2 June". */
  atResource: (resource: string, when: string) => `${resource}, ${when}`,
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    scheduler: typeof schedulerMessages.defaults
  }
}

/** The scheduler's messages, as `labels` takes them. */
export type SchedulerMessages = typeof schedulerMessages.defaults
