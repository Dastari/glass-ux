# Money

`glass-ux/money-field` · [Live component catalogue](https://dastari.github.io/glass-ux/)

An amount held in minor units (integer cents), so sums never drift. It shows and reads the locale's
currency format (`$1,234.50`) through Intl.NumberFormat, rounds to the currency's minor digits
(AUD 2, JPY 0, KWD 3) and refuses negatives unless `allowNegative`. Built on NumberField.

```tsx
import { moneySchema } from "glass-ux/money-field"

const schema = z.object({ rate: moneySchema({ required: true, max: 100000 }) })   // 16500 = $165.00

<form.AppField name="rate">{(field) => <field.MoneyField label="Hourly rate" currency="AUD" />}</form.AppField>
```

- **Options:** `currency` (default AUD), `min`/`max`/`step` in minor units, `allowNegative`,
  `showCode` (adds "AUD" after the amount, for screens with several currencies), `locale`
  (the decimal and grouping marks it shows and reads; default: the
  [application locale](../getting-started.md#set-the-formatting-locale)). Pass the same
  `locale` to `moneySchema` when the field has its own.
- **Choosing the currency:** `currencies={["AUD", "NZD", "USD"]}` puts a picker at the start of the
  box with the currency's symbol and code; the amount is then shown without its symbol. Control it
  with `currency` and `onCurrencyChange`, or start it with `defaultCurrency`. A change keeps the
  amount in major units and rounds it to the new currency's decimals (12.50 AUD becomes 13 JPY), and
  `onValueChange` reports it in the new currency's minor units in the same event. Keep the currency
  in its own form field beside the amount. `currencyDisplay` is `"narrowSymbol"` ("$", default),
  `"symbol"` ("A$") or `"code"` ("AUD"), with or without a picker.
- **Finer amounts:** `fractionDigits={4}` (on `MoneyField`, `MoneyInput`, `moneySchema`, `toMinor`,
  `fromMinor`, `formatMoney` and `parseMoney`) counts 10⁻⁴ of the currency, for unit costs: 525 is
  $0.0525, shown with 2 to 4 decimals. The value stays an integer; give `min`, `max` and `step` in the
  same units.
- **Parts:** `MoneyInput`, `toMinor`, `fromMinor`, `formatMoney`, `parseMoney`, `minorDigits`,
  `unitDigits`, `moneyFormat`, `currencySymbol`, `currencyName`.
