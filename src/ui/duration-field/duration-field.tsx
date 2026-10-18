import { IconClock } from "../../icons/generated/icons.js"
import { sameNumber, useParsedText } from "../../lib/use-parsed-text.js"
import { Field } from "../field/index.js"
import { useBoundField, type FieldChrome } from "../form/context.js"
import { Input, type InputProps } from "../input/index.js"
import { formatDuration, parseDuration, type DurationUnit } from "./duration.js"

export interface DurationInputProps extends Omit<InputProps, "value" | "defaultValue" | "onValueChange" | "type"> {
  /** Seconds; null when empty; NaN while the text cannot be read. */
  value?: number | null
  defaultValue?: number | null
  /**
   * Called on each keystroke with the parsed duration in whole seconds, null when the text is empty,
   * or NaN while it cannot be read. Pair with `value` to control it; use `defaultValue` otherwise.
   */
  onValueChange?: (seconds: number | null) => void
  /** Units written back, largest first (default d, h, m). Seconds below the smallest round. */
  units?: readonly DurationUnit[]
  /** The unit of a bare number ("90" → 90 minutes). Default "m". */
  defaultUnit?: DurationUnit
}

/**
 * A duration typed the way people say it — "1h 30m", "90", "1:30", "1.5 hours", "2 days" — held
 * as whole seconds and rewritten compactly when focus leaves ("90" → "1h 30m").
 */
export function DurationInput({ value, defaultValue = null, onValueChange, units = ["d", "h", "m"], defaultUnit = "m", placeholder = "1h 30m", icon, onBlur, width = "short", ...rest }: DurationInputProps) {
  const text = useParsedText<number | null>({
    value,
    defaultValue,
    onValueChange,
    parse: (next) => (next.trim() ? (parseDuration(next, { defaultUnit }) ?? Number.NaN) : null),
    format: (seconds) => (seconds === null || Number.isNaN(seconds) ? "" : formatDuration(seconds, { units })),
    same: sameNumber,
  })
  return (
    <Input
      autoComplete="off"
      spellCheck={false}
      {...rest}
      width={width}
      data-identifier=""
      icon={icon === undefined ? <IconClock /> : icon}
      placeholder={placeholder}
      value={text.text}
      onValueChange={text.onTextChange}
      onBlur={(event) => {
        text.tidy()
        onBlur?.(event)
      }}
    />
  )
}

export interface DurationFieldProps
  extends FieldChrome,
    Omit<DurationInputProps, "value" | "defaultValue" | "onValueChange" | "name" | "onBlur" | "invalid" | "required" | "disabled" | "className"> {
  /** Spell the value out as the hint when none is given ("1 hour 30 minutes"). Default true. */
  describe?: boolean
}

/** DurationInput bound to a `number | null` (seconds) form field. Pair it with `durationSchema()`. */
export function DurationField({ label, hint, optional, required, aside, className, disabled, describe = true, ...control }: DurationFieldProps) {
  const { field, error, root } = useBoundField<number | null>()
  const seconds = field.state.value
  const derived = describe && seconds !== null && !Number.isNaN(seconds) ? formatDuration(seconds, { units: control.units ?? ["d", "h", "m"], style: "long" }) : undefined
  return (
    <Field {...root} label={label} hint={hint ?? derived} optional={optional} required={required} aside={aside} className={className} disabled={disabled}>
      <DurationInput
        {...control}
        name={field.name}
        value={seconds}
        onValueChange={(next) => field.handleChange(next)}
        onBlur={field.handleBlur}
        required={required}
        disabled={disabled}
        invalid={Boolean(error)}
      />
    </Field>
  )
}
