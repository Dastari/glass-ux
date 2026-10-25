import { useEffect, useId, useRef, useState, type ReactNode } from "react"
import { cx } from "../../lib/cx.js"
import { useMessages } from "../../lib/i18n/use-messages.js"
import { useControllable } from "../../lib/use-controllable.js"
import { Button, useActionFeedback } from "../button/index.js"
import { stepperMessages } from "./messages.js"
import { Stepper, type StepItem, type StepStatus, type StepperNavigation } from "./stepper.js"

/**
 * A step's check before the Wizard moves on: return (or resolve) `true` or nothing to continue,
 * `false` to stay, or a message to stay and show it. A thrown error stays and shows its message.
 */
export type WizardValidate = () => boolean | string | void | Promise<boolean | string | void>

export interface WizardStep extends Omit<StepItem, "status"> {
  /** The step's content. */
  content: ReactNode
  /** Runs when the person presses Next (or Finish on the last step). */
  validate?: WizardValidate
}

export interface WizardProps {
  steps: WizardStep[]
  /** The current step's id. Pair with `onValueChange` to control it. */
  value?: string
  /** The first step shown when uncontrolled. Default: the first step. */
  defaultValue?: string
  onValueChange?: (id: string) => void
  /** Runs after the last step validates; the Finish button shows its progress and outcome. */
  onFinish: () => Promise<unknown> | void
  /** Which steps the person may jump back to from the stepper. Default `visited`. */
  navigation?: StepperNavigation
  /** `horizontal` (default): steps above the content; `vertical`: a rail of steps beside it. */
  orientation?: "horizontal" | "vertical"
  /** The Finish button's text. Default "Finish". */
  finishLabel?: string
  /** Content at the start of the footer (a Cancel button, or a draft note). */
  footerStart?: ReactNode
  locale?: string
  labels?: Partial<typeof stepperMessages.defaults>
  className?: string
  "aria-label"?: string
}

/**
 * A multi-step task: a Stepper, the current step's content, and Back, Next (or Skip for an
 * optional step) and Finish. Next runs the step's `validate` first and stays with its message
 * when it fails; the stepper marks the step. Moving between steps focuses the new step and
 * announces it. Steps keep their state: the Wizard only shows one at a time.
 */
export function Wizard({
  steps,
  value: valueProp,
  defaultValue,
  onValueChange,
  onFinish,
  navigation = "visited",
  orientation = "horizontal",
  finishLabel,
  footerStart,
  locale,
  labels,
  className,
  "aria-label": ariaLabel,
}: WizardProps) {
  const t = useMessages(stepperMessages, { labels, locale })
  const [value, setValue] = useControllable(valueProp, defaultValue ?? steps[0]?.id ?? "", onValueChange)
  const [done, setDone] = useState<Record<string, "complete" | "skipped">>({})
  const [errors, setErrors] = useState<Record<string, string | true>>({})
  const [checking, setChecking] = useState(false)
  const finish = useActionFeedback()
  const body = useRef<HTMLDivElement>(null)
  const moved = useRef(false)
  const titleId = useId()
  const at = Math.max(0, steps.findIndex((step) => step.id === value))
  const step = steps[at]
  const last = at === steps.length - 1

  // After a move (not on first render), focus the new step so its content is read next.
  useEffect(() => {
    if (!moved.current) return
    moved.current = false
    body.current?.focus({ preventScroll: false })
  }, [value])

  const go = (index: number) => {
    const target = steps[index]
    if (!target) return
    moved.current = true
    setValue(target.id)
  }

  /** Run the current step's check; record and return whether it passed. */
  const check = async () => {
    if (!step) return false
    let outcome: boolean | string | void
    try {
      setChecking(true)
      outcome = await step.validate?.()
    } catch (error) {
      outcome = error instanceof Error ? error.message : String(error)
    } finally {
      setChecking(false)
    }
    const passed = outcome === undefined || outcome === true
    setErrors(({ [step.id]: _, ...rest }) => (passed ? rest : { ...rest, [step.id]: typeof outcome === "string" ? outcome : true }))
    if (passed) setDone((prev) => ({ ...prev, [step.id]: "complete" }))
    return passed
  }

  const statusOf = (item: WizardStep): StepStatus | undefined => {
    if (errors[item.id]) return "error"
    if (item.id === value) return "current"
    return done[item.id] ?? "upcoming"
  }
  const message = step ? errors[step.id] : undefined

  return (
    <section className={cx("fa-wizard", className)} data-orientation={orientation} aria-label={ariaLabel}>
      <Stepper
        steps={steps.map(({ content: _content, validate: _validate, ...item }) => ({ ...item, status: statusOf(item as WizardStep) }))}
        value={value}
        navigation={navigation}
        orientation={orientation}
        locale={locale}
        labels={labels}
        onValueChange={(id) => go(steps.findIndex((item) => item.id === id))}
      />
      <div className="fa-wizard-main">
        <div ref={body} className="fa-wizard-body" tabIndex={-1} role="group" aria-labelledby={titleId}>
          <span id={titleId} className="sr-only">
            {t.stepOf(at + 1, steps.length)}: {step?.label}
          </span>
          {steps.map((item) => (
            // Every step stays mounted so its fields keep what was typed; only the current one shows.
            <div key={item.id} className="fa-wizard-step" hidden={item.id !== value}>
              {item.content}
            </div>
          ))}
        </div>
        <p className="fa-wizard-message" role="alert">
          {typeof message === "string" ? message : null}
        </p>
        <div className="fa-wizard-footer">
          <div className="fa-wizard-footer-start">{footerStart}</div>
          {at > 0 ? (
            <Button variant="ghost" onClick={() => go(at - 1)} disabled={checking}>
              {t.back}
            </Button>
          ) : null}
          {step?.optional && !last ? (
            <Button
              variant="secondary"
              disabled={checking}
              onClick={() => {
                setDone((prev) => ({ ...prev, [step.id]: "skipped" }))
                setErrors(({ [step.id]: _, ...rest }) => rest)
                go(at + 1)
              }}
            >
              {t.skip}
            </Button>
          ) : null}
          {last ? (
            <Button
              variant="primary"
              status={finish.status}
              pendingLabel={t.finishing}
              successLabel={t.finished}
              disabled={checking}
              onClick={async () => {
                if (finish.status === "pending" || !(await check())) return
                // An error from onFinish shows on the button; the application explains it.
                void finish.run(async () => onFinish())
              }}
            >
              {finishLabel ?? t.finish}
            </Button>
          ) : (
            <Button
              variant="primary"
              disabled={checking}
              onClick={async () => {
                if (await check()) go(at + 1)
              }}
            >
              {t.next}
            </Button>
          )}
        </div>
      </div>
    </section>
  )
}
