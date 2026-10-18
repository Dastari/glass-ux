# Login flow

`glass-ux/login-flow` · [Live component catalogue](https://dastari.github.io/glass-ux/components/login-flow)

`LoginFlow` is a complete authentication column: password sign-in, third-party providers,
remember me, a two-factor code step, forgot and reset password, and optional account
creation. The host supplies async callbacks and owns every request, redirect, session,
URL and brand. The flow owns validation (R15), pending and outcome feedback in place, focus,
announcements and the animated change between views.

```tsx
import { LoginError, LoginFlow, loginProvider } from "glass-ux/login-flow"

<LoginFlow
  headingLevel={1}
  header={<BrandLogo source={productLogo} label="Orbit Workspace" />}
  providers={[loginProvider("google"), loginProvider("microsoft")]}
  onProviderSignIn={(provider) => redirectTo(`/auth/${provider.id}`)}
  onSignIn={async ({ identifier, password, remember }) => {
    const result = await api.signIn({ identifier, password, remember })
    if (result.mfa) return { status: "two-factor", challenge: { id: result.challengeId } }
    if (result.locked) return { status: "error", message: "This account is locked. Reset the password." }
    if (!result.ok) throw new LoginError("Incorrect email or password.")
  }}
  onVerifyTwoFactor={({ code, challenge }) => api.verify(challenge.id, code)}
  onRequestPasswordReset={({ identifier }) => api.requestReset(identifier)}
  remember
/>
```

## Outcomes

Every callback returns a promise. Resolving with nothing, or `{ status: "success", message? }`,
is success. `{ status: "error", message, field? }` is a refusal: a string message with a
`field` replaces that field's message line and focuses it; otherwise the message replaces the
view's status line. Sign-in and provider callbacks may also resolve to
`{ status: "two-factor", challenge? }`, which opens the code step.

Throw `LoginError` to show its message. Any other thrown error shows
`labels.unexpectedError` and is passed to `onError`, so raw transport errors never reach people.

## Views

| View              | Enabled by               | Contents                                                                  |
| ----------------- | ------------------------ | ------------------------------------------------------------------------- |
| `sign-in`         | always                   | Providers and/or the password form, remember me, reset and sign-up links |
| `two-factor`      | `onVerifyTwoFactor`      | `OtpField` (submits when complete), optional resend with cooldown         |
| `forgot-password` | `onRequestPasswordReset` | The identifier, then the reset confirmation                               |
| `reset-password`  | `onRequestPasswordReset` | Neutral confirmation and resend; code and new password with `onResetPassword` |
| `sign-up`         | `onSignUp`               | Name, email and/or username, new password and confirmation, terms         |

Without `onSignIn` the flow is providers-only. A view whose callback is missing falls back to
sign-in. Route views with `view` and `onViewChange`; `getViewHref` renders view links as real
links whose plain clicks still go through `onViewChange`. The entered identifier is kept
across views; passwords and codes are never carried over.

## Options

- **`identifier`:** `"email"` (default), `"username"` or `"email-or-username"`. Sign-in uses
  `autocomplete="username"` and `current-password`; sign-up uses `new-password`, and the
  code steps `one-time-code`. Username fields turn off capitalisation and correction.
- **`providers`:** `loginProvider("google" | "github" | "microsoft" | "apple" | "slack" | "discord" | "facebook", overrides?)`,
  or any `{ id, label, icon?, action?, disabledReason? }`. `providerPlacement` puts them
  above (default) or below the form; `providerLayout="auto"` uses two columns from four.
- **`signUp`:** `name`, `identifier` (`"email"`, `"username"` or `"email-and-username"`),
  `confirmPassword`, `terms` (a required statement with host links) and `providers`.
- **`passwordPolicy`:** `passwordSchema` options or `(password) => message | undefined` for
  sign-up and reset. The server enforces the real policy.
- **`resendCooldown`:** seconds before a reset email or code can be sent again (default 30).
- **`labels`:** every visible string, with factual English defaults in `DEFAULT_LOGIN_LABELS`.

## Layout and motion

On a page canvas the flow draws its own panel `Surface` (`padding="dialog"`, the panel inset
in containers narrower than 22rem) and caps itself at 26rem. Inside a `Dialog`, `Sheet` or
`Panel`, pass `surface={false}`; pass `heading={false}` when the dialog header names the view,
and drive that header from the controlled view. `autoFocus` focuses the first empty field on
mount; give the Dialog `initialFocus={false}` so the flow chooses it.

Each view reserves a two-line status line under its primary action, so refusals,
confirmations and resend notices replace empty space and never move a button. Buttons show
pending and outcome faces in place; while one operation runs, the providers, submit and view
links wait. A view change animates the stage height and fades the new view in with motion
tokens; reduced motion makes both instant. Focus moves to the new view's first empty field,
otherwise its heading.
