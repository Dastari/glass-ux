# MoneyField

MoneyInput bound to a `number | null` (minor units) form field. Pair it with `moneySchema()`.
A currency picker changes the field's amount in the new currency's units; keep the currency in
its own field with `currency` and `onCurrencyChange`.

`import { MoneyField } from "glass-ux/money-field"`

[Live examples](https://dastari.github.io/glass-ux/components/money-field)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| allowNegative | `boolean \| undefined` | false, true | no | — | Allows values below zero when validation also permits them. |
| aria-label | `string \| undefined` | See type | no | — | Accessible name when a visible label does not name the control. |
| aside | `ReactNode` | See type | no | — | Right side of the label row: a live value readout or a small link. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| currencies | `readonly string[] \| undefined` | See type | no | — | The currencies a person can choose from (ISO 4217, in this order). With two or more, a currency picker sits at the start of the box, showing the chosen currency's symbol and code, and the amount is shown without its symbol. |
| currency | `string \| undefined` | See type | no | — | ISO 4217. Default AUD. With `currencies`, pass it with `onCurrencyChange`, or use `defaultCurrency`. |
| currencyDisplay | `"symbol" \| "code" \| "narrowSymbol" \| undefined` | "symbol", "code", "narrowSymbol" | no | — | How the currency is shown: "narrowSymbol" ("$", default), "symbol" ("A$", the locale's unambiguous symbol) or "code" ("AUD"). In the picker, the symbol comes before the code. |
| defaultCurrency | `string \| undefined` | See type | no | — | The first currency when `currency` is not controlled. Default AUD. |
| fractionDigits | `number \| undefined` | See type | no | — | Hold amounts finer than the currency's minor unit (unit costs): the value counts 10^-fractionDigits of the currency (4: 525 is $0.0525), shown with 2 to `fractionDigits` decimals for AUD. At least the currency's own decimals. Pair with `moneySchema({ fractionDigits })`, and use the same scale for `min`, `max` and `step`. |
| hint | `ReactNode` | See type | no | — | The message line's resting text. Only when the format or consequence is not obvious (R2.8). |
| id | `string \| undefined` | See type | no | — | A stable element or component identifier. |
| label | `ReactNode` | See type | no | — | Names the control. Omit only when a group legend or `aria-label` names it instead. |
| locale | `string \| undefined` | See type | no | — | BCP 47 locale the number is shown and typed in (decimal and grouping marks). Default: the nearest `LocaleProvider`, then `configureLocale()`, then `<html lang>`, then en-US. |
| max | `number \| undefined` | See type | no | — | Upper value or visible-item limit, as specified by the type. |
| min | `number \| undefined` | See type | no | — | Bounds in minor units. Default min 0 (no negatives) unless `allowNegative`. |
| onCurrencyChange | `((currency: string) => void) \| undefined` | See type | no | — | Called with the currency a person chose. The amount stays the same in major units, rounded to the new currency's decimals (12.50 AUD becomes 12.50 EUR, or 13 JPY), and `onValueChange` reports it in the new currency's minor units in the same event. |
| optional | `boolean \| undefined` | false, true | no | — | Marks the label "Optional". Prefer this over marking required fields. |
| placeholder | `string \| undefined` | See type | no | — | The prompt shown while the value is empty. It does not replace the field’s label. |
| readOnly | `boolean \| undefined` | false, true | no | — | Displays the current value without allowing edits. |
| ref | `Ref<HTMLInputElement> \| undefined` | See type | no | — | Receives the underlying element for focus or measurement. React 19 accepts ref as a normal prop. |
| required | `boolean \| undefined` | false, true | no | — | Shows the required marker. Pass `required` to the control as well. |
| scrubLabel | `ReactNode` | See type | no | — | A short prefix inside the box that scrubs the value when dragged ("W", "Max"). |
| showCode | `boolean \| undefined` | false, true | no | — | Show the currency code after the amount ("AUD"), for screens with more than one currency. Default false. Not needed with a picker. |
| size | `NumberFieldSize \| undefined` | "sm", "md", "lg" | no | — | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
| step | `number \| undefined` | See type | no | — | Step for the arrow keys, in minor units. Default one major unit ($1). |
| steppers | `boolean \| undefined` | false, true | no | — | Show the − / + steppers (default). Arrow keys always step. |
| warning | `ReactNode` | See type | no | — | Non-blocking warning in the reserved message slot; errors take precedence. |
| width | `FieldWidth \| undefined` | "full", "short", "medium" | no | "medium" | Content width: short (port, PIN), medium (name, hostname), full (default). |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| disabled | `boolean \| undefined` | false, true | no | — | Whether the component should ignore user interaction. Takes precedence over the `disabled` prop on the `<Field.Control>` component. |
