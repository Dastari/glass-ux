# PercentInput

A percentage, 0–100 by default, with the % as a unit and tabular figures. The value is a
whole percent, or a fraction with `scale="fraction"`; bounds are in the same scale as the value.

`import { PercentInput } from "glass-ux/percent-field"`

[Live examples](https://dastari.github.io/glass-ux/components/percent-input)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string \| undefined` | See type | no | — | Accessible name when a visible label does not name the control. |
| className | `string \| undefined` | See type | no | — | Layout only. |
| decimals | `number \| undefined` | See type | no | 0 | Decimal places shown and kept. Default 0. |
| defaultValue | `number \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| disabled | `boolean \| undefined` | false, true | no | — | Disables interaction while retaining the component’s disabled appearance. |
| id | `string \| undefined` | See type | no | — | A stable element or component identifier. |
| invalid | `boolean \| undefined` | false, true | no | — | Invalid outside a Field. |
| largeStep | `number \| undefined` | See type | no | — | The larger keyboard increment. |
| max | `number \| undefined` | See type | no | — | Upper value or visible-item limit, as specified by the type. |
| min | `number \| undefined` | See type | no | — | Lower allowed value. |
| name | `string \| undefined` | See type | no | — | The component’s name or native form field name, as specified by its value type. |
| onBlur | `((event: FocusEvent<HTMLInputElement>) => void) \| undefined` | See type | no | — | Called when blur occurs. The callback type specifies its arguments. |
| onValueChange | `((value: number \| null) => void) \| undefined` | See type | no | — | Called when value change occurs. The callback type specifies its arguments. |
| placeholder | `string \| undefined` | See type | no | — | The prompt shown while the value is empty. It does not replace the field’s label. |
| readOnly | `boolean \| undefined` | false, true | no | — | Displays the current value without allowing edits. |
| ref | `Ref<HTMLInputElement> \| undefined` | See type | no | — | Receives the underlying element for focus or measurement. React 19 accepts ref as a normal prop. |
| required | `boolean \| undefined` | false, true | no | — | Marks the field as required; pair it with the corresponding schema validation. |
| scale | `"whole" \| "fraction" \| undefined` | "whole", "fraction" | no | "whole" | whole (default): 90 means 90 %. fraction: 0.9 means 90 % (what ratios and APIs often store). |
| scrubLabel | `ReactNode` | See type | no | — | A short prefix inside the box that scrubs the value when dragged ("W", "Max"). |
| size | `NumberFieldSize \| undefined` | "sm", "md", "lg" | no | — | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
| step | `number \| undefined` | See type | no | — | Increment used by keyboard and stepper interaction. |
| steppers | `boolean \| undefined` | false, true | no | — | Show the − / + steppers (default). Arrow keys always step. |
| value | `number \| null \| undefined` | See type | no | — | The controlled value. Keep it in application state and update it in the change callback. |
| width | `FieldWidth \| undefined` | "full", "short", "medium" | no | "short" | Content width: short (port, PIN), medium (name, hostname), full (default). |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
