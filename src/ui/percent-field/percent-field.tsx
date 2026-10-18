import { Field } from "../field/index.js"
import { useBoundField, type FieldChrome } from "../form/context.js"
import { NumberField, type NumberFieldProps } from "../number-field/index.js"

export interface PercentInputProps extends Omit<NumberFieldProps, "format" | "unit" | "value" | "defaultValue" | "onValueChange"> {
  /** whole (default): 90 means 90 %. fraction: 0.9 means 90 % (what ratios and APIs often store). */
  scale?: "whole" | "fraction"
  value?: number | null
  defaultValue?: number
  /**
   * Called with the percentage in the `scale` of the value (90, or 0.9 for fraction), or null when
   * empty, as it is typed, stepped or scrubbed. Pair with `value` to control it; use `defaultValue` otherwise.
   */
  onValueChange?: (value: number | null) => void
  /** Decimal places shown and kept. Default 0. */
  decimals?: number
}

const toShown = (value: number | null | undefined, scale: "whole" | "fraction") =>
  value === null || value === undefined ? value : scale === "fraction" ? Math.round(value * 1e6) / 1e4 : value

/**
 * A percentage, 0–100 by default, with the % as a unit and tabular figures. The value is a
 * whole percent, or a fraction with `scale="fraction"`; bounds are in the same scale as the value.
 */
export function PercentInput({ scale = "whole", value, defaultValue, onValueChange, min, max, decimals = 0, step, width = "short", ...rest }: PercentInputProps) {
  const factor = scale === "fraction" ? 100 : 1
  return (
    <NumberField
      {...rest}
      value={toShown(value, scale)}
      defaultValue={toShown(defaultValue, scale) ?? undefined}
      onValueChange={(next) => onValueChange?.(next === null ? null : scale === "fraction" ? Math.round((next / 100) * 1e6) / 1e6 : next)}
      min={(min ?? 0) * factor}
      max={(max ?? (scale === "fraction" ? 1 : 100)) * factor}
      step={step ?? (decimals ? 10 ** -decimals : 1)}
      format={{ maximumFractionDigits: decimals, minimumFractionDigits: 0 }}
      unit="%"
      width={width}
    />
  )
}

export interface PercentFieldProps
  extends FieldChrome,
    Omit<PercentInputProps, "value" | "defaultValue" | "onValueChange" | "name" | "onBlur" | "invalid" | "required" | "disabled" | "className"> {}

/** PercentInput bound to a `number | null` form field. Pair it with `percentSchema()`. */
export function PercentField({ label, hint, optional, required, aside, className, disabled, ...control }: PercentFieldProps) {
  const { field, error, root } = useBoundField<number | null>()
  return (
    <Field {...root} label={label} hint={hint} optional={optional} required={required} aside={aside} className={className} disabled={disabled}>
      <PercentInput
        {...control}
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
