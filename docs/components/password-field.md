# Password

`glass-ux/password-field` · [Live component catalogue](https://dastari.github.io/glass-ux/)


A password box: the eye toggles reveal (an icon button with a tooltip and `aria-pressed`), a Caps
Lock note appears inside the box while Caps Lock is on, and new passwords get a strength bar along
the box's lower edge with the words in the message line ("Fair · Add another word or a few more
characters"). Optional Generate (crypto.getRandomValues, uniform) reveals what it made and offers
Copy.

```tsx
import { currentPasswordSchema, passwordSchema } from "glass-ux/password-field"

const schema = z.object({
  current: currentPasswordSchema(),
  next: passwordSchema({ minLength: 12, minScore: 2, userInputs: [name, email] }),
})

<form.AppField name="current">{(field) => <field.PasswordField label="Current password" purpose="current" />}</form.AppField>
<form.AppField name="next">{(field) => <field.PasswordField label="New password" generate userInputs={[name, email]} />}</form.AppField>
```

- **`purpose`:** `"current"` → `autocomplete="current-password"`, no strength bar; `"new"`
  (default) → `autocomplete="new-password"`, strength bar, and Safari's `passwordrules` when
  Generate is on.
- **`generate`:** `true` or `{ length, lower, upper, digits, symbols, unambiguous }` (default 20
  characters, every class, no look-alike characters).
- **Never logged:** the value goes nowhere but the form. The components never log, store or send it.

## Strength: why not zxcvbn

zxcvbn-ts's value is its dictionaries: about 1.5 MB raw / 400 KB gzipped for the common and English
packs. Glass UX's passwords are mostly generated, the server enforces the real policy (and should check
breached-password lists), and the meter only has to steer people off obviously weak choices.
`estimateStrength` (about 3 KB) rewards length and variety and penalises the commonest passwords
(with l33t spellings undone), keyboard runs, sequences, repeats, years and the person's own
details. Scores 0–4: Too weak, Weak, Fair, Good, Strong.
