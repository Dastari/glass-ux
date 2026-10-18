import { useState } from "react"
import { Rules, SectionPage, Specimen, TokenTable } from "../kit.js"
import { IconLogIn } from "../../icons/generated/icons.js"
import { Button } from "../../ui/button/index.js"
import { Dialog } from "../../ui/dialog/index.js"
import { DEFAULT_LOGIN_LABELS, LoginFlow, loginProvider, type LoginView } from "../../ui/login-flow/index.js"
import { Usage } from "./inputs.kit.js"
import {
  DEMO_CODE,
  DEMO_PASSWORD,
  DemoBrand,
  DemoLegal,
  demoProvider,
  demoResetPassword,
  demoResetRequest,
  demoSignIn,
  demoSignUp,
  demoVerify,
} from "./login-flow.fixtures.js"

const PROVIDERS = [loginProvider("google"), loginProvider("github"), loginProvider("microsoft")]

function DefaultFlow() {
  return (
    <div className="flex w-full justify-center" data-testid="login-default">
      <LoginFlow
        headingLevel={3}
        header={<DemoBrand />}
        footer={<DemoLegal />}
        providers={PROVIDERS}
        onProviderSignIn={demoProvider}
        onSignIn={(credentials) => demoSignIn(credentials)}
        remember
        onRequestPasswordReset={demoResetRequest}
      />
    </div>
  )
}

function UsernameFlow() {
  return (
    <div className="flex w-full justify-center" data-testid="login-username">
      <LoginFlow headingLevel={3} identifier="username" onSignIn={(credentials) => demoSignIn(credentials)} remember={{ defaultChecked: true }} />
    </div>
  )
}

function ProvidersOnlyFlow() {
  return (
    <div className="flex w-full justify-center" data-testid="login-providers">
      <LoginFlow
        headingLevel={3}
        header={<DemoBrand />}
        providers={[
          loginProvider("google"),
          loginProvider("microsoft"),
          loginProvider("apple"),
          loginProvider("slack"),
          loginProvider("discord"),
          loginProvider("facebook"),
        ]}
        onProviderSignIn={demoProvider}
      />
    </div>
  )
}

function SignUpFlow() {
  return (
    <div className="flex w-full justify-center" data-testid="login-sign-up">
      <LoginFlow
        headingLevel={3}
        defaultView="sign-up"
        providers={[loginProvider("google"), loginProvider("apple")]}
        providerPlacement="below"
        onProviderSignIn={demoProvider}
        onSignIn={(credentials) => demoSignIn(credentials)}
        onSignUp={demoSignUp}
        signUp={{
          terms: (
            <>
              I accept the{" "}
              <a className="fa-login-link" href="#terms">
                terms of service
              </a>
            </>
          ),
        }}
      />
    </div>
  )
}

function ResetFlow() {
  return (
    <div className="flex w-full justify-center" data-testid="login-reset">
      <LoginFlow
        headingLevel={3}
        defaultView="forgot-password"
        defaultIdentifier="avery@orbit.example"
        onSignIn={(credentials) => demoSignIn(credentials)}
        onRequestPasswordReset={demoResetRequest}
        onResetPassword={demoResetPassword}
        resendCooldown={20}
      />
    </div>
  )
}

function TwoFactorFlow() {
  return (
    <div className="flex w-full justify-center" data-testid="login-two-factor">
      <LoginFlow
        headingLevel={3}
        defaultIdentifier="mfa@orbit.example"
        onSignIn={(credentials) => demoSignIn(credentials)}
        onVerifyTwoFactor={demoVerify}
        onResendTwoFactor={demoResetRequest}
        remember
      />
    </div>
  )
}

function RefusedFlow() {
  return (
    <div className="flex w-full justify-center" data-testid="login-errors">
      <LoginFlow
        headingLevel={3}
        defaultIdentifier="locked@orbit.example"
        providers={[loginProvider("github", { disabledReason: "GitHub sign-in is unavailable during maintenance" }), loginProvider("microsoft")]}
        onProviderSignIn={demoProvider}
        onSignIn={(credentials) => demoSignIn(credentials)}
        onRequestPasswordReset={demoResetRequest}
      />
    </div>
  )
}

function PendingFlow() {
  return (
    <div className="flex w-full justify-center" data-testid="login-pending">
      <LoginFlow headingLevel={3} defaultIdentifier="avery@orbit.example" providers={[loginProvider("google")]} onProviderSignIn={demoProvider} onSignIn={(credentials) => demoSignIn(credentials, 4000)} />
    </div>
  )
}

function DialogFlow() {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<LoginView>("sign-in")
  const title = { "sign-in": DEFAULT_LOGIN_LABELS.signInTitle, "sign-up": DEFAULT_LOGIN_LABELS.signUpTitle, "forgot-password": DEFAULT_LOGIN_LABELS.forgotTitle, "reset-password": DEFAULT_LOGIN_LABELS.resetSentTitle, "two-factor": DEFAULT_LOGIN_LABELS.twoFactorTitle }[view]
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setView("sign-in")
      }}
    >
      <Button icon={<IconLogIn />} onClick={() => setOpen(true)} data-testid="login-dialog-open">
        Sign in
      </Button>
      <Dialog.Popup size="sm" initialFocus={false}>
        <Dialog.Header title={title} />
        <Dialog.Body>
          <LoginFlow
            surface={false}
            autoFocus
            heading={false}
            view={view}
            onViewChange={setView}
            providers={[loginProvider("google")]}
            onProviderSignIn={demoProvider}
            onSignIn={(credentials) => demoSignIn(credentials)}
            onRequestPasswordReset={demoResetRequest}
            onSignUp={demoSignUp}
            signUp={{ name: false, confirmPassword: false }}
          />
        </Dialog.Body>
      </Dialog.Popup>
    </Dialog.Root>
  )
}

export default function LoginFlowSection() {
  return (
    <SectionPage>
      <Specimen
        title="Email, password and providers"
        description={`Providers above the password form, remember me and the reset link. avery@orbit.example signs in with the password ${DEMO_PASSWORD}; Microsoft returns a refusal.`}
      >
        <DefaultFlow />
      </Specimen>

      <Specimen title="Username" description="A username field without capitalisation or correction, autocomplete=username, and remember me ticked by default.">
        <UsernameFlow />
      </Specimen>

      <Specimen title="Providers only" description="Without onSignIn there is no password form. From four providers the buttons use two columns with short names; their accessible names keep “Continue with …”.">
        <ProvidersOnlyFlow />
      </Specimen>

      <Specimen title="Account creation" description="onSignUp enables the view and its link. Name, email, a new password with strength, confirmation and a required terms statement with a host link. avery@orbit.example is already taken.">
        <SignUpFlow />
      </Specimen>

      <Specimen
        title="Forgot password"
        description={`Request a reset, then enter the code and a new password because onResetPassword is supplied. The demo code is ${DEMO_CODE}. Resend waits out a 20-second cooldown; a successful reset returns to sign-in with a confirmation.`}
      >
        <ResetFlow />
      </Specimen>

      <Specimen title="Two-factor code" description={`mfa@orbit.example with ${DEMO_PASSWORD} resolves to { status: "two-factor" }. The code step submits when complete; the demo code is ${DEMO_CODE}.`}>
        <TwoFactorFlow />
      </Specimen>

      <Specimen
        title="Refused sign-in"
        description={`locked@orbit.example with ${DEMO_PASSWORD} is locked; any other password is incorrect. GitHub explains why it is unavailable; Microsoft returns an error. Messages replace the reserved status line.`}
      >
        <RefusedFlow />
      </Specimen>

      <Specimen title="Pending" description="The sign-in callback takes four seconds. The button shows its pending face in place; providers and view links wait.">
        <PendingFlow />
      </Specimen>

      <Specimen title="In a dialog" description="surface={false} and heading={false}: the Dialog supplies the surface and a header that follows the controlled view. On phones it opens as a bottom sheet.">
        <DialogFlow />
      </Specimen>

      <Usage
        description="The host owns every request, redirect and session. Callbacks resolve to an outcome; nothing, or { status: 'success' }, is success."
        code={`
import { LoginError, LoginFlow, loginProvider } from "glass-ux/login-flow"

<LoginFlow
  identifier="email"                      // "username" | "email-or-username"
  view={view} onViewChange={navigate}     // or defaultView
  providers={[loginProvider("google"), { id: "okta", label: "Okta", icon: <OktaMark /> }]}
  onProviderSignIn={(provider) => startRedirect(provider.id)}
  onSignIn={async ({ identifier, password, remember }) => {
    const result = await api.signIn(identifier, password, remember)
    if (result.locked) return { status: "error", message: "This account is locked. Reset the password." }
    if (result.mfa) return { status: "two-factor", challenge: { id: result.challengeId } }
    if (!result.ok) throw new LoginError("Incorrect email or password.")
  }}
  onVerifyTwoFactor={({ code, challenge }) => api.verify(challenge.id, code)}
  onRequestPasswordReset={({ identifier }) => api.requestReset(identifier)}
  onSignUp={(values) => api.createAccount(values)}
  signUp={{ terms: <>I accept the <a href="/terms">terms</a></> }}
  passwordPolicy={{ minLength: 14 }}
  header={<BrandLogo source={productLogo} />}
/>`}
      />

      <Rules
        do={[
          "Return outcomes with factual messages that say what to do next.",
          "Keep the reset confirmation neutral: do not reveal whether an account exists.",
          "Route views with view and onViewChange when each has a URL.",
          "Enforce rate limits, lockout and the real password policy on the server.",
        ]}
        dont={[
          "Add a slogan or welcome paragraph above the form.",
          "Repeat the view's title when a Dialog header already names it.",
          "Show raw server errors; throw LoginError with a message written for people.",
          "Store, log or prefill passwords.",
        ]}
      />

      <TokenTable
        tokens={[
          ["--inset-dialog", "Surface padding; --inset-panel in narrow containers"],
          ["--gap-section", "Header, view and footer spacing"],
          ["--gap-fields", "The form's field rhythm"],
          ["--duration-base", "Height change between views"],
          ["--duration-slow", "Entering view fade and slide"],
          ["--danger-text", "Refusal in the status line"],
          ["--success-text", "Confirmation in the status line"],
        ]}
      />
    </SectionPage>
  )
}
