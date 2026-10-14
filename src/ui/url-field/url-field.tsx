import { IconExternalLink, IconLink } from "../../icons/generated/icons.js"
import { useControllable } from "../../lib/use-controllable.js"
import { Button } from "../button/index.js"
import { Field } from "../field/index.js"
import { useBoundField, type FieldChrome } from "../form/context.js"
import { NormalisedInput, type NormalisedInputProps } from "../input/index.js"
import { isInsecure, normaliseUrl, type UrlOptions } from "./url.js"

export interface UrlInputProps extends Omit<NormalisedInputProps, "normalise" | "type" | "inputMode" | "identifier">, UrlOptions {
  /** An "Open in a new tab" button while the value is a valid URL (default true). */
  openable?: boolean
}

/** A web address. A missing scheme is added on blur ("https://"); the URL is written canonically. */
export function UrlInput({ schemes, defaultScheme, requireTld, openable = true, value, defaultValue = "", onValueChange, placeholder, icon, trailing, ...rest }: UrlInputProps) {
  const [text, setText] = useControllable(value, defaultValue, onValueChange)
  const options = { schemes, defaultScheme, requireTld }
  const valid = text ? normaliseUrl(text, options) : null
  return (
    <NormalisedInput
      autoComplete="url"
      {...rest}
      type="url"
      inputMode="url"
      identifier={false}
      value={text}
      onValueChange={setText}
      icon={icon === undefined ? <IconLink /> : icon}
      placeholder={placeholder ?? `${defaultScheme ?? schemes?.[0] ?? "https"}://northstar.example`}
      normalise={(next) => normaliseUrl(next, options)}
      trailing={
        <>
          {trailing}
          {openable && valid && /^https?:/i.test(valid) ? (
            <Button
              variant="ghost"
              size="sm"
              className="fa-input-btn"
              icon={<IconExternalLink />}
              aria-label="Open in a new tab"
              onClick={() => window.open(valid, "_blank", "noopener,noreferrer")}
            />
          ) : null}
        </>
      }
    />
  )
}

export interface UrlFieldProps
  extends FieldChrome,
    Omit<UrlInputProps, "value" | "defaultValue" | "onValueChange" | "name" | "onBlur" | "invalid" | "required" | "disabled" | "className"> {
  /** Say so in the hint when the address is http:// (default true when https is allowed). */
  warnInsecure?: boolean
}

/** UrlInput bound to a string form field. Pair it with `urlSchema()`. */
export function UrlField({ label, hint, optional, required, aside, className, disabled, warnInsecure, ...control }: UrlFieldProps) {
  const { field, error, root } = useBoundField<string>()
  const value = field.state.value
  const warn = (warnInsecure ?? (control.schemes ?? ["https"]).includes("https")) && isInsecure(value) ? "Not encrypted: http:// sends everything in the clear" : undefined
  return (
    <Field {...root} label={label} hint={hint ?? warn} optional={optional} required={required} aside={aside} className={className} disabled={disabled}>
      <UrlInput
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
