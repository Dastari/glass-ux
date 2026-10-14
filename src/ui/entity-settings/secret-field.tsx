import { useRef, type FocusEvent, type ReactNode } from "react"
import { IconKey } from "../../icons/generated/icons.js"
import { Button } from "../button/index.js"
import { Field, type FieldWidth } from "../field/index.js"
import { firstError, useFieldContext } from "../form/index.js"
import { Input } from "../input/index.js"
import type { SecretValue } from "./settings-state.js"

export interface SecretInputProps {
  value: SecretValue
  /** Called when value change occurs. The callback type specifies its arguments. */
  onValueChange: (value: SecretValue) => void
  /** Called when blur occurs. The callback type specifies its arguments. */
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void
  /** Available width or named width tier. */
  width?: FieldWidth
  disabled?: boolean
  /** Marks the control invalid. Pair it with an accessible validation message. */
  invalid?: boolean
  /** Names the secret for its buttons: "community" → "Replace community". */
  name?: string
  id?: string
  placeholder?: string
}

/**
 * A write-only secret (BR notes): a stored value is never shown, only "Set", with Replace
 * and Clear. Replace swaps in an empty password box (with Keep current to back out); Clear
 * marks it for removal on save (with Undo). With nothing stored, the box takes a new value.
 */
export function SecretInput({ value, onValueChange, onBlur, width, disabled, invalid, name = "secret", id, placeholder }: SecretInputProps) {
  const boxRef = useRef<HTMLInputElement>(null)
  const replace = () => {
    onValueChange({ ...value, action: "replace", value: "" })
    requestAnimationFrame(() => boxRef.current?.focus())
  }
  if (value.action === "keep" && value.stored) {
    return (
      <Input
        id={id}
        readOnly
        value="Set"
        icon={<IconKey />}
        width={width}
        disabled={disabled}
        invalid={invalid}
        onBlur={onBlur}
        data-secret-state="set"
        trailing={
          <>
            <Button size="sm" variant="ghost" className="fa-input-btn fa-secret-btn" disabled={disabled} onClick={replace} aria-label={`Replace ${name}`} tooltip={false}>
              Replace
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="fa-input-btn fa-secret-btn"
              disabled={disabled}
              onClick={() => onValueChange({ ...value, action: "clear", value: "" })}
              aria-label={`Clear ${name}`}
              tooltip={false}
            >
              Clear
            </Button>
          </>
        }
      />
    )
  }
  if (value.action === "clear") {
    return (
      <Input
        id={id}
        readOnly
        value="Cleared when you save"
        icon={<IconKey />}
        width={width}
        disabled={disabled}
        invalid={invalid}
        onBlur={onBlur}
        data-secret-state="clear"
        trailing={
          <Button
            size="sm"
            variant="ghost"
            className="fa-input-btn fa-secret-btn"
            disabled={disabled}
            onClick={() => onValueChange({ ...value, action: "keep", value: "" })}
            aria-label={`Undo clearing ${name}`}
            tooltip={false}
          >
            Undo
          </Button>
        }
      />
    )
  }
  return (
    <Input
      ref={boxRef}
      id={id}
      type="password"
      autoComplete="new-password"
      spellCheck={false}
      value={value.value}
      placeholder={placeholder ?? (value.stored ? "New value" : undefined)}
      width={width}
      disabled={disabled}
      invalid={invalid}
      onBlur={onBlur}
      data-secret-state={value.stored ? "replace" : "new"}
      onValueChange={(next) => onValueChange({ ...value, action: next ? "replace" : value.stored ? "replace" : "keep", value: next })}
      trailing={
        value.stored ? (
          <Button
            size="sm"
            variant="ghost"
            className="fa-input-btn fa-secret-btn"
            disabled={disabled}
            onClick={() => onValueChange({ ...value, action: "keep", value: "" })}
            aria-label={`Keep the current ${name}`}
            tooltip={false}
          >
            Keep current
          </Button>
        ) : undefined
      }
    />
  )
}

export interface SecretFieldProps {
  label: ReactNode
  /** Supporting text in the field’s reserved message slot. Validation errors take precedence. */
  hint?: ReactNode
  /** Shows the optional-field indication without changing validation. */
  optional?: boolean
  required?: boolean
  /** Available width or named width tier. */
  width?: FieldWidth
  disabled?: boolean
  /** Names the secret for its buttons ("community"). */
  secretName?: string
  className?: string
}

/**
 * SecretInput bound to a form field holding a `SecretValue`: use it inside
 * `form.AppField`. The schema decides when a secret is required (`secretWillBeSet`).
 */
export function SecretField({ label, hint, optional, required, width, disabled, secretName, className }: SecretFieldProps) {
  const field = useFieldContext<SecretValue>()
  const error = firstError(field.state.meta.errors)
  return (
    <Field
      name={field.name}
      label={label}
      hint={hint}
      optional={optional}
      required={required}
      error={error}
      dirty={field.state.meta.isDirty}
      touched={field.state.meta.isTouched}
      disabled={disabled}
      className={className}
    >
      <SecretInput
        value={field.state.value}
        onValueChange={(next) => field.handleChange(next)}
        onBlur={field.handleBlur}
        width={width}
        disabled={disabled}
        invalid={Boolean(error)}
        name={secretName ?? (typeof label === "string" ? label.toLowerCase() : undefined)}
      />
    </Field>
  )
}
