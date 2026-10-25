import { useMessages } from "../../lib/i18n/index.js"
import { ipFieldMessages, getIpFieldMessages } from "./messages.js"
import { IconNetwork } from "../../icons/generated/icons.js"
import { useLocale } from "../../lib/locale/use-locale.js"
import { useControllable } from "../../lib/use-controllable.js"
import { CopyButton } from "../copy-button/index.js"
import { Field } from "../field/index.js"
import { useBoundField, type FieldChrome } from "../form/context.js"
import { NormalisedInput, type NormalisedInputProps } from "../input/index.js"
import { describeRange, isNetworkAddress, networkOf, normaliseIp, parseIp, scopeOf, type CidrMode, type IpVersion } from "./ip.js"

export interface IpInputProps extends Omit<NormalisedInputProps, "normalise" | "type" | "inputMode"> {
  /** IPv4, IPv6 or either (default). */
  version?: IpVersion | "any"
  /** A prefix length (/24): "none" (default), "optional" or "required". */
  cidr?: CidrMode
  /** A copy button while the value is a valid address (default true). */
  copyable?: boolean
}

const PLACEHOLDER: Record<CidrMode, Record<IpVersion | "any", string>> = {
  none: { 4: "192.168.1.10", 6: "2001:db8::1", any: "192.168.1.10" },
  optional: { 4: "192.168.1.0/24", 6: "2001:db8::/64", any: "192.168.1.0/24" },
  required: { 4: "192.168.1.0/24", 6: "2001:db8::/64", any: "192.168.1.0/24" },
}

/**
 * An IPv4 or IPv6 address, optionally with a prefix length. Typed text stays as typed; on blur
 * it becomes canonical (leading zeros gone, IPv6 compressed per RFC 5952, brackets dropped).
 */
export function IpInput({ version = "any", cidr = "none", copyable = true, value, defaultValue = "", onValueChange, placeholder, icon, trailing, ...rest }: IpInputProps) {
  const messages = useMessages(ipFieldMessages)

  const [text, setText] = useControllable(value, defaultValue, onValueChange)
  const options = { version, cidr }
  const valid = text ? normaliseIp(text, options) : null
  return (
    <NormalisedInput
      {...rest}
      value={text}
      onValueChange={setText}
      icon={icon === undefined ? <IconNetwork /> : icon}
      placeholder={placeholder ?? PLACEHOLDER[cidr][version]}
      normalise={(next) => normaliseIp(next, options)}
      trailing={
        <>
          {trailing}
          {copyable && valid ? <CopyButton value={valid} label={cidr === "none" ? messages.copyAddress : messages.copyRange} className="fa-input-btn" /> : null}
        </>
      }
    />
  )
}

/**
 * What a valid value means, for the field's hint: "Private · 254 hosts · 192.168.1.1–…", or
 * "Host bits set: the network is 192.168.1.0/24". Undefined for an empty or unreadable value.
 * The host count is written in `options.locale` (default `getLocale()`).
 */
export function describeIp(value: string, options: { version?: IpVersion | "any"; cidr?: CidrMode; locale?: string } = {}, messages = getIpFieldMessages(options.locale)): string | undefined {
  if (!value.trim()) return undefined
  const result = parseIp(value, options)
  if (!result.ok) return undefined
  const ip = result.value
  if (!isNetworkAddress(ip)) return messages.hostBitsSetTheNetworkIs(networkOf(ip).address, ip.prefix)
  return [scopeOf(ip, messages), describeRange(ip, options.locale, messages)].filter(Boolean).join(" · ") || undefined
}

export interface IpFieldProps extends FieldChrome, Omit<IpInputProps, "value" | "defaultValue" | "onValueChange" | "name" | "onBlur" | "invalid" | "required" | "disabled" | "className"> {
  /** Show what the address is (private, its range) as the hint when none is given. Default true. */
  describe?: boolean
}

/** IpInput bound to a string form field. Pair it with `ipSchema()`. */
export function IpField({ label, hint, optional, required, aside, className, disabled, describe = true, ...control }: IpFieldProps) {
 const messages = useMessages(ipFieldMessages)
  const { field, error, root } = useBoundField<string>()
  const locale = useLocale()
  const derived = describe ? describeIp(field.state.value, { ...control, locale }, messages) : undefined
  return (
    <Field {...root} label={label} hint={hint ?? derived} optional={optional} required={required} aside={aside} className={className} disabled={disabled}>
      <IpInput
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
