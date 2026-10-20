/**
 * Container-aware forms (R7): a control drawn in one of a few forms, widest first ("full",
 * "icons", "menu"), shows the widest that fits the box it is given. Shared by Segmented and
 * SwatchPicker.
 *
 *   room        the parent's content width, or the control's own width when it overflows
 *               inside a flex row whose siblings take part of the parent (a toolbar)
 *   widths      the natural width of each form, measured off-screen so it is known whatever
 *               form is shown; the last form is the fallback and always "fits"
 *   hysteresis  a form that overflowed is not tried again until the parent grows past the
 *               room it failed in, so the control never flips back and forth
 *
 *   import { useFitForm } from "glass-ux/fit-form"
 */
import { useLayoutEffect, useRef, useState, type RefObject } from "react"
import { observeElementSizes } from "./resize-observer.js"

/** The natural width of each form; `null` (or missing) when the form is not available. The last form needs no width. */
export type FitWidths<F extends string> = Partial<Record<F, number | null>>

/** A form that overflowed, and the parent's room when it did. */
export interface FitFailure<F extends string> {
  form: F
  room: number
}

/** One measurement of a control against its container. */
export interface FitMeasurement<F extends string> {
  /** The natural width of each form. */
  widths: FitWidths<F>
  /** The parent's content width. */
  parentRoom: number
  /** The control's own width (its share of a flex row). */
  ownRoom: number
  /** The shown form spills out of the control's own box. */
  overflowing: boolean
}

/** The widest form (first in `forms`) whose natural width fits `room`; the last form otherwise. Tolerates sub-pixel rounding. */
export function fitForm<F extends string>(forms: readonly F[], widths: FitWidths<F>, room: number): F {
  for (let index = 0; index < forms.length - 1; index++) {
    const form = forms[index] as F
    const width = widths[form]
    if (width != null && width <= room + 0.5) return form
  }
  return forms[forms.length - 1] as F
}

/**
 * The next form, from the one shown now. When the shown form overflows its own box, its own
 * width is the room, and the parent's room is remembered: that form is not tried again until
 * the parent grows past it. Pure, so it is unit-tested apart from the DOM.
 */
export function nextFitForm<F extends string>(
  forms: readonly F[],
  shown: F,
  { widths, parentRoom, ownRoom, overflowing }: FitMeasurement<F>,
  failed: FitFailure<F> | null
): { form: F; failed: FitFailure<F> | null } {
  const rank = (form: F) => forms.indexOf(form)
  const last = forms[forms.length - 1] as F
  if (overflowing) {
    const form = fitForm(forms, widths, ownRoom)
    return { form: rank(form) > rank(shown) ? form : last, failed: { form: shown, room: parentRoom } }
  }
  const blocked = failed && parentRoom <= failed.room + 0.5 ? failed : null
  const form = fitForm(forms, widths, parentRoom)
  if (blocked && rank(form) <= rank(blocked.form)) return { form: shown, failed: blocked }
  return { form, failed: blocked }
}

/** The content width of an element (inside its padding). */
export function contentWidth(element: HTMLElement): number {
  const style = getComputedStyle(element)
  return element.clientWidth - (Number.parseFloat(style.paddingLeft) || 0) - (Number.parseFloat(style.paddingRight) || 0)
}

/**
 * Whether a row's last item ends past the row's own box (beyond its end padding), with a
 * pixel of tolerance. Measures the items, not scrollWidth, which would also count an
 * indicator mid-slide.
 */
export function overflowsOwnBox(root: HTMLElement, lastItem: HTMLElement | null): boolean {
  if (!lastItem) return false
  const pad = Number.parseFloat(getComputedStyle(root).paddingRight) || 0
  return lastItem.offsetLeft + lastItem.offsetWidth + pad > root.clientWidth + 1
}

/** Options for {@link useFitForm}: the forms, the root to measure and how to read widths. */
export interface UseFitFormOptions<F extends string> {
  /** The forms, widest first. The last is the fallback, chosen when nothing else fits. */
  forms: readonly F[]
  /** The form before the first measurement. Default: the first. */
  initial?: F
  /** Measure only while true (the control's `collapse` is "auto"). */
  enabled: boolean
  /** The control's root. It must render `data-form` with the form shown; its parent offers the room. */
  ref: RefObject<HTMLElement | null>
  /** Elements whose size changes the natural widths: an off-screen measuring row. */
  observe?: ReadonlyArray<RefObject<Element | null>>
  /** Reads the natural widths and whether the shown form spills out of the root's own box. */
  measure: (root: HTMLElement, shown: F) => { widths: FitWidths<F>; overflowing: boolean }
  /** Changes that need a fresh measurement (a signature of the options). */
  signature?: string
}

const useIsoLayoutEffect = typeof window === "undefined" ? () => {} : useLayoutEffect

/**
 * The widest form that fits the control's box, re-measured when the root, its parent or an
 * observed element changes size (one shared ResizeObserver, at most once a frame). A form
 * that overflowed is not retried until the parent grows past the room it failed in
 * ({@link nextFitForm}). A retry that overflows again is undone in the same layout pass,
 * before paint, so growing a container never flickers.
 */
export function useFitForm<F extends string>({ forms, initial, enabled, ref, observe, measure, signature = "" }: UseFitFormOptions<F>): F {
  const [measured, setMeasured] = useState<F>(initial ?? (forms[0] as F))
  const failed = useRef<FitFailure<F> | null>(null)
  const latest = useRef({ forms, measure, observe })
  latest.current = { forms, measure, observe }
  const formsKey = forms.join("|")
  useIsoLayoutEffect(() => {
    const root = ref.current
    const parent = root?.parentElement
    if (!enabled || !root || !parent) return
    let frame = 0
    const check = () => {
      frame = 0
      const { forms: order, measure: read } = latest.current
      // Read the DOM outside the state updater (it must stay pure): it tells the form on screen.
      const attribute = root.getAttribute("data-form") as F | null
      const shown = attribute && order.includes(attribute) ? attribute : (order[0] as F)
      const { widths, overflowing } = read(root, shown)
      const next = nextFitForm(order, shown, { widths, parentRoom: contentWidth(parent), ownRoom: root.clientWidth, overflowing }, failed.current)
      failed.current = next.failed
      setMeasured(next.form)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(check)
    }
    check()
    const observer = observeElementSizes(schedule)
    observer.observe(root)
    observer.observe(parent)
    for (const extra of latest.current.observe ?? []) if (extra.current) observer.observe(extra.current)
    return () => {
      if (frame) cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [enabled, measured, signature, formsKey, ref])
  return measured
}
