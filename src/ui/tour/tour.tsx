import { Popover as BasePopover } from "@base-ui/react/popover"
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from "react"
import { createPortal } from "react-dom"
import { useMessages } from "../../lib/i18n/use-messages.js"
import { prefersReducedMotion } from "../../lib/motion.js"
import { popupContainer } from "../../lib/popup-container.js"
import { usePopupMetrics } from "../../lib/popup-metrics.js"
import { useControllable } from "../../lib/use-controllable.js"
import { Button } from "../button/index.js"
import { fullyVisible, nextStep, spotlightPath } from "./geometry.js"
import { tourMessages } from "./messages.js"
import { markTourCompleted, tourCompleted } from "./storage.js"

/** Where a step points: a CSS selector, a ref, or a function that finds the element. */
export type TourTarget = string | RefObject<Element | null> | (() => Element | null)

/** One step of a tour. */
export interface TourStep {
  /** The element the step explains. Omit it for a step that is not about one element (a welcome): the card shows in the middle with nothing lit. */
  target?: TourTarget
  /** The card's title; it also names the card for assistive technology. Short and factual. */
  title: string
  /** One or two sentences: what the target is for. */
  body?: ReactNode
  /** The card's side of the target. Default bottom; it flips when there is no room. */
  placement?: "top" | "bottom" | "left" | "right" | "inline-start" | "inline-end"
  /** Extra content under the body, such as a link to the full guide or a control to try. */
  action?: ReactNode
  /** Runs before the step shows, to bring its target on screen (open a panel, switch a tab). The target is looked for once it resolves. */
  onEnter?: () => void | Promise<void>
}

/** Why the tour closed. */
export type TourCloseReason = "complete" | "skip" | "escape"

export interface TourProps {
  /** The steps, in order. A step whose target is missing is skipped (after `targetTimeout`). */
  steps: TourStep[]
  /** Whether the tour is showing. Controlled while defined. */
  open?: boolean
  /** Show the tour at first (uncontrolled). Ignored once `storageKey` records it as completed. */
  defaultOpen?: boolean
  /** Called with false and the reason when the tour finishes, is skipped or Esc closes it. */
  onOpenChange?: (open: boolean, details: { reason: TourCloseReason | "open" }) => void
  /** The current step's index. Controlled while defined. */
  step?: number
  /** The step shown first when the step is uncontrolled. Default 0. */
  defaultStep?: number
  /** Called with the step's index when Next, Back or the arrow keys change it, or a missing target is skipped. */
  onStepChange?: (step: number) => void
  /** Called when the person presses Done on the last step. */
  onComplete?: () => void
  /** Called with the step's index when the person skips the tour (Skip or Esc). */
  onSkip?: (step: number) => void
  /**
   * Remember completion in localStorage under this key: finishing or skipping records it, and
   * an uncontrolled tour does not open again. Include the user and the tour's version
   * ("onboarding:v2:user-42"). `useTourCompletion` reads and resets it.
   */
  storageKey?: string
  /** How long to wait for a step's target to appear (ms) before skipping it. Default 1000. */
  targetTimeout?: number
  /** Wording for this instance, over the language pack and `MessagesProvider`. */
  labels?: Partial<typeof tourMessages.defaults>
  /** BCP 47 locale for the wording. Default: the nearest `LocaleProvider`. */
  locale?: string
}

const useIsomorphicLayoutEffect = typeof window === "undefined" ? () => {} : useLayoutEffect

function resolveTarget(target: TourTarget | undefined): Element | null {
  if (!target) return null
  try {
    if (typeof target === "string") return document.querySelector(target)
    if (typeof target === "function") return target()
    return target.current
  } catch {
    return null
  }
}

const viewport = () => ({ width: document.documentElement.clientWidth, height: document.documentElement.clientHeight })

/**
 * A guided tour of an application's UI. Each step dims the page except its target (the
 * spotlight, in the scrim colour) and shows a card anchored to it with an arrow: the
 * title, a sentence or two, "Step 2 of 5", Skip, Back and Next (Done on the last step).
 * Targets scroll into view, and the spotlight and card follow them through scrolling and
 * resizing. A step whose target is missing waits up to `targetTimeout`, then is skipped.
 *
 * The card is a non-modal dialog named by its title: focus moves to it when the tour opens
 * and returns where it was when it closes, and nothing else on the page is made inert. ← and
 * → step while focus is in the card; Esc skips. The spotlight is decorative. Still and
 * reduced motion move the spotlight without animating.
 */
export function Tour({
  steps,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  step: stepProp,
  defaultStep = 0,
  onStepChange,
  onComplete,
  onSkip,
  storageKey,
  targetTimeout = 1000,
  labels,
  locale,
}: TourProps) {
  const t = useMessages(tourMessages, { labels, locale })
  const [initiallyOpen] = useState(() => defaultOpen && !(storageKey && tourCompleted(storageKey)))
  const [open, setOpen] = useControllable<boolean>(openProp, initiallyOpen)
  const [index, setIndex] = useControllable<number>(stepProp, defaultStep, onStepChange)
  const current = steps[index]
  const total = steps.length

  // ── Resolve the step's target (or skip it) ────────────────────────────────
  const [shown, setShown] = useState<{ index: number; element: Element | null } | null>(null)
  const direction = useRef<1 | -1>(1)
  const missing = useRef(new Set<number>())
  const returnFocus = useRef<HTMLElement | null>(null)

  const close = useCallback(
    (reason: TourCloseReason) => {
      if (storageKey) markTourCompleted(storageKey)
      if (reason === "complete") onComplete?.()
      else onSkip?.(index)
      setOpen(false)
      onOpenChange?.(false, { reason })
    },
    [storageKey, onComplete, onSkip, index, setOpen, onOpenChange],
  )

  // Opening: remember where focus was, and start from the first step (uncontrolled).
  const wasOpen = useRef(false)
  useIsomorphicLayoutEffect(() => {
    if (open && !wasOpen.current) {
      returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      missing.current = new Set()
      direction.current = 1
    }
    if (!open && wasOpen.current) {
      setShown(null)
      // The card is gone: focus goes back where it was when the tour opened (R20.3).
      if (document.activeElement === document.body || document.activeElement === null) returnFocus.current?.focus()
    }
    wasOpen.current = open
  }, [open])

  useEffect(() => {
    if (!open || !current) return
    let cancelled = false
    let observer: MutationObserver | null = null
    let timer: ReturnType<typeof setTimeout> | undefined
    const show = (element: Element | null) => {
      if (cancelled) return
      observer?.disconnect()
      clearTimeout(timer)
      if (element && !fullyVisible(element.getBoundingClientRect(), viewport()))
        element.scrollIntoView({ block: "center", inline: "nearest", behavior: prefersReducedMotion() ? "instant" : "smooth" })
      setShown({ index, element })
    }
    const skip = () => {
      if (cancelled) return
      observer?.disconnect()
      missing.current.add(index)
      const next = nextStep(total, index, direction.current, missing.current)
      const back = next < 0 && direction.current === -1 ? nextStep(total, index, 1, missing.current) : -1
      if (next >= 0) setIndex(next)
      else if (back >= 0) {
        direction.current = 1
        setIndex(back)
      } else close("complete")
    }
    const look = () => {
      if (!current.target) return show(null)
      const found = resolveTarget(current.target)
      if (found) return show(found)
      observer = new MutationObserver(() => {
        const element = resolveTarget(current.target)
        if (element) show(element)
      })
      observer.observe(document.body, { childList: true, subtree: true, attributes: true })
      timer = setTimeout(skip, targetTimeout)
    }
    Promise.resolve(current.onEnter?.()).then(look, look)
    return () => {
      cancelled = true
      observer?.disconnect()
      clearTimeout(timer)
    }
    // oxlint-disable-next-line react/exhaustive-effect-dependencies -- resolve once per step; close/setIndex are stable enough for a step's lifetime
  }, [open, index, current])

  const go = (to: number) => {
    if (to < 0 || to >= total) return
    direction.current = to > index ? 1 : -1
    missing.current.delete(to)
    setIndex(to)
  }

  // The card keeps showing the last resolved step until the next one's target is found, so
  // its content and anchor change together and it never closes between steps.
  const ready = open && shown !== null
  const element = shown?.element ?? null
  const shownIndex = shown?.index ?? index
  const step = steps[shownIndex]
  const last = nextStep(total, shownIndex, 1, missing.current) < 0
  const first = nextStep(total, shownIndex, -1, missing.current) < 0
  const titleId = useId()
  const bodyId = useId()
  const nextRef = useRef<HTMLButtonElement>(null)
  const popup = usePopupMetrics()

  // A point near the middle of the screen anchors a step with no target.
  const centre = useRef({
    getBoundingClientRect: () => {
      const view = viewport()
      return new DOMRect(view.width / 2, view.height * 0.3, 0, 0)
    },
  })

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const field = event.target instanceof HTMLElement && event.target.closest("input, textarea, select, [contenteditable='true']")
    if (field || event.altKey || event.ctrlKey || event.metaKey) return
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl"
    const forward = event.key === (rtl ? "ArrowLeft" : "ArrowRight")
    const backward = event.key === (rtl ? "ArrowRight" : "ArrowLeft")
    if (forward && !last) go(nextStep(total, shownIndex, 1, missing.current))
    else if (backward && !first) go(nextStep(total, shownIndex, -1, missing.current))
    else return
    event.preventDefault()
  }

  if (!open || typeof document === "undefined") return null
  const position = shownIndex + 1
  return (
    <>
      <Spotlight target={element} active={ready} />
      <BasePopover.Root
        open={ready}
        modal={false}
        onOpenChange={(next, details) => {
          // Only Esc closes the card; pressing outside it (the target, the page) does not.
          if (!next && details.reason === "escape-key") close("escape")
        }}
      >
        <BasePopover.Portal container={popupContainer()}>
          <BasePopover.Positioner
            className="fa-tour-positioner"
            anchor={element ?? centre.current}
            side={element ? (step?.placement ?? "bottom") : "bottom"}
            align="center"
            sideOffset={element ? popup.offset * 2 : 0}
            collisionPadding={popup.collisionPadding}
            arrowPadding={popup.rem}
          >
            <BasePopover.Popup
              className="glass-overlay fa-popup fa-tour-card"
              data-centred={element ? undefined : ""}
              aria-labelledby={titleId}
              aria-describedby={step?.body ? bodyId : undefined}
              initialFocus={nextRef}
              finalFocus={() => returnFocus.current ?? true}
              onKeyDown={onKeyDown}
            >
              {element ? <BasePopover.Arrow className="fa-tour-arrow" /> : null}
              <span className="sr-only" aria-live="polite">
                {step ? t.announce(position, total, step.title) : ""}
              </span>
              <BasePopover.Title id={titleId} className="fa-tour-title">
                {step?.title}
              </BasePopover.Title>
              {step?.body ? (
                <BasePopover.Description id={bodyId} className="fa-tour-body">
                  {step.body}
                </BasePopover.Description>
              ) : null}
              {step?.action ? <div className="fa-tour-action">{step.action}</div> : null}
              <div className="fa-tour-footer">
                <span className="fa-tour-progress" data-numeric aria-hidden>
                  {t.progress(position, total)}
                </span>
                {/* Hidden, not removed, so Back and Next never move (R9.6). */}
                <Button variant="ghost" size="sm" className="fa-tour-skip" data-hidden={last ? "" : undefined} onClick={() => close("skip")}>
                  {t.skip}
                </Button>
                <Button variant="ghost" size="sm" data-hidden={first ? "" : undefined} onClick={() => go(nextStep(total, shownIndex, -1, missing.current))}>
                  {t.back}
                </Button>
                <Button ref={nextRef} variant="primary" size="sm" onClick={() => (last ? close("complete") : go(nextStep(total, shownIndex, 1, missing.current)))}>
                  <span className="fa-tour-swap">
                    <span data-hidden={last ? "" : undefined}>{t.next}</span>
                    <span data-hidden={last ? undefined : ""}>{t.done}</span>
                  </span>
                </Button>
              </div>
            </BasePopover.Popup>
          </BasePopover.Positioner>
        </BasePopover.Portal>
      </BasePopover.Root>
    </>
  )
}

/**
 * The scrim with a hole over the target, drawn with clip-path so the target stays clickable
 * and the dimmed page does not take presses. It follows scrolling and resizing by writing
 * the path to the element (no re-render); a new step animates the hole there.
 */
function Spotlight({ target, active }: { target: Element | null; active: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const probe = useRef<HTMLSpanElement>(null)

  const write = useCallback(
    (animate: boolean) => {
      const element = ref.current
      const measure = probe.current?.getBoundingClientRect()
      if (!element || !measure) return
      element.toggleAttribute("data-animate", animate)
      const rect = target?.getBoundingClientRect() ?? null
      element.style.clipPath = `path(evenodd, "${spotlightPath(viewport(), rect, measure.width, measure.height)}")`
    },
    [target],
  )

  // A new target: animate the hole to it.
  useIsomorphicLayoutEffect(() => {
    write(active)
  }, [write, active])

  // Follow scrolling (any scroller) and resizing, one write per frame.
  useEffect(() => {
    let frame = 0
    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => write(false))
    }
    window.addEventListener("scroll", schedule, { capture: true, passive: true })
    window.addEventListener("resize", schedule)
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule)
    if (target) observer?.observe(target)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("scroll", schedule, { capture: true })
      window.removeEventListener("resize", schedule)
      observer?.disconnect()
    }
  }, [target, write])

  return createPortal(
    <div ref={ref} className="fa-tour-spotlight" data-active={active ? "" : undefined} aria-hidden>
      <span ref={probe} className="fa-tour-probe" />
    </div>,
    popupContainer() ?? document.body,
  )
}
