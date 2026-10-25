import { useMessages } from "../../lib/i18n/index.js"
import { macFieldMessages, getMacFieldMessages } from "./messages.js"
import { useEffect, useState } from "react"
import { IconEthernet } from "../../icons/generated/icons.js"
import { useControllable } from "../../lib/use-controllable.js"
import { CopyButton } from "../copy-button/index.js"
import { Field } from "../field/index.js"
import { useBoundField, type FieldChrome } from "../form/context.js"
import { NormalisedInput, type NormalisedInputProps } from "../input/index.js"
import { describeMac, formatMac, macDigits, ouiOf, type MacFormat } from "./mac.js"

/**
 * Finds the vendor for an OUI ("001565" → "Yealink"). Sync or async; undefined when unknown.
 * The library ships no OUI table (the IEEE registry is about 4 MB); the application supplies
 * one, usually a server lookup.
 */
export type MacVendorLookup = (oui: string) => string | undefined | Promise<string | undefined>

export interface MacAddressInputProps extends Omit<NormalisedInputProps, "normalise" | "type" | "inputMode"> {
  /** How the value is written. colon (default) "00:15:65:AA:BB:CC"; hyphen (Windows); dot (Cisco); bare. */
  format?: MacFormat
  /** Upper case (default) or lower. */
  letterCase?: "upper" | "lower"
  /** A copy button while the value is a valid address (default true). */
  copyable?: boolean
}

/** A MAC address in any notation, written one way when focus leaves the field. */
export function MacAddressInput({ format = "colon", letterCase = "upper", copyable = true, value, defaultValue = "", onValueChange, placeholder, icon, trailing, ...rest }: MacAddressInputProps) {
  const messages = useMessages(macFieldMessages)

  const [text, setText] = useControllable(value, defaultValue, onValueChange)
  const style = { format, case: letterCase } as const
  const digits = text ? macDigits(text) : null
  return (
    <NormalisedInput
      {...rest}
      value={text}
      onValueChange={setText}
      icon={icon === undefined ? <IconEthernet /> : icon}
      placeholder={placeholder ?? formatMac("001565AABBCC", style)}
      normalise={(next) => {
        const found = macDigits(next)
        return found ? formatMac(found, style) : null
      }}
      trailing={
        <>
          {trailing}
          {copyable && digits ? <CopyButton value={formatMac(digits, style)} label={messages.copyMacAddress} className="fa-input-btn" /> : null}
        </>
      }
    />
  )
}

/** The vendor of a MAC address through `lookup`, kept for the address shown (stale answers are dropped). */
export function useMacVendor(value: string, lookup: MacVendorLookup | undefined): string | undefined {
  const digits = macDigits(value)
  const oui = digits ? ouiOf(digits) : null
  const [answer, setAnswer] = useState<{ oui: string; vendor: string | undefined } | null>(null)
  useEffect(() => {
    if (!lookup || !oui) return
    let current = true
    void Promise.resolve(lookup(oui)).then(
      (vendor) => {
        if (current) setAnswer({ oui, vendor })
      },
      () => undefined
    )
    return () => {
      current = false
    }
  }, [lookup, oui])
  return answer && answer.oui === oui ? answer.vendor : undefined
}

/** The hint for a MAC value: its vendor, or what kind of address it is. */
export function describeMacValue(value: string, vendor: string | undefined, messages = getMacFieldMessages()): string | undefined {
  const digits = macDigits(value)
  if (!digits) return undefined
  const special = describeMac(digits, messages)
  return [vendor ? messages.vendor(vendor) : null, special].filter(Boolean).join(" · ") || undefined
}

export interface MacAddressFieldProps
  extends FieldChrome,
    Omit<MacAddressInputProps, "value" | "defaultValue" | "onValueChange" | "name" | "onBlur" | "invalid" | "required" | "disabled" | "className"> {
  /** Look up the vendor for the hint ("Vendor · Yealink"). */
  lookupVendor?: MacVendorLookup
}

/** MacAddressInput bound to a string form field. Pair it with `macSchema()`. */
export function MacAddressField({ label, hint, optional, required, aside, className, disabled, lookupVendor, ...control }: MacAddressFieldProps) {
 const messages = useMessages(macFieldMessages)
  const { field, error, root } = useBoundField<string>()
  const vendor = useMacVendor(field.state.value, lookupVendor)
  return (
    <Field {...root} label={label} hint={hint ?? describeMacValue(field.state.value, vendor, messages)} optional={optional} required={required} aside={aside} className={className} disabled={disabled}>
      <MacAddressInput
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
