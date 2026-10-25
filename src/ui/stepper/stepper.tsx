import type { CSSProperties, ReactNode } from "react"
import { IconCheck } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { useMessages } from "../../lib/i18n/use-messages.js"
import { stepperMessages } from "./messages.js"

/** Where a step stands. `current` is derived from `value` when a step does not set its own status. */
export type StepStatus = "upcoming" | "current" | "complete" | "error" | "skipped"

export interface StepItem {
  id: string
  /** The step's name ("Connect the site"). */
  label: ReactNode
  /** One line under the label. */
  description?: ReactNode
  /** Marks the step "Optional" under its label. */
  optional?: boolean
  /** The step's status. Default: complete before `value`, current at it, upcoming after. */
  status?: StepStatus
  /** The step cannot be navigated to. */
  disabled?: boolean
}

/**
 * Which steps a person may jump to by choosing them:
 *   none     (default) the steps only show progress
 *   visited  complete, skipped and errored steps, and the current one
 *   any      every step that is not disabled
 */
export type StepperNavigation = "none" | "visited" | "any"

export interface StepperProps {
  /** The steps, in order. */
  steps: StepItem[]
  /** The current step's id. */
  value: string
  /** Called with a step's id when the person chooses it (see `navigation`). */
  onValueChange?: (id: string) => void
  /** Which steps can be chosen (StepperNavigation). Default none. */
  navigation?: StepperNavigation
  /**
   * `horizontal` (default) lays the steps along a line, and below a container width shows
   * "Step 2 of 5" with the current step's name and a progress bar instead; `vertical` stacks
   * them, for a side rail or a step-by-step page.
   */
  orientation?: "horizontal" | "vertical"
  /** Content under the current step in the vertical layout (a step-by-step form on one page). */
  children?: ReactNode
  /** Formatting and wording locale; defaults to the nearest LocaleProvider. */
  locale?: string
  /** Wording overrides. */
  labels?: Partial<typeof stepperMessages.defaults>
  /** Layout only. */
  className?: string
  /** Names the steps navigation. Default "Steps". */
  "aria-label"?: string
}

/** Each step's effective status from its own status and its position relative to `value`. */
export function stepStatuses(steps: StepItem[], value: string): StepStatus[] {
  const at = steps.findIndex((step) => step.id === value)
  return steps.map((step, index) => step.status ?? (index < at ? "complete" : index === at ? "current" : "upcoming"))
}

/**
 * Progress through a multi-step task: numbered markers joined by a line, a check on finished
 * steps and a mark on steps that need attention. It shows progress; the content and the
 * Back and Next buttons belong to the page or a Wizard.
 */
export function Stepper({
  steps,
  value,
  onValueChange,
  navigation = "none",
  orientation = "horizontal",
  children,
  locale,
  labels,
  className,
  "aria-label": ariaLabel,
}: StepperProps) {
  const t = useMessages(stepperMessages, { labels, locale })
  const statuses = stepStatuses(steps, value)
  const at = Math.max(0, steps.findIndex((step) => step.id === value))
  const current = steps[at]
  const reachable = (index: number) => {
    if (navigation === "none" || steps[index]!.disabled || index === at) return false
    if (navigation === "any") return true
    return statuses[index] !== "upcoming"
  }
  const statusText: Partial<Record<StepStatus, string>> = { complete: t.complete, current: t.current, error: t.error, skipped: t.skipped }

  return (
    <nav aria-label={ariaLabel ?? t.steps} className={cx("fa-stepper", className)} data-orientation={orientation}>
      {orientation === "horizontal" ? (
        // The compact form, shown by a container query when the steps do not fit.
        <div className="fa-stepper-compact" aria-hidden>
          <span className="fa-stepper-compact-count" data-numeric>
            {t.stepOf(at + 1, steps.length)}
          </span>
          <span className="fa-stepper-compact-label">{current?.label}</span>
          <span className="fa-stepper-compact-bar" style={{ "--_progress": String((at + 1) / steps.length) } as CSSProperties} />
        </div>
      ) : null}
      <ol className="fa-stepper-list">
        {steps.map((step, index) => {
          const status = statuses[index]!
          const canGo = reachable(index)
          const marker = (
            <span className="fa-stepper-marker" aria-hidden>
              {status === "complete" ? <IconCheck size="sm" /> : status === "error" ? "!" : index + 1}
            </span>
          )
          const text = (
            <span className="fa-stepper-text">
              <span className="fa-stepper-label">{step.label}</span>
              {step.description || step.optional ? (
                <span className="fa-stepper-description">
                  {step.optional ? <span className="fa-stepper-optional">{t.optional}</span> : null}
                  {step.description}
                </span>
              ) : null}
              {statusText[status] ? <span className="sr-only">, {statusText[status]}</span> : null}
            </span>
          )
          return (
            <li
              key={step.id}
              className="fa-stepper-step"
              data-status={status}
              data-disabled={step.disabled ? "" : undefined}
              aria-current={status === "current" ? "step" : undefined}
            >
              {canGo ? (
                <button type="button" className="fa-stepper-target fa-pressable" onClick={() => onValueChange?.(step.id)}>
                  {marker}
                  {text}
                </button>
              ) : (
                <span className="fa-stepper-target">
                  {marker}
                  {text}
                </span>
              )}
              {orientation === "vertical" && status === "current" && children ? <div className="fa-stepper-content">{children}</div> : null}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
