# One-time code

`glass-ux/otp-field` · [Live component catalogue](https://dastari.github.io/glass-ux/)

N boxes for a TOTP or verification code, built on Base UI's OTP Field: `autocomplete="one-time-code"`
(phones offer the code from a message), `inputmode="numeric"`, Backspace steps back, the arrows
move, and paste fills every box — the code is found inside whatever was copied ("Your code is
482913", "482 913", "G-482913"). Error and success show on the boxes; the ✓ has a reserved slot, so
nothing moves.

```tsx
import { otpSchema } from "glass-ux/otp-field"

const schema = z.object({ code: otpSchema() })   // "Enter the 6-digit code"

<form.AppField name="code">
  {(field) => <field.OtpField label="Verification code" autoSubmit status={refused ? "error" : undefined} />}
</form.AppField>
```

- **Props:** `length` (default 6), `characters` ("numeric" or "alphanumeric", upper-cased),
  `groups` (default 3+3 for six, 4+4 for eight), `autoSubmit` (submit the form when complete),
  `onComplete`, `status` ("error" | "success"), `mask` (a PIN), `size` ("lg" default, "md").
- **Clear the error** as soon as the code changes (a field listener), and do not clear the boxes
  when a code is refused.
- **Parts:** `OtpInput`, `normaliseOtp(text, length, characters)`, `isCompleteOtp`.
