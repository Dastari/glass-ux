# Scheduler

`glass-ux/scheduler` · [Live component catalogue](https://dastari.github.io/glass-ux/components/scheduler)

An events calendar for planning: maintenance windows, bookings and shifts. Month, week, day
and agenda views share one header: Today, previous and next, the visible range as a title and
a view switch. The scheduler fills its container's height, so give it one (a `PanelBody`, a
sized region); the hours and the agenda scroll inside it.

```tsx
import { Scheduler, type SchedulerEvent, type SchedulerEventChange } from "glass-ux/scheduler";
import { Panel, PanelBody } from "glass-ux/surface";

function Maintenance() {
  const [events, setEvents] = useState<SchedulerEvent[]>(initial);
  const change = ({ event, start, end, days }: SchedulerEventChange) =>
    setEvents((current) => current.map((e) => (e.id === event.id ? { ...e, start: days?.start ?? start, end: days?.end ?? end } : e)));
  return (
    <Panel className="h-160">
      <PanelBody>
        <Scheduler
          events={events}
          editable
          onEventChange={change}
          onSlotSelect={(slot) => openNewBooking(slot)}
          onEventClick={(event) => openBooking(event.id)}
        />
      </PanelBody>
    </Panel>
  );
}
```

## Events and time zones

An event is `{ id, title, start, end?, allDay?, tone?, description?, resourceId? }`; carry your
own fields too, and every callback hands your object back.

- **Timed events** take an instant (`Date`, epoch milliseconds, ISO text with an offset) or a
  wall-clock string without one (`"2026-10-26T09:00"`), which is read in the scheduler's zone.
  The end is exclusive; a missing end means 30 minutes.
- **All-day events** take calendar days (`"2026-10-26"`), with the end exclusive as in iCalendar:
  `end: "2026-10-29"` covers 26–28 October. A missing or same-day end means one day.
- **The grid is one zone's wall clock**: the browser's, or `timeZone` (an IANA name). Day columns
  are that zone's calendar days, and a daylight-saving change moves nothing: a 23-hour day is
  drawn on the same 24-hour grid, by its wall clock.
- Timed events of 24 hours or more run as bars in the all-day band; shorter ones that cross
  midnight are split across their days.
- **`tone`** is a chart slot (`1`–`8`, `--chart-1` … `--chart-8`) for kinds of work, or a status
  tone (`success`, `warning`, `danger`, `info`, `neutral`) when the colour means a state (R3.3).
- **`resources`** names `resourceId` on the event, in its accessible name and the agenda.

## Views

| View     | Shows                                                                                                   |
| -------- | ------------------------------------------------------------------------------------------------------- |
| `week`   | A column per day under the all-day band. Overlapping events sit side by side (interval-graph packing: a cluster is as wide as its most simultaneous events, and an event widens into columns left free). A line marks the current time. |
| `day`    | The same, one day.                                                                                      |
| `month`  | Whole weeks. Bars run across days; timed events list under them in time order. A day with more than fits shows "+N more", which opens the whole day in a popover. A day's number opens its day view. |
| `agenda` | The month's days that have events, each a labelled list in time order.                                  |

`view`/`defaultView`/`onViewChange` and `date`/`defaultDate`/`onDateChange` are controllable;
`views` chooses the switch's options. Weeks start on the locale's first day
(`Intl.Locale#weekInfo`, with a regional fallback) unless `weekStartsOn` says otherwise. Names
and times come from `Intl` in the component's locale; wording comes from `schedulerMessages`
(`glass-ux/i18n` language packs, or `labels`).

## Selecting time

With `onSlotSelect`, empty time can be chosen; without it, it cannot.

- **Pointer:** click a slot (`slotMinutes`, default 30) or drag over empty time in one day
  column. Drag across the all-day band, or across month cells, for whole days.
- **Touch:** tap a slot; dragging scrolls.
- **Keyboard:** Tab to the hours, then arrow keys move a slot cursor (left and right change day),
  Shift with up and down extends it, and Enter selects it. In the month, Enter on a day selects
  it as an all-day slot.

The selection stays highlighted until the next one, so a dialog opened from it has context.

## Editing events

`editable` (or a function deciding per event) lets people move and resize events:

| Input    | Move                                                    | Resize                                     |
| -------- | ------------------------------------------------------- | ------------------------------------------ |
| Pointer  | Drag the event; it snaps to `snapMinutes` (default 15) and to days. | Drag a timed event's lower edge, or a bar's end. |
| Touch    | A short press, then drag; a swipe still scrolls.        | The same, on the edge.                     |
| Keyboard | Arrow keys: up and down by the snap, left and right by a day (in the month, up and down by a week). | Shift with the arrow keys moves the end.   |

Escape cancels a drag. Moving by days keeps the wall-clock time across daylight-saving changes;
a move keeps the event's length. The click that ends a drag does not open the event.

`onEventChange({ event, start, end, allDay, days, kind, input })` reports each change. The event
shows at its new time at once (optimistic) and stays there while your `events` array is the
same one, or while a returned promise is pending. Apply the change to your state; for all-day
events store `days.start` and `days.end`. A rejected promise puts the event back and announces
that the change failed. Moves and resizes are announced in a polite live region.

Dragging must not be the only way to reschedule (R11.2): offer a form or menu action too.

## Narrow containers and loading

Below 40 rem the scheduler is compact: the week shows one day with the week's days in a strip
above it (previous and next move by a day), the month shows coloured dots with the chosen day's
events listed below the grid, and the view switch folds to icons or a menu. Set `compact` to
force either form.

`loading` keeps the header, grid and lines where they are and shows placeholders in place of
events. The all-day band reserves one row while loading and grows to fit the loaded bars (up
to four rows, then it scrolls).

## Accessibility

- The month is a `grid` with weekday column headers; arrow keys move between days and one day
  is the tab stop.
- Every event is a button named with its title, its day and time range, and its resource.
  Editable events describe their keys.
- The hours are a focusable group named for the visible days and describe the slot keys.
- The agenda is a labelled list of days, each a list of its events.
- Moves, resizes, failures and the keyboard slot cursor are announced politely.
