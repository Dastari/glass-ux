# Web address

`glass-ux/url-field` · [Live component catalogue](https://dastari.github.io/glass-ux/)


A URL. When focus leaves, a missing scheme is added (`https://` by default), the scheme and host
are lower-cased, Unicode hosts become punycode, default ports and a bare trailing slash are
dropped. Schemes that are not links (`javascript:`, `data:`) are refused. An "Open in a new tab"
button appears while the value is valid; an `http://` value says it is not encrypted.

```tsx
import { urlSchema } from "glass-ux/url-field"

const schema = z.object({ portal: urlSchema({ required: true }), webhook: urlSchema({ schemes: ["https"] }) })

<form.AppField name="portal">{(field) => <field.UrlField label="Customer portal" />}</form.AppField>
```

- **Options** (control and schema): `schemes` (default `["https", "http"]`), `defaultScheme`,
  `requireTld` (default true: "https://intranet" is refused unless false).
- **Messages:** "Enter a web address", "Start the address with https://", "Enter a full address
  such as https://northstar.example".
- **Parts:** `UrlInput`, `parseUrl`, `normaliseUrl`, `isInsecure`.
