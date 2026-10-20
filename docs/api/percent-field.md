# PercentField

PercentInput bound to a `number | null` form field. Pair it with `percentSchema()`.

`import { PercentField } from "glass-ux/percent-field"`

[Live examples](https://dastari.github.io/glass-ux/components/percent-field)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string \| undefined` | See type | no | — | Accessible name when a visible label does not name the control. |
| aside | `ReactNode` | See type | no | — | Right side of the label row: a live value readout or a small link. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| decimals | `number \| undefined` | See type | no | — | Decimal places shown and kept. Default 0. |
| hint | `ReactNode` | See type | no | — | The message line's resting text. Only when the format or consequence is not obvious (R2.8). |
| id | `string \| undefined` | See type | no | — | A stable element or component identifier. |
| label | `ReactNode` | See type | no | — | Names the control. Omit only when a group legend or `aria-label` names it instead. |
| largeStep | `number \| undefined` | See type | no | — | The larger keyboard increment. |
| locale | `string \| undefined` | See type | no | — | BCP 47 locale the number is shown and typed in (decimal and grouping marks). Default: the nearest `LocaleProvider`, then `configureLocale()`, then `<html lang>`, then en-US. |
| max | `number \| undefined` | See type | no | — | Upper value or visible-item limit, as specified by the type. |
| min | `number \| undefined` | See type | no | — | Lower allowed value. |
| optional | `boolean \| undefined` | false, true | no | — | Marks the label "Optional". Prefer this over marking required fields. |
| placeholder | `string \| undefined` | See type | no | — | The prompt shown while the value is empty. It does not replace the field’s label. |
| readOnly | `boolean \| undefined` | false, true | no | — | Displays the current value without allowing edits. |
| ref | `Ref<HTMLInputElement> \| undefined` | See type | no | — | Receives the underlying element for focus or measurement. React 19 accepts ref as a normal prop. |
| required | `boolean \| undefined` | false, true | no | — | Shows the required marker. Pass `required` to the control as well. |
| scale | `"whole" \| "fraction" \| undefined` | "whole", "fraction" | no | — | whole (default): 90 means 90 %. fraction: 0.9 means 90 % (what ratios and APIs often store). |
| scrubLabel | `ReactNode` | See type | no | — | A short prefix inside the box that scrubs the value when dragged ("W", "Max"). |
| size | `NumberFieldSize \| undefined` | "sm", "md", "lg" | no | — | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
| step | `number \| undefined` | See type | no | — | Increment used by keyboard and stepper interaction. |
| steppers | `boolean \| undefined` | false, true | no | — | Show the − / + steppers (default). Arrow keys always step. |
| warning | `ReactNode` | See type | no | — | Non-blocking warning in the reserved message slot; errors take precedence. |
| width | `FieldWidth \| undefined` | "full", "short", "medium" | no | — | Content width: short (port, PIN), medium (name, hostname), full (default). |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| disabled | `boolean \| undefined` | false, true | no | — | Whether the component should ignore user interaction. Takes precedence over the `disabled` prop on the `<Field.Control>` component. |
