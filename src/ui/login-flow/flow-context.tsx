/**
 * LoginFlow's internal state shared by its views: copy, the entered identifier, the
 * pending operation, navigation and the resend cooldowns. Not exported from the package.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import { FEEDBACK_HOLD_MS, type ButtonStatus } from "../button/index.js"
import { focusFirstInvalid } from "../form/index.js"
import type {
  LoginFieldName,
  LoginFlowLabels,
  LoginFlowProps,
  LoginIdentifierKind,
  LoginProvider,
  LoginSuccess,
  LoginView,
  SignInOutcome,
  TwoFactorChallenge,
} from "./types.js"

/**
 * Throw this from a callback to show its message as a refused outcome. Any other thrown
 * error shows `labels.unexpectedError` and goes to `onError`.
 */
export class LoginError extends Error {
  /** The field the message belongs to, if any. */
  readonly field?: LoginFieldName
  constructor(message: string, options: { field?: LoginFieldName; cause?: unknown } = {}) {
    super(message, { cause: options.cause })
    this.name = "LoginError"
    this.field = options.field
  }
}

/** A line in a view's reserved status slot. */
export interface LoginMessage {
  tone: "danger" | "success" | "info"
  /** Plain text rendered or copied by the component. */
  text: ReactNode
}

export interface Cooldown {
  /** Whole seconds left; 0 when sending is allowed. */
  remaining: number
  start: () => void
}

/** Counts down from `seconds` after `start()`, once a second. */
export function useCooldown(seconds: number): Cooldown {
  const [until, setUntil] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (until <= now) return
    const timer = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(timer)
  }, [until, now])
  const start = useCallback(() => {
    if (seconds <= 0) return
    const at = Date.now()
    setNow(at)
    setUntil(at + seconds * 1000)
  }, [seconds])
  return { remaining: Math.max(0, Math.ceil((until - now) / 1000)), start }
}

export interface FlowValue {
  /** Display and accessibility labels supplied by the application. */
  labels: LoginFlowLabels
  /** Semantic entity or content kind, used to choose labels and rendering. */
  kind: LoginIdentifierKind
  props: LoginFlowProps
  /** Currently selected presentation view. */
  view: LoginView
  identifier: string
  setIdentifier: (value: string) => void
  remember: boolean
  setRemember: (value: boolean) => void
  /** Any operation is running: other actions and view links wait. */
  busy: boolean
  setBusy: (busy: boolean) => void
  /** Change view, optionally carrying a status line into it. */
  go: (view: LoginView, notice?: LoginMessage) => void
  /** The status line carried into the current view ("Password changed…"). */
  notice: LoginMessage | undefined
  challenge: TwoFactorChallenge
  challengeProvider?: LoginProvider
  requireTwoFactor: (challenge: TwoFactorChallenge | undefined, provider?: LoginProvider) => void
  resetCooldown: Cooldown
  codeCooldown: Cooldown
  /** Views that can be reached with the supplied callbacks. */
  available: (view: LoginView) => boolean
  headingId: string
  descriptionId: string
}

export const FlowContext = createContext<FlowValue | null>(null)

export function useFlow() {
  const flow = useContext(FlowContext)
  if (!flow) throw new Error("LoginFlow views render inside LoginFlow")
  return flow
}

/** What a form needs for field-level server errors. */
export interface ServerErrorForm {
  formId: string
  setFieldMeta: (field: never, updater: never) => void
}

type MetaWithErrors = { errorMap?: Record<string, unknown> } | undefined

/** Set or clear (undefined) a host-supplied message on one field. */
export function setServerError(form: ServerErrorForm, name: string, message: string | undefined) {
  const updater = (previous: MetaWithErrors) => (previous ? { ...previous, errorMap: { ...previous.errorMap, onServer: message } } : previous)
  form.setFieldMeta(name as never, updater as never)
}

export interface RunOptions {
  /** The form whose fields can show a field-level message. */
  form?: ServerErrorForm
  /** Host field names → this form's field names. */
  fields?: Partial<Record<LoginFieldName, string>>
  /** Called when success occurs. The callback type specifies its arguments. */
  onSuccess?: (outcome: LoginSuccess) => void
  /** Called when two factor occurs. The callback type specifies its arguments. */
  onTwoFactor?: (challenge: TwoFactorChallenge | undefined) => void
}

/** A view's status line, starting with the notice carried into the view. */
export function useViewMessage() {
  const flow = useFlow()
  return useState<LoginMessage | undefined>(flow.notice)
}

/**
 * One operation (a submit, a provider, a resend): its button status and the outcome
 * mapping (returned or thrown errors, two-factor, success) onto the view's status line.
 */
export function useLoginAction(setMessage: (message: LoginMessage | undefined) => void) {
  const flow = useFlow()
  const [status, setStatus] = useState<ButtonStatus>("idle")
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const pending = useRef(false)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      clearTimeout(timer.current)
    }
  }, [])

  const hold = (next: ButtonStatus) => {
    setStatus(next)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      if (mounted.current) setStatus("idle")
    }, FEEDBACK_HOLD_MS)
  }

  const run = async (action: () => Promise<SignInOutcome | void>, options: RunOptions = {}) => {
    if (pending.current) return undefined
    pending.current = true
    flow.setBusy(true)
    clearTimeout(timer.current)
    setStatus("pending")
    setMessage(undefined)
    let outcome: SignInOutcome
    try {
      outcome = (await action()) ?? { status: "success" }
    } catch (error) {
      if (error instanceof LoginError) outcome = { status: "error", message: error.message, field: error.field }
      else {
        flow.props.onError?.(error)
        outcome = { status: "error", message: flow.labels.unexpectedError }
      }
    } finally {
      pending.current = false
      flow.setBusy(false)
    }
    if (!mounted.current) return outcome
    if (outcome.status === "error") {
      hold("error")
      const target = outcome.field ? options.fields?.[outcome.field] : undefined
      if (target && options.form && typeof outcome.message === "string") {
        setServerError(options.form, target, outcome.message)
        focusFirstInvalid(options.form.formId)
      } else setMessage({ tone: "danger", text: outcome.message })
    } else if (outcome.status === "two-factor") {
      setStatus("idle")
      options.onTwoFactor?.(outcome.challenge)
    } else {
      hold("success")
      if (outcome.message) setMessage({ tone: "success", text: outcome.message })
      options.onSuccess?.(outcome)
    }
    return outcome
  }

  return { status, run }
}
