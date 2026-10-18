import { Button as BaseButton } from "@base-ui/react/button"
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type MouseEvent,
  type ReactNode,
} from "react"
import { IconCheck, IconError, IconSpinner } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { feedbackHold } from "../../lib/motion.js"
import { Tooltip } from "../tooltip/index.js"

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "soft"
  | "danger"
  | "danger-soft"
  | "success"
  | "success-soft"
  | "warning"
  | "warning-soft"
export type ButtonSize = "xs" | "sm" | "md" | "lg"
export type ButtonStatus = "idle" | "pending" | "success" | "error"

/** The default of --feedback-hold in tokens.css. Timers read the token itself (`feedbackHold`), so a host that changes it is honoured. */
export const FEEDBACK_HOLD_MS = 1800

export interface ButtonProps extends Omit<ComponentProps<typeof BaseButton>, "className"> {
  className?: string
  variant?: ButtonVariant
  size?: ButtonSize
  /** Leading icon. Pass an icon element without a size; the button sizes it. */
  icon?: ReactNode
  /** Trailing icon (chevrons, external-link). */
  iconEnd?: ReactNode
  /** Circular instead of the control radius (send buttons, avatars-as-buttons). */
  shape?: "default" | "circle"
  /** Stretch to the container width. */
  block?: boolean
  /**
   * Opt in to in-place feedback. The button reserves the width of its widest face, so
   * moving between idle → pending → success/error never moves anything around it.
   */
  status?: ButtonStatus
  /** Label shown while the asynchronous action runs. Its width is reserved with the other feedback labels. */
  pendingLabel?: ReactNode
  /** Label shown after a successful action before returning to the resting state. */
  successLabel?: ReactNode
  /** Label shown after a failed action. Use onError to explain the failure. */
  errorLabel?: ReactNode
  /**
   * Tooltip content. Icon-only buttons always get a tooltip (R20.7): this prop overrides
   * the default, which is the button's aria-label. Pass `false` only when a visible label
   * sits right next to the button.
   */
  tooltip?: ReactNode | false
  /** Keyboard shortcut shown in the tooltip, e.g. "mod+k". */
  shortcut?: string
  /**
   * Why the button is disabled (R12.3). Keeps the button focusable (aria-disabled) so the
   * reason is reachable by hover, focus and screen readers.
   */
  disabledReason?: string
  /**
   * Polite screen-reader announcement made when `status` settles from `pending` to
   * `success` or `error`. Defaults to `successLabel`/`errorLabel`, then "Done"/"Failed".
   * Pass `false` when the host announces the outcome itself. While `status` is set the
   * visually hidden live region stays mounted beside the button and adds no geometry.
   */
  statusAnnouncement?: { success?: ReactNode; error?: ReactNode } | false
}

/**
 * The only button. Every clickable control with a button shape renders through this, so
 * hover, press, focus, disabled and feedback behave the same everywhere. Icon-only
 * buttons must carry an aria-label.
 */
export function Button({
  variant = "secondary",
  size = "md",
  icon,
  iconEnd,
  shape = "default",
  block = false,
  status,
  pendingLabel,
  successLabel,
  errorLabel,
  className,
  children,
  disabled,
  tooltip,
  shortcut,
  disabledReason,
  focusableWhenDisabled,
  statusAnnouncement,
  ...rest
}: ButtonProps) {
  const hasLabel = children !== undefined && children !== null && children !== false
  const iconOnly = !hasLabel
  const tracksStatus = status !== undefined
  const active = status ?? "idle"
  const busy = active === "pending"
  const ariaLabel = rest["aria-label"]
  const isDisabled = Boolean(disabled || disabledReason)
  const settled = useSettledStatus(active)
  const announcement =
    statusAnnouncement === false || !settled
      ? null
      : settled === "success"
        ? (statusAnnouncement?.success ?? successLabel ?? "Done")
        : (statusAnnouncement?.error ?? errorLabel ?? "Failed")

  if (import.meta.env.DEV && iconOnly && !ariaLabel) {
    console.error("Button: an icon-only button needs an aria-label (it also becomes its tooltip).")
  }

  const face = (name: ButtonStatus, lead: ReactNode, label: ReactNode, trail?: ReactNode) => (
    <span className="fa-btn-face" data-face={name} data-active={active === name ? "" : undefined}>
      {lead}
      {iconOnly ? null : <span className="fa-btn-label">{label}</span>}
      {trail}
    </span>
  )

  const button = (
    <BaseButton
      {...rest}
      disabled={isDisabled || busy}
      focusableWhenDisabled={busy || Boolean(disabledReason) || focusableWhenDisabled}
      aria-busy={busy || undefined}
      aria-description={disabledReason}
      className={cx("fa-btn fa-pressable fa-lit", className)}
      data-variant={variant}
      data-size={size}
      data-shape={shape === "circle" ? "circle" : undefined}
      data-icon-only={iconOnly ? "" : undefined}
      data-block={block ? "" : undefined}
      data-status={tracksStatus ? active : undefined}
    >
      {tracksStatus ? (
        <span className="fa-btn-stack">
          {face("idle", icon, children, iconEnd)}
          {face("pending", <IconSpinner className="fa-btn-spinner" />, pendingLabel ?? children)}
          {face("success", <IconCheck className="fa-btn-check" />, successLabel ?? children)}
          {face("error", <IconError />, errorLabel ?? children)}
        </span>
      ) : (
        <>
          {icon}
          {hasLabel ? <span className="fa-btn-label">{children}</span> : null}
          {iconEnd}
        </>
      )}
    </BaseButton>
  )

  const content = disabledReason ?? (tooltip === false ? null : (tooltip ?? (iconOnly ? ariaLabel : null)))
  const control = content ? (
    <Tooltip content={content} shortcut={shortcut}>
      {button}
    </Tooltip>
  ) : (
    button
  )
  // A sibling, not a descendant: text inside the button would join its accessible name.
  // The fragment shape stays the same when `status` toggles so the button is never remounted.
  return (
    <>
      {control}
      {tracksStatus && statusAnnouncement !== false ? (
        <span className="sr-only fa-btn-live" aria-live="polite">
          {announcement}
        </span>
      ) : null}
    </>
  )
}

/** The outcome a pending action settled on; cleared when the button rests or runs again. */
function useSettledStatus(status: ButtonStatus): "success" | "error" | null {
  const [settled, setSettled] = useState<"success" | "error" | null>(null)
  const [previous, setPrevious] = useState(status)
  if (previous !== status) {
    setPrevious(status)
    setSettled(status === "success" || status === "error" ? (previous === "pending" ? status : null) : null)
  }
  return settled
}

/**
 * Drive a button's feedback from an async action: pending while it runs, then ✓ or ✕
 * for `holdMs` (default: the --feedback-hold token) before resting. Errors are handed to `onError` (normally a toast);
 * the button itself only signals that something failed.
 */
export function useActionFeedback(holdMs?: number) {
  const [status, setStatus] = useState<ButtonStatus>("idle")
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  const run = useCallback(
    async (action: () => Promise<unknown>, onError?: (error: unknown) => void) => {
      clearTimeout(timer.current)
      setStatus("pending")
      try {
        await action()
        setStatus("success")
        return true
      } catch (error) {
        setStatus("error")
        onError?.(error)
        return false
      } finally {
        timer.current = setTimeout(() => setStatus("idle"), holdMs ?? feedbackHold())
      }
    },
    // oxlint-disable-next-line react/memo-dependencies -- holdMs is read in `finally`
    [holdMs]
  )

  const reset = useCallback(() => {
    clearTimeout(timer.current)
    setStatus("idle")
  }, [])

  return { status, run, reset }
}

export interface ActionButtonProps extends Omit<ButtonProps, "status"> {
  /** The asynchronous operation to run. The button handles pending, success and failure feedback. */
  onAction: () => Promise<unknown>
  /** Receives a failed operation so the application can explain it, normally with a toast. */
  onError?: (error: unknown) => void
}

/** A Button that runs an async action and confirms the outcome in place. */
export function ActionButton({ onAction, onError, onClick, ...props }: ActionButtonProps) {
  const { status, run } = useActionFeedback()
  return (
    <Button
      {...props}
      status={status}
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        onClick?.(event as never)
        if (status === "pending" || event.defaultPrevented) return
        void run(onAction, onError)
      }}
    />
  )
}

export interface ButtonGroupProps extends ComponentProps<"div"> {
  /** Join the buttons into one control (split buttons, segmented actions). */
  attached?: boolean
}

/** A row of related buttons in a `role="group"` container, spaced apart or, with `attached`, joined into one control. */
export function ButtonGroup({ attached = false, className, ...rest }: ButtonGroupProps) {
  return (
    <div
      role="group"
      {...rest}
      className={cx("fa-btn-group", className)}
      data-attached={attached ? "" : undefined}
    />
  )
}
