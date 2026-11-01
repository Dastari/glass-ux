import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react"
import { IconPlus, IconTrash } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { useMessages } from "../../lib/i18n/use-messages.js"
import { formatPercent, numberFormat } from "../../lib/locale/intl.js"
import { useLocale } from "../../lib/locale/use-locale.js"
import { useControllable } from "../../lib/use-controllable.js"
import { Button } from "../button/index.js"
import { ColorPicker, type ColorSwatch } from "../color-picker/index.js"
import { Field } from "../field/index.js"
import { NumberField } from "../number-field/index.js"
import { Segmented } from "../segmented/index.js"
import { addGradientStop, DEFAULT_GRADIENT, gradientStopsCss, gradientToCss, moveGradientStop, removeGradientStop, type GradientKind, type GradientStop, type GradientValue } from "./gradient.js"
import { gradientPickerMessages } from "./messages.js"

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect

const KINDS: readonly GradientKind[] = ["linear", "radial", "angular"]

export interface GradientPickerProps {
  /** The gradient. Pair with `onValueChange` to control it. */
  value?: GradientValue
  /** The starting gradient when uncontrolled. Default: a mid blue to a pale violet. */
  defaultValue?: GradientValue
  /** Called with the gradient when a change is finished: a stop or colour drag released, a key, a typed number. A drag only repaints until then. */
  onValueChange?: (value: GradientValue) => void
  /** The types to offer, in order. Default all three. */
  kinds?: readonly GradientKind[]
  /** The most stops a gradient may hold. Default 8. */
  maxStops?: number
  /** Offer opacity on each stop (`#rrggbbaa`). Default false. */
  alpha?: boolean
  /** Preset colours for a stop. */
  swatches?: ColorSwatch[]
  /** Offer the browser's eyedropper where it has one. Default true. */
  eyeDropper?: boolean
  disabled?: boolean
  /** Formatting and wording locale; defaults to the nearest LocaleProvider. */
  locale?: string
  /** Wording overrides for this picker. */
  labels?: Partial<typeof gradientPickerMessages.defaults>
  /** Layout only. */
  className?: string
  id?: string
  /** Accessible name for the picker group when no visible label names it. */
  "aria-label"?: string
  /** IDs of elements that name the picker. */
  "aria-labelledby"?: string
}

const round = (value: number) => Math.round(value * 10) / 10

/**
 * A gradient built on ColorPicker: linear, radial or angular, with stops along a rail. Drag a stop,
 * press the rail to add one, or use Add stop and the Position field, which need no drag. Each stop
 * is a slider: arrow keys move it (Shift for ten percent), Home and End go to the ends and Delete
 * removes it. The rail follows the gradient's own axis, left to right in every language, as the
 * colour picker's axes do. The value is `GradientValue`; `gradientToCss` turns it into CSS, and the
 * preview shows that same string, in sRGB, so it looks the same on any display.
 */
export function GradientPicker({
  value: valueProp,
  defaultValue = DEFAULT_GRADIENT,
  onValueChange,
  kinds = KINDS,
  maxStops = 8,
  alpha = false,
  swatches,
  eyeDropper,
  disabled = false,
  locale: localeProp,
  labels,
  className,
  id,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
}: GradientPickerProps) {
  const t = useMessages(gradientPickerMessages, { labels, locale: localeProp })
  const locale = useLocale(localeProp)
  const [value, setValue] = useControllable(valueProp, defaultValue, onValueChange)
  const [selected, setSelected] = useState(0)
  const root = useRef<HTMLDivElement>(null)
  const rail = useRef<HTMLDivElement>(null)
  const thumbs = useRef(new Map<number, HTMLDivElement>())
  const drag = useRef<{ pointer: number; index: number; moved: boolean } | null>(null)
  /** What shows now, ahead of `value` during a drag. */
  const live = useRef(value)
  /** A stop that should take focus once it has rendered in its new place. */
  const focusNext = useRef<number | null>(null)
  const stops = value.stops
  const index = Math.min(selected, stops.length - 1)
  const stop = stops[index]!
  const percent = (position: number) => formatPercent(locale, position, 1)
  const number = numberFormat(locale)

  /** Show a gradient without a render: the preview, the rail and the stops' places. */
  const paint = (next: GradientValue) => {
    live.current = next
    root.current?.style.setProperty("--_gradient", gradientToCss(next))
    root.current?.style.setProperty("--_rail", `linear-gradient(to right, ${gradientStopsCss(next)})`)
    next.stops.forEach((item, at) => {
      const thumb = thumbs.current.get(at)
      if (!thumb) return
      thumb.style.setProperty("--_position", `${item.position}%`)
      thumb.style.setProperty("--_stop", item.color)
      thumb.setAttribute("aria-valuenow", String(item.position))
      thumb.setAttribute("aria-valuetext", t.stopValue(percent(item.position), item.color))
    })
  }
  const commit = (next: GradientValue, nextIndex = index) => {
    live.current = next
    setSelected(nextIndex)
    setValue(next)
  }

  // Back to the value as rendered: a host may have refused the last change.
  useIsomorphicLayoutEffect(() => {
    if (!drag.current) paint(value)
    if (focusNext.current !== null) {
      thumbs.current.get(focusNext.current)?.focus()
      focusNext.current = null
    }
  })

  const positionAt = (event: { clientX: number }) => {
    const rect = rail.current?.getBoundingClientRect()
    return rect ? round(((event.clientX - rect.left) / (rect.width || 1)) * 100) : 0
  }

  const onThumbDown = (event: PointerEvent<HTMLDivElement>, at: number) => {
    if (disabled || (event.pointerType === "mouse" && event.button !== 0)) return
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { pointer: event.pointerId, index: at, moved: false }
    setSelected(at)
  }
  const onThumbMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current
    if (!current || current.pointer !== event.pointerId) return
    current.moved = true
    const position = Math.min(100, Math.max(0, positionAt(event)))
    paint({ ...live.current, stops: live.current.stops.map((item, at) => (at === current.index ? { ...item, position } : item)) })
  }
  const onThumbEnd = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current
    if (!current || current.pointer !== event.pointerId) return
    drag.current = null
    if (!current.moved) return
    const moved = moveGradientStop(live.current, current.index, live.current.stops[current.index]!.position)
    focusNext.current = moved.index
    commit(moved.value, moved.index)
  }

  const add = (position?: number) => {
    if (disabled || stops.length >= maxStops) return
    const added = addGradientStop(value, position)
    focusNext.current = added.index
    commit(added.value, added.index)
  }
  const remove = (at: number) => {
    if (disabled || stops.length <= 2) return
    focusNext.current = Math.min(at, stops.length - 2)
    commit(removeGradientStop(value, at), focusNext.current)
  }
  const move = (at: number, position: number) => {
    const moved = moveGradientStop(value, at, position)
    if (document.activeElement === thumbs.current.get(at)) focusNext.current = moved.index
    commit(moved.value, moved.index)
  }
  const recolour = (color: string): GradientValue => ({ ...live.current, stops: live.current.stops.map((item, at) => (at === index ? { ...item, color } : item)) })

  const onThumbKey = (event: KeyboardEvent<HTMLDivElement>, at: number, item: GradientStop) => {
    if (disabled) return
    const amount = event.shiftKey ? 10 : 1
    const positions: Record<string, number> = {
      ArrowRight: item.position + amount,
      ArrowUp: item.position + amount,
      ArrowLeft: item.position - amount,
      ArrowDown: item.position - amount,
      PageUp: item.position + 10,
      PageDown: item.position - 10,
      Home: 0,
      End: 100,
    }
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault()
      remove(at)
      return
    }
    const next = positions[event.key]
    if (next === undefined) return
    event.preventDefault()
    move(at, next)
  }

  return (
    <div
      ref={root}
      id={id}
      role="group"
      aria-label={ariaLabelledBy ? undefined : (ariaLabel ?? t.picker)}
      aria-labelledby={ariaLabelledBy}
      className={cx("fa-gradient-picker", className)}
      data-disabled={disabled ? "" : undefined}
      data-alpha={alpha ? "" : undefined}
      style={{ "--_gradient": gradientToCss(value), "--_rail": `linear-gradient(to right, ${gradientStopsCss(value)})` } as CSSProperties}
    >
      <div className="fa-gradient-preview" role="img" aria-label={t.preview} />
      <div className="fa-gradient-row">
        {kinds.length > 1 ? (
          <Field label={t.kind} message="auto" nativeLabel={false}>
            <Segmented
              size="sm"
              options={kinds.map((kind) => ({ value: kind, label: t[kind] }))}
              value={value.kind}
              onValueChange={(kind) => commit({ ...value, kind })}
              disabled={disabled}
            />
          </Field>
        ) : null}
        <Field label={t.angle} message="auto">
          <NumberField
            size="sm"
            locale={locale}
            width="short"
            unit="°"
            value={value.angle}
            min={0}
            max={360}
            disabled={disabled || value.kind === "radial"}
            onValueChange={(angle) => {
              if (angle !== null && angle >= 0 && angle <= 360 && angle !== value.angle) commit({ ...value, angle })
            }}
          />
        </Field>
      </div>
      {/* oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- pressing the rail adds a stop; Add stop is the keyboard's way */}
      <div
        ref={rail}
        className="fa-gradient-rail"
        role="group"
        aria-label={t.stops}
        onPointerDown={(event) => {
          if (event.target === event.currentTarget && (event.pointerType !== "mouse" || event.button === 0)) add(positionAt(event))
        }}
      >
        {stops.map((item, at) => (
          <div
            key={at}
            ref={(element) => {
              if (element) thumbs.current.set(at, element)
              else thumbs.current.delete(at)
            }}
            role="slider"
            tabIndex={disabled ? -1 : 0}
            className="fa-gradient-stop"
            data-selected={at === index ? "" : undefined}
            aria-label={t.stop(number.format(at + 1))}
            aria-orientation="horizontal"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={item.position}
            aria-valuetext={t.stopValue(percent(item.position), item.color)}
            aria-disabled={disabled || undefined}
            style={{ "--_position": `${item.position}%`, "--_stop": item.color } as CSSProperties}
            onFocus={() => setSelected(at)}
            onPointerDown={(event) => onThumbDown(event, at)}
            onPointerMove={onThumbMove}
            onPointerUp={onThumbEnd}
            onPointerCancel={onThumbEnd}
            onKeyDown={(event) => onThumbKey(event, at, item)}
          />
        ))}
      </div>
      <div className="fa-gradient-row" data-align="end">
        <Field label={t.position} message="auto">
          <NumberField
            size="sm"
            locale={locale}
            width="short"
            unit="%"
            value={stop.position}
            min={0}
            max={100}
            disabled={disabled}
            onValueChange={(position) => {
              if (position !== null && position >= 0 && position <= 100 && position !== stop.position) move(index, position)
            }}
          />
        </Field>
        <Button size="sm" icon={<IconPlus />} disabled={disabled} disabledReason={stops.length >= maxStops ? t.mostStops(number.format(maxStops)) : undefined} onClick={() => add()}>
          {t.addStop}
        </Button>
        <Button size="sm" variant="ghost" icon={<IconTrash />} disabled={disabled} disabledReason={stops.length <= 2 ? t.fewestStops : undefined} onClick={() => remove(index)}>
          {t.removeStop}
        </Button>
      </div>
      <ColorPicker
        value={stop.color}
        alpha={alpha}
        swatches={swatches}
        eyeDropper={eyeDropper}
        disabled={disabled}
        locale={localeProp}
        onValueChange={(color) => paint(recolour(color))}
        onValueCommit={(color) => commit(recolour(color))}
      />
    </div>
  )
}
