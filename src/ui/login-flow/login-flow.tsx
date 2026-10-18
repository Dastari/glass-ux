import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { cx } from "../../lib/cx.js"
import { observeElementSizes } from "../../lib/resize-observer.js"
import { useControllable } from "../../lib/use-controllable.js"
import { Surface } from "../surface/index.js"
import { FlowContext, useCooldown, type FlowValue, type LoginMessage } from "./flow-context.js"
import { DEFAULT_LOGIN_LABELS } from "./labels.js"
import type { LoginFlowProps, LoginProvider, LoginView, TwoFactorChallenge } from "./types.js"
import { ForgotPasswordView, ResetPasswordView, SignInView, SignUpView, TwoFactorView } from "./views.js"

/** How deep a view sits: moving deeper slides forward, returning slides back. */
const DEPTH: Record<LoginView, number> = { "sign-in": 0, "sign-up": 1, "forgot-password": 1, "two-factor": 1, "reset-password": 2 }

const VIEWS: Record<LoginView, () => ReactNode> = {
  "sign-in": SignInView,
  "two-factor": TwoFactorView,
  "forgot-password": ForgotPasswordView,
  "reset-password": ResetPasswordView,
  "sign-up": SignUpView,
}

/** The first empty text box in the view, else its first box, else its heading or the view itself. */
function focusView(stage: HTMLElement) {
  const boxes = [...stage.querySelectorAll<HTMLInputElement>("input:not([type='hidden']):not([type='checkbox']):not([type='radio']):not([disabled]):not([tabindex='-1']):not([aria-hidden='true'])")]
  const target = boxes.find((box) => !box.value) ?? boxes[0] ?? stage.querySelector<HTMLElement>(".fa-login-title") ?? stage.querySelector<HTMLElement>(".fa-login-view")
  target?.focus()
}

/**
 * The stage animates its height from the previous view's to the next one's and the view
 * fades and slides in, both on motion tokens (reduced motion makes them instant). It clips
 * only while the height moves, so focus rings are never cut at rest.
 */
function useViewTransition(view: LoginView, autoFocus: boolean) {
  const stage = useRef<HTMLDivElement>(null)
  const height = useRef(0)
  const first = useRef(true)

  useLayoutEffect(() => {
    const element = stage.current
    if (!element) return
    const content = element.firstElementChild as HTMLElement | null
    if (first.current) {
      first.current = false
      height.current = content?.offsetHeight ?? 0
      if (!autoFocus) return
      focusView(element)
      // A Dialog moves focus to its first control after mounting its content.
      const frame = requestAnimationFrame(() => {
        if (!element.contains(document.activeElement)) focusView(element)
      })
      return () => cancelAnimationFrame(frame)
    }
    const from = element.hasAttribute("data-animating") ? element.getBoundingClientRect().height : height.current
    const to = content?.offsetHeight ?? 0
    height.current = to
    const seconds = Number.parseFloat(getComputedStyle(element).transitionDuration) || 0
    let timer: ReturnType<typeof setTimeout> | undefined
    const detach = () => {
      clearTimeout(timer)
      element.removeEventListener("transitionend", onEnd)
    }
    const finish = () => {
      detach()
      element.style.height = ""
      element.removeAttribute("data-animating")
    }
    function onEnd(event: TransitionEvent) {
      if (event.target === element && event.propertyName === "height") finish()
    }
    if (seconds > 0 && Math.abs(from - to) > 1) {
      element.style.height = `${from}px`
      element.setAttribute("data-animating", "")
      void element.offsetHeight
      element.style.height = `${to}px`
      element.addEventListener("transitionend", onEnd)
      timer = setTimeout(finish, seconds * 1000 + 100)
    } else finish()
    // The activated link is gone with the old view: focus the new one now, and again after a
    // surrounding focus manager (a Dialog's) has reacted to the removal.
    focusView(element)
    const frame = requestAnimationFrame(() => {
      if (!element.contains(document.activeElement)) focusView(element)
    })
    // A change mid-transition continues from the current height (read above).
    return () => {
      cancelAnimationFrame(frame)
      detach()
    }
  }, [view])

  // Keep the resting height current as messages, errors and fonts arrive.
  useEffect(() => {
    const content = stage.current
    if (!content) return
    const observer = observeElementSizes(() => {
      const element = content.firstElementChild as HTMLElement | null
      if (element && !content.hasAttribute("data-animating")) height.current = element.offsetHeight
    })
    for (const child of content.children) observer.observe(child)
    return () => observer.disconnect()
  }, [view])

  return stage
}

/**
 * A complete, configurable authentication flow: password sign-in with an email, username or
 * either; third-party providers; remember me; a two-factor code step; forgot and reset
 * password; and optional account creation. The host supplies async callbacks and owns every
 * backend contract, URL and brand; the flow owns validation, pending and outcome feedback in
 * place, focus, and the animated change between views.
 *
 * Route it with `view`/`onViewChange` (and `getViewHref` for real links), or leave it
 * uncontrolled. The entered identifier is kept across views.
 */
export function LoginFlow(given: LoginFlowProps) {
  const {
    heading = true,
    headingLevel = 2,
    providerPlacement = "above",
    providerLayout = "auto",
    identifier: kind = "email",
    defaultIdentifier = "",
    view: viewProp,
    defaultView = "sign-in",
    onViewChange,
    remember: rememberOption = false,
    resendCooldown = 30,
    labels: labelOverrides,
    header,
    footer,
    surface = true,
    autoFocus = false,
    className,
    id,
  } = given
  const props: LoginFlowProps = { ...given, heading, headingLevel, providerPlacement, providerLayout }
  const labels = useMemo(() => ({ ...DEFAULT_LOGIN_LABELS, ...labelOverrides }), [labelOverrides])
  const [requested, setView] = useControllable<LoginView>(viewProp, defaultView, onViewChange)
  const [identifier, setIdentifier] = useState(defaultIdentifier)
  const [remember, setRemember] = useState(typeof rememberOption === "object" ? rememberOption.defaultChecked : false)
  const [busy, setBusy] = useState(false)
  const [challenge, setChallenge] = useState<{ challenge: TwoFactorChallenge; provider?: LoginProvider }>({ challenge: {} })
  const [notice, setNotice] = useState<{ view: LoginView; message: LoginMessage } | undefined>()
  const resetCooldown = useCooldown(resendCooldown)
  const codeCooldown = useCooldown(resendCooldown)
  const headingId = useId()
  const descriptionId = useId()

  const available = (next: LoginView) => {
    if (next === "sign-up") return Boolean(props.onSignUp)
    if (next === "forgot-password" || next === "reset-password") return Boolean(props.onRequestPasswordReset)
    if (next === "two-factor") return Boolean(props.onVerifyTwoFactor)
    return true
  }
  const view: LoginView = available(requested) ? requested : "sign-in"
  if (import.meta.env.DEV && view !== requested)
    console.error(`LoginFlow: the "${requested}" view needs its callback (onSignUp, onRequestPasswordReset or onVerifyTwoFactor); showing sign-in.`)

  // A carried notice belongs to the view it was carried into.
  useEffect(() => {
    if (notice && notice.view !== view) setNotice(undefined)
  }, [notice, view])

  const stage = useViewTransition(view, autoFocus)
  const [shown, setShown] = useState<{ view: LoginView; direction?: "forward" | "back" }>({ view })
  if (shown.view !== view) setShown({ view, direction: DEPTH[view] >= DEPTH[shown.view] ? "forward" : "back" })

  const go = (next: LoginView, message?: LoginMessage) => {
    setNotice(message ? { view: next, message } : undefined)
    setView(next)
  }

  const flow: FlowValue = {
    labels,
    kind,
    props,
    view,
    identifier,
    setIdentifier,
    remember,
    setRemember,
    busy,
    setBusy,
    go,
    notice: notice?.view === view ? notice.message : undefined,
    challenge: challenge.challenge,
    challengeProvider: challenge.provider,
    requireTwoFactor: (next, provider) => {
      setChallenge({ challenge: next ?? {}, provider })
      if (import.meta.env.DEV && !props.onVerifyTwoFactor) console.error("LoginFlow: a callback asked for a two-factor code, but onVerifyTwoFactor is missing.")
      codeCooldown.start()
      go("two-factor")
    },
    resetCooldown,
    codeCooldown,
    available,
    headingId,
    descriptionId,
  }

  const View = VIEWS[view]
  const content = (
    <>
      {header ? <div className="fa-login-header">{header}</div> : null}
      <div ref={stage} className="fa-login-stage" data-enter={shown.direction}>
        <View key={view} />
      </div>
      {footer ? <div className="fa-login-footer">{footer}</div> : null}
    </>
  )

  return (
    <div id={id} className={cx("fa-login", className)} data-surface={surface ? "" : undefined} data-busy={busy ? "" : undefined}>
      <FlowContext value={flow}>
        {surface ? (
          <Surface material="panel" radius="surface" padding="dialog" className="fa-login-surface">
            {content}
          </Surface>
        ) : (
          <div className="fa-login-surface">{content}</div>
        )}
      </FlowContext>
    </div>
  )
}
