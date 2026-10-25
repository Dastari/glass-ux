# DateRangeField

A range of calendar days in one box: two typed ends ("1/10/2026 – 13/10/2026") and a
range calendar. The range is reported only when both ends are days and in order; a
reversed range marks the box invalid.

`import { DateRangeField } from "glass-ux/date-picker"`

[Live examples](https://dastari.github.io/glass-ux/components/date-range-field)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string \| undefined` | See type | no | — | Accessible name when a visible label does not name the control. |
| aria-labelledby | `string \| undefined` | See type | no | — | IDs of elements that provide the accessible name. |
| className | `string \| undefined` | See type | no | — | Layout only. Applied to the control box. |
| defaultValue | `DateRange \| null \| undefined` | See type | no | null | The initial value when using the component without controlling its state. |
| disabled | `boolean \| undefined` | false, true | no | — | Disables interaction while retaining the component’s disabled appearance. |
| endLabel | `string \| undefined` | See type | no | — | Label at the end of the scale or track. |
| id | `string \| undefined` | See type | no | — | A stable element or component identifier. |
| invalid | `boolean \| undefined` | false, true | no | — | Invalid outside a Field. Text that is not a date marks the field invalid by itself. |
| locale | `string \| undefined` | See type | no | — | BCP 47 locale: the typed order ("dd/mm/yyyy" in en-AU), names, first weekday. Default: the nearest `LocaleProvider`, then `configureLocale()`, then `<html lang>`, then en-US. |
| max | `string \| undefined` | See type | no | — | Upper value or visible-item limit, as specified by the type. |
| min | `string \| undefined` | See type | no | — | Lower allowed value. |
| onValueChange | `((value: DateRange \| null) => void) \| undefined` | See type | no | — | Called with a complete, ordered range, or null when either end is emptied. |
| readOnly | `boolean \| undefined` | false, true | no | — | Displays the current value without allowing edits. |
| size | `DateFieldSize \| undefined` | "sm", "md", "lg" | no | "md" | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
| startLabel | `string \| undefined` | See type | no | — | Accessible names of the two ends (default "Start date", "End date"). |
| value | `DateRange \| null \| undefined` | See type | no | — | The controlled value. Keep it in application state and update it in the change callback. |
| width | `FieldWidth \| undefined` | "full", "short", "medium" | no | — | Content width (R15.6). A date fits `short`… almost: the default is medium. |
