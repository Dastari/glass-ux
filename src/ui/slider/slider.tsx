import { useMessages } from "../../lib/i18n/index.js"
import { sliderMessages } from "./messages.js"
import { Slider as BaseSlider } from "@base-ui/react/slider"
import { useState, type CSSProperties, type FocusEvent } from "react"
import { cx } from "../../lib/cx.js"
import { numberFormat } from "../../lib/locale/intl.js"
import { useLocale } from "../../lib/locale/use-locale.js"
import type { ChoiceSize, ChoiceTone } from "../field/index.js"

export interface SliderMark {
  value: number
  /** Optional label under the tick ("Off", "50%", "Max"). */
  label?: string
}

export interface SliderProps {
  /** A number for one thumb, a pair for a range. */
  value?: number | number[]
  defaultValue?: number | number[]
  /**
   * Called continuously while a thumb is dragged or stepped, with a number for one thumb or an
   * array for a range. Pair with `value` to control it; use `defaultValue` otherwise.
   */
  onValueChange?: (value: number | number[]) => void
  /** Fires once when the user lets go (or after a keyboard step). */
  onValueCommitted?: (value: number | number[]) => void
  /** Lower allowed value. */
  min?: number
  /** Upper value or visible-item limit, as specified by the type. */
  max?: number
  /** Increment used by keyboard and stepper interaction. */
  step?: number
  /** The larger keyboard increment. */
  largeStep?: number
  /** Formats the bubble and aria-valuetext. Default: the number plus `unit`. */
  format?: (value: number) => string
  /** Unit after the number, joined with a thin space ("Mbps", "%"). */
  unit?: string
  /** BCP 47 locale for the default bubble and aria-valuetext number. Default: the nearest `LocaleProvider`, then `configureLocale()`, then `<html lang>`, then en-US. */
  locale?: string
  /**
   * The value the fill grows from, for a two-way slider such as -100 to 100: the fill runs
   * from the origin to the thumb, on either side, in the reading direction. At the origin
   * there is no fill. One thumb only; a range ignores it. Default: `min`, the fill from the start.
   */
  origin?: number
  /** Tick marks under the track; `true` puts one on every step (use for ≤ 20 steps). */
  marks?: boolean | Array<number | SliderMark>
  /** Names each thumb of a range ("Minimum", "Maximum"). */
  thumbLabels?: string[]
  size?: ChoiceSize
  /** auto: the value bubble shows while dragging or keyboard-focused. always: pinned. */
  bubble?: "auto" | "always" | "never"
  /** The range colour. Status tones only when the value is a status threshold (R3.3). */
  tone?: ChoiceTone
  disabled?: boolean
  name?: string
  id?: string
  /** Called when a thumb loses focus, so a form can mark the field touched. */
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void
  /** Layout only. */
  className?: string
  /** Accessible name when a visible label does not name the control. */
  "aria-label"?: string
  /** IDs of elements that provide the accessible name. */
  "aria-labelledby"?: string
}

const asArray = (value: number | number[] | undefined, fallback: number) =>
  Array.isArray(value) ? value : [value ?? fallback]

/**
 * A value (or a range) on a track. The tone range glows in a recessed glass well; the
 * thumbs are glass beads. A glass value bubble appears while dragging or keyboard-focused.
 * Arrow keys step, Shift/Page keys take large steps, Home/End jump to the ends.
 */
export function Slider({
  value,
  defaultValue,
  onValueChange,
  onValueCommitted,
  min = 0,
  max = 100,
  step = 1,
  largeStep,
  origin,
  format,
  unit,
  marks,
  thumbLabels,
  size = "md",
  tone,
  bubble = "auto",
  disabled,
  name,
  id,
  onBlur,
  className,
  locale,
  ...aria
}: SliderProps) {
  const messages = useMessages(sliderMessages, { locale: locale })

  const number = numberFormat(useLocale(locale))
  const [inner, setInner] = useState(() => asArray(defaultValue, min))
  // Mount measured thumbs after the public Control ref attaches. Base UI's child
  // layout effect must see that control to observe an initially hidden panel's reveal.
  const [control, setControl] = useState<HTMLDivElement | null>(null)
  const values = value === undefined ? inner : asArray(value, min)
  const show = format ?? ((current: number) => (unit ? `${number.format(current)} ${unit}` : number.format(current)))
  const span = max - min || 1
  const markList: SliderMark[] =
    marks === true
      ? Array.from({ length: Math.floor(span / step) + 1 }, (_, index) => ({ value: min + index * step }))
      : Array.isArray(marks)
        ? marks.map((mark) => (typeof mark === "number" ? { value: mark } : mark))
        : []
  const labelled = markList.some((mark) => mark.label)
  const range = values.length > 1
  const fraction = (current: number | undefined, fallback: number) => Math.min(1, Math.max(0, ((current ?? fallback) - min) / span))
  // A two-way slider fills between its origin and the thumb, as a range does.
  const centred = !range && origin !== undefined
  const low = range ? (values[0] ?? min) : centred ? Math.min(origin, values[0] ?? min) : min
  const high = range ? (values[values.length - 1] ?? max) : centred ? Math.max(origin, values[0] ?? min) : (values[0] ?? min)
  // The range and thumbs move with transform (slider.css), from the values' fractions;
  // Base UI's inline left/width are pinned so a step never re-lays out the track.
  const from = range || centred ? fraction(low, min) : 0
  const to = fraction(high, min)

  return (
    <BaseSlider.Root
      value={value}
      defaultValue={defaultValue}
      onValueChange={(next) => {
        if (value === undefined) setInner(asArray(next as number | number[], min))
        onValueChange?.(next as number | number[])
      }}
      onValueCommitted={(next) => onValueCommitted?.(next as number | number[])}
      min={min}
      max={max}
      step={step}
      largeStep={largeStep}
      disabled={disabled}
      name={name}
      id={id}
      thumbAlignment="edge"
      className={cx("fa-slider", className)}
      data-size={size}
      data-tone={tone === "accent" ? undefined : tone}
      data-bubble={bubble === "auto" ? undefined : bubble}
      data-marks={labelled ? "labelled" : markList.length ? "" : undefined}
    >
      <BaseSlider.Control ref={setControl} className="fa-slider-control">
        <BaseSlider.Track className="fa-slider-track">
          <span className="fa-slider-range">
            <BaseSlider.Indicator
              className="fa-slider-indicator"
              data-range={range || centred ? "" : undefined}
              style={{ insetInlineStart: 0, width: "100%", "--_from": from, "--_to": to } as CSSProperties}
            >
              <span className="fa-slider-fill" />
            </BaseSlider.Indicator>
          </span>
          {markList.map((mark) => (
            <span
              key={mark.value}
              className="fa-slider-tick"
              aria-hidden
              data-active={mark.value >= low && mark.value <= high ? "" : undefined}
              style={{ "--_at": (mark.value - min) / span } as CSSProperties}
            />
          ))}
          {control && values.map((current, index) => (
            <BaseSlider.Thumb
              key={index}
              index={index}
              className="fa-slider-thumb"
              // Centred by the stylesheet's direction, as the fill is: Base UI's own translate
              // follows only a DirectionProvider, so a page without one put RTL thumbs a thumb off.
              style={{ insetInlineStart: 0, translate: "calc(var(--_dir) * -50%) -50%", "--_f": fraction(current, min) } as CSSProperties}
              onBlur={onBlur}
              getAriaValueText={(formatted, raw) => show(raw)}
              {...(range ? { "aria-label": thumbLabels?.[index] ?? (index === 0 ? messages.minimum : messages.maximum) } : aria)}
            >
              <span className="fa-slider-bubble" aria-hidden>
                {show(current)}
              </span>
            </BaseSlider.Thumb>
          ))}
        </BaseSlider.Track>
      </BaseSlider.Control>
      {labelled ? (
        <div className="fa-slider-marks" aria-hidden>
          {markList.map((mark) =>
            mark.label ? (
              <span key={mark.value} className="fa-slider-mark-label" style={{ "--_at": (mark.value - min) / span } as CSSProperties}>
                {mark.label}
              </span>
            ) : null
          )}
        </div>
      ) : null}
    </BaseSlider.Root>
  )
}
