# MAC address

`glass-ux/mac-field` · [Live component catalogue](https://dastari.github.io/glass-ux/)

A MAC address in any notation — colons, hyphens (Windows), dots (Cisco `0015.65aa.bbcc`) or none —
written one way when focus leaves. With `lookupVendor`, the hint names the maker ("Vendor ·
Yealink"); a locally administered (randomised Wi-Fi) or multicast address says so.

```tsx
import { macSchema } from "glass-ux/mac-field"

const schema = z.object({ mac: macSchema({ required: true }) })

<form.AppField name="mac">
  {(field) => <field.MacAddressField label="MAC address" lookupVendor={(oui) => api.vendorOf(oui)} />}
</form.AppField>
```

- **Options:** `format` ("colon" default, "hyphen", "dot", "bare"), `letterCase` ("upper" default).
- **Vendor lookup:** `(oui: "001565") => string | undefined | Promise<…>`. The library ships no OUI
  table (the IEEE registry is about 4 MB): the server should answer it.
- **Parts:** `MacAddressInput`, `macDigits`, `formatMac`, `normaliseMac`, `ouiOf`, `macFacts`,
  `useMacVendor`.
