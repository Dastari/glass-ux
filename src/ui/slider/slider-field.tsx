import { Field as BaseField } from "@base-ui/react/field"
import type { ReactNode } from "react"
import { cx } from "../../lib/cx.js"
import { useMessages } from "../../lib/i18n/index.js"
import { numberFormat } from "../../lib/locale/intl.js"
import { useLocale } from "../../lib/locale/use-locale.js"
import { useControllable } from "../../lib/use-controllable.js"
import { Field, type FieldProps } from "../field/index.js"
import { fieldMessages } from "../field/messages.js"
import { Slider, type SliderProps } from "./slider.js"

/**
 * Props of the standalone `SliderField` from `glass-ux/slider`. (`SliderFieldProps` in
 * `glass-ux/form` describes the form-bound field.)
 */
export interface StandaloneSliderFieldProps
  extends
    Pick<FieldProps, "hint" | "warning" | "error" | "invalid" | "optional" | "required" | "message" | "dirty" | "touched">,
    Pick<
      SliderProps,
      | "min"
      | "max"
      | "step"
      | "largeStep"
      | "format"
      | "unit"
      | "marks"
      | "locale"
      | "size"
      | "tone"
      | "bubble"
      | "disabled"
      | "name"
      | "id"
      | "onBlur"
    > {
  /** Names the slider. Shown at the start of the row. */
  label: ReactNode
  /** The value, in the slider's units. Pair with `onValueChange` to control it. */
  value?: number
  /** The starting value when uncontrolled. Default `min`. */
  defaultValue?: number
  /** Called continuously while the thumb is dragged or stepped. */
  onValueChange?: (value: number) => void
  /** Called once when the user lets go (or after a keyboard step). */
  onValueCommitted?: (value: number) => void
  /** Show the current value at the end of the row. Default true. When false the bubble shows while dragging unless `bubble` says otherwise. */
  showValue?: boolean
  /** Layout only. */
  className?: string
}

/**
 * Values the readout can take: the ends, and one step in from each (a fractional step makes
 * "99.9" wider than "100"). With tabular figures the widest of these sets the readout's width.
 */
function samples(min: number, max: number, step: number, show: (value: number) => string) {
  const candidates = [min, max, Math.min(max, min + step), Math.max(min, max - step)]
  return [...new Set(candidates.map(show))]
}

/**
 * A slider with its label, track and current value on one row. The value's width is
 * reserved from the widest value the slider can show, so dragging never moves the track
 * (R9.1). The label column is a fixed width, so the tracks of stacked fields line up, and a long
 * label wraps; set `--slider-field-label-width` to change it. In a container narrower than 22rem the row wraps to the label and value above the
 * track. Hint, warning and error share Field's reserved message line.
 *
 * Controlled with `value` and `onValueChange`, or uncontrolled with `defaultValue`. The
 * label names the slider and the readout is hidden from assistive technology, because the
 * thumb already announces its value text. Use `Slider` directly for a range.
 *
 * @example
 * <SliderField label="Bandwidth limit" unit="Mbps" min={5} max={100} step={5} defaultValue={40} />
 */
export function SliderField({
  label,
  value: valueProp,
  defaultValue,
  onValueChange,
  onValueCommitted,
  showValue = true,
  hint,
  warning,
  error,
  invalid,
  optional = false,
  required = false,
  message,
  dirty,
  touched,
  min = 0,
  max = 100,
  step = 1,
  format,
  unit,
  locale,
  bubble,
  disabled,
  name,
  id,
  className,
  ...slider
}: StandaloneSliderFieldProps) {
  const messages = useMessages(fieldMessages)
  const number = numberFormat(useLocale(locale))
  const [value, setValue] = useControllable<number>(valueProp, defaultValue ?? min, onValueChange)
  const show = format ?? ((current: number) => (unit ? `${number.format(current)} ${unit}` : number.format(current)))

  return (
    <Field
      className={cx("fa-slider-field", className)}
      error={error}
      invalid={invalid}
      warning={warning}
      hint={hint}
      message={message}
      disabled={disabled}
      name={name}
      dirty={dirty}
      touched={touched}
    >
      <div className="fa-slider-field-row" data-value={showValue ? "" : undefined}>
        <span className="fa-slider-field-name">
          <BaseField.Label nativeLabel={false} render={<div />} className="fa-label fa-field-label">
            {label}
          </BaseField.Label>
          {required ? (
            <span className="fa-field-required" aria-hidden>
              *
            </span>
          ) : null}
          {optional ? <span className="fa-field-optional">{messages.optional}</span> : null}
        </span>
        <Slider
          {...slider}
          id={id}
          name={name}
          min={min}
          max={max}
          step={step}
          format={format}
          unit={unit}
          locale={locale}
          bubble={bubble ?? (showValue ? "never" : "auto")}
          disabled={disabled}
          value={value}
          onValueChange={(next) => setValue(Array.isArray(next) ? (next[0] ?? min) : next)}
          onValueCommitted={onValueCommitted ? (next) => onValueCommitted(Array.isArray(next) ? (next[0] ?? min) : next) : undefined}
        />
        {showValue ? (
          <span className="fa-slider-field-value" aria-hidden data-numeric>
            <span className="fa-slider-field-live">{show(value)}</span>
            {samples(min, max, step, show).map((text) => (
              <span key={text} className="fa-slider-field-sample">
                {text}
              </span>
            ))}
          </span>
        ) : null}
      </div>
    </Field>
  )
}
