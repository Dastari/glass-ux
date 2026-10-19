# DateTimeField

DateTimeInput bound to a `string | null` form field holding a wall clock (`2026-10-21T09:30`).
Pair it with `dateTimeSchema()` and the same locale, bounds and zone. One label names both
parts; one message line serves both. An incomplete or unreadable entry reaches the form as
read, so the schema names the part to fix.

`import { DateTimeField } from "glass-ux/date-picker"`

[Live examples](https://dastari.github.io/glass-ux/components/date-time-field)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string \| undefined` | See type | no | — | Accessible name of the group when no Field label names it. |
| aria-labelledby | `string \| undefined` | See type | no | — | IDs of elements that name the group. |
| aside | `ReactNode` | See type | no | — | Right side of the label row: a live value readout or a small link. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| dateLabel | `string \| undefined` | See type | no | — | Accessible names of the two parts (default "Date", "Time"). |
| defaultTime | `string \| undefined` | See type | no | — | The time filled in when a day is entered or picked before any time ("09:00"). |
| describe | `boolean \| undefined` | false, true | no | true | With `timeZone`, describe the zone as the hint when none is given ("Australia/Sydney · UTC+11:00"), and explain a time a daylight-saving change skips (a warning) or repeats. Default true. |
| hint | `ReactNode` | See type | no | — | The message line's resting text. Only when the format or consequence is not obvious (R2.8). |
| hourCycle | `HourCycle \| undefined` | 12, 24 | no | — | Override the locale's clock: 12 (am/pm) or 24. |
| id | `string \| undefined` | See type | no | — | The date input's id; a Field label points at it. |
| label | `ReactNode` | See type | no | — | Names the control. Omit only when a group legend or `aria-label` names it instead. |
| locale | `string \| undefined` | See type | no | — | BCP 47 locale: the date order, the clock and names (default en-AU). |
| max | `string \| undefined` | See type | no | — | Latest allowed wall-clock date and time. |
| min | `string \| undefined` | See type | no | — | Earliest allowed wall-clock date and time. |
| optional | `boolean \| undefined` | false, true | no | — | Marks the label "Optional". Prefer this over marking required fields. |
| readOnly | `boolean \| undefined` | false, true | no | — | Displays the current value without allowing edits. |
| ref | `Ref<HTMLInputElement> \| undefined` | See type | no | — | Receives the date input, for focus. |
| required | `boolean \| undefined` | false, true | no | — | Shows the required marker. Pass `required` to the control as well. |
| size | `DateFieldSize \| undefined` | "sm", "md", "lg" | no | — | The box height, matching DateField. |
| step | `number \| undefined` | See type | no | — | Minutes between suggested times, and between arrow-key steps on the minutes (default 15). |
| suggestions | `readonly string[] \| undefined` | See type | no | — | Explicit times to offer in the list instead of every `step` minutes. |
| timeLabel | `string \| undefined` | See type | no | — | Accessible name of the time part (default "Time"). |
| timeZone | `string \| undefined` | See type | no | — | IANA zone the wall clock is read in ("Australia/Sydney"). Shown in the box as its abbreviation or offset on that date; the list leaves out times a daylight-saving change skips. The value never converts: use `resolveWallClock` for the instant. |
| warning | `ReactNode` | See type | no | — | Non-blocking warning in the reserved message slot; errors take precedence. |
| width | `FieldWidth \| undefined` | "full", "short", "medium" | no | — | Content width (R15.6). Default medium. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
