# Phone and mobile

`glass-ux/phone-field` · [Live component catalogue](https://dastari.github.io/glass-ux/)

A phone number with its country. The country picker (flag, ISO code, calling code; search by name,
code or "+61") sets how national numbers are read; typing or pasting an international number
("+64 21 123 4567", "0011 64…", "00 44…") switches it. Numbers are stored as E.164 and shown
national ("0412 345 678") or international ("+61 412 345 678") once focus leaves.

## Usage

```tsx
import { mobileSchema, phoneSchema } from "glass-ux/phone-field"

const schema = z.object({
  mobile: mobileSchema({ required: true }),   // refuses landlines
  office: phoneSchema(),                      // optional
})

<form.AppField name="mobile">{(field) => <field.MobileField label="Mobile" />}</form.AppField>
<form.AppField name="office">{(field) => <field.PhoneField label="Office" extension />}</form.AppField>
```

Props: `defaultCountry` (default "AU": the workspace's country), `display` ("national" or
"international"), `extension` (desk phones), `countries` (restrict the picker), `priority`
(listed first), `flags` (default true), `copyable` (default true), `width` (default medium).

## Value

E.164: `"+61412345678"`. An extension rides along as an RFC 3966 parameter:
`"+61362345678;ext=204"`. While the text cannot be read, the value is the text as typed, so the
schema can say what is wrong. Helpers: `splitPhoneValue`, `joinPhoneValue`, `formatPhone(lib,
value, display, homeCountry)`, `parsePhone`, `checkPhone`.

## libphonenumber-js

The "max" metadata (157 KB raw, 39 KB gzipped; about 55 KB gzipped with the code) loads as its own
chunk the first time a phone control mounts (`loadPhoneLibrary()`, `usePhoneLibrary()`). "min"
cannot tell a mobile from a landline, which MobileField needs. Before it loads, the schema checks
the E.164 shape only; the field loads it on mount, so by the time someone leaves the field the full
check runs. Validate outside a form with a phone field (an import) after `await loadPhoneLibrary()`.

## Flags

SVG from country-flag-icons (MIT; 178 KB raw, 47 KB gzipped for all 267), loaded once, lazily, in
a box that is the same size before and after. Windows does not draw flag emoji, so the library
never uses them. `flags={false}` turns them off.

## For People contact methods

Glass UX's `ContactMethod` (`kind: "email" | "phone" | "mobile"`, `value: string`) maps one to one:

| kind     | Field                                                        | Schema           | value                            |
| -------- | ------------------------------------------------------------ | ---------------- | -------------------------------- |
| `mobile` | `field.MobileField`                                          | `mobileSchema()` | `"+61412345678"`                 |
| `phone`  | `field.PhoneField extension`                                 | `phoneSchema()`  | `"+61362345678;ext=204"`         |
| `email`  | `field.EmailField knownDomains={[organisation.emailDomain]}` | `emailSchema()`  | `"mira.rowan@northstar.example"` |

In a list of contact methods (a form array), bind each row's `value` with the field for its kind;
the label ("Work", "Reception") is a TextField in its own row. The schema picks the rule by kind:

```ts
const contactMethod = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("email"),
    label: z.string(),
    value: emailSchema({ required: true }),
    primary: z.boolean(),
  }),
  z.object({
    kind: z.literal("phone"),
    label: z.string(),
    value: phoneSchema({ required: true }),
    primary: z.boolean(),
  }),
  z.object({
    kind: z.literal("mobile"),
    label: z.string(),
    value: mobileSchema({ required: true }),
    primary: z.boolean(),
  }),
]);
const schema = z.object({ contacts: z.array(contactMethod) });
```

Read-only display:
`formatPhone(lib, value, "national", "AU")` once `usePhoneLibrary()` returns the library (show the
E.164 text until then), with `<CopyButton value={value} label="Copy number" />`.

## Accessibility

The number input carries the field's label. The country picker is its own Base UI Combobox (input
inside the popup), named "Country: Australia (+61)"; it never takes the field's label. The
extension is labelled "Extension".
