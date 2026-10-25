import { useLocale } from "../../lib/locale/use-locale.js"
/**
 * LoginFlow's views. Each one owns a TanStack form (R15: blur, then change after an error;
 * one field per row), its submit button's in-place feedback and a reserved status line.
 */
import { useStore, type AnyFieldApi } from "@tanstack/react-form"
import { useMemo, type ReactNode } from "react"
import { z } from "zod"
import { Button } from "../button/index.js"
import { EmailField } from "../email-field/index.js"
import { formBehaviour, useAppForm } from "../form/index.js"
import { setServerError, useFlow, useLoginAction, useViewMessage, type FlowValue, type LoginMessage } from "./flow-context.js"
import { Divider, LoginForm, ProviderList, ResendButton, StatusLine, SwitchPrompt, UsernameField, ViewFrame, ViewLink } from "./parts.js"
import { codeSchema, confirmsPassword, loginIdentifierSchema, newPasswordSchema } from "./schema.js"
import type { LoginIdentifierKind } from "./types.js"

/** Clears a host message from the field that changed, and the view's status line. */
function clearOnChange(setMessage: (message: LoginMessage | undefined) => void, after?: (field: AnyFieldApi) => void) {
  return {
    onChange: ({ fieldApi }: { fieldApi: AnyFieldApi }) => {
      if (fieldApi.state.meta.errorMap.onServer) setServerError(fieldApi.form, fieldApi.name, undefined)
      setMessage(undefined)
      after?.(fieldApi)
    },
  }
}

const identifierLabel = (flow: FlowValue) =>
  flow.kind === "email" ? flow.labels.emailLabel : flow.kind === "username" ? flow.labels.usernameLabel : flow.labels.emailOrUsernameLabel

/** The sign-in or reset identifier: an email field, or a username field without autocorrection. */
function IdentifierControl({ kind, label, aside }: { kind: LoginIdentifierKind; label: string; aside?: ReactNode }) {
  if (kind === "email") return <EmailField label={label} autoComplete="username" aside={aside} />
  return <UsernameField label={label} aside={aside} />
}

function SubmitButton({ status, label, pending, success }: { status: ReturnType<typeof useLoginAction>["status"]; label: string; pending: string; success: string }) {
  const flow = useFlow()
  return (
    <Button type="submit" variant="primary" block status={status} pendingLabel={pending} successLabel={success} disabled={flow.busy && status !== "pending"} className="fa-login-submit">
      {label}
    </Button>
  )
}

/** Providers and the "or" divider, in the configured placement around `form`. */
function WithProviders({ form, setMessage, show = true }: { form: ReactNode; setMessage: (message: LoginMessage | undefined) => void; show?: boolean }) {
  const flow = useFlow()
  const providers = show && (flow.props.providers?.length ?? 0) > 0
  if (!providers) return <>{form}</>
  const list = <ProviderList setMessage={setMessage} onTwoFactor={flow.requireTwoFactor} />
  if (!form) return list
  return (flow.props.providerPlacement ?? "above") === "above" ? (
    <>
      {list}
      <Divider />
      {form}
    </>
  ) : (
    <>
      {form}
      <Divider />
      {list}
    </>
  )
}

/* ── Sign in ─────────────────────────────────────────────────────────────── */

export function SignInView() {
 const locale = useLocale()
  const flow = useFlow()
  const { labels, kind, props } = flow
  const [message, setMessage] = useViewMessage()
  const submit = useLoginAction(setMessage)
  const schema = useMemo(
    () => z.object({ identifier: loginIdentifierSchema(kind, labels, locale), password: z.string().min(1, labels.passwordRequired), remember: z.boolean() }),
    [kind, labels, locale]
  )
  const form = useAppForm({
    ...formBehaviour,
    defaultValues: { identifier: flow.identifier, password: "", remember: flow.remember },
    validators: { onDynamic: schema },
    listeners: clearOnChange(setMessage, (field) => {
      if (field.name === "identifier") flow.setIdentifier(field.state.value as string)
      if (field.name === "remember") flow.setRemember(field.state.value as boolean)
    }),
    onSubmit: async ({ value, formApi }) => {
      const signIn = props.onSignIn
      if (!signIn) return
      await submit.run(() => signIn({ identifier: value.identifier.trim(), password: value.password, remember: value.remember }), {
        form: formApi,
        fields: { identifier: "identifier", password: "password" },
        onTwoFactor: (challenge) => flow.requireTwoFactor(challenge),
      })
    },
  })

  const forgot = props.onRequestPasswordReset ? <ViewLink to="forgot-password">{labels.forgotPasswordLink}</ViewLink> : undefined
  const passwordForm = props.onSignIn ? (
    <LoginForm form={form}>
      <form.AppField name="identifier">{() => <IdentifierControl kind={kind} label={identifierLabel(flow)} />}</form.AppField>
      <form.AppField name="password">{(field) => <field.PasswordField label={labels.passwordLabel} purpose="current" aside={forgot} />}</form.AppField>
      {props.remember ? <form.AppField name="remember">{(field) => <field.CheckboxField label={labels.rememberLabel} />}</form.AppField> : null}
      <SubmitButton status={submit.status} label={labels.signInAction} pending={labels.signInPending} success={labels.signInSuccess} />
      <StatusLine message={message} />
    </LoginForm>
  ) : null

  return (
    <ViewFrame title={labels.signInTitle} description={labels.signInDescription}>
      <WithProviders form={passwordForm} setMessage={setMessage} />
      {passwordForm ? null : <StatusLine message={message} />}
      {props.onSignUp ? <SwitchPrompt prompt={labels.signUpPrompt} to="sign-up" link={labels.signUpLink} /> : null}
    </ViewFrame>
  )
}

/* ── Two-factor ──────────────────────────────────────────────────────────── */

export function TwoFactorView() {
 const locale = useLocale()
  const flow = useFlow()
  const { labels, props, challenge } = flow
  const [message, setMessage] = useViewMessage()
  const submit = useLoginAction(setMessage)
  const length = challenge.length ?? 6
  const characters = challenge.characters ?? "numeric"
  const schema = useMemo(() => z.object({ code: codeSchema(length, characters, locale) }), [length, characters, locale])
  const form = useAppForm({
    ...formBehaviour,
    defaultValues: { code: "" },
    validators: { onDynamic: schema },
    listeners: clearOnChange(setMessage),
    onSubmit: async ({ value, formApi }) => {
      const verify = props.onVerifyTwoFactor
      if (!verify) return
      await submit.run(() => verify({ code: value.code, identifier: flow.identifier, remember: flow.remember, challenge, provider: flow.challengeProvider }), {
        form: formApi,
        fields: { code: "code" },
      })
    },
  })
  const resend = props.onResendTwoFactor
  const canResend = Boolean(resend) && challenge.resendable !== false

  return (
    <ViewFrame title={labels.twoFactorTitle} description={challenge.description ?? labels.twoFactorDescription}>
      <LoginForm form={form}>
        <form.AppField name="code">
          {(field) => <field.OtpField label={labels.codeLabel} length={length} characters={characters} autoSubmit status={submit.status === "success" ? "success" : undefined} />}
        </form.AppField>
        <SubmitButton status={submit.status} label={labels.verifyAction} pending={labels.verifyPending} success={labels.verifySuccess} />
        <StatusLine message={message} />
      </LoginForm>
      <div className="fa-login-actions">
        {canResend && resend ? (
          <ResendButton label={labels.resendCode} sent={labels.codeResent} cooldown={flow.codeCooldown} onResend={() => resend(challenge)} setMessage={setMessage} />
        ) : null}
        <ViewLink to="sign-in" className="fa-login-back">
          {labels.backToSignIn}
        </ViewLink>
      </div>
    </ViewFrame>
  )
}

/* ── Forgot password ─────────────────────────────────────────────────────── */

export function ForgotPasswordView() {
 const locale = useLocale()
  const flow = useFlow()
  const { labels, kind, props } = flow
  const [message, setMessage] = useViewMessage()
  const submit = useLoginAction(setMessage)
  const schema = useMemo(() => z.object({ identifier: loginIdentifierSchema(kind, labels, locale) }), [kind, labels, locale])
  const form = useAppForm({
    ...formBehaviour,
    defaultValues: { identifier: flow.identifier },
    validators: { onDynamic: schema },
    listeners: clearOnChange(setMessage, (field) => flow.setIdentifier(field.state.value as string)),
    onSubmit: async ({ value, formApi }) => {
      const request = props.onRequestPasswordReset
      if (!request) return
      const identifier = value.identifier.trim()
      await submit.run(() => request({ identifier }), {
        form: formApi,
        fields: { identifier: "identifier" },
        onSuccess: () => {
          flow.setIdentifier(identifier)
          flow.resetCooldown.start()
          flow.go("reset-password")
        },
      })
    },
  })

  return (
    <ViewFrame title={labels.forgotTitle} description={labels.forgotDescription(kind)}>
      <LoginForm form={form}>
        <form.AppField name="identifier">{() => <IdentifierControl kind={kind} label={identifierLabel(flow)} />}</form.AppField>
        <SubmitButton status={submit.status} label={labels.sendResetAction} pending={labels.sendResetPending} success={labels.sendResetSuccess} />
        <StatusLine message={message} />
      </LoginForm>
      <div className="fa-login-actions">
        <ViewLink to="sign-in" className="fa-login-back">
          {labels.backToSignIn}
        </ViewLink>
      </div>
    </ViewFrame>
  )
}

/* ── Reset password (requested) ──────────────────────────────────────────── */

export function ResetPasswordView() {
 const locale = useLocale()
  const flow = useFlow()
  const { labels, props } = flow
  const [message, setMessage] = useViewMessage()
  const submit = useLoginAction(setMessage)
  const verifies = Boolean(props.onResetPassword)
  const length = props.resetCode?.length ?? 6
  const characters = props.resetCode?.characters ?? "numeric"
  const schema = useMemo(
    () =>
      z
        .object({ code: codeSchema(length, characters, locale), password: newPasswordSchema(props.passwordPolicy, locale), confirm: z.string() })
        .superRefine(confirmsPassword(labels)),
    [length, characters, props.passwordPolicy, labels, locale]
  )
  const form = useAppForm({
    ...formBehaviour,
    defaultValues: { code: "", password: "", confirm: "" },
    validators: { onDynamic: schema },
    listeners: clearOnChange(setMessage),
    onSubmit: async ({ value, formApi }) => {
      const reset = props.onResetPassword
      if (!reset) return
      await submit.run(() => reset({ identifier: flow.identifier, code: value.code, password: value.password }), {
        form: formApi,
        fields: { code: "code", newPassword: "password", confirmPassword: "confirm" },
        onSuccess: (outcome) => flow.go("sign-in", { tone: "success", text: outcome.message ?? labels.passwordChanged }),
      })
    },
  })
  const request = props.onRequestPasswordReset
  const identifier = flow.identifier

  return (
    <ViewFrame title={labels.resetSentTitle} description={verifies ? labels.resetCodeDescription(identifier) : labels.resetSentDescription(identifier)}>
      {verifies ? (
        <LoginForm form={form}>
          <form.AppField name="code">{(field) => <field.OtpField label={labels.resetCodeLabel} length={length} characters={characters} />}</form.AppField>
          <form.AppField name="password">{(field) => <field.PasswordField label={labels.newPasswordLabel} purpose="new" userInputs={identifier ? [identifier] : undefined} />}</form.AppField>
          <form.AppField name="confirm">{(field) => <field.PasswordField label={labels.confirmPasswordLabel} purpose="new" strength={false} />}</form.AppField>
          <SubmitButton status={submit.status} label={labels.setPasswordAction} pending={labels.setPasswordPending} success={labels.setPasswordSuccess} />
          <StatusLine message={message} />
        </LoginForm>
      ) : (
        <StatusLine message={message} />
      )}
      <div className="fa-login-actions">
        {request && identifier ? (
          <ResendButton label={labels.resendReset} sent={labels.resetResent} cooldown={flow.resetCooldown} onResend={() => request({ identifier })} setMessage={setMessage} />
        ) : null}
        <ViewLink to="sign-in" className="fa-login-back">
          {labels.backToSignIn}
        </ViewLink>
      </div>
    </ViewFrame>
  )
}

/* ── Sign up ─────────────────────────────────────────────────────────────── */

export function SignUpView() {
 const locale = useLocale()
  const flow = useFlow()
  const { labels, kind, props } = flow
  const options = props.signUp ?? {}
  const [message, setMessage] = useViewMessage()
  const submit = useLoginAction(setMessage)
  const askName = options.name ?? true
  const asked = options.identifier ?? (kind === "username" ? "username" : "email")
  const askEmail = asked !== "username"
  const askUsername = asked !== "email"
  const askConfirm = options.confirmPassword ?? true
  const askTerms = options.terms !== undefined && options.terms !== null && options.terms !== false
  const entered = flow.identifier
  const looksLikeEmail = kind === "email" || entered.includes("@")

  const schema = useMemo(() => {
    const shape = {
      name: askName ? z.string().trim().min(1, labels.nameRequired) : z.string(),
      email: askEmail ? loginIdentifierSchema("email", labels, locale) : z.string(),
      username: askUsername ? z.string().trim().min(1, labels.usernameRequired) : z.string(),
      password: newPasswordSchema(props.passwordPolicy, locale),
      confirm: z.string(),
      terms: askTerms ? z.boolean().refine((value) => value, labels.termsRequired) : z.boolean(),
    }
    const base = z.object(shape)
    return askConfirm ? base.superRefine(confirmsPassword(labels)) : base
  }, [askName, askEmail, askUsername, askConfirm, askTerms, labels, props.passwordPolicy])

  const form = useAppForm({
    ...formBehaviour,
    defaultValues: {
      name: "",
      email: askEmail && looksLikeEmail ? entered : "",
      username: askUsername && !looksLikeEmail ? entered : "",
      password: "",
      confirm: "",
      terms: false,
    },
    validators: { onDynamic: schema },
    listeners: clearOnChange(setMessage, (field) => {
      const value = field.state.value as string
      // The sign-in identifier follows whichever field the flow signs in with.
      if (field.name === "email" && kind !== "username") flow.setIdentifier(value)
      if (field.name === "username" && kind !== "email") flow.setIdentifier(value)
    }),
    onSubmit: async ({ value, formApi }) => {
      const signUp = props.onSignUp
      if (!signUp) return
      await submit.run(
        () =>
          signUp({
            name: askName ? value.name.trim() : undefined,
            email: askEmail ? value.email.trim() : undefined,
            username: askUsername ? value.username.trim() : undefined,
            password: value.password,
            termsAccepted: askTerms ? value.terms : undefined,
          }),
        { form: formApi, fields: { name: "name", email: "email", username: "username", password: "password", newPassword: "password", confirmPassword: "confirm", terms: "terms" } }
      )
    },
  })
  const people = useStore(form.store, (state) => [state.values.name, state.values.email, state.values.username].filter(Boolean).join("\n"))
  const userInputs = useMemo(() => (people ? people.split("\n") : undefined), [people])

  const accountForm = (
    <LoginForm form={form}>
      {askName ? <form.AppField name="name">{(field) => <field.TextField label={labels.nameLabel} autoComplete="name" />}</form.AppField> : null}
      {askEmail ? (
        <form.AppField name="email">{(field) => <field.EmailField label={labels.signUpEmailLabel} autoComplete={askUsername ? "email" : "username"} />}</form.AppField>
      ) : null}
      {askUsername ? <form.AppField name="username">{() => <UsernameField label={labels.signUpUsernameLabel} />}</form.AppField> : null}
      <form.AppField name="password">{(field) => <field.PasswordField label={labels.signUpPasswordLabel} purpose="new" userInputs={userInputs} />}</form.AppField>
      {askConfirm ? <form.AppField name="confirm">{(field) => <field.PasswordField label={labels.confirmPasswordLabel} purpose="new" strength={false} />}</form.AppField> : null}
      {askTerms ? <form.AppField name="terms">{(field) => <field.CheckboxField label={options.terms} />}</form.AppField> : null}
      <SubmitButton status={submit.status} label={labels.signUpAction} pending={labels.signUpPending} success={labels.signUpSuccess} />
      <StatusLine message={message} />
    </LoginForm>
  )

  return (
    <ViewFrame title={labels.signUpTitle}>
      <WithProviders form={accountForm} setMessage={setMessage} show={options.providers ?? true} />
      <SwitchPrompt prompt={labels.signInPrompt} to="sign-in" link={labels.signInLink} />
    </ViewFrame>
  )
}
