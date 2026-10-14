# Country

`glass-ux/country-select` · [Live component catalogue](https://dastari.github.io/glass-ux/)


Every ISO 3166-1 country (and Kosovo) chosen by typing its name, named by the browser in the
locale (Intl.DisplayNames), with its flag and code. The workspace's country comes first
(`priority`). Shares its data with the phone field.

```tsx
import { countrySchema } from "glass-ux/country-select"

const schema = z.object({ country: countrySchema({ required: true }) })   // "AU"

<form.AppField name="country">{(field) => <field.CountryField label="Country" priority={["AU", "NZ"]} />}</form.AppField>
```

- **Options:** `countries` (restrict), `priority`, `flags` (default true), `locale`.
- **Data:** `COUNTRY_TABLE` (code, calling code), `listCountries`, `countryName`, `callingCodeOf`,
  `MAIN_COUNTRY_FOR_CALLING_CODE`; unit tests keep the calling codes in step with libphonenumber.
- **Flags:** `CountryFlag` — SVG (country-flag-icons, MIT), loaded once, lazily, never emoji.
