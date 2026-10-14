# Email

`glass-ux/email-field` · [Live component catalogue](https://dastari.github.io/glass-ux/)

An email address checked the way mail systems read it (not the full RFC 5322 grammar), with a
hint when the domain looks mistyped: "Did you mean avery@**gmail.com**?" in the message line, which
replaces the value when chosen. The hint appears only after focus leaves.

```tsx
import { emailSchema } from "glass-ux/email-field"

const schema = z.object({ work: emailSchema({ required: true }), personal: emailSchema() })

<form.AppField name="work">
  {(field) => <field.EmailField label="Work email" knownDomains={["northstar.example"]} />}
</form.AppField>
```

- **Value:** a string, trimmed on blur, `mailto:` dropped, the domain lower-cased (the local part
  keeps its case).
- **Typo hint:** `suggest` (default true); `knownDomains` adds the organisation's own domain to the
  common providers (Gmail, Outlook, Hotmail, iCloud, BigPond, Optus, TPG, iiNet…). One edit for
  short domains, two for longer, plus common top-level slips (.con, .com.ua).
- **Messages:** "Enter an email address", "Enter an email such as name@example.com.au".
- **Parts:** `EmailInput`, `EmailSuggestion` (the hint, for your own layout), `parseEmail`,
  `normaliseEmail`, `suggestEmail(value, known)`.
- `type="email"`, `inputmode="email"`, `autocomplete="email"`.
