import { IconGlobe, IconServer } from "../../icons/generated/icons.js"
import { useControllable } from "../../lib/use-controllable.js"
import { CopyButton } from "../copy-button/index.js"
import { Field } from "../field/index.js"
import { useBoundField, type FieldChrome } from "../form/context.js"
import { NormalisedInput, type NormalisedInputProps } from "../input/index.js"
import { NETBIOS_MAX, normaliseDomain, normaliseHostname, type HostnameOptions } from "./hostname.js"

interface HostTextProps extends Omit<NormalisedInputProps, "normalise" | "type" | "inputMode"> {
  /** A copy button while the value is valid (default false: names are short and visible). */
  copyable?: boolean
}

export interface HostnameInputProps extends HostTextProps, HostnameOptions {}

/** A host name: one label ("NST-C106") or a dotted name ("printer.northstar.local"). A pasted URL gives its host. */
export function HostnameInput({ fqdn, wildcard, case: letterCase, copyable = false, value, defaultValue = "", onValueChange, placeholder, icon, trailing, ...rest }: HostnameInputProps) {
  const [text, setText] = useControllable(value, defaultValue, onValueChange)
  const options = { fqdn, wildcard, case: letterCase }
  const valid = text ? normaliseHostname(text, options) : null
  return (
    <NormalisedInput
      {...rest}
      value={text}
      onValueChange={setText}
      icon={icon === undefined ? <IconServer /> : icon}
      placeholder={placeholder ?? (fqdn ? "printer.northstar.local" : "NST-C106")}
      normalise={(next) => normaliseHostname(next, options)}
      trailing={
        <>
          {trailing}
          {copyable && valid ? <CopyButton value={valid} label="Copy host name" className="fa-input-btn" /> : null}
        </>
      }
    />
  )
}

export interface DomainInputProps extends HostTextProps, Omit<HostnameOptions, "fqdn"> {}

/** A domain ("northstar.example"), lower case; Unicode becomes punycode; a pasted URL gives its host. */
export function DomainInput({ wildcard, case: letterCase, copyable = false, value, defaultValue = "", onValueChange, placeholder, icon, trailing, ...rest }: DomainInputProps) {
  const [text, setText] = useControllable(value, defaultValue, onValueChange)
  const options = { wildcard, case: letterCase }
  const valid = text ? normaliseDomain(text, options) : null
  return (
    <NormalisedInput
      {...rest}
      value={text}
      onValueChange={setText}
      icon={icon === undefined ? <IconGlobe /> : icon}
      placeholder={placeholder ?? (wildcard ? "*.northstar.example" : "northstar.example")}
      normalise={(next) => normaliseDomain(next, options)}
      trailing={
        <>
          {trailing}
          {copyable && valid ? <CopyButton value={valid} label="Copy domain" className="fa-input-btn" /> : null}
        </>
      }
    />
  )
}

type BoundOmit = "value" | "defaultValue" | "onValueChange" | "name" | "onBlur" | "invalid" | "required" | "disabled" | "className"

export interface HostnameFieldProps extends FieldChrome, Omit<HostnameInputProps, BoundOmit> {
  /** Warn (as the hint) when a single-label name passes NetBIOS's 15 characters. Default false. */
  netbios?: boolean
}

/** HostnameInput bound to a string form field. Pair it with `hostnameSchema()`. */
export function HostnameField({ label, hint, optional, required, aside, className, disabled, netbios = false, ...control }: HostnameFieldProps) {
  const { field, error, root } = useBoundField<string>()
  const value = field.state.value
  const long = netbios && !value.includes(".") && value.length > NETBIOS_MAX ? `Longer than ${NETBIOS_MAX} characters: older Windows tools see only the first ${NETBIOS_MAX}` : undefined
  return (
    <Field {...root} label={label} hint={hint ?? long} optional={optional} required={required} aside={aside} className={className} disabled={disabled}>
      <HostnameInput
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

export interface DomainFieldProps extends FieldChrome, Omit<DomainInputProps, BoundOmit> {}

/** DomainInput bound to a string form field. Pair it with `domainSchema()`. */
export function DomainField({ label, hint, optional, required, aside, className, disabled, ...control }: DomainFieldProps) {
  const { field, error, root } = useBoundField<string>()
  return (
    <Field {...root} label={label} hint={hint} optional={optional} required={required} aside={aside} className={className} disabled={disabled}>
      <DomainInput
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
