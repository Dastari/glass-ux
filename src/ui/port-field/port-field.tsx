import { cx } from "../../lib/cx.js"
import { Field } from "../field/index.js"
import { useBoundField, type FieldChrome } from "../form/context.js"
import { NumberField, type NumberFieldProps } from "../number-field/index.js"
import { PORT_MAX, PORT_MIN, serviceOf } from "./ports.js"

export interface PortInputProps extends Omit<NumberFieldProps, "min" | "max" | "step" | "largeStep" | "format" | "unit" | "scrubLabel"> {
  /** Name the usual service inside the box ("443 HTTPS"). Default true. */
  service?: boolean
  /** Your own names for ports, checked before the well-known list ({ 8443: "UniFi controller" }). */
  services?: Readonly<Record<number, string>>
}

/**
 * A TCP or UDP port: whole numbers 1–65535, no grouping ("8080", never "8,080"), and the
 * service usually on it named beside the number. Arrow keys step; there are no steppers by
 * default, because nobody clicks from 443 to 8443.
 */
export function PortInput({ service = true, services, steppers = false, width = "short", className, value, defaultValue, ...rest }: PortInputProps) {
  const current = value ?? defaultValue ?? null
  const name = service && current !== null ? (services?.[current] ?? serviceOf(current)) : undefined
  return (
    <NumberField
      {...rest}
      value={value}
      defaultValue={defaultValue}
      className={cx("fa-port", className)}
      min={PORT_MIN}
      max={PORT_MAX}
      step={1}
      largeStep={1000}
      format={{ useGrouping: false, maximumFractionDigits: 0 }}
      steppers={steppers}
      width={width}
      unit={name}
    />
  )
}

export interface PortFieldProps
  extends FieldChrome,
    Omit<PortInputProps, "value" | "defaultValue" | "onValueChange" | "name" | "onBlur" | "invalid" | "required" | "disabled" | "className"> {}

/** PortInput bound to a `number | null` form field. Pair it with `portSchema()`. */
export function PortField({ label, hint, optional, required, aside, className, disabled, ...control }: PortFieldProps) {
  const { field, error, root } = useBoundField<number | null>()
  return (
    <Field {...root} label={label} hint={hint} optional={optional} required={required} aside={aside} className={className} disabled={disabled}>
      <PortInput
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
