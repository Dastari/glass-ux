# TimeInput

A time of day typed as people write it ("930", "9:30pm", "21:30", "noon") or picked from a
list, shown in the locale's clock ("9:30 am" in en-AU) and held as `HH:mm`. Arrow keys step
the part under the caret (minutes by `step`), Page Up and Page Down move an hour, Home and
End go to min and max, and Alt+↓ opens the list. Text that is not a time (or is outside
min/max) turns the box invalid; the text is tidied on blur.

`import { TimeInput } from "glass-ux/date-picker"`

[Live examples](https://dastari.github.io/glass-ux/components/time-input)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string \| undefined` | See type | no | — | Accessible name when a visible label does not name the control. |
| aria-labelledby | `string \| undefined` | See type | no | — | IDs of elements that provide the accessible name. |
| className | `string \| undefined` | See type | no | — | Layout only. Applied to the control box. |
| defaultValue | `string \| null \| undefined` | See type | no | null | The initial time when uncontrolled. |
| disabled | `boolean \| undefined` | false, true | no | — | Disables interaction while retaining the component’s disabled appearance. |
| hourCycle | `HourCycle \| undefined` | 12, 24 | no | — | Override the locale's clock: 12 (am/pm) or 24. |
| id | `string \| undefined` | See type | no | — | A stable element or component identifier. |
| invalid | `boolean \| undefined` | false, true | no | — | Invalid outside a Field. Text that is not a time marks the field invalid by itself. |
| locale | `string \| undefined` | See type | no | "en-AU" | BCP 47 locale: the clock and its am/pm words (default en-AU, a 12-hour clock). |
| max | `string \| undefined` | See type | no | — | Latest allowed time. |
| min | `string \| undefined` | See type | no | — | Earliest allowed time. |
| name | `string \| undefined` | See type | no | — | The component’s name or native form field name, as specified by its value type. |
| onBlur | `((event: FocusEvent<HTMLInputElement>) => void) \| undefined` | See type | no | — | Called when the text input loses focus, after the typed time has been committed. |
| onReject | `((value: string) => void) \| undefined` | See type | no | — | Called on blur or Enter instead of `onValueChange` when the text cannot be read (with the text as typed) or reads as a time outside min/max (with that time). The box is marked invalid. The bound TimeField passes it to the form so `timeSchema` can explain it. |
| onValueChange | `((value: TimeValue \| null) => void) \| undefined` | See type | no | — | Called with a time, or null when the field is emptied. Typing commits on blur or Enter; arrow keys and the list commit at once. |
| placeholder | `string \| undefined` | See type | no | — | The prompt while empty. Default: the format in the locale's clock ("h:mm am"). |
| popup | `boolean \| undefined` | false, true | no | true | Show the list button (default true). Typing and arrow keys work without it. |
| readOnly | `boolean \| undefined` | false, true | no | — | Displays the current value without allowing edits. |
| ref | `Ref<HTMLInputElement> \| undefined` | See type | no | — | Receives the underlying element for focus or measurement. React 19 accepts ref as a normal prop. |
| required | `boolean \| undefined` | false, true | no | — | Marks the input required for assistive technology; pair it with `timeSchema({ required: true })`. |
| seconds | `boolean \| undefined` | false, true | no | false | Hold seconds (`HH:mm:ss`). Default false. |
| size | `DateFieldSize \| undefined` | "sm", "md", "lg" | no | "md" | The box height, matching DateField. |
| step | `number \| undefined` | See type | no | 15 | Minutes between suggested times, and between arrow-key steps on the minutes (default 15). |
| suggestions | `readonly string[] \| undefined` | See type | no | — | Explicit times to offer in the list instead of every `step` minutes. |
| value | `string \| null \| undefined` | See type | no | — | A time of day (`09:30`, or `09:30:15` with `seconds`), or null when empty. A value that is not a time is shown as it is and marked invalid. |
| width | `FieldWidth \| undefined` | "full", "short", "medium" | no | "short" | Content width (R15.6). Default short: a time is about eight characters. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
