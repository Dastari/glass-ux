/**
 * A fictional identity service for the LoginFlow demos. Every account, address and code is
 * sample data; the callbacks only wait and compare strings.
 */
import { BrandLogo } from "../../ui/brand/index.js"
import type { LoginOutcome, LoginProvider, PasswordResetSubmission, SignInCredentials, SignInOutcome, SignUpValues, TwoFactorSubmission } from "../../ui/login-flow/index.js"
import { DEMO_LOGO } from "../fixtures/brand.js"

/** The password every demo account accepts. */
export const DEMO_PASSWORD = "orbit-sample-pass"
/** The two-factor and reset code the demos accept. */
export const DEMO_CODE = "246810"

export const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * avery@orbit.example signs in; mfa@orbit.example asks for a code; locked@orbit.example is
 * locked; anything else with the wrong password is refused.
 */
export async function demoSignIn({ identifier, password }: SignInCredentials, latency = 900): Promise<SignInOutcome> {
  await wait(latency)
  const account = identifier.toLowerCase()
  if (account.startsWith("locked"))
    return { status: "error", message: "This account is locked. Reset the password or try again in 15 minutes." }
  if (password !== DEMO_PASSWORD) return { status: "error", message: "Incorrect email or password." }
  if (account.startsWith("mfa")) return { status: "two-factor", challenge: { id: "demo-challenge", description: "Enter the 6-digit code from the authenticator app for Orbit Workspace." } }
  return { status: "success", message: `Signed in as ${identifier}.` }
}

export async function demoVerify({ code }: TwoFactorSubmission): Promise<LoginOutcome> {
  await wait(700)
  return code === DEMO_CODE ? { status: "success", message: "Code accepted. Signed in." } : { status: "error", field: "code", message: "That code is incorrect or has expired" }
}

/** GitHub is unavailable; Microsoft is refused by the organisation; the rest succeed. */
export async function demoProvider(provider: LoginProvider): Promise<SignInOutcome> {
  await wait(1100)
  if (provider.id === "microsoft") return { status: "error", message: "Microsoft sign-in is not enabled for this workspace. Use your email and password." }
  return { status: "success", message: `Signed in with ${provider.label}.` }
}

export async function demoResetRequest(): Promise<LoginOutcome> {
  await wait(800)
  return { status: "success" }
}

export async function demoResetPassword({ code }: PasswordResetSubmission): Promise<LoginOutcome> {
  await wait(800)
  return code === DEMO_CODE ? { status: "success" } : { status: "error", field: "code", message: "That reset code is incorrect or has expired" }
}

export async function demoSignUp({ email, username }: SignUpValues): Promise<LoginOutcome> {
  await wait(900)
  if (email?.toLowerCase().startsWith("avery@") || username?.toLowerCase() === "avery")
    return { status: "error", field: email ? "email" : "username", message: email ? "This email already has an account" : "This username is taken" }
  return { status: "success", message: `Account created for ${email ?? username}. A confirmation email was sent.` }
}

/** The fictional product's mark and name, as a host would put in the header slot. */
export function DemoBrand() {
  return (
    <>
      <BrandLogo source={DEMO_LOGO} className="size-7" />
      <span className="font-semibold" style={{ fontSize: "var(--type-subtitle-size)" }}>Orbit Workspace</span>
    </>
  )
}

/** Legal links for the footer slot. */
export function DemoLegal() {
  return (
    <p className="flex flex-wrap gap-x-4 gap-y-1">
      <a className="fa-login-link" href="#terms">
        Terms
      </a>
      <a className="fa-login-link" href="#privacy">
        Privacy
      </a>
      <a className="fa-login-link" href="#help">
        Help
      </a>
    </p>
  )
}
