# DateField

A calendar day typed in the locale's order ("13/10/2026") or picked from a calendar. Any
separator works and two-digit years mean 20xx; the text is tidied on blur. Text that is
not a day (or is outside min/max) turns the box invalid and keeps what was typed.

`import { DateField } from "glass-ux/date-picker"`

[Live examples](https://dastari.github.io/glass-ux/components/date-field)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string \| undefined` | See type | no | — | Accessible name when a visible label does not name the control. |
| aria-labelledby | `string \| undefined` | See type | no | — | IDs of elements that provide the accessible name. |
| className | `string \| undefined` | See type | no | — | Layout only. Applied to the control box. |
| defaultValue | `string \| null \| undefined` | See type | no | null | The initial value when using the component without controlling its state. |
| disabled | `boolean \| undefined` | false, true | no | — | Disables interaction while retaining the component’s disabled appearance. |
| id | `string \| undefined` | See type | no | — | A stable element or component identifier. |
| invalid | `boolean \| undefined` | false, true | no | — | Invalid outside a Field. Text that is not a date marks the field invalid by itself. |
| locale | `string \| undefined` | See type | no | "en-AU" | BCP 47 locale: the typed order ("dd/mm/yyyy" in en-AU), names, first weekday. |
| max | `string \| undefined` | See type | no | — | Upper value or visible-item limit, as specified by the type. |
| min | `string \| undefined` | See type | no | — | Lower allowed value. |
| name | `string \| undefined` | See type | no | — | The component’s name or native form field name, as specified by its value type. |
| onBlur | `((event: FocusEvent<HTMLInputElement>) => void) \| undefined` | See type | no | — | Called when blur occurs. The callback type specifies its arguments. |
| onValueChange | `((value: IsoDate \| null) => void) \| undefined` | See type | no | — | Called with a valid day, or null when the field is emptied. Typing commits on blur or Enter. |
| placeholder | `string \| undefined` | See type | no | — | The prompt shown while the value is empty. It does not replace the field’s label. |
| readOnly | `boolean \| undefined` | false, true | no | — | Displays the current value without allowing edits. |
| ref | `Ref<HTMLInputElement> \| undefined` | See type | no | — | Receives the underlying element for focus or measurement. React 19 accepts ref as a normal prop. |
| size | `DateFieldSize \| undefined` | "sm", "md", "lg" | no | "md" | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
| value | `string \| null \| undefined` | See type | no | — | A calendar day (`2026-10-13`), or null when empty. |
| width | `FieldWidth \| undefined` | "full", "short", "medium" | no | "medium" | Content width (R15.6). A date fits `short`… almost: the default is medium. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
