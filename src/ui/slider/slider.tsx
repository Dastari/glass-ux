import { Slider as BaseSlider } from "@base-ui/react/slider"
import { useState, type CSSProperties, type FocusEvent } from "react"
import { cx } from "../../lib/cx.js"
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
  /** Called when value change occurs. The callback type specifies its arguments. */
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
  /** Called when blur occurs. The callback type specifies its arguments. */
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
  ...aria
}: SliderProps) {
  const [inner, setInner] = useState(() => asArray(defaultValue, min))
  // Mount measured thumbs after the public Control ref attaches. Base UI's child
  // layout effect must see that control to observe an initially hidden panel's reveal.
  const [control, setControl] = useState<HTMLDivElement | null>(null)
  const values = value === undefined ? inner : asArray(value, min)
  const show = format ?? ((current: number) => (unit ? `${current.toLocaleString("en-AU")} ${unit}` : current.toLocaleString("en-AU")))
  const span = max - min || 1
  const markList: SliderMark[] =
    marks === true
      ? Array.from({ length: Math.floor(span / step) + 1 }, (_, index) => ({ value: min + index * step }))
      : Array.isArray(marks)
        ? marks.map((mark) => (typeof mark === "number" ? { value: mark } : mark))
        : []
  const labelled = markList.some((mark) => mark.label)
  const range = values.length > 1

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
          <BaseSlider.Indicator className="fa-slider-indicator" />
          {markList.map((mark) => (
            <span
              key={mark.value}
              className="fa-slider-tick"
              aria-hidden
              data-active={
                range
                  ? mark.value >= (values[0] ?? min) && mark.value <= (values[1] ?? max)
                    ? ""
                    : undefined
                  : mark.value <= (values[0] ?? min)
                    ? ""
                    : undefined
              }
              style={{ "--_at": (mark.value - min) / span } as CSSProperties}
            />
          ))}
          {control && values.map((current, index) => (
            <BaseSlider.Thumb
              key={index}
              index={index}
              className="fa-slider-thumb"
              onBlur={onBlur}
              getAriaValueText={(formatted, raw) => show(raw)}
              {...(range ? { "aria-label": thumbLabels?.[index] ?? (index === 0 ? "Minimum" : "Maximum") } : aria)}
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
