# LoginFlow

A complete, configurable authentication flow: password sign-in with an email, username or
either; third-party providers; remember me; a two-factor code step; forgot and reset
password; and optional account creation. The host supplies async callbacks and owns every
backend contract, URL and brand; the flow owns validation, pending and outcome feedback in
place, focus, and the animated change between views.

Route it with `view`/`onViewChange` (and `getViewHref` for real links), or leave it
uncontrolled. The entered identifier is kept across views.

`import { LoginFlow } from "glass-ux/login-flow"`

[Live examples](https://dastari.github.io/glass-ux/components/login-flow)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| autoFocus | `boolean \| undefined` | false, true | no | false | Focus the first empty field when the flow mounts: a dedicated sign-in page or a sign-in dialog. Default false. |
| className | `string \| undefined` | See type | no | — | Classes for the outer element's placement. |
| defaultIdentifier | `string \| undefined` | See type | no | "" | Prefills the identifier (a remembered email). The entered identifier is kept across views. |
| defaultView | `LoginView \| undefined` | "sign-in", "two-factor", "forgot-password", "reset-password", "sign-up" | no | "sign-in" | The initial view when uncontrolled. Default "sign-in". |
| footer | `ReactNode` | See type | no | — | Below the flow: legal links or support contact. |
| getViewHref | `((view: LoginView) => string \| undefined) \| undefined` | See type | no | — | A URL for each routed view. View links then render as real links (open in a new tab, copy address); a plain click still calls `onViewChange` without navigating. |
| header | `ReactNode` | See type | no | — | Above the view heading: the host's logo or product name. |
| heading | `boolean \| undefined` | false, true | no | true | Render each view's title. Set false when a Dialog header or page title already names the view. Default true. |
| headingLevel | `1 \| 2 \| 3 \| undefined` | 1, 2, 3 | no | 2 | Heading level of the view title. Use 1 on a dedicated sign-in page. Default 2. |
| id | `string \| undefined` | See type | no | — | Element id of the outer element. |
| identifier | `LoginIdentifierKind \| undefined` | "email", "username", "email-or-username" | no | "email" | What people sign in with. Sets the label, `autocomplete` and validation. Default "email". |
| labels | `Partial<LoginFlowLabels> \| undefined` | See type | no | — | Visible copy. Any subset; the rest keeps the factual defaults. |
| onError | `((error: unknown) => void) \| undefined` | See type | no | — | Receives errors thrown by callbacks (other than `LoginError`) for logging. The view shows `labels.unexpectedError`. |
| onProviderSignIn | `((provider: LoginProvider) => Promise<SignInOutcome \| void>) \| undefined` | See type | no | — | Starts a provider sign-in (normally a redirect). Resolves like `onSignIn`. |
| onRequestPasswordReset | `((request: PasswordResetRequest) => Promise<LoginOutcome \| void>) \| undefined` | See type | no | — | Sends a password reset. Enables "Forgot password?". |
| onResendTwoFactor | `((challenge: TwoFactorChallenge) => Promise<LoginOutcome \| void>) \| undefined` | See type | no | — | Sends another two-factor code. Offers "Send a new code" with the resend cooldown. |
| onResetPassword | `((submission: PasswordResetSubmission) => Promise<LoginOutcome \| void>) \| undefined` | See type | no | — | Verifies a reset code and sets the new password in place. Without it, the reset view only confirms the email. |
| onSignIn | `((credentials: SignInCredentials) => Promise<SignInOutcome \| void>) \| undefined` | See type | no | — | Password sign-in. Resolve with nothing or `{ status: "success" }`, an error outcome, or `{ status: "two-factor" }` to ask for a code. Omit for a providers-only flow. |
| onSignUp | `((values: SignUpValues) => Promise<LoginOutcome \| void>) \| undefined` | See type | no | — | Creates an account. Enables the sign-up view and its link. |
| onVerifyTwoFactor | `((submission: TwoFactorSubmission) => Promise<LoginOutcome \| void>) \| undefined` | See type | no | — | Checks a two-factor code. Required when `onSignIn` or `onProviderSignIn` can return `two-factor`. |
| onViewChange | `((view: LoginView) => void) \| undefined` | See type | no | — | Called with the next view when a link, outcome or back action changes it. |
| passwordPolicy | `LoginPasswordPolicy \| undefined` | See type | no | — | Rules for a new password (sign-up and reset). The server still enforces its own policy. |
| providerLayout | `"auto" \| "grid" \| "list" \| undefined` | "auto", "grid", "list" | no | "auto" | list: one full-width button per row. grid: two columns of short buttons. auto (default): grid from four providers. |
| providerPlacement | `"above" \| "below" \| undefined` | "above", "below" | no | "above" | Where the providers sit relative to the password form. Default "above". |
| providers | `readonly LoginProvider[] \| undefined` | See type | no | — | Third-party sign-in options, in display order. |
| remember | `boolean \| { defaultChecked: boolean; } \| undefined` | See type | no | false | Show "Keep me signed in". `true` starts unticked. Default false. |
| resendCooldown | `number \| undefined` | See type | no | 30 | Seconds before a reset email or code can be sent again. Default 30; 0 disables the cooldown. |
| resetCode | `{ length?: number; characters?: OtpCharacters; } \| undefined` | See type | no | — | Reset code shape for `onResetPassword`. Default 6 digits. |
| signUp | `LoginSignUpOptions \| undefined` | See type | no | — | Sign-up fields. |
| surface | `boolean \| undefined` | false, true | no | true | Draw the flow on its own panel surface (a page canvas). Set false inside a Dialog, Sheet or Panel. Default true. |
| view | `LoginView \| undefined` | "sign-in", "two-factor", "forgot-password", "reset-password", "sign-up" | no | — | The controlled view, when the host routes it. Pair with `onViewChange`. |
