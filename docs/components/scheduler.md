# Scheduler

`glass-ux/scheduler` · [Live component catalogue](https://dastari.github.io/glass-ux/components/scheduler)

An events calendar for planning: maintenance windows, bookings and shifts. Month, week, day
and agenda views share one header: Today, previous and next, the visible range as a title and
a view switch. With `layout="timeline"` the day, week and month are a row per resource and a
column per day instead: crews, rooms or machines across dates. The scheduler fills its container's height, so give it one (a `PanelBody`, a
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
`views` chooses the switch's options. `hiddenDays` (ISO weekdays, `[6, 7]` for weekends)
leaves days out of the week and the timeline without changing any event's dates. `actions`
puts your own controls (an Add button, filters) in the header. Weeks start on the locale's first day
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

## Timeline

`layout="timeline"` draws day, week and month as a row per resource and a column per day.
Events sit in their resource's row (`resourceId`) as bars across the days they touch, timed or
all-day, packed into lanes so a busy row grows to fit. The view switch offers day, week and
month; the agenda is unchanged. An event whose `resourceId` matches no resource is not drawn.

```tsx
import { DragDropProvider, DropZone, Draggable } from "glass-ux/drag-drop";
import { SCHEDULER_EVENT_TYPE, Scheduler, type SchedulerEventChange } from "glass-ux/scheduler";

<DragDropProvider>
  <UnscheduledList /> {/* a DropZone of Draggables of type "work-order"; it also accepts SCHEDULER_EVENT_TYPE */}
  <Scheduler
    layout="timeline"
    events={jobs}
    resources={[{ id: "unassigned", title: "Unassigned", sticky: true }, ...crew]}
    blocks={leave}
    hiddenDays={[6, 7]}
    editable={(job) => (job.sent ? "Sent to the crew" : true)}
    eventEffect={(job) => (job.repeats ? "copy" : "move")}
    onEventChange={saveChange}
    dropAccept="work-order"
    onDrop={({ item, resourceId, day }) => planWork(item.data, resourceId, day)}
    validateDrop={(drag, person, target) => (target.blocks.length ? { status: "error", reason: `${person.title} is on leave` } : true)}
    renderResource={(person) => <PersonHeading person={person} />}
    renderEvent={(job, { time }) => <JobChip job={job} time={time} />}
    resourceHeader={<SearchField aria-label="Find a person" />}
  />
</DragDropProvider>
```

- **Rows.** `resources` are the rows in order. `sticky` ones come first and stay under the day
  headings while the rest scroll: use one with your own id for dated work nobody is assigned
  to, and map your "no resource" to it. They stay pinned only while together they take at
  most 40% of the timeline's height; taller, and in the narrow form, they scroll with the
  other rows, so a busy unassigned band never hides the people under it. `renderResource` draws a row's heading and `resourceHeader` the
  corner above them; filter `resources` yourself for search. More than 40 rows are virtualised.
- **Columns.** Day, week (without `hiddenDays`) or month. `continuous` makes the month one
  strip from the month before to the month after: scrolling into another month makes it the
  date (`onDateChange`) and keeps the same day under the same place; previous and next move a
  month; only the columns in view and a week either side render. `columnWidth` is the
  narrowest a column gets before the timeline scrolls sideways, `resourceWidth` the headings
  column. `onRangeChange({ first, last, start, end })` reports the days shown, for loading.
- **Events.** `renderEvent(event, { time, allDay, continuesBefore, continuesAfter, compact })`
  draws a card's content. The card's face is one button (its name says what, when and where)
  beside your content, never around it, so buttons and links in it keep their own clicks and
  keys and never start a drag. Cut ends show where an event continues before or after the days
  shown; changes always report its real start and end.
- **Editing.** With `editable`, drag an event to another day or row, or drag either end.
  `editable` may return a string: the event is locked, says why, and still opens. `resizable`
  decides the ends separately (single-day work that only moves). With the keyboard, left and
  right move it a shown day, up and down to the previous or next row, Shift with left and
  right changes its end, Alt and Shift its start, Space picks it up (for your own zones) and
  Enter opens it. `onEventChange` reports `resourceId` when it changed rows and `edge` for a
  resize.
- **Copies.** `eventEffect(event)` returning "copy" makes a drag leave the event in place: the
  change has `effect: "copy"` and describes the new one to create.
- **Your lists.** Rows are [DragDrop](drag-drop.md) zones. Your Draggables whose type is in
  `dropAccept` drop on a row and the day under the pointer (with the keyboard, the timeline
  cursor's day): `onDrop({ item, resourceId, day, start, end, input, effect })`; return a
  promise to show the row as saving. Timeline events are DragDrop items of type
  `SCHEDULER_EVENT_TYPE` with the event as `item.data`, so your own zone can take them back.
  Put one `DragDropProvider` around both; without one the scheduler brings its own.
- **Refusing.** `validateDrop(drag, resource, target)` decides a row for your items and its
  own events: `target` is the proposed day and interval and the resource's `blocks` it would
  overlap. It is asked again as the day or row under the drag changes, and for keyboard moves
  and resizes; a refusal says why and leaves the event where it was.
- **Blocks.** `blocks` (`{ id, resourceId, start, end?, allDay?, title?, tone? }`, whole days
  by default, ends exclusive) shade when resources are not available. They take no clicks or
  drops of their own; the keyboard cursor reads their titles.
- **Choosing days.** With `onSlotSelect`, drag across a row's days (or tap one) or Tab to the
  grid and use the arrows (Shift extends, Enter selects). The slot carries the row's
  `resourceId`, and the second argument's `element` is the highlighted selection, to anchor a
  quick-add popover to (the other views pass theirs too).
- **Narrow.** Below 40 rem the timeline shows one day, each resource's heading above its
  events, and previous and next move by a day.

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
- In the timeline each row is a group named by its resource; the days and rows are one
  focusable group whose arrow-key cursor names the row, the days and any blocks. Rows are
  drop zones named by their resource.
- Moves, resizes, failures and the keyboard slot cursor are announced politely.
