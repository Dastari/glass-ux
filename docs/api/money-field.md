# MoneyField

MoneyInput bound to a `number | null` (minor units) form field. Pair it with `moneySchema()`.

`import { MoneyField } from "glass-ux/money-field"`

[Live examples](https://dastari.github.io/glass-ux/components/money-field)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| allowNegative | `boolean \| undefined` | false, true | no | — | Allows values below zero when validation also permits them. |
| aria-label | `string \| undefined` | See type | no | — | Accessible name when a visible label does not name the control. |
| aside | `ReactNode` | false, true | no | — | Right side of the label row: a live value readout or a small link. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| currency | `string \| undefined` | See type | no | — | ISO 4217. Default AUD. |
| hint | `ReactNode` | false, true | no | — | The message line's resting text. Only when the format or consequence is not obvious (R2.8). |
| id | `string \| undefined` | See type | no | — | A stable element or component identifier. |
| label | `ReactNode` | false, true | no | — | Names the control. Omit only when a group legend or `aria-label` names it instead. |
| max | `number \| undefined` | See type | no | — | Upper value or visible-item limit, as specified by the type. |
| min | `number \| undefined` | See type | no | — | Bounds in minor units. Default min 0 (no negatives) unless `allowNegative`. |
| optional | `boolean \| undefined` | false, true | no | — | Marks the label "Optional". Prefer this over marking required fields. |
| placeholder | `string \| undefined` | See type | no | — | The prompt shown while the value is empty. It does not replace the field’s label. |
| readOnly | `boolean \| undefined` | false, true | no | — | Displays the current value without allowing edits. |
| ref | `Ref<HTMLInputElement> \| undefined` | See type | no | — | Receives the underlying element for focus or measurement. React 19 accepts ref as a normal prop. |
| required | `boolean \| undefined` | false, true | no | — | Shows the required marker. Pass `required` to the control as well. |
| scrubLabel | `ReactNode` | false, true | no | — | A short prefix inside the box that scrubs the value when dragged ("W", "Max"). |
| showCode | `boolean \| undefined` | false, true | no | — | Show the currency code after the amount ("AUD"), for screens with more than one currency. Default false. |
| size | `NumberFieldSize \| undefined` | "sm", "md", "lg" | no | — | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
| step | `number \| undefined` | See type | no | — | Step for the arrow keys, in minor units. Default one major unit ($1). |
| steppers | `boolean \| undefined` | false, true | no | — | Show the − / + steppers (default). Arrow keys always step. |
| warning | `ReactNode` | false, true | no | — | Non-blocking warning in the reserved message slot; errors take precedence. |
| width | `FieldWidth \| undefined` | "full", "short", "medium" | no | "medium" | Content width: short (port, PIN), medium (name, hostname), full (default). |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
