import { useMessages } from "../../lib/i18n/index.js"
import { emailFieldMessages } from "./messages.js"
import { IconMail } from "../../icons/generated/icons.js"
import { Field } from "../field/index.js"
import { useBoundField, type FieldChrome } from "../form/context.js"
import { NormalisedInput, type NormalisedInputProps } from "../input/index.js"
import { EMAIL_EXAMPLE, normaliseEmail, suggestEmail } from "./email.js"

export interface EmailInputProps extends Omit<NormalisedInputProps, "normalise" | "type" | "inputMode" | "identifier"> {}

/** An email address: trimmed, "mailto:" dropped and the domain lower-cased when focus leaves. */
export function EmailInput({ placeholder = EMAIL_EXAMPLE, icon, autoComplete = "email", ...rest }: EmailInputProps) {
  return (
    <NormalisedInput
      {...rest}
      type="email"
      inputMode="email"
      autoComplete={autoComplete}
      identifier={false}
      icon={icon === undefined ? <IconMail /> : icon}
      placeholder={placeholder}
      normalise={normaliseEmail}
    />
  )
}

export interface EmailSuggestionProps {
  /** The address someone probably meant ("avery@gmail.com"). */
  suggestion: string
  /** Called with `suggestion` when the hint is pressed, to replace the typed address with it. */
  onAccept: (suggestion: string) => void
}

/** "Did you mean avery@gmail.com?" for the field's message line; choosing it replaces the value. */
export function EmailSuggestion({ suggestion, onAccept }: EmailSuggestionProps) {
  const messages = useMessages(emailFieldMessages)

  const at = suggestion.lastIndexOf("@")
  const sentence = messages.didYouMean(suggestion)
  const position = sentence.indexOf(suggestion)
  return (
    <button type="button" className="fa-email-suggestion fa-pressable" onClick={() => onAccept(suggestion)}>
      {position < 0 ? sentence : <>{sentence.slice(0, position)}{suggestion.slice(0, at + 1)}<strong>{suggestion.slice(at + 1)}</strong>{sentence.slice(position + suggestion.length)}</>}
    </button>
  )
}

export interface EmailFieldProps
  extends FieldChrome,
    Omit<EmailInputProps, "value" | "defaultValue" | "onValueChange" | "name" | "onBlur" | "invalid" | "required" | "disabled" | "className"> {
  /** Offer a correction for a likely typo in the domain (default true). */
  suggest?: boolean
  /** Domains to correct towards besides the common providers: the organisation's own ("northstar.example"). */
  knownDomains?: readonly string[]
}

/** EmailInput bound to a string form field, with the typo hint. Pair it with `emailSchema()`. */
export function EmailField({ label, hint, optional, required, aside, className, disabled, suggest = true, knownDomains, ...control }: EmailFieldProps) {
  const { field, error, root } = useBoundField<string>()
  const value = field.state.value
  // Only once the person has left the field: no suggestions mid-word.
  const suggestion = suggest && field.state.meta.isBlurred && value ? suggestEmail(value, knownDomains) : null
  return (
    <Field
      {...root}
      label={label}
      hint={suggestion ? <EmailSuggestion suggestion={suggestion} onAccept={(next) => field.handleChange(next)} /> : hint}
      optional={optional}
      required={required}
      aside={aside}
      className={className}
      disabled={disabled}
    >
      <EmailInput
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
