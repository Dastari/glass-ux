# Scheduler

An events calendar for planning: maintenance windows, bookings and shifts. Month, week, day
and agenda views share a header with previous, next, Today, the visible range and a view
switch. Overlapping events sit side by side; all-day and multi-day events run as bars in a
band above the hours, and a month cell that overflows offers "+N more". The grid is drawn in
the browser's zone or `timeZone`. Click or drag over empty time to select a slot; with
`editable`, drag events to move them, drag their lower edge to resize, or focus one and use
the arrow keys (Shift for the end). In a narrow container the week shows one day with a day
strip and the month shows dots with the selected day's events below. It fills its
container's height; give it one (a Panel body, a sized region).

`import { Scheduler } from "glass-ux/scheduler"`

[Live examples](https://dastari.github.io/glass-ux/components/scheduler)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string \| undefined` | See type | no | — | Accessible name for the whole scheduler. Default the visible range. |
| className | `string \| undefined` | See type | no | — | Layout only. |
| compact | `boolean \| undefined` | false, true | no | — | Force the compact form (one day column, dots in the month) on or off. Default: by the container's width. |
| date | `string \| undefined` | See type | no | — | A day in the range shown (controlled): the month, week or day around it. |
| defaultDate | `string \| undefined` | See type | no | — | The first day shown when uncontrolled. Default today in `timeZone`. |
| defaultView | `SchedulerView \| undefined` | "month", "week", "day", "agenda" | no | "week" | The first view when uncontrolled. Default "week". |
| editable | `boolean \| ((event: E) => boolean) \| undefined` | See type | no | false | Let people move and resize events by dragging and with the keyboard. A function decides per event. |
| events | `readonly E[]` | See type | yes | — | The events to show. Keep the array stable between renders; a new array drops optimistic changes the host has not kept. |
| labels | `Partial<{ views: string; month: string; week: string; day: string; agenda: string; today: string; previous: (view: SchedulerView) => string; next: (view: SchedulerView) => string; allDay: string; more: (count: number) => string; moreLabel: (count: number, day: string) => string; dayLabel: (day: string, count: number) => string; timeRange: (start: string, end: string) => string; eventLabel: (title: string, when: string, resource?: string) => string; editHint: string; slots: (day: string) => string; slotsHint: string; slotFocused: (when: string) => string; moved: (title: string, when: string) => string; resized: (title: string, when: string) => string; changeFailed: (title: string) => string; noEvents: string; noEventsIn: (range: string) => string; agendaLabel: (range: string) => string; loading: string; now: (time: string) => string; weekDays: string; continues: string; }> \| undefined` | See type | no | — | Replace any of the wording (see `schedulerMessages`). |
| loading | `boolean \| undefined` | false, true | no | false | Events are loading: the grid keeps its geometry and shows placeholders where events go. |
| locale | `string \| undefined` | See type | no | — | BCP 47 locale for names, times and the first day of the week. Default the nearest `LocaleProvider`, then `configureLocale()`, then `<html lang>`. |
| now | `number \| Date \| undefined` | See type | no | — | The current time, for today and the time line. Default the clock, updated each minute. |
| onDateChange | `((date: IsoDate) => void) \| undefined` | See type | no | — | Called with the new day when the person moves with previous, next, Today or a day's heading. |
| onEventChange | `((change: SchedulerEventChange<E>) => void \| Promise<unknown>) \| undefined` | See type | no | — | Called when the person moves or resizes an event. The event shows at its new time at once; update `events` to keep it there. Return a promise to hold it there until it settles: a rejection puts it back and announces that the change failed. |
| onEventClick | `((event: E, details: { element: HTMLElement; }) => void) \| undefined` | See type | no | — | Called when the person opens an event (click, tap or Enter). |
| onSlotSelect | `((slot: SchedulerSlot) => void) \| undefined` | See type | no | — | Called with an empty stretch of time chosen by click, drag or keyboard. Without it, empty time cannot be selected. |
| onViewChange | `((view: SchedulerView) => void) \| undefined` | See type | no | — | Called with the view the person switches to, or "day" when they open a day's heading. |
| resources | `readonly SchedulerResource[] \| undefined` | See type | no | — | Resources named on events by `resourceId`. |
| scrollToTime | `string \| undefined` | See type | no | "07:00" | The time of day the week and day views scroll to when they open ("07:00"). Default "07:00". |
| slotMinutes | `number \| undefined` | See type | no | 30 | Minutes in one slot of the time grid: its lines and what a click selects. Default 30. |
| snapMinutes | `number \| undefined` | See type | no | 15 | Minutes that drags and arrow keys snap to. Default 15. |
| style | `CSSProperties \| undefined` | See type | no | — | Layout only. |
| timeZone | `string \| undefined` | See type | no | — | The IANA zone whose wall clock the grid shows ("Australia/Sydney"). Default the browser's. |
| view | `SchedulerView \| undefined` | "month", "week", "day", "agenda" | no | — | The view shown (controlled). |
| views | `readonly SchedulerView[] \| undefined` | See type | no | ALL_VIEWS | The views in the switch, in order. Default month, week, day and agenda. |
| weekStartsOn | `number \| undefined` | See type | no | — | First day of the week, 1 = Monday … 7 = Sunday. Default the locale's. |
