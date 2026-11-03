import {
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react"
import { cx } from "../../lib/cx.js"
import { readingKey } from "../../lib/direction.js"
import { useMessages } from "../../lib/i18n/use-messages.js"
import { formatPercent, numberFormat } from "../../lib/locale/intl.js"
import { useLocale } from "../../lib/locale/use-locale.js"
import { colorWheelMessages } from "./messages.js"
import { hueFamily, normalizeWheel, paintWheel, pointToWheel, type ColorWheelValue, type HueFamily } from "./wheel.js"

export interface ColorWheelProps {
  /** The value: `hue` in degrees and `amount` from 0 (neutral) to `max`. Pair with `onValueChange` to control it. */
  value?: ColorWheelValue
  /** The starting value when uncontrolled. Default `{ hue: 0, amount: 0 }`, neutral. */
  defaultValue?: ColorWheelValue
  /** Called with the new value on every change, while dragging too. */
  onValueChange?: (value: ColorWheelValue) => void
  /** Called once per gesture with the final value: when the pointer is released, on each key press, on a double press back to neutral. Not called when the gesture changed nothing. */
  onValueCommitted?: (value: ColorWheelValue) => void
  /** The amount at the rim. Default 100. The value never goes past it. */
  max?: number
  /** The amount per arrow key; pointer values snap to it too. Default `max / 100`. Shift and Page Up/Down take ten. */
  step?: number
  /** Degrees per arrow key; pointer values snap to it too. Default 1. Shift takes ten. */
  hueStep?: number
  /** Formats the amount in the readout and in its spoken value. Default: a percentage of `max` in the locale's form. */
  format?: (amount: number) => string
  /** Show the hue and amount under the wheel ("142° · 35%", or "Neutral"). Its line is reserved, so nothing moves as it changes. Default false. */
  readout?: boolean
  /** `md` (default) or `sm`, a smaller wheel and bead for tool panels, matching ColorPicker's sizes. The wheel shrinks to fit a narrower box; its hit area is the whole disc. */
  size?: "sm" | "md"
  /**
   * `disc` (default): the colour disc itself, grey at the centre and full colour at the rim, so the
   * colour under the bead is the colour chosen. `ring`: a hue ring around a recessed neutral well,
   * a quieter look where several wheels sit side by side; the bead carries the colour.
   */
  variant?: "disc" | "ring"
  disabled?: boolean
  /** Formatting and wording locale; defaults to the nearest LocaleProvider. */
  locale?: string
  /** Wording overrides for this wheel. */
  labels?: Partial<typeof colorWheelMessages.defaults>
  /** Layout only. */
  className?: string
  id?: string
  /** Accessible name for the wheel's group ("Shadows") when no visible label names it. Default "Colour wheel". */
  "aria-label"?: string
  /** IDs of elements that name the wheel's group. */
  "aria-labelledby"?: string
  /** IDs of elements that describe the wheel's group. */
  "aria-describedby"?: string
}

type Axis = "hue" | "amount"

const NEUTRAL: ColorWheelValue = { hue: 0, amount: 0 }
const CANVAS_SIZE = 320

const FAMILY_MESSAGE = {
  red: "hueRed",
  orange: "hueOrange",
  yellow: "hueYellow",
  green: "hueGreen",
  cyan: "hueCyan",
  blue: "hueBlue",
  purple: "huePurple",
  magenta: "hueMagenta",
} as const satisfies Record<HueFamily, keyof typeof colorWheelMessages.defaults>

const same = (a: ColorWheelValue, b: ColorWheelValue) => a.hue === b.hue && a.amount === b.amount

/** The disc's pixels, painted once and shared by every wheel on the page. */
let discPixels: ImageData | null = null
function paintDisc(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d")
  if (!context) return
  if (!discPixels) {
    paintWheel(canvas)
    discPixels = context.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE)
  } else context.putImageData(discPixels, 0, 0)
}

/**
 * A colour wheel: a hue and an amount around a neutral centre, the control for a colour balance,
 * a grade's shadows, midtones and highlights, or a tint. The value is `{ hue, amount }`: the OKLCH
 * hue in degrees, at its angle on the wheel (0° to the right of the centre, rising
 * counter-clockwise, in every language, as in a chart), and the amount from 0 at the centre to
 * `max` at the rim. The disc is drawn in OKLCH at one lightness, so the hues are evenly spaced and
 * equally strong; `colorWheelColor` gives the colour under the bead.
 *
 * Pointer: press or drag anywhere on the wheel; a double press returns to neutral.
 *
 * Keyboard: the wheel is one tab stop holding two sliders, Hue and Amount. Left and Right turn the
 * hue (Right raises the angle; in a right-to-left language the keys swap, as in every slider). Up
 * and Down change the amount, outward and back. Shift with an arrow takes ten steps; Page Up and
 * Page Down change the amount by ten steps; Home returns to neutral and End goes to the rim, both
 * keeping the hue. Focus moves to the slider whose value the key changed, so a screen reader
 * speaks the value that moved: the hue as its colour family and angle ("Green, 142°"), the
 * amount as a percentage of `max`, or "Neutral" at the centre. At the centre the hue is kept, so
 * the next step outward continues in it.
 */
export function ColorWheel({
  value,
  defaultValue = NEUTRAL,
  onValueChange,
  onValueCommitted,
  max = 100,
  step = max / 100,
  hueStep = 1,
  format,
  readout = false,
  size = "md",
  variant = "disc",
  disabled = false,
  locale: localeProp,
  labels,
  className,
  id,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
}: ColorWheelProps) {
  const t = useMessages(colorWheelMessages, { labels, locale: localeProp })
  const locale = useLocale(localeProp)
  const fit = (next: ColorWheelValue) => normalizeWheel(next, max, step, hueStep)
  const [inner, setInner] = useState(() => fit(defaultValue))
  const controlled = value !== undefined
  const shown = controlled ? fit(value) : inner
  const [axis, setAxis] = useState<Axis>("hue")

  const root = useRef<HTMLDivElement>(null)
  const field = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const inputs = { hue: useRef<HTMLInputElement>(null), amount: useRef<HTMLInputElement>(null) }
  const readoutLine = useRef<HTMLDivElement>(null)
  /** The value as last painted: during a drag it runs ahead of the rendered one. */
  const live = useRef(shown)
  const drag = useRef<{ pointerId: number; start: ColorWheelValue } | null>(null)

  const angle = (hue: number) =>
    numberFormat(locale, { style: "unit", unit: "degree", unitDisplay: "narrow", maximumFractionDigits: 1 }).format(hue)
  const amountText = (amount: number) => (format ? format(amount) : formatPercent(locale, max > 0 ? (amount / max) * 100 : 0, 1))
  const texts = (current: ColorWheelValue) => ({
    hue: t.hueValue({ name: t[FAMILY_MESSAGE[hueFamily(current.hue)]], angle: angle(current.hue) }),
    amount: current.amount === 0 ? t.neutral : amountText(current.amount),
    readout: current.amount === 0 ? t.neutral : t.readout({ angle: angle(current.hue), amount: amountText(current.amount) }),
  })
  const latest = useRef({ texts, shown, controlled, max })
  latest.current = { texts, shown, controlled, max }

  /** Move the bead and update the sliders without a render (R18.5). */
  const paint = (next: ColorWheelValue) => {
    live.current = next
    const words = latest.current.texts(next)
    const element = root.current
    if (!element) return
    element.style.setProperty("--_h", String(next.hue))
    element.style.setProperty("--_a", String(latest.current.max > 0 ? next.amount / latest.current.max : 0))
    const hue = inputs.hue.current
    const amount = inputs.amount.current
    if (hue) {
      hue.value = String(next.hue)
      hue.setAttribute("aria-valuetext", words.hue)
    }
    if (amount) {
      amount.value = String(next.amount)
      amount.setAttribute("aria-valuetext", words.amount)
    }
    if (readoutLine.current) readoutLine.current.textContent = words.readout
  }

  // The rendered value, whenever no drag is running ahead of it.
  useLayoutEffect(() => {
    if (!drag.current) paint(shown)
  })

  useLayoutEffect(() => {
    if (variant === "disc" && canvas.current) paintDisc(canvas.current)
  }, [variant])

  /**
   * Report a value; returns whether it changed. A drag paints ahead of the render; otherwise a
   * controlled wheel waits for its host's render, so a value the host refuses never shows.
   */
  const emit = (next: ColorWheelValue, commit: boolean) => {
    const fitted = fit(next)
    if (same(fitted, live.current)) return false
    if (drag.current || !controlled) paint(fitted)
    onValueChange?.(fitted)
    if (!drag.current && !controlled) setInner(fitted)
    if (commit) onValueCommitted?.(fitted)
    return true
  }

  const fromPointer = (event: PointerEvent<HTMLElement>): ColorWheelValue => {
    const rect = field.current!.getBoundingClientRect()
    const radius = rect.width / 2
    return pointToWheel(event.clientX - rect.left - radius, event.clientY - rect.top - rect.height / 2, radius, max, live.current.hue)
  }

  const focusAxis = (next: Axis) => {
    setAxis(next)
    const input = inputs[next].current
    if (input && document.activeElement !== input) input.focus({ preventScroll: true })
  }

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    const gesture = drag.current
    if (!gesture || gesture.pointerId !== event.pointerId) return
    drag.current = null
    const final = live.current
    if (latest.current.controlled) paint(latest.current.shown)
    else setInner(final)
    if (!same(final, gesture.start)) onValueCommitted?.(final)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // Any key shows the focus ring a press left hidden.
    root.current?.removeAttribute("data-pointer-focus")
    const current = live.current
    const many = event.shiftKey ? 10 : 1
    let next: ColorWheelValue
    let to: Axis = "amount"
    switch (readingKey(event.key, event.currentTarget)) {
      case "ArrowRight":
        next = { ...current, hue: current.hue + hueStep * many }
        to = "hue"
        break
      case "ArrowLeft":
        next = { ...current, hue: current.hue - hueStep * many }
        to = "hue"
        break
      case "ArrowUp":
        next = { ...current, amount: current.amount + step * many }
        break
      case "ArrowDown":
        next = { ...current, amount: current.amount - step * many }
        break
      case "PageUp":
        next = { ...current, amount: current.amount + step * 10 }
        break
      case "PageDown":
        next = { ...current, amount: current.amount - step * 10 }
        break
      case "Home":
        next = { ...current, amount: 0 }
        break
      case "End":
        next = { ...current, amount: max }
        break
      default:
        return
    }
    event.preventDefault()
    emit(next, true)
    focusAxis(to)
  }

  // A screen reader's own increment (a swipe, a volume key) changes the native input.
  const onInput = (which: Axis) => (event: ChangeEvent<HTMLInputElement>) => {
    const number = Number(event.currentTarget.value)
    if (Number.isFinite(number)) emit({ ...live.current, [which]: number }, true)
    // Until a render says otherwise, the input shows the value the wheel holds.
    event.currentTarget.value = String(live.current[which])
  }

  const words = texts(shown)
  const fraction = max > 0 ? shown.amount / max : 0

  return (
    <div
      ref={root}
      id={id}
      role="group"
      aria-label={ariaLabelledBy ? undefined : (ariaLabel ?? t.wheel)}
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
      className={cx("fa-color-wheel", className)}
      data-size={size === "md" ? undefined : size}
      data-variant={variant}
      data-disabled={disabled ? "" : undefined}
      style={{ "--_h": String(shown.hue), "--_a": String(fraction) } as CSSProperties}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) event.currentTarget.removeAttribute("data-pointer-focus")
      }}
    >
      {/* oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- the pointer surface; the sliders inside take the keyboard */}
      <div
        className="fa-color-wheel-disc"
        onPointerDown={(event) => {
          if (disabled || (event.pointerType === "mouse" && event.button !== 0)) return
          event.currentTarget.setPointerCapture(event.pointerId)
          root.current?.setAttribute("data-pointer-focus", "")
          drag.current = { pointerId: event.pointerId, start: live.current }
          focusAxis(axis)
          emit(fromPointer(event), false)
        }}
        // The press's default would move focus off the slider it just focused.
        onMouseDown={(event) => event.preventDefault()}
        onPointerMove={(event) => {
          if (drag.current?.pointerId === event.pointerId) emit(fromPointer(event), false)
        }}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={() => {
          if (!disabled) emit({ ...live.current, amount: 0 }, true)
        }}
      >
        <span className="fa-color-wheel-ring" aria-hidden />
        <div ref={field} className="fa-color-wheel-field">
          {variant === "disc" ? (
            <canvas ref={canvas} className="fa-color-wheel-canvas" width={CANVAS_SIZE} height={CANVAS_SIZE} aria-hidden />
          ) : null}
          <span className="fa-color-wheel-bead">
            <input
              ref={inputs.hue}
              type="range"
              className="fa-color-wheel-input"
              aria-label={t.hue}
              aria-valuetext={words.hue}
              min={0}
              max={360 - hueStep}
              step={hueStep}
              defaultValue={shown.hue}
              tabIndex={axis === "hue" ? 0 : -1}
              disabled={disabled}
              onFocus={() => setAxis("hue")}
              onKeyDown={onKeyDown}
              onChange={onInput("hue")}
            />
            <input
              ref={inputs.amount}
              type="range"
              className="fa-color-wheel-input"
              aria-label={t.amount}
              aria-valuetext={words.amount}
              min={0}
              max={max}
              step={step}
              defaultValue={shown.amount}
              tabIndex={axis === "amount" ? 0 : -1}
              disabled={disabled}
              onFocus={() => setAxis("amount")}
              onKeyDown={onKeyDown}
              onChange={onInput("amount")}
            />
          </span>
        </div>
      </div>
      {readout ? (
        <div ref={readoutLine} className="fa-color-wheel-readout" aria-hidden>
          {words.readout}
        </div>
      ) : null}
    </div>
  )
}
