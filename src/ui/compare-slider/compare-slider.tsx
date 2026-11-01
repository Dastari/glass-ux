import { useEffect, useRef, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from "react"
import { IconArrowLeftRight } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { isRtl, readingKey } from "../../lib/direction.js"
import { useMessages } from "../../lib/i18n/index.js"
import { formatPercent } from "../../lib/locale/intl.js"
import { useLocale } from "../../lib/locale/use-locale.js"
import { useControllable } from "../../lib/use-controllable.js"
import { compareSliderMessages } from "./messages.js"

export interface CompareSliderProps {
  /** Shown from the reading start (or the top) up to the divider. Any content: an image, a chart, text. */
  before: ReactNode
  /** Shown from the divider to the reading end (or the bottom). Keep it the same size as `before`. */
  after: ReactNode
  /** How much of `before` shows, from 0 to 100 percent. Pair with `onValueChange` to control it. */
  value?: number
  /** The starting position when uncontrolled. Default 50. */
  defaultValue?: number
  /** Called with the percentage when a drag is released, on a press and on each key. A drag writes the position directly until then. */
  onValueChange?: (value: number) => void
  /** Which way the divider travels. Default `horizontal`. */
  orientation?: "horizontal" | "vertical"
  /** A short name over the `before` side: "Before", "2024". */
  beforeLabel?: ReactNode
  /** A short name over the `after` side. */
  afterLabel?: ReactNode
  /** Percent per arrow key. Default 1; Shift, Page Up and Page Down take ten. */
  step?: number
  disabled?: boolean
  /** The divider's accessible name. Default "Comparison position". */
  "aria-label"?: string
  /** Formatting and wording locale; defaults to the nearest LocaleProvider. */
  locale?: string
  /** Layout only. */
  className?: string
}

const clamp = (value: number) => Math.min(100, Math.max(0, value))
const round = (value: number) => Math.round(value * 10) / 10
const INTERACTIVE = "a, button, input, select, textarea, label, summary, [tabindex], [contenteditable='true']"

/**
 * Two pieces of content over each other with a divider between them: a before and after of an
 * image, a chart, a page. Drag the divider, press anywhere to move it there, or focus it and use
 * the arrow keys (Shift, Page Up and Page Down for ten percent, Home and End for the ends).
 * `before` starts at the reading start, so the sides change places in right-to-left languages and
 * the arrows still move the divider the way they point. The two contents are laid over each
 * other, and the taller decides the height. Controls inside them keep working.
 */
export function CompareSlider({
  before,
  after,
  value: valueProp,
  defaultValue = 50,
  onValueChange,
  orientation = "horizontal",
  beforeLabel,
  afterLabel,
  step = 1,
  disabled = false,
  "aria-label": ariaLabel,
  locale: localeProp,
  className,
}: CompareSliderProps) {
  const t = useMessages(compareSliderMessages, { locale: localeProp })
  const locale = useLocale(localeProp)
  const [value, setValue] = useControllable(valueProp, defaultValue, onValueChange)
  const root = useRef<HTMLDivElement>(null)
  const handle = useRef<HTMLDivElement>(null)
  const dragging = useRef<number | null>(null)
  const live = useRef(value)
  const shown = clamp(value)
  const vertical = orientation === "vertical"

  /** Move the divider without a render: the custom property and the slider's state. */
  const paint = (next: number) => {
    live.current = next
    root.current?.style.setProperty("--_split", `${next}%`)
    handle.current?.setAttribute("aria-valuenow", String(next))
    handle.current?.setAttribute("aria-valuetext", formatPercent(locale, next))
  }
  // The value as rendered, once any drag has let go; a host may have refused the last one.
  useEffect(() => {
    if (dragging.current === null) paint(shown)
  })

  const fromPointer = (event: PointerEvent<HTMLDivElement>) => {
    const element = root.current
    if (!element) return live.current
    const rect = element.getBoundingClientRect()
    const fraction = vertical ? (event.clientY - rect.top) / (rect.height || 1) : (event.clientX - rect.left) / (rect.width || 1)
    return round(clamp((!vertical && isRtl(element) ? 1 - fraction : fraction) * 100))
  }

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled || (event.pointerType === "mouse" && event.button !== 0)) return
    const target = event.target as HTMLElement
    const onHandle = handle.current?.contains(target)
    // Only a control inside the content counts: a scroller around the slider may be focusable too.
    const control = target.closest(INTERACTIVE)
    if (!onHandle && control && event.currentTarget.contains(control)) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragging.current = event.pointerId
    handle.current?.focus({ preventScroll: true })
    if (!onHandle) paint(fromPointer(event))
  }
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dragging.current === event.pointerId) paint(fromPointer(event))
  }
  const onPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (dragging.current !== event.pointerId) return
    dragging.current = null
    if (live.current !== shown) setValue(live.current)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return
    const key = readingKey(event.key, event.currentTarget)
    const large = Math.max(step, 10)
    const amount = event.shiftKey ? large : step
    const steps: Record<string, number> = {
      [vertical ? "ArrowDown" : "ArrowRight"]: shown + amount,
      [vertical ? "ArrowUp" : "ArrowLeft"]: shown - amount,
      PageUp: shown + large,
      PageDown: shown - large,
      Home: 0,
      End: 100,
    }
    const next = steps[key]
    if (next === undefined) return
    event.preventDefault()
    const clamped = round(clamp(next))
    paint(clamped)
    setValue(clamped)
  }

  return (
    // oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- the pointer surface; the divider inside is the slider
    <div
      ref={root}
      className={cx("fa-compare", className)}
      data-orientation={orientation}
      data-disabled={disabled ? "" : undefined}
      style={{ "--_split": `${shown}%` } as CSSProperties}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
    >
      <div className="fa-compare-pane" data-side="after">
        {after}
        {afterLabel ? <span className="fa-compare-label over-imagery">{afterLabel}</span> : null}
      </div>
      <div className="fa-compare-pane" data-side="before">
        {before}
        {beforeLabel ? <span className="fa-compare-label over-imagery">{beforeLabel}</span> : null}
      </div>
      <span className="fa-compare-line" aria-hidden />
      <div
        ref={handle}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        className="fa-compare-handle"
        aria-label={ariaLabel ?? t.label}
        aria-orientation={orientation}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={shown}
        aria-valuetext={formatPercent(locale, shown)}
        aria-disabled={disabled || undefined}
        onKeyDown={onKeyDown}
      >
        <IconArrowLeftRight aria-hidden />
      </div>
    </div>
  )
}
