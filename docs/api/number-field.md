# NumberField

A number with bounds and steps: type it, use ↑ ↓ (Shift for large steps), the − / +
steppers, or drag the scrub label. Values are clamped to min/max on blur and formatted
with tabular figures.

`import { NumberField } from "glass-ux/number-field"`

[Live examples](https://dastari.github.io/glass-ux/components/number-field)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string \| undefined` | See type | no | — | Accessible name when a visible label does not name the control. |
| className | `string \| undefined` | See type | no | — | Layout only. |
| defaultValue | `number \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| disabled | `boolean \| undefined` | false, true | no | — | Disables interaction while retaining the component’s disabled appearance. |
| format | `Intl.NumberFormatOptions \| undefined` | See type | no | — | Intl number formatting (grouping, decimals, percent). |
| id | `string \| undefined` | See type | no | — | A stable element or component identifier. |
| invalid | `boolean \| undefined` | false, true | no | — | Invalid outside a Field. |
| largeStep | `number \| undefined` | See type | no | — | The larger keyboard increment. |
| locale | `string \| undefined` | See type | no | — | BCP 47 locale the number is shown and typed in (decimal and grouping marks). Default: the nearest `LocaleProvider`, then `configureLocale()`, then `<html lang>`, then en-US. |
| max | `number \| undefined` | See type | no | — | Upper value or visible-item limit, as specified by the type. |
| min | `number \| undefined` | See type | no | — | Lower allowed value. |
| name | `string \| undefined` | See type | no | — | The component’s name or native form field name, as specified by its value type. |
| onBlur | `((event: FocusEvent<HTMLInputElement>) => void) \| undefined` | See type | no | — | Called when the text input loses focus, so a form can mark the field touched. |
| onValueChange | `((value: number \| null) => void) \| undefined` | See type | no | — | Called with the parsed number, or null when the box is empty, as it is typed, stepped or scrubbed. Pair with `value` to control it; use `defaultValue` otherwise. |
| placeholder | `string \| undefined` | See type | no | — | The prompt shown while the value is empty. It does not replace the field’s label. |
| readOnly | `boolean \| undefined` | false, true | no | — | Displays the current value without allowing edits. |
| ref | `Ref<HTMLInputElement> \| undefined` | See type | no | — | Receives the underlying element for focus or measurement. React 19 accepts ref as a normal prop. |
| required | `boolean \| undefined` | false, true | no | — | Marks the field as required; pair it with the corresponding schema validation. |
| scrubLabel | `ReactNode` | See type | no | — | A short prefix inside the box that scrubs the value when dragged ("W", "Max"). |
| size | `NumberFieldSize \| undefined` | "sm", "md", "lg" | no | "md" | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
| step | `number \| undefined` | See type | no | 1 | Increment used by keyboard and stepper interaction. |
| steppers | `boolean \| undefined` | false, true | no | true | Show the − / + steppers (default). Arrow keys always step. |
| unit | `ReactNode` | See type | no | — | Unit after the value ("MB", "ms", "devices"). |
| value | `number \| null \| undefined` | See type | no | — | The controlled value. Keep it in application state and update it in the change callback. |
| width | `FieldWidth \| undefined` | "full", "short", "medium" | no | — | Content width: short (port, PIN), medium (name, hostname), full (default). |
