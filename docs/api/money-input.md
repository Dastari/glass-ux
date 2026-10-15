# MoneyInput

An amount of money held in minor units (integer cents), so totals never drift. It shows and
reads the locale's currency format ("$1,234.50"), and rounds to the currency's minor digits.

`import { MoneyInput } from "glass-ux/money-field"`

[Live examples](https://dastari.github.io/glass-ux/components/money-input)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| allowNegative | `boolean \| undefined` | false, true | no | false | Allows values below zero when validation also permits them. |
| aria-label | `string \| undefined` | See type | no | — | Accessible name when a visible label does not name the control. |
| className | `string \| undefined` | See type | no | — | Layout only. |
| currency | `string \| undefined` | See type | no | DEFAULT_CURRENCY | ISO 4217. Default AUD. |
| defaultValue | `number \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| disabled | `boolean \| undefined` | false, true | no | — | Disables interaction while retaining the component’s disabled appearance. |
| id | `string \| undefined` | See type | no | — | A stable element or component identifier. |
| invalid | `boolean \| undefined` | false, true | no | — | Invalid outside a Field. |
| max | `number \| undefined` | See type | no | — | Upper value or visible-item limit, as specified by the type. |
| min | `number \| undefined` | See type | no | — | Bounds in minor units. Default min 0 (no negatives) unless `allowNegative`. |
| name | `string \| undefined` | See type | no | — | The component’s name or native form field name, as specified by its value type. |
| onBlur | `((event: FocusEvent<HTMLInputElement>) => void) \| undefined` | See type | no | — | Called when blur occurs. The callback type specifies its arguments. |
| onValueChange | `((minor: number \| null) => void) \| undefined` | See type | no | — | Called when value change occurs. The callback type specifies its arguments. |
| placeholder | `string \| undefined` | See type | no | — | The prompt shown while the value is empty. It does not replace the field’s label. |
| readOnly | `boolean \| undefined` | false, true | no | — | Displays the current value without allowing edits. |
| ref | `Ref<HTMLInputElement> \| undefined` | See type | no | — | Receives the underlying element for focus or measurement. React 19 accepts ref as a normal prop. |
| required | `boolean \| undefined` | false, true | no | — | Marks the field as required; pair it with the corresponding schema validation. |
| scrubLabel | `ReactNode` | See type | no | — | A short prefix inside the box that scrubs the value when dragged ("W", "Max"). |
| showCode | `boolean \| undefined` | false, true | no | false | Show the currency code after the amount ("AUD"), for screens with more than one currency. Default false. |
| size | `NumberFieldSize \| undefined` | "sm", "md", "lg" | no | — | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
| step | `number \| undefined` | See type | no | — | Step for the arrow keys, in minor units. Default one major unit ($1). |
| steppers | `boolean \| undefined` | false, true | no | false | Show the − / + steppers (default). Arrow keys always step. |
| value | `number \| null \| undefined` | See type | no | — | Minor units (cents). Null when empty. |
| width | `FieldWidth \| undefined` | "full", "short", "medium" | no | — | Content width: short (port, PIN), medium (name, hostname), full (default). |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
