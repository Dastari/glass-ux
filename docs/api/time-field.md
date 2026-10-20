# TimeField

TimeInput bound to a `string | null` form field holding `HH:mm`. Pair it with `timeSchema()`
and the same locale, clock and bounds. Unreadable text reaches the form as typed and a time
outside min/max as read, so the schema can say which.

`import { TimeField } from "glass-ux/date-picker"`

[Live examples](https://dastari.github.io/glass-ux/components/time-field)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string \| undefined` | See type | no | — | Accessible name when a visible label does not name the control. |
| aria-labelledby | `string \| undefined` | See type | no | — | IDs of elements that provide the accessible name. |
| aside | `ReactNode` | See type | no | — | Right side of the label row: a live value readout or a small link. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| hint | `ReactNode` | See type | no | — | The message line's resting text. Only when the format or consequence is not obvious (R2.8). |
| hourCycle | `HourCycle \| undefined` | 12, 24 | no | — | Override the locale's clock: 12 (am/pm) or 24. |
| id | `string \| undefined` | See type | no | — | A stable element or component identifier. |
| label | `ReactNode` | See type | no | — | Names the control. Omit only when a group legend or `aria-label` names it instead. |
| locale | `string \| undefined` | See type | no | — | BCP 47 locale: the clock and its am/pm words. Default: the nearest `LocaleProvider`, then `configureLocale()`, then `<html lang>`, then en-US. |
| max | `string \| undefined` | See type | no | — | Latest allowed time. |
| min | `string \| undefined` | See type | no | — | Earliest allowed time. |
| optional | `boolean \| undefined` | false, true | no | — | Marks the label "Optional". Prefer this over marking required fields. |
| placeholder | `string \| undefined` | See type | no | — | The prompt while empty. Default: the format in the locale's clock ("h:mm am"). |
| popup | `boolean \| undefined` | false, true | no | — | Show the list button (default true). Typing and arrow keys work without it. |
| readOnly | `boolean \| undefined` | false, true | no | — | Displays the current value without allowing edits. |
| ref | `Ref<HTMLInputElement> \| undefined` | See type | no | — | Receives the underlying element for focus or measurement. React 19 accepts ref as a normal prop. |
| required | `boolean \| undefined` | false, true | no | — | Shows the required marker. Pass `required` to the control as well. |
| seconds | `boolean \| undefined` | false, true | no | — | Hold seconds (`HH:mm:ss`). Default false. |
| size | `DateFieldSize \| undefined` | "sm", "md", "lg" | no | — | The box height, matching DateField. |
| step | `number \| undefined` | See type | no | — | Minutes between suggested times, and between arrow-key steps on the minutes (default 15). |
| suggestions | `readonly string[] \| undefined` | See type | no | — | Explicit times to offer in the list instead of every `step` minutes. |
| warning | `ReactNode` | See type | no | — | Non-blocking warning in the reserved message slot; errors take precedence. |
| width | `FieldWidth \| undefined` | "full", "short", "medium" | no | — | Content width (R15.6). Default short: a time is about eight characters. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| disabled | `boolean \| undefined` | false, true | no | — | Whether the component should ignore user interaction. Takes precedence over the `disabled` prop on the `<Field.Control>` component. |
