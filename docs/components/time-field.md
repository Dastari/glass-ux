# Time and date-time

`glass-ux/date-picker` · [Live component catalogue](https://dastari.github.io/glass-ux/)

`TimeField` holds a time of day; `DateTimeField` holds a date and a time in one box. Both are
typed as people write them and also offer a list of times. They belong to the date picker family
and share DateField's typing, calendar and sizes.

```tsx
import { dateTimeSchema, resolveWallClock, timeSchema } from "glass-ux/date-picker"

const schema = z.object({
  opens: timeSchema({ required: true, min: "06:00", max: "12:00" }),        // "07:30"
  starts: dateTimeSchema({ required: true, timeZone: "Australia/Sydney" }), // "2026-10-21T09:30"
})

<form.AppField name="opens">{(field) => <field.TimeField label="Depot opens" min="06:00" max="12:00" step={30} />}</form.AppField>
<form.AppField name="starts">{(field) => <field.DateTimeField label="Maintenance starts" timeZone="Australia/Sydney" />}</form.AppField>

// When sending it: resolveWallClock(values.starts, "Australia/Sydney")?.iso → "2026-10-21T09:30:00+11:00"
```

Pass the schema the same locale, `hourCycle`, bounds and zone as the field, so its messages show
times as the field does.

## Values

- **TimeField:** `"HH:mm"`, 24-hour and zero-padded (`"07:30"`), or `"HH:mm:ss"` with `seconds`;
  `null` when empty.
- **DateTimeField:** a wall clock, `"YYYY-MM-DDTHH:mm"` with no offset (`"2026-10-21T09:30"`);
  `null` when empty. `timeZone` (an IANA name) is a separate prop. The value never converts
  while the person types or when the zone changes.
- While an entry cannot be accepted, the bound value is a string the schema explains: the text
  as typed ("Enter a time such as 9:30 am"), a time outside min/max as read ("Enter a time from
  6:00 am to 12:00 pm"), or for DateTimeField the parts as read ("Enter a time", "Enter a date as
  dd/mm/yyyy"). The bare `TimeInput` and `DateTimeInput` report these through `onReject`;
  `onValueChange` receives only accepted values.

## Typing and keys

- Accepted: `930`, `0930`, `9:30`, `21:30`, `21.30`, `9h30`, `9:30pm`, `9.30 p.m.`, `9 pm`,
  `12am`, the locale's own am/pm words, `noon`, `midday` and `midnight`. Without am/pm the
  hour is read on a 24-hour clock (`9` is 09:00). Text is tidied on blur, never while typing.
- Shown in the locale's clock: en-AU (the default) uses `9:30 am`; `hourCycle={24}` shows
  `09:30`.
- ↑ and ↓ step the part under the caret: hours by one, minutes to the next multiple of `step`
  from `min` (or midnight), seconds by one, am/pm flips. Page Up and Page Down move an hour.
  Home and End go to `min` and `max` when set; otherwise they move the caret. Stepping stays
  within the bounds and the day.
- Alt+↓ or the button opens the popup. The list opens at the chosen time, or the nearest one to
  now. ↑ and ↓ move, Page Up and Page Down move an hour, Home and End go to the ends, typing
  jumps (`9`, `93` → 9:30 am), Enter or Space picks, Esc closes.

## Step

`step` (minutes, default 15) spaces the list and the minute steps. Fifteen minutes gives 96 rows
a day, the spacing calendar applications use for appointments; typing still accepts any minute.
Use 30 for bookings and 1 for logs and readings. The list is windowed, so `step={1}` (1,440 rows)
stays light. `suggestions` replaces the generated list with explicit times.

## Date and time

One label names the group and both parts ("Maintenance starts Date", "… Time"); one message
line serves both. Each part is one tab stop. The popup shows the calendar beside the times and
stacks them in a narrow popup. Picking a day keeps the popup open and moves to the times;
picking a time closes it. `defaultTime` fills the time when a day is chosen first. `min` and
`max` are wall clocks: they bound the calendar's days and the times on the first and last day.

With `timeZone`, the box shows the zone's abbreviation on that date (AEST or AEDT), else its
offset; the hint names the zone and offset ("Australia/Sydney · UTC+11:00").

## Daylight saving

A wall-clock time may not exist (the clocks skip it) or may occur twice (the clocks repeat it).
`resolveWallClock(value, timeZone)` returns the instant, its ISO form with offset and `kind`
(`"exact"`, `"gap"` or `"overlap"`). By default it resolves as Temporal's `"compatible"` mode:

- **Skipped** (Sydney, 4 Oct 2026, 2:30 am): moved forward by the length of the gap, to 3:30 am
  AEDT. The field keeps 2:30 am and warns: "Clocks skip 2:30 am on 4 Oct; read as 3:30 am
  AEDT".
- **Repeated** (Sydney, 5 Apr 2026, 2:30 am): the earlier instant (AEDT, UTC+11:00). The hint
  says "2:30 am occurs twice on 5 Apr; read as the first (AEDT)". Pass
  `disambiguation: "later"` for the second.

The list leaves out times the clocks skip on the chosen day. To refuse both cases instead, use
`dateTimeSchema({ timeZone, daylightSaving: "reject" })`.

## Parts

`TimeInput`, `DateTimeInput`, `parseTimeText`, `formatTimeText`, `timePlaceholder`,
`hourCycleOf`, `isTimeValue`, `timeSlots`, `isWallClock`, `splitWallClock`, `joinWallClock`,
`resolveWallClock`, `wallClockToInstant`, `instantToWallClock`, `zoneOffsetMinutes`.
