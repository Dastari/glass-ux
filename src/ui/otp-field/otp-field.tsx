import { useMessages } from "../../lib/i18n/index.js"
import { otpFieldMessages } from "./messages.js"
import { OTPField } from "@base-ui/react/otp-field"
import { Fragment, useRef, type ClipboardEvent } from "react"
import { IconCheck } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { useControllable } from "../../lib/use-controllable.js"
import { Field } from "../field/index.js"
import { useBoundField, type FieldChrome } from "../form/context.js"
import { normaliseOtp, type OtpCharacters } from "./otp.js"

export type OtpStatus = "error" | "success"

export interface OtpInputProps {
  value?: string
  defaultValue?: string
  /**
   * Called with the code entered so far (upper case when alphanumeric) on each typed, deleted or
   * pasted character. Pair with `value` to control it; use `defaultValue` otherwise.
   */
  onValueChange?: (value: string) => void
  /** Called once every box is filled (typed, pasted or autofilled). */
  onComplete?: (value: string) => void
  /** Number of boxes. Default 6. */
  length?: number
  /** Digits (default) or letters and digits (recovery codes). */
  characters?: OtpCharacters
  /** Split the boxes into groups with a gap: [3, 3] for six. Default: halves for 6 and 8. */
  groups?: readonly number[]
  /** Submit the surrounding form when complete (Base UI's autoSubmit). Default false. */
  autoSubmit?: boolean
  /** error: the code was refused. success: accepted — boxes go green with a ✓, no shift either way. */
  status?: OtpStatus
  /** Show dots instead of characters (a PIN). Default false. */
  mask?: boolean
  size?: "md" | "lg"
  disabled?: boolean
  readOnly?: boolean
  required?: boolean
  /** Marks the control invalid. Pair it with an accessible validation message. */
  invalid?: boolean
  name?: string
  id?: string
  /** Called when focus leaves the group of boxes, not when it moves between them. */
  onBlur?: () => void
  className?: string
  /** Accessible name when a visible label does not name the control. */
  "aria-label"?: string
}

const defaultGroups = (length: number) => (length === 6 ? [3, 3] : length === 8 ? [4, 4] : [length])

/**
 * A one-time code in N boxes (Base UI OTP Field): autocomplete="one-time-code" so phones offer
 * the code from a message, a numeric keypad, paste fills every box (the code is found inside
 * "Your code is 482913"), Backspace steps back, the arrows move. Errors and success show on
 * the boxes themselves; nothing moves.
 */
export function OtpInput({
  value,
  defaultValue = "",
  onValueChange,
  onComplete,
  length = 6,
  characters = "numeric",
  groups,
  autoSubmit = false,
  status,
  mask = false,
  size = "lg",
  disabled,
  readOnly,
  required,
  invalid,
  name,
  id,
  onBlur,
  className,
  "aria-label": ariaLabel,
}: OtpInputProps) {
  const messages = useMessages(otpFieldMessages)

  const [code, setCode] = useControllable(value, defaultValue, onValueChange)
  const rootRef = useRef<HTMLDivElement>(null)
  const layout = groups ?? defaultGroups(length)
  const complete = (next: string) => {
    if (next.length === length) onComplete?.(next)
  }

  // Our own paste: find the code inside whatever was copied, then fill from the first box.
  const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    if (disabled || readOnly) return
    const raw = event.clipboardData?.getData("text/plain") ?? ""
    const next = normaliseOtp(raw, length, characters)
    if (!next) return
    event.preventDefault()
    setCode(next)
    complete(next)
    const inputs = rootRef.current?.querySelectorAll<HTMLInputElement>("input.fa-otp-box")
    inputs?.[Math.min(next.length, length - 1)]?.focus()
  }

  let index = 0
  return (
    <OTPField.Root
      ref={rootRef}
      id={id}
      name={name}
      length={length}
      value={code}
      onValueChange={(next) => setCode(next)}
      onValueComplete={(next) => complete(next)}
      validationType={characters === "numeric" ? "numeric" : "alphanumeric"}
      inputMode={characters === "numeric" ? "numeric" : "text"}
      normalizeValue={characters === "alphanumeric" ? (next) => next.toUpperCase() : undefined}
      autoComplete="one-time-code"
      autoSubmit={autoSubmit}
      mask={mask}
      disabled={disabled}
      readOnly={readOnly}
      required={required}
      className={cx("fa-otp", className)}
      data-size={size}
      data-status={status}
      data-invalid={invalid || status === "error" ? "" : undefined}
      aria-invalid={invalid || status === "error" || undefined}
      aria-label={ariaLabel}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onBlur?.()
      }}
    >
      {layout.map((count, group) => (
        <Fragment key={group}>
          {group > 0 ? <OTPField.Separator className="fa-otp-separator" /> : null}
          <span className="fa-otp-group">
            {Array.from({ length: count }, () => {
              const slot = index++
              return (
                <OTPField.Input
                  key={slot}
                  className="fa-otp-box"
                  onPaste={onPaste}
                  aria-label={slot === 0 ? undefined : messages.characterOf(slot + 1, length)}
                />
              )
            })}
          </span>
        </Fragment>
      ))}
      <span className="fa-otp-mark" aria-hidden>
        <IconCheck />
      </span>
    </OTPField.Root>
  )
}

export interface OtpFieldProps extends FieldChrome, Omit<OtpInputProps, "value" | "defaultValue" | "onValueChange" | "name" | "onBlur" | "invalid" | "required" | "disabled" | "className"> {}

/**
 * OtpInput bound to a string form field. Pair it with `otpSchema()`. With `autoSubmit`, a
 * complete code submits the form, so the Submit button's pending → ✓ shows the outcome.
 */
export function OtpField({ label, hint, optional, required, aside, className, disabled, ...control }: OtpFieldProps) {
  const { field, error, root } = useBoundField<string>()
  return (
    <Field {...root} label={label} hint={hint} optional={optional} required={required} aside={aside} className={className} disabled={disabled}>
      <OtpInput
        {...control}
        name={field.name}
        value={field.state.value}
        onValueChange={(next) => field.handleChange(next)}
        onBlur={field.handleBlur}
        required={required}
        disabled={disabled}
        invalid={Boolean(error)}
        status={control.status ?? (error ? "error" : undefined)}
      />
    </Field>
  )
}
