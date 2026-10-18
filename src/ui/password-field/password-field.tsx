import { useState, type KeyboardEvent } from "react"
import { IconDice, IconKey } from "../../icons/generated/icons.js"
import { useControllable } from "../../lib/use-controllable.js"
import { Button } from "../button/index.js"
import { CopyButton } from "../copy-button/index.js"
import { Field } from "../field/index.js"
import { useBoundField, type FieldChrome } from "../form/context.js"
import { Input, type InputProps } from "../input/index.js"
import { generatePassword, type GenerateOptions } from "./generate.js"
import { estimateStrength, type Strength } from "./strength.js"

export type PasswordPurpose = "current" | "new"

export interface PasswordInputProps extends Omit<InputProps, "type" | "value" | "defaultValue" | "onValueChange" | "autoComplete" | "clearable"> {
  value?: string
  defaultValue?: string
  /**
   * Called with the password on each keystroke and when Generate fills it. Pair with `value` to
   * control it; use `defaultValue` otherwise.
   */
  onValueChange?: (value: string) => void
  /**
   * current: signing in or confirming (autocomplete="current-password"). new: setting one
   * (autocomplete="new-password", password managers offer to generate and save). Default "new".
   */
  purpose?: PasswordPurpose
  /** The strength bar along the box's lower edge. Default: on for new passwords. */
  strength?: boolean
  /** The person's own details, which the strength estimate penalises (name, email, organisation). */
  userInputs?: readonly string[]
  /** A Generate button (cryptographically random), with these options. Default off. */
  generate?: boolean | GenerateOptions
  /** A copy button while there is a value. Default: on when Generate is. */
  copyable?: boolean
  /** Called with a fresh estimate whenever the password changes, while strength is measured (`strength`, or a new password). */
  onStrengthChange?: (strength: Strength) => void
}

const SEGMENTS = [1, 2, 3, 4] as const

/** Safari's password-rules hint for generated passwords, matching our own generator. */
function passwordRules(options: GenerateOptions) {
  const rules = [`minlength: ${options.length ?? 20}`]
  if (options.lower ?? true) rules.push("required: lower")
  if (options.upper ?? true) rules.push("required: upper")
  if (options.digits ?? true) rules.push("required: digit")
  if (options.symbols ?? true) rules.push("required: [!#%*+-=?@^_~]")
  return rules.join("; ")
}

/**
 * A password box (R20): the reveal toggle is an eye button with a tooltip and aria-pressed;
 * a Caps Lock warning appears inside the box while it is on; new passwords get a strength bar
 * and, optionally, Generate and Copy. The value is never logged, stored or sent anywhere but
 * the form.
 */
export function PasswordInput({
  value,
  defaultValue = "",
  onValueChange,
  purpose = "new",
  strength,
  userInputs,
  generate = false,
  copyable,
  onStrengthChange,
  icon,
  trailing,
  onKeyDown,
  onKeyUp,
  onBlur,
  revealed,
  onRevealedChange,
  disabled,
  readOnly,
  ...rest
}: PasswordInputProps) {
  const [text, setText] = useControllable(value, defaultValue, onValueChange)
  const [capsLock, setCapsLock] = useState(false)
  const [shown, setShown] = useControllable<boolean>(revealed, false, onRevealedChange)
  const measuring = strength ?? purpose === "new"
  const estimate = measuring ? estimateStrength(text, userInputs) : null
  const generateOptions = generate === true ? {} : generate || null
  const canCopy = (copyable ?? Boolean(generateOptions)) && text !== ""
  const editable = !disabled && !readOnly

  const readCaps = (event: KeyboardEvent<HTMLInputElement>) => {
    const on = event.getModifierState?.("CapsLock") ?? false
    if (on !== capsLock) setCapsLock(on)
  }

  const change = (next: string) => {
    setText(next)
    if (measuring && onStrengthChange) onStrengthChange(estimateStrength(next, userInputs))
  }

  return (
    <div className="fa-password" data-strength={estimate && text && !disabled ? estimate.score : undefined}>
      <Input
        spellCheck={false}
        {...rest}
        type="password"
        autoComplete={purpose === "current" ? "current-password" : "new-password"}
        // Safari reads this to generate a password the server will accept.
        {...(purpose === "new" && generateOptions ? { passwordrules: passwordRules(generateOptions) } : {})}
        icon={icon === undefined ? <IconKey /> : icon}
        disabled={disabled}
        readOnly={readOnly}
        value={text}
        onValueChange={change}
        revealed={shown}
        onRevealedChange={setShown}
        onKeyDown={(event) => {
          readCaps(event)
          onKeyDown?.(event)
        }}
        onKeyUp={(event) => {
          readCaps(event)
          onKeyUp?.(event)
        }}
        onBlur={(event) => {
          setCapsLock(false)
          onBlur?.(event)
        }}
        trailing={
          <>
            {trailing}
            {capsLock ? (
              <span className="fa-password-caps" aria-hidden>
                Caps Lock is on
              </span>
            ) : null}
            {/* Always mounted, so assistive technology registers it before the message arrives. */}
            <span className="sr-only" role="status">
              {capsLock ? "Caps Lock is on" : ""}
            </span>
            {generateOptions && editable ? (
              <Button
                variant="ghost"
                size="sm"
                className="fa-input-btn"
                icon={<IconDice />}
                aria-label="Generate a password"
                onClick={() => {
                  change(generatePassword(generateOptions))
                  setShown(true)
                }}
              />
            ) : null}
            {canCopy ? <CopyButton value={() => text} label="Copy password" className="fa-input-btn" /> : null}
          </>
        }
      />
      {measuring && !disabled ? (
        <span className="fa-password-meter" aria-hidden>
          {SEGMENTS.map((segment) => (
            <span key={segment} className="fa-password-segment" data-on={estimate && text && estimate.score >= segment ? "" : undefined} />
          ))}
        </span>
      ) : null}
    </div>
  )
}

/** "Strong", or "Fair · Use 12 characters or more" — the words for the field's message line. */
export const describeStrength = (strength: Strength) => (strength.feedback ? `${strength.label} · ${strength.feedback}` : strength.label)

export interface PasswordFieldProps
  extends FieldChrome,
    Omit<PasswordInputProps, "value" | "defaultValue" | "onValueChange" | "name" | "onBlur" | "invalid" | "required" | "disabled" | "className"> {}

/**
 * PasswordInput bound to a string form field. For new passwords the message line says how
 * strong it is until there is an error. Pair it with `passwordSchema()` (new) or
 * `currentPasswordSchema()` (sign-in, confirm).
 */
export function PasswordField({ label, hint, optional, required, aside, className, disabled, ...control }: PasswordFieldProps) {
  const { field, error, root } = useBoundField<string>()
  const value = field.state.value
  const measuring = control.strength ?? (control.purpose ?? "new") === "new"
  const words = measuring && value ? describeStrength(estimateStrength(value, control.userInputs)) : undefined
  return (
    <Field {...root} label={label} hint={words ?? hint} optional={optional} required={required} aside={aside} className={className} disabled={disabled}>
      <PasswordInput
        {...control}
        name={field.name}
        value={value}
        onValueChange={(next) => field.handleChange(next)}
        onBlur={field.handleBlur}
        required={required}
        disabled={disabled}
        invalid={Boolean(error)}
      />
    </Field>
  )
}
