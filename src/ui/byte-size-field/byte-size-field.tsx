import { IconDisk } from "../../icons/generated/icons.js"
import { sameNumber, useParsedText } from "../../lib/use-parsed-text.js"
import { Field } from "../field/index.js"
import { useBoundField, type FieldChrome } from "../form/context.js"
import { Input, type InputProps } from "../input/index.js"
import { formatBytes, parseBytes, type ByteBase } from "./bytes.js"

export interface ByteSizeInputProps extends Omit<InputProps, "value" | "defaultValue" | "onValueChange" | "type"> {
  /** Bytes; null when empty; NaN while the text cannot be read. */
  value?: number | null
  defaultValue?: number | null
  /**
   * Called on each keystroke with the parsed size in whole bytes, null when the text is empty, or
   * NaN while it cannot be read. Pair with `value` to control it; use `defaultValue` otherwise.
   */
  onValueChange?: (bytes: number | null) => void
  /** How sizes are written back: decimal (default: kB, MB, GB, as disks are sold) or binary (KiB, MiB, GiB, as memory is). */
  base?: ByteBase
  /** The unit of a bare number ("500" → 500 MB). Default "MB". */
  defaultUnit?: string
}

/**
 * A size typed the way people write it — "500 MB", "1.5 GB", "2 GiB" — held as whole bytes and
 * rewritten when focus leaves ("1500 MB" → "1.5 GB"). For quotas, thresholds and limits.
 */
export function ByteSizeInput({ value, defaultValue = null, onValueChange, base = "decimal", defaultUnit = "MB", placeholder = "500 MB", icon, onBlur, width = "short", ...rest }: ByteSizeInputProps) {
  const text = useParsedText<number | null>({
    value,
    defaultValue,
    onValueChange,
    parse: (next) => (next.trim() ? (parseBytes(next, { defaultUnit }) ?? Number.NaN) : null),
    format: (bytes) => (bytes === null || Number.isNaN(bytes) ? "" : formatBytes(bytes, { base, decimals: 2 }).replace("\u2009", " ")),
    same: sameNumber,
  })
  return (
    <Input
      autoComplete="off"
      spellCheck={false}
      {...rest}
      width={width}
      data-identifier=""
      icon={icon === undefined ? <IconDisk /> : icon}
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

export interface ByteSizeFieldProps
  extends FieldChrome,
    Omit<ByteSizeInputProps, "value" | "defaultValue" | "onValueChange" | "name" | "onBlur" | "invalid" | "required" | "disabled" | "className"> {}

/** ByteSizeInput bound to a `number | null` (bytes) form field. Pair it with `byteSizeSchema()`. */
export function ByteSizeField({ label, hint, optional, required, aside, className, disabled, ...control }: ByteSizeFieldProps) {
  const { field, error, root } = useBoundField<number | null>()
  return (
    <Field {...root} label={label} hint={hint} optional={optional} required={required} aside={aside} className={className} disabled={disabled}>
      <ByteSizeInput
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
