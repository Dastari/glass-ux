# Host name and domain

`glass-ux/hostname-field` · [Live component catalogue](https://dastari.github.io/glass-ux/)

Names checked label by label (RFC 1123: letters, digits and hyphens, never starting or ending with
a hyphen, 63 per label, 253 in all). A pasted URL gives its host.

- **HostnameField:** one label ("NST-C106") or a dotted name ("printer.northstar.local"). Keeps case by
  default. `fqdn` requires a dot; `netbios` warns past 15 characters.
- **DomainField:** at least two labels and an alphabetic top-level domain; lower-cased; Unicode
  becomes punycode; `wildcard` allows a leading `*.`.

```tsx
import { domainSchema, hostnameSchema } from "glass-ux/hostname-field"

const schema = z.object({ computer: hostnameSchema({ required: true }), domain: domainSchema({ required: true }) })

<form.AppField name="computer">{(field) => <field.HostnameField label="Computer name" netbios />}</form.AppField>
<form.AppField name="domain">{(field) => <field.DomainField label="Email domain" />}</form.AppField>
```

Parts: `HostnameInput`, `DomainInput`, `parseHostname`, `parseDomain`, `hostOf`, `toAscii`.
