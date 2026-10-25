import { useMessages } from "../../lib/i18n/index.js"
import { countrySelectMessages } from "./messages.js"
import { useMemo } from "react"
import { useLocale } from "../../lib/locale/use-locale.js"
import { Combobox, type ComboboxOption, type ComboboxProps } from "../combobox/index.js"
import { Field } from "../field/index.js"
import { useBoundField, type FieldChrome } from "../form/context.js"
import { listCountries } from "./countries.js"
import { CountryFlag } from "./flag.js"

export interface CountrySelectProps extends Omit<ComboboxProps<string>, "options" | "source" | "icon" | "loading"> {
  /** Only these ISO codes. */
  countries?: readonly string[]
  /** Codes listed first, in this order: the workspace's own country, then its neighbours. Default ["AU", "NZ"]. */
  priority?: readonly string[]
  /** Flags beside the names (SVG, lazy; never emoji). Default true. */
  flags?: boolean
  /** BCP 47 locale for the country names and their order. Default: the nearest `LocaleProvider`, then `configureLocale()`, then `<html lang>`, then en-US. */
  locale?: string
}

/**
 * Choose a country by typing its name: every ISO 3166-1 country, named by the platform in the
 * locale, with its flag and code. The value is the ISO 3166-1 alpha-2 code ("AU").
 */
export function CountrySelect({ countries, priority = ["AU", "NZ"], flags = true, locale: localeProp, value, defaultValue, placeholder: placeholderProp, ...rest }: CountrySelectProps) {
  const messages = useMessages(countrySelectMessages, { locale: localeProp })
  const placeholder = placeholderProp ?? messages.chooseACountry

  const locale = useLocale(localeProp)
  const options = useMemo<Array<ComboboxOption<string>>>(
    () =>
      listCountries({ locale, only: countries, priority }).map((country) => ({
        value: country.code,
        label: country.name,
        icon: flags ? <CountryFlag code={country.code} /> : undefined,
        meta: country.code,
      })),
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- list identity follows the codes, not the array instances
    [locale, countries?.join(), priority.join(), flags]
  )
  const current = value ?? defaultValue ?? null
  return (
    <Combobox<string>
      {...rest}
      value={value}
      defaultValue={defaultValue}
      options={options}
      placeholder={placeholder}
      icon={flags && current ? <CountryFlag code={current} /> : undefined}
    />
  )
}

export interface CountryFieldProps extends FieldChrome, Omit<CountrySelectProps, "value" | "defaultValue" | "onValueChange" | "name" | "onBlur" | "invalid" | "required" | "disabled" | "className"> {}

/** CountrySelect bound to a `string | null` form field (ISO code). Pair it with `countrySchema()`. */
export function CountryField({ label, hint, optional, required, aside, className, disabled, width = "medium", ...control }: CountryFieldProps) {
  const { field, error, root } = useBoundField<string | null>()
  return (
    <Field {...root} label={label} hint={hint} optional={optional} required={required} aside={aside} className={className} disabled={disabled}>
      <CountrySelect
        {...control}
        width={width}
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
