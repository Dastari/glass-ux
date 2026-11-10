# MoneyInput

An amount of money held in minor units (integer cents), so totals never drift. It shows and
reads the locale's currency format ("$1,234.50"), and rounds to the currency's minor digits,
or to `fractionDigits` for finer amounts. With `currencies`, a picker at the start of the box
changes the currency.

`import { MoneyInput } from "glass-ux/money-field"`

[Live examples](https://dastari.github.io/glass-ux/components/money-input)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| allowNegative | `boolean \| undefined` | false, true | no | false | Allows values below zero when validation also permits them. |
| aria-label | `string \| undefined` | See type | no | — | Accessible name when a visible label does not name the control. |
| className | `string \| undefined` | See type | no | — | Layout only. |
| currencies | `readonly string[] \| undefined` | See type | no | — | The currencies a person can choose from (ISO 4217, in this order). With two or more, a currency picker sits at the start of the box, showing the chosen currency's symbol and code, and the amount is shown without its symbol. |
| currency | `string \| undefined` | See type | no | — | ISO 4217. Default AUD. With `currencies`, pass it with `onCurrencyChange`, or use `defaultCurrency`. |
| currencyDisplay | `"symbol" \| "code" \| "narrowSymbol" \| undefined` | "symbol", "code", "narrowSymbol" | no | "narrowSymbol" | How the currency is shown: "narrowSymbol" ("$", default), "symbol" ("A$", the locale's unambiguous symbol) or "code" ("AUD"). In the picker, the symbol comes before the code. |
| defaultCurrency | `string \| undefined` | See type | no | DEFAULT_CURRENCY | The first currency when `currency` is not controlled. Default AUD. |
| defaultValue | `number \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| disabled | `boolean \| undefined` | false, true | no | — | Disables interaction while retaining the component’s disabled appearance. |
| fractionDigits | `number \| undefined` | See type | no | — | Hold amounts finer than the currency's minor unit (unit costs): the value counts 10^-fractionDigits of the currency (4: 525 is $0.0525), shown with 2 to `fractionDigits` decimals for AUD. At least the currency's own decimals. Pair with `moneySchema({ fractionDigits })`, and use the same scale for `min`, `max` and `step`. |
| id | `string \| undefined` | See type | no | — | A stable element or component identifier. |
| invalid | `boolean \| undefined` | false, true | no | — | Invalid outside a Field. |
| locale | `string \| undefined` | See type | no | — | BCP 47 locale the number is shown and typed in (decimal and grouping marks). Default: the nearest `LocaleProvider`, then `configureLocale()`, then `<html lang>`, then en-US. |
| max | `number \| undefined` | See type | no | — | Upper value or visible-item limit, as specified by the type. |
| min | `number \| undefined` | See type | no | — | Bounds in minor units. Default min 0 (no negatives) unless `allowNegative`. |
| name | `string \| undefined` | See type | no | — | The component’s name or native form field name, as specified by its value type. |
| onBlur | `((event: FocusEvent<HTMLInputElement>) => void) \| undefined` | See type | no | — | Called when the text input loses focus, so a form can mark the field touched. |
| onCurrencyChange | `((currency: string) => void) \| undefined` | See type | no | — | Called with the currency a person chose. The amount stays the same in major units, rounded to the new currency's decimals (12.50 AUD becomes 12.50 EUR, or 13 JPY), and `onValueChange` reports it in the new currency's minor units in the same event. |
| onValueChange | `((minor: number \| null) => void) \| undefined` | See type | no | — | Called with the amount in minor units (integer cents), or null when the box is empty, as it is typed, stepped or scrubbed, and when the currency changes (see `onCurrencyChange`). Pair with `value` to control it; use `defaultValue` otherwise. |
| placeholder | `string \| undefined` | See type | no | — | The prompt shown while the value is empty. It does not replace the field’s label. |
| readOnly | `boolean \| undefined` | false, true | no | — | Displays the current value without allowing edits. |
| ref | `Ref<HTMLInputElement> \| undefined` | See type | no | — | Receives the underlying element for focus or measurement. React 19 accepts ref as a normal prop. |
| required | `boolean \| undefined` | false, true | no | — | Marks the field as required; pair it with the corresponding schema validation. |
| scrubLabel | `ReactNode` | See type | no | — | A short prefix inside the box that scrubs the value when dragged ("W", "Max"). |
| showCode | `boolean \| undefined` | false, true | no | false | Show the currency code after the amount ("AUD"), for screens with more than one currency. Default false. Not needed with a picker. |
| size | `NumberFieldSize \| undefined` | "sm", "md", "lg" | no | — | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
| step | `number \| undefined` | See type | no | — | Step for the arrow keys, in minor units. Default one major unit ($1). |
| steppers | `boolean \| undefined` | false, true | no | false | Show the − / + steppers (default). Arrow keys always step. |
| value | `number \| null \| undefined` | See type | no | — | Minor units (cents), or 10^-fractionDigits of the currency with `fractionDigits`. Null when empty. |
| width | `FieldWidth \| undefined` | "full", "short", "medium" | no | — | Content width: short (port, PIN), medium (name, hostname), full (default). |
