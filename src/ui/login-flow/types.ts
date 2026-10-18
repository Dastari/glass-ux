import type { ReactNode } from "react"
import type { OtpCharacters } from "../otp-field/index.js"
import type { PasswordSchemaOptions } from "../password-field/index.js"

/**
 * The step a LoginFlow shows. Hosts can route each one (`/login`, `/signup`, `/forgot`).
 *
 * - `sign-in`: identifier and password, remember me, third-party providers.
 * - `two-factor`: a one-time code, after a sign-in callback asks for one.
 * - `forgot-password`: request a password reset for an identifier.
 * - `reset-password`: the reset was requested: resend, and the code and new password when the host verifies codes.
 * - `sign-up`: account creation. Available when `onSignUp` is supplied.
 */
export type LoginView = "sign-in" | "two-factor" | "forgot-password" | "reset-password" | "sign-up"

/** What people sign in with: an email address, a username, or either in one field. */
export type LoginIdentifierKind = "email" | "username" | "email-or-username"

/** A field a host outcome can attach its message to. */
export type LoginFieldName = "identifier" | "password" | "code" | "name" | "email" | "username" | "newPassword" | "confirmPassword" | "terms"

/** The operation finished. Its optional message is shown in the view's reserved status line. */
export interface LoginSuccess {
  /** Discriminant for a completed operation. */
  status: "success"
  /** Factual confirmation, such as "Signed in as avery@orbit.example". Omit when the host navigates away. */
  message?: ReactNode
}

/** The operation was refused. Nothing moves: the message replaces the reserved status line or a field's message line. */
export interface LoginFailure {
  /** Discriminant for a refused operation. */
  status: "error"
  /** What happened and what to do next ("Incorrect email or password."). */
  message: ReactNode
  /** Show a string message on this field instead of the status line, and focus the field. */
  field?: LoginFieldName
}

/** A one-time code is required before sign-in completes. */
export interface LoginTwoFactorRequired {
  /** Discriminant for a sign-in that needs a second factor. */
  status: "two-factor"
  /** How the code was delivered and how it is shaped. Defaults to a 6-digit authenticator code. */
  challenge?: TwoFactorChallenge
}

/** The result of a host callback that cannot branch to a second factor. Resolving with nothing means success. */
export type LoginOutcome = LoginSuccess | LoginFailure

/** The result of a sign-in callback (password or provider). Resolving with nothing means success. */
export type SignInOutcome = LoginOutcome | LoginTwoFactorRequired

/** The second-factor request a sign-in callback returns. Serialisable, so a routed two-factor view can be restored. */
export interface TwoFactorChallenge {
  /** The host's challenge or session identifier, passed back to `onVerifyTwoFactor` and `onResendTwoFactor`. */
  id?: string
  /** Where the code came from: "Enter the code sent to •••• 0142." Defaults to the authenticator-app description. */
  description?: ReactNode
  /** Number of code characters. Default 6. */
  length?: number
  /** Digits (default) or letters and digits. */
  characters?: OtpCharacters
  /** Offer "Send a new code" (requires `onResendTwoFactor`). Default true when the callback exists. */
  resendable?: boolean
}

/** One third-party sign-in option. Use `loginProvider("google")` for a preset or supply your own. */
export interface LoginProvider {
  /** Stable identifier passed back to `onProviderSignIn` ("google", "okta-staff"). */
  id: string
  /** The service's name ("Google"). Buttons read "Continue with Google" unless `action` is set. */
  label: string
  /** The service's mark, without a size. */
  icon?: ReactNode
  /** Replaces the whole button text ("Use company single sign-on"). */
  action?: string
  /** Why this provider cannot be used right now. The button stays focusable and explains itself. */
  disabledReason?: string
}

/** The values the password sign-in form submits. */
export interface SignInCredentials {
  /** The trimmed email address or username, as configured by `identifier`. */
  identifier: string
  /** The password exactly as typed. Never logged or stored by the component. */
  password: string
  /** Whether "Keep me signed in" was ticked. False when the option is not shown. */
  remember: boolean
}

/** The values the two-factor form submits. */
export interface TwoFactorSubmission {
  /** The complete one-time code. */
  code: string
  /** The identifier used to sign in. Empty after a provider sign-in. */
  identifier: string
  /** Whether "Keep me signed in" was ticked. */
  remember: boolean
  /** The challenge the sign-in callback returned. */
  challenge: TwoFactorChallenge
  /** The provider whose sign-in asked for the code, if any. */
  provider?: LoginProvider
}

/** The request for a password reset. */
export interface PasswordResetRequest {
  /** The trimmed email address or username. */
  identifier: string
}

/** A reset code and the new password, when the host verifies reset codes in place. */
export interface PasswordResetSubmission {
  /** The identifier the reset was requested for. */
  identifier: string
  /** The complete reset code. */
  code: string
  /** The new password. */
  password: string
}

/** The values the sign-up form submits. Fields that are not shown are undefined. */
export interface SignUpValues {
  /** The person's name, when `signUp.name` is on. */
  name?: string
  /** The email address, when sign-up asks for one. */
  email?: string
  /** The username, when sign-up asks for one. */
  username?: string
  /** The new password. */
  password: string
  /** True when the terms statement was accepted; undefined without `signUp.terms`. */
  termsAccepted?: boolean
}

/**
 * The new-password rules for sign-up and reset: `passwordSchema` options (default 12 characters,
 * at least Fair), or a function returning the message for an unacceptable password.
 */
export type LoginPasswordPolicy = PasswordSchemaOptions | ((password: string) => string | undefined)

/** Account creation fields. */
export interface LoginSignUpOptions {
  /** Ask for a name. Default true. */
  name?: boolean
  /**
   * Which identifiers to ask for. Default: `email`, or `username` when the flow signs in with
   * a username. `email-and-username` asks for both.
   */
  identifier?: "email" | "username" | "email-and-username"
  /** Ask for the password twice. Default true. */
  confirmPassword?: boolean
  /** A statement that must be accepted, with host-supplied links ("I accept the <a>terms</a>"). */
  terms?: ReactNode
  /** Show the providers on the sign-up view too. Default true. */
  providers?: boolean
}

/** Every visible string. Override any subset through `labels`; defaults are factual English. */
export interface LoginFlowLabels {
  /** Sign-in heading. */
  signInTitle: ReactNode
  /** Optional line under the sign-in heading. */
  signInDescription?: ReactNode
  /** Identifier label for `identifier="email"`. */
  emailLabel: string
  /** Identifier label for `identifier="username"`. */
  usernameLabel: string
  /** Identifier label for `identifier="email-or-username"`. */
  emailOrUsernameLabel: string
  /** Password label. */
  passwordLabel: string
  /** Remember-me checkbox label. */
  rememberLabel: ReactNode
  /** Link beside the password label that opens the reset request. */
  forgotPasswordLink: string
  /** Sign-in button. */
  signInAction: string
  /** Sign-in button while the callback runs. */
  signInPending: string
  /** Sign-in button after success. */
  signInSuccess: string
  /** Word between the providers and the password form. */
  providerSeparator: string
  /** A provider button's text. */
  providerAction: (provider: LoginProvider) => string
  /** Text before the sign-up link on the sign-in view. */
  signUpPrompt: ReactNode
  /** Link that opens the sign-up view. */
  signUpLink: string
  /** Two-factor heading. */
  twoFactorTitle: ReactNode
  /** Two-factor description when the challenge supplies none. */
  twoFactorDescription: ReactNode
  /** One-time code label. */
  codeLabel: string
  /** Verify button. */
  verifyAction: string
  /** Verify button while the callback runs. */
  verifyPending: string
  /** Verify button after success. */
  verifySuccess: string
  /** Button that requests another two-factor code. */
  resendCode: string
  /** Confirmation after a new code was sent. */
  codeResent: ReactNode
  /** Resend button text during the cooldown. */
  resendIn: (seconds: number) => string
  /** Resend button after a successful resend. */
  resendSent: string
  /** Link back to the sign-in view. */
  backToSignIn: string
  /** Reset request heading. */
  forgotTitle: ReactNode
  /** Reset request description, by identifier kind. */
  forgotDescription: (kind: LoginIdentifierKind) => ReactNode
  /** Reset request button. */
  sendResetAction: string
  /** Reset request button while the callback runs. */
  sendResetPending: string
  /** Reset request button after success. */
  sendResetSuccess: string
  /** Heading after a reset was requested. */
  resetSentTitle: ReactNode
  /** What was sent, without confirming that the account exists. */
  resetSentDescription: (identifier: string) => ReactNode
  /** What was sent when the host verifies reset codes in place. */
  resetCodeDescription: (identifier: string) => ReactNode
  /** Button that sends the reset email again. */
  resendReset: string
  /** Confirmation after the reset email was sent again. */
  resetResent: ReactNode
  /** Reset code label. */
  resetCodeLabel: string
  /** New password label (reset). */
  newPasswordLabel: string
  /** Password confirmation label. */
  confirmPasswordLabel: string
  /** Button that sets the new password. */
  setPasswordAction: string
  /** Set-password button while the callback runs. */
  setPasswordPending: string
  /** Set-password button after success. */
  setPasswordSuccess: string
  /** Status shown on the sign-in view after a password reset. */
  passwordChanged: ReactNode
  /** Sign-up heading. */
  signUpTitle: ReactNode
  /** Name label. */
  nameLabel: string
  /** Email label on the sign-up view. */
  signUpEmailLabel: string
  /** Username label on the sign-up view. */
  signUpUsernameLabel: string
  /** Password label on the sign-up view. */
  signUpPasswordLabel: string
  /** Sign-up button. */
  signUpAction: string
  /** Sign-up button while the callback runs. */
  signUpPending: string
  /** Sign-up button after success. */
  signUpSuccess: string
  /** Text before the sign-in link on the sign-up view. */
  signInPrompt: ReactNode
  /** Link that opens the sign-in view from sign-up. */
  signInLink: string
  /** Required-field message for the identifier, by kind. */
  identifierRequired: (kind: LoginIdentifierKind) => string
  /** Required-field message for the sign-in password. */
  passwordRequired: string
  /** Required-field message for the name. */
  nameRequired: string
  /** Required-field message for a new username. */
  usernameRequired: string
  /** Shown when the confirmation differs from the new password. */
  passwordMismatch: string
  /** Shown when the terms statement is not accepted. */
  termsRequired: string
  /** Shown when a callback throws an unexpected error. */
  unexpectedError: ReactNode
}

/** Props for {@link LoginFlow}. */
export interface LoginFlowProps {
  /** What people sign in with. Sets the label, `autocomplete` and validation. Default "email". */
  identifier?: LoginIdentifierKind
  /** Prefills the identifier (a remembered email). The entered identifier is kept across views. */
  defaultIdentifier?: string
  /** The controlled view, when the host routes it. Pair with `onViewChange`. */
  view?: LoginView
  /** The initial view when uncontrolled. Default "sign-in". */
  defaultView?: LoginView
  /** Called with the next view when a link, outcome or back action changes it. */
  onViewChange?: (view: LoginView) => void
  /**
   * A URL for each routed view. View links then render as real links (open in a new tab,
   * copy address); a plain click still calls `onViewChange` without navigating.
   */
  getViewHref?: (view: LoginView) => string | undefined
  /**
   * Password sign-in. Resolve with nothing or `{ status: "success" }`, an error outcome, or
   * `{ status: "two-factor" }` to ask for a code. Omit for a providers-only flow.
   */
  onSignIn?: (credentials: SignInCredentials) => Promise<SignInOutcome | void>
  /** Third-party sign-in options, in display order. */
  providers?: readonly LoginProvider[]
  /** Starts a provider sign-in (normally a redirect). Resolves like `onSignIn`. */
  onProviderSignIn?: (provider: LoginProvider) => Promise<SignInOutcome | void>
  /** Where the providers sit relative to the password form. Default "above". */
  providerPlacement?: "above" | "below"
  /** list: one full-width button per row. grid: two columns of short buttons. auto (default): grid from four providers. */
  providerLayout?: "auto" | "list" | "grid"
  /** Show "Keep me signed in". `true` starts unticked. Default false. */
  remember?: boolean | { defaultChecked: boolean }
  /** Checks a two-factor code. Required when `onSignIn` or `onProviderSignIn` can return `two-factor`. */
  onVerifyTwoFactor?: (submission: TwoFactorSubmission) => Promise<LoginOutcome | void>
  /** Sends another two-factor code. Offers "Send a new code" with the resend cooldown. */
  onResendTwoFactor?: (challenge: TwoFactorChallenge) => Promise<LoginOutcome | void>
  /** Sends a password reset. Enables "Forgot password?". */
  onRequestPasswordReset?: (request: PasswordResetRequest) => Promise<LoginOutcome | void>
  /** Verifies a reset code and sets the new password in place. Without it, the reset view only confirms the email. */
  onResetPassword?: (submission: PasswordResetSubmission) => Promise<LoginOutcome | void>
  /** Reset code shape for `onResetPassword`. Default 6 digits. */
  resetCode?: { length?: number; characters?: OtpCharacters }
  /** Seconds before a reset email or code can be sent again. Default 30; 0 disables the cooldown. */
  resendCooldown?: number
  /** Creates an account. Enables the sign-up view and its link. */
  onSignUp?: (values: SignUpValues) => Promise<LoginOutcome | void>
  /** Sign-up fields. */
  signUp?: LoginSignUpOptions
  /** Rules for a new password (sign-up and reset). The server still enforces its own policy. */
  passwordPolicy?: LoginPasswordPolicy
  /** Visible copy. Any subset; the rest keeps the factual defaults. */
  labels?: Partial<LoginFlowLabels>
  /** Above the view heading: the host's logo or product name. */
  header?: ReactNode
  /** Below the flow: legal links or support contact. */
  footer?: ReactNode
  /** Render each view's title. Set false when a Dialog header or page title already names the view. Default true. */
  heading?: boolean
  /** Heading level of the view title. Use 1 on a dedicated sign-in page. Default 2. */
  headingLevel?: 1 | 2 | 3
  /** Draw the flow on its own panel surface (a page canvas). Set false inside a Dialog, Sheet or Panel. Default true. */
  surface?: boolean
  /** Focus the first empty field when the flow mounts: a dedicated sign-in page or a sign-in dialog. Default false. */
  autoFocus?: boolean
  /** Receives errors thrown by callbacks (other than `LoginError`) for logging. The view shows `labels.unexpectedError`. */
  onError?: (error: unknown) => void
  /** Classes for the outer element's placement. */
  className?: string
  /** Element id of the outer element. */
  id?: string
}
