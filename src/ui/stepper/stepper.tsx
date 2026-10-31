import { useEffect, useRef, type CSSProperties, type ReactNode, type RefObject } from "react"
import { IconCheck } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { useMessages } from "../../lib/i18n/use-messages.js"
import { listFormat } from "../../lib/locale/intl.js"
import { useLocale } from "../../lib/locale/use-locale.js"
import { prefersReducedMotion } from "../../lib/motion.js"
import { stepperMessages } from "./messages.js"

/**
 * What a step's marker shows. `current` is derived from `value` when a step does not set its
 * own status. Being the current step (`value`) is separate: a complete step can be current too.
 */
export type StepStatus = "upcoming" | "current" | "complete" | "error" | "skipped"

export interface StepItem {
  id: string
  /** The step's name ("Connect the site"). */
  label: ReactNode
  /** One line under the label. */
  description?: ReactNode
  /** Marks the step "Optional" under its label. */
  optional?: boolean
  /**
   * The step's marker: a number, a check (`complete`), "!" (`error`) or dashed (`skipped`).
   * Default: complete before `value`, current at it, upcoming after. Set it when completion
   * does not follow order; the step at `value` keeps its "you are here" highlight and
   * `aria-current` whatever its status.
   */
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
  /** The step the person is on (or, with `sections`, the one in view): `aria-current="step"` and the current highlight. */
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
  /**
   * Section navigation for one long scrolling page: each step's section element. The Stepper
   * reports the section in view through `onValueChange` as the page scrolls (the section at
   * the top third, or the last one when scrolled to the end), and choosing a step scrolls its
   * section into view, smoothly unless motion is reduced. Use with `navigation="any"`.
   */
  sections?: Readonly<Record<string, RefObject<HTMLElement | null>>>
  /** The element that scrolls the sections. Default: the first section's nearest scrolling ancestor. */
  scrollContainer?: RefObject<HTMLElement | null>
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

/** The nearest ancestor that scrolls vertically, or the document's scrolling element. */
function scrollParent(element: HTMLElement): HTMLElement {
  for (let node = element.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node)
    if ((overflowY === "auto" || overflowY === "scroll") && node.scrollHeight > node.clientHeight) return node
  }
  return (document.scrollingElement as HTMLElement | null) ?? document.documentElement
}

/**
 * Follow the section in view and scroll to a chosen one. While a chosen section is being
 * scrolled to, the sections passed on the way are not reported, so the highlight goes
 * straight to the choice.
 */
function useSections(
  steps: StepItem[],
  sections: StepperProps["sections"],
  scrollContainer: StepperProps["scrollContainer"],
  value: string,
  onValueChange: StepperProps["onValueChange"],
) {
  const latest = useRef({ steps, value, onValueChange })
  latest.current = { steps, value, onValueChange }
  const target = useRef<{ id: string; until: number } | null>(null)

  useEffect(() => {
    if (!sections) return
    const first = Object.values(sections).find((ref) => ref.current)?.current
    if (!first) return
    const container = scrollContainer?.current ?? scrollParent(first)
    const page = container === document.scrollingElement || container === document.documentElement
    const events: EventTarget = page ? window : container
    let frame = 0
    const check = () => {
      frame = 0
      const { steps: list, value: shown, onValueChange: report } = latest.current
      const top = page ? 0 : container.getBoundingClientRect().top
      const height = page ? window.innerHeight : container.clientHeight
      const line = top + height / 3
      const atEnd = container.scrollTop + container.clientHeight >= container.scrollHeight - 2
      let inView = list[0]?.id
      for (const step of list) {
        const element = sections[step.id]?.current
        if (!element) continue
        if (atEnd || element.getBoundingClientRect().top <= line) inView = step.id
      }
      const aim = target.current
      if (aim) {
        if (inView !== aim.id && performance.now() < aim.until) return
        target.current = null
      }
      if (inView && inView !== shown) report?.(inView)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(check)
    }
    const settle = () => {
      target.current = null
      schedule()
    }
    events.addEventListener("scroll", schedule, { passive: true })
    events.addEventListener("scrollend", settle)
    window.addEventListener("resize", schedule)
    schedule()
    return () => {
      cancelAnimationFrame(frame)
      events.removeEventListener("scroll", schedule)
      events.removeEventListener("scrollend", settle)
      window.removeEventListener("resize", schedule)
    }
  }, [sections, scrollContainer])

  return (id: string) => {
    const element = sections?.[id]?.current
    if (!element) return false
    const smooth = !prefersReducedMotion()
    target.current = { id, until: performance.now() + (smooth ? 1500 : 100) }
    element.scrollIntoView({ block: "start", behavior: smooth ? "smooth" : "auto" })
    return true
  }
}

/**
 * Progress through a multi-step task: numbered markers joined by a line, a check on finished
 * steps and a mark on steps that need attention. It shows progress; the content and the
 * Back and Next buttons belong to the page or a Wizard. With `sections` it is the section
 * navigation of one long page, following the section in view.
 */
export function Stepper({
  steps,
  value,
  onValueChange,
  navigation = "none",
  orientation = "horizontal",
  children,
  sections,
  scrollContainer,
  locale,
  labels,
  className,
  "aria-label": ariaLabel,
}: StepperProps) {
  const t = useMessages(stepperMessages, { labels, locale })
  const language = useLocale(locale)
  const scrollTo = useSections(steps, sections, scrollContainer, value, onValueChange)
  const statuses = stepStatuses(steps, value)
  const found = steps.findIndex((step) => step.id === value)
  const at = Math.max(0, found)
  const current = steps[at]
  const reachable = (index: number) => {
    if (navigation === "none" || steps[index]!.disabled || index === at) return false
    if (navigation === "any") return true
    return statuses[index] !== "upcoming"
  }
  const statusText: Partial<Record<StepStatus, string>> = { complete: t.complete, error: t.error, skipped: t.skipped }

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
          const isCurrent = index === found
          const canGo = reachable(index)
          // The marker's state, then whether this is the current step: "complete, current".
          const spoken = listFormat(language, { type: "unit", style: "short" }).format([statusText[status], isCurrent ? t.current : undefined].filter((part): part is string => Boolean(part)))
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
              {spoken ? <span className="sr-only">, {spoken}</span> : null}
            </span>
          )
          return (
            <li
              key={step.id}
              className="fa-stepper-step"
              data-status={status}
              data-current={isCurrent ? "" : undefined}
              data-disabled={step.disabled ? "" : undefined}
              aria-current={isCurrent ? "step" : undefined}
            >
              {canGo ? (
                <button
                  type="button"
                  className="fa-stepper-target fa-pressable"
                  onClick={() => {
                    scrollTo(step.id)
                    onValueChange?.(step.id)
                  }}
                >
                  {marker}
                  {text}
                </button>
              ) : (
                <span className="fa-stepper-target">
                  {marker}
                  {text}
                </span>
              )}
              {orientation === "vertical" && isCurrent && children ? <div className="fa-stepper-content">{children}</div> : null}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
