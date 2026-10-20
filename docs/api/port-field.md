# PortField

PortInput bound to a `number | null` form field. Pair it with `portSchema()`.

`import { PortField } from "glass-ux/port-field"`

[Live examples](https://dastari.github.io/glass-ux/components/port-field)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string \| undefined` | See type | no | — | Accessible name when a visible label does not name the control. |
| aside | `ReactNode` | See type | no | — | Right side of the label row: a live value readout or a small link. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| hint | `ReactNode` | See type | no | — | The message line's resting text. Only when the format or consequence is not obvious (R2.8). |
| id | `string \| undefined` | See type | no | — | A stable element or component identifier. |
| label | `ReactNode` | See type | no | — | Names the control. Omit only when a group legend or `aria-label` names it instead. |
| locale | `string \| undefined` | See type | no | — | BCP 47 locale the number is shown and typed in (decimal and grouping marks). Default: the nearest `LocaleProvider`, then `configureLocale()`, then `<html lang>`, then en-US. |
| optional | `boolean \| undefined` | false, true | no | — | Marks the label "Optional". Prefer this over marking required fields. |
| placeholder | `string \| undefined` | See type | no | — | The prompt shown while the value is empty. It does not replace the field’s label. |
| readOnly | `boolean \| undefined` | false, true | no | — | Displays the current value without allowing edits. |
| ref | `Ref<HTMLInputElement> \| undefined` | See type | no | — | Receives the underlying element for focus or measurement. React 19 accepts ref as a normal prop. |
| required | `boolean \| undefined` | false, true | no | — | Shows the required marker. Pass `required` to the control as well. |
| service | `boolean \| undefined` | false, true | no | — | Name the usual service inside the box ("443 HTTPS"). Default true. |
| services | `Readonly<Record<number, string>> \| undefined` | See type | no | — | Your own names for ports, checked before the well-known list ({ 8443: "UniFi controller" }). |
| size | `NumberFieldSize \| undefined` | "sm", "md", "lg" | no | — | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
| steppers | `boolean \| undefined` | false, true | no | — | Show the − / + steppers (default). Arrow keys always step. |
| warning | `ReactNode` | See type | no | — | Non-blocking warning in the reserved message slot; errors take precedence. |
| width | `FieldWidth \| undefined` | "full", "short", "medium" | no | — | Content width: short (port, PIN), medium (name, hostname), full (default). |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| disabled | `boolean \| undefined` | false, true | no | — | Whether the component should ignore user interaction. Takes precedence over the `disabled` prop on the `<Field.Control>` component. |
