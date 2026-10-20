import { NumberField as BaseNumberField } from "@base-ui/react/number-field"
import type { FocusEvent, ReactNode, Ref } from "react"
import { IconMinus, IconPlus } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { useLocale } from "../../lib/locale/use-locale.js"
import { widthAttr, type FieldWidth } from "../field/index.js"
import { Button } from "../button/index.js"

export type NumberFieldSize = "sm" | "md" | "lg"

export interface NumberFieldProps {
  value?: number | null
  defaultValue?: number
  /**
   * Called with the parsed number, or null when the box is empty, as it is typed, stepped or
   * scrubbed. Pair with `value` to control it; use `defaultValue` otherwise.
   */
  onValueChange?: (value: number | null) => void
  /** Lower allowed value. */
  min?: number
  /** Upper value or visible-item limit, as specified by the type. */
  max?: number
  /** Increment used by keyboard and stepper interaction. */
  step?: number
  /** The larger keyboard increment. */
  largeStep?: number
  /** Intl number formatting (grouping, decimals, percent). */
  format?: Intl.NumberFormatOptions
  /** BCP 47 locale the number is shown and typed in (decimal and grouping marks). Default: the nearest `LocaleProvider`, then `configureLocale()`, then `<html lang>`, then en-US. */
  locale?: string
  /** Unit after the value ("MB", "ms", "devices"). */
  unit?: ReactNode
  /** A short prefix inside the box that scrubs the value when dragged ("W", "Max"). */
  scrubLabel?: ReactNode
  size?: NumberFieldSize
  /** Content width: short (port, PIN), medium (name, hostname), full (default). */
  width?: FieldWidth
  /** Show the − / + steppers (default). Arrow keys always step. */
  steppers?: boolean
  placeholder?: string
  disabled?: boolean
  readOnly?: boolean
  required?: boolean
  /** Invalid outside a Field. */
  invalid?: boolean
  name?: string
  id?: string
  /** Called when the text input loses focus, so a form can mark the field touched. */
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void
  /** Layout only. */
  className?: string
  ref?: Ref<HTMLInputElement>
  /** Accessible name when a visible label does not name the control. */
  "aria-label"?: string
}

/**
 * A number with bounds and steps: type it, use ↑ ↓ (Shift for large steps), the − / +
 * steppers, or drag the scrub label. Values are clamped to min/max on blur and formatted
 * with tabular figures.
 */
export function NumberField({
  value,
  defaultValue,
  onValueChange,
  min,
  max,
  step = 1,
  largeStep,
  format,
  locale,
  unit,
  scrubLabel,
  size = "md",
  width,
  steppers = true,
  placeholder,
  disabled,
  readOnly,
  required,
  invalid,
  name,
  id,
  onBlur,
  className,
  ref,
  ...aria
}: NumberFieldProps) {
  const resolvedLocale = useLocale(locale)
  return (
    <BaseNumberField.Root
      value={value}
      defaultValue={defaultValue}
      onValueChange={(next) => onValueChange?.(next)}
      min={min}
      max={max}
      step={step}
      largeStep={largeStep}
      format={format}
      locale={resolvedLocale}
      disabled={disabled}
      readOnly={readOnly}
      required={required}
      name={name}
      id={id}
      className={cx("fa-number", className)}
    >
      <BaseNumberField.Group
        className="fa-control fa-input fa-number-group"
        data-size={size}
        data-width={widthAttr(width)}
        data-readonly={readOnly ? "" : undefined}
        data-disabled={disabled ? "" : undefined}
        data-invalid={invalid ? "" : undefined}
      >
        {scrubLabel ? (
          <BaseNumberField.ScrubArea className="fa-number-scrub">
            <span className="fa-number-scrub-label">{scrubLabel}</span>
          </BaseNumberField.ScrubArea>
        ) : null}
        <BaseNumberField.Input
          {...aria}
          ref={ref}
          placeholder={placeholder}
          aria-invalid={invalid || undefined}
          onBlur={onBlur}
          className="fa-control-input fa-number-input"
        />
        {unit ? <span className="fa-input-unit">{unit}</span> : null}
        {steppers && !readOnly ? (
          <span className="fa-number-steppers">
            <BaseNumberField.Decrement
              render={<Button variant="ghost" size="sm" className="fa-input-btn" icon={<IconMinus />} aria-label="Decrease" />}
              tabIndex={-1}
            />
            <BaseNumberField.Increment
              render={<Button variant="ghost" size="sm" className="fa-input-btn" icon={<IconPlus />} aria-label="Increase" />}
              tabIndex={-1}
            />
          </span>
        ) : null}
      </BaseNumberField.Group>
    </BaseNumberField.Root>
  )
}
