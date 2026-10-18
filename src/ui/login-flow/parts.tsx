/**
 * Building blocks shared by LoginFlow's views: the view frame (heading and description),
 * the reserved status line, view links, the provider list, the "or" divider and the
 * username field.
 */
import { useState, type MouseEvent, type ReactNode } from "react"
import { IconAlert, IconInfo, IconRefresh, IconSuccess, IconUser } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { Button, type ButtonStatus } from "../button/index.js"
import { Field } from "../field/index.js"
import { useBoundField, type FieldChrome } from "../form/index.js"
import { Input } from "../input/index.js"
import { useFlow, useLoginAction, type Cooldown, type LoginMessage } from "./flow-context.js"
import type { LoginOutcome, LoginProvider, LoginView, TwoFactorChallenge } from "./types.js"

export function ViewFrame({ title, description, children }: { title: ReactNode; description?: ReactNode; children: ReactNode }) {
  const flow = useFlow()
  const level = flow.props.headingLevel ?? 2
  const Heading = `h${level}` as const
  const showHeading = flow.props.heading ?? true
  return (
    <div className="fa-login-view" data-view={flow.view} aria-labelledby={showHeading ? flow.headingId : undefined} role={showHeading ? "group" : undefined}>
      {showHeading || description ? (
        <div className="fa-login-intro">
          {showHeading ? (
            <Heading id={flow.headingId} className="fa-login-title" tabIndex={-1}>
              {title}
            </Heading>
          ) : null}
          {description ? (
            <p id={flow.descriptionId} className="fa-login-description">
              {description}
            </p>
          ) : null}
        </div>
      ) : null}
      {children}
    </div>
  )
}

const MESSAGE_ICONS = { danger: IconAlert, success: IconSuccess, info: IconInfo } as const

/**
 * The view's status line: always rendered and two lines high, so an error, success or
 * resend confirmation replaces empty space and never moves the buttons around it.
 */
export function StatusLine({ message }: { message: LoginMessage | undefined }) {
  const Icon = message ? MESSAGE_ICONS[message.tone] : null
  return (
    <div className="fa-login-status" role="status" aria-live="polite" aria-atomic="true" data-tone={message?.tone}>
      {message && Icon ? (
        <p className="fa-login-status-text">
          <Icon className="fa-login-status-icon" />
          <span>{message.text}</span>
        </p>
      ) : null}
    </div>
  )
}

/** A link-styled control that changes view. With `getViewHref` it is a real link the host can route. */
export function ViewLink({ to, children, className }: { to: LoginView; children: ReactNode; className?: string }) {
  const flow = useFlow()
  const href = flow.props.getViewHref?.(to)
  const disabled = flow.busy
  if (href)
    return (
      <a
        href={href}
        className={cx("fa-login-link", className)}
        aria-disabled={disabled || undefined}
        onClick={(event: MouseEvent<HTMLAnchorElement>) => {
          if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
          event.preventDefault()
          if (!disabled) flow.go(to)
        }}
      >
        {children}
      </a>
    )
  return (
    <button type="button" className={cx("fa-login-link", className)} aria-disabled={disabled || undefined} onClick={() => (disabled ? undefined : flow.go(to))}>
      {children}
    </button>
  )
}

/** "No account? Create account" and similar prompts. */
export function SwitchPrompt({ prompt, to, link }: { prompt: ReactNode; to: LoginView; link: ReactNode }) {
  return (
    <p className="fa-login-switch">
      <span>{prompt}</span> <ViewLink to={to}>{link}</ViewLink>
    </p>
  )
}

export function Divider() {
  const { labels } = useFlow()
  return (
    <div className="fa-login-divider">
      <span>{labels.providerSeparator}</span>
    </div>
  )
}

/**
 * The provider buttons. The pressed one shows pending → ✓/✕ in place while the others
 * wait; its message goes to the view's status line.
 */
export function ProviderList({ setMessage, onTwoFactor }: { setMessage: (message: LoginMessage | undefined) => void; onTwoFactor: (challenge: TwoFactorChallenge | undefined, provider: LoginProvider) => void }) {
  const flow = useFlow()
  const action = useLoginAction(setMessage)
  const [activeId, setActiveId] = useState<string | null>(null)
  const providers = flow.props.providers ?? []
  const layout = flow.props.providerLayout ?? "auto"
  const grid = layout === "grid" || (layout === "auto" && providers.length >= 4)
  if (!providers.length) return null

  const start = (provider: LoginProvider) => {
    const handler = flow.props.onProviderSignIn
    if (!handler || flow.busy) return
    setActiveId(provider.id)
    void action.run(() => handler(provider), { onTwoFactor: (challenge) => onTwoFactor(challenge, provider) })
  }

  return (
    <ul className="fa-login-providers" data-layout={grid ? "grid" : "list"}>
      {providers.map((provider) => {
        const name = flow.labels.providerAction(provider)
        const mine: ButtonStatus = activeId === provider.id ? action.status : "idle"
        return (
          <li key={provider.id}>
            <Button
              block
              variant="secondary"
              icon={provider.icon}
              status={mine}
              aria-label={grid ? name : undefined}
              tooltip={false}
              disabledReason={provider.disabledReason}
              disabled={!flow.props.onProviderSignIn || (flow.busy && mine !== "pending")}
              onClick={() => start(provider)}
              data-provider={provider.id}
            >
              {grid ? provider.label : name}
            </Button>
          </li>
        )
      })}
    </ul>
  )
}

/**
 * Sends an email or code again, then waits out the cooldown. It keeps focus while it is
 * unavailable and says how many seconds remain.
 */
export function ResendButton({
  label,
  sent,
  cooldown,
  onResend,
  setMessage,
}: {
  label: string
  sent: ReactNode
  cooldown: Cooldown
  /** Called with no arguments when the person presses the button; sends again and resolves to the outcome. On success the cooldown starts and, without an outcome message, `sent` is shown. */
  onResend: () => Promise<LoginOutcome | void>
  setMessage: (message: LoginMessage | undefined) => void
}) {
  const flow = useFlow()
  const action = useLoginAction(setMessage)
  const waiting = cooldown.remaining > 0
  return (
    <Button
      variant="ghost"
      size="sm"
      icon={<IconRefresh />}
      status={action.status}
      pendingLabel={flow.labels.sendResetPending}
      successLabel={flow.labels.resendSent}
      disabled={waiting || (flow.busy && action.status !== "pending")}
      focusableWhenDisabled
      data-numeric
      onClick={() =>
        void action.run(onResend, {
          onSuccess: (outcome) => {
            cooldown.start()
            if (!outcome.message) setMessage({ tone: "success", text: sent })
          },
        })
      }
    >
      {waiting ? flow.labels.resendIn(cooldown.remaining) : label}
    </Button>
  )
}

export interface UsernameFieldProps extends FieldChrome {
  autoComplete?: string
}

/** A username or either-kind identifier: no capitalisation, correction or spell check. */
export function UsernameField({ label, hint, optional, required, aside, className, disabled, autoComplete = "username" }: UsernameFieldProps) {
  const { field, error, root } = useBoundField<string>()
  return (
    <Field {...root} label={label} hint={hint} optional={optional} required={required} aside={aside} className={className} disabled={disabled}>
      <Input
        name={field.name}
        value={field.state.value}
        onValueChange={(next) => field.handleChange(next)}
        onBlur={() => {
          const trimmed = field.state.value.trim()
          if (trimmed !== field.state.value) field.handleChange(trimmed)
          field.handleBlur()
        }}
        icon={<IconUser />}
        autoComplete={autoComplete}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        required={required}
        disabled={disabled}
        invalid={Boolean(error)}
      />
    </Field>
  )
}

/** The <form> for one view: Enter submits, the form validates every field and focuses the first invalid one. */
export function LoginForm({ form, children }: { form: { formId: string; handleSubmit: () => Promise<void> }; children: ReactNode }) {
  return (
    <form
      noValidate
      className="fa-login-form"
      data-form={form.formId}
      onSubmit={(event) => {
        event.preventDefault()
        event.stopPropagation()
        void form.handleSubmit()
      }}
    >
      {children}
    </form>
  )
}
