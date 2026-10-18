import { Field } from "../field/index.js"
import { useBoundField, type FieldChrome } from "../form/context.js"
import { NumberField, type NumberFieldProps } from "../number-field/index.js"
import { DEFAULT_CURRENCY, fromMinor, minorDigits, toMinor } from "./money.js"

export interface MoneyInputProps extends Omit<NumberFieldProps, "format" | "unit" | "value" | "defaultValue" | "onValueChange" | "min" | "max" | "step" | "largeStep"> {
  /** Minor units (cents). Null when empty. */
  value?: number | null
  defaultValue?: number
  /**
   * Called with the amount in minor units (integer cents), or null when the box is empty, as it is
   * typed, stepped or scrubbed. Pair with `value` to control it; use `defaultValue` otherwise.
   */
  onValueChange?: (minor: number | null) => void
  /** ISO 4217. Default AUD. */
  currency?: string
  /** Bounds in minor units. Default min 0 (no negatives) unless `allowNegative`. */
  min?: number
  /** Upper value or visible-item limit, as specified by the type. */
  max?: number
  /** Allows values below zero when validation also permits them. */
  allowNegative?: boolean
  /** Show the currency code after the amount ("AUD"), for screens with more than one currency. Default false. */
  showCode?: boolean
  /** Step for the arrow keys, in minor units. Default one major unit ($1). */
  step?: number
}

/**
 * An amount of money held in minor units (integer cents), so totals never drift. It shows and
 * reads the locale's currency format ("$1,234.50"), and rounds to the currency's minor digits.
 */
export function MoneyInput({ value, defaultValue, onValueChange, currency = DEFAULT_CURRENCY, min, max, allowNegative = false, showCode = false, step, steppers = false, ...rest }: MoneyInputProps) {
  const digits = minorDigits(currency)
  const major = (minor: number | null | undefined) => (minor === null || minor === undefined ? minor : fromMinor(minor, currency))
  return (
    <NumberField
      {...rest}
      value={major(value)}
      defaultValue={major(defaultValue) ?? undefined}
      onValueChange={(next) => onValueChange?.(next === null ? null : toMinor(next, currency))}
      min={min !== undefined ? fromMinor(min, currency) : allowNegative ? undefined : 0}
      max={max !== undefined ? fromMinor(max, currency) : undefined}
      step={step !== undefined ? fromMinor(step, currency) : 1}
      largeStep={step !== undefined ? fromMinor(step * 10, currency) : 10}
      format={{ style: "currency", currency, currencyDisplay: "narrowSymbol", minimumFractionDigits: digits, maximumFractionDigits: digits }}
      unit={showCode ? currency : undefined}
      steppers={steppers}
    />
  )
}

export interface MoneyFieldProps
  extends FieldChrome,
    Omit<MoneyInputProps, "value" | "defaultValue" | "onValueChange" | "name" | "onBlur" | "invalid" | "required" | "disabled" | "className"> {}

/** MoneyInput bound to a `number | null` (minor units) form field. Pair it with `moneySchema()`. */
export function MoneyField({ label, hint, optional, required, aside, className, disabled, width = "medium", ...control }: MoneyFieldProps) {
  const { field, error, root } = useBoundField<number | null>()
  return (
    <Field {...root} label={label} hint={hint} optional={optional} required={required} aside={aside} className={className} disabled={disabled}>
      <MoneyInput
        {...control}
        width={width}
        name={field.name}
        value={field.state.value}
        onValueChange={(next) => field.handleChange(next)}
        onBlur={field.handleBlur}
        required={required}
        disabled={disabled}
        invalid={Boolean(error)}
      />
    </Field>
  )
}
