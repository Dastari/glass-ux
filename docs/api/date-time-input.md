# DateTimeInput

A date and a time in one box: a day typed in the locale's order and a time typed as people
write it, with one button that opens a calendar beside a list of times (stacked when
narrow). The value is a wall clock with no offset; with `timeZone` the zone shows in the box.
Each part is one tab stop; the time part steps with the arrow keys like TimeInput.

`import { DateTimeInput } from "glass-ux/date-picker"`

[Live examples](https://dastari.github.io/glass-ux/components/date-time-input)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string \| undefined` | See type | no | — | Accessible name of the group when no Field label names it. |
| aria-labelledby | `string \| undefined` | See type | no | — | IDs of elements that name the group. |
| className | `string \| undefined` | See type | no | — | Layout only. Applied to the control box. |
| dateLabel | `string \| undefined` | See type | no | "Date" | Accessible names of the two parts (default "Date", "Time"). |
| defaultTime | `string \| undefined` | See type | no | — | The time filled in when a day is entered or picked before any time ("09:00"). |
| defaultValue | `string \| null \| undefined` | See type | no | null | The initial date and time when uncontrolled. |
| disabled | `boolean \| undefined` | false, true | no | — | Disables interaction while retaining the component’s disabled appearance. |
| hourCycle | `HourCycle \| undefined` | 12, 24 | no | — | Override the locale's clock: 12 (am/pm) or 24. |
| id | `string \| undefined` | See type | no | — | The date input's id; a Field label points at it. |
| invalid | `boolean \| undefined` | false, true | no | — | Invalid outside a Field. Text that cannot be read marks the field invalid by itself. |
| locale | `string \| undefined` | See type | no | "en-AU" | BCP 47 locale: the date order, the clock and names (default en-AU). |
| max | `string \| undefined` | See type | no | — | Latest allowed wall-clock date and time. |
| min | `string \| undefined` | See type | no | — | Earliest allowed wall-clock date and time. |
| name | `string \| undefined` | See type | no | — | Form field name of the date input (the time input takes `name` + "-time"). |
| onBlur | `((event: FocusEvent<HTMLElement>) => void) \| undefined` | See type | no | — | Called when focus leaves the field, after the typed value has been committed. |
| onReject | `((value: string) => void) \| undefined` | See type | no | — | Called instead of `onValueChange` when the field is left incomplete, unreadable or outside min/max: with the wall-clock value when both parts read (so a schema can name the range), else with `date` + "T" + `time`, each part as read or as typed. The box is marked invalid. |
| onValueChange | `((value: WallClock \| null) => void) \| undefined` | See type | no | — | Called with a complete date and time, or null when both parts are emptied. Typing commits when focus leaves the field or on Enter; the calendar, the list and arrow keys commit at once. |
| readOnly | `boolean \| undefined` | false, true | no | — | Displays the current value without allowing edits. |
| ref | `Ref<HTMLInputElement> \| undefined` | See type | no | — | Receives the date input, for focus. |
| required | `boolean \| undefined` | false, true | no | — | Marks both parts required for assistive technology; pair it with `dateTimeSchema({ required: true })`. |
| size | `DateFieldSize \| undefined` | "sm", "md", "lg" | no | "md" | The box height, matching DateField. |
| step | `number \| undefined` | See type | no | 15 | Minutes between suggested times, and between arrow-key steps on the minutes (default 15). |
| suggestions | `readonly string[] \| undefined` | See type | no | — | Explicit times to offer in the list instead of every `step` minutes. |
| timeLabel | `string \| undefined` | See type | no | "Time" | Accessible name of the time part (default "Time"). |
| timeZone | `string \| undefined` | See type | no | — | IANA zone the wall clock is read in ("Australia/Sydney"). Shown in the box as its abbreviation or offset on that date; the list leaves out times a daylight-saving change skips. The value never converts: use `resolveWallClock` for the instant. |
| value | `string \| null \| undefined` | See type | no | — | A wall-clock date and time (`2026-10-21T09:30`) with no offset, or null when empty. |
| width | `FieldWidth \| undefined` | "full", "short", "medium" | no | "medium" | Content width (R15.6). Default medium. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
