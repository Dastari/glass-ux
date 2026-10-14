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
  `showCode` (adds "AUD" after the amount, for screens with several currencies).
- **Parts:** `MoneyInput`, `toMinor`, `fromMinor`, `formatMoney`, `parseMoney`, `minorDigits`.
