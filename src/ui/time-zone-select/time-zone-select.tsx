import { useMemo } from "react"
import { IconClock } from "../../icons/generated/icons.js"
import { dateTimeFormat } from "../../lib/locale/intl.js"
import { useLocale } from "../../lib/locale/use-locale.js"
import { Combobox, type ComboboxOption, type ComboboxProps } from "../combobox/index.js"
import { Field } from "../field/index.js"
import { useBoundField, type FieldChrome } from "../form/context.js"
import { describeTimeZone, localTimeZone, timeZoneIds } from "./time-zones.js"

export interface TimeZoneSelectProps extends Omit<ComboboxProps<string>, "options" | "source" | "loading"> {
  /** Zones listed first under "Suggested". Default: this browser's zone and UTC. */
  suggested?: readonly string[]
  /** Only these zones. */
  zones?: readonly string[]
  /** BCP 47 locale for zone abbreviations and the local time. Default: the nearest `LocaleProvider`, then `configureLocale()`, then `<html lang>`, then en-US. */
  locale?: string
}

/** The zones as options: readable IANA names, the abbreviation (in `locale`, default `getLocale()`) and offset now, sorted by offset. */
export function timeZoneOptions(options: { suggested?: readonly string[]; zones?: readonly string[]; locale?: string; at?: Date } = {}): Array<ComboboxOption<string>> {
  const at = options.at ?? new Date()
  const ids = options.zones ? [...options.zones] : timeZoneIds()
  const suggested = (options.suggested ?? [localTimeZone(), "UTC"]).filter((id, index, list) => ids.includes(id) && list.indexOf(id) === index)
  const rows = ids.map((id) => describeTimeZone(id, { at, locale: options.locale }))
  const option = (row: (typeof rows)[number], group: string | undefined): ComboboxOption<string> => ({
    value: row.id,
    label: row.id.replace(/_/g, " "),
    meta: [row.abbreviation, row.offset].filter(Boolean).join(" · "),
    group,
  })
  const rest = rows.filter((row) => !suggested.includes(row.id)).toSorted((a, b) => a.offsetMinutes - b.offsetMinutes || a.id.localeCompare(b.id))
  if (!suggested.length) return rest.map((row) => option(row, undefined))
  return [
    ...suggested.map((id) => option(rows.find((row) => row.id === id)!, "Suggested")),
    ...rest.map((row) => option(row, "All time zones")),
  ]
}

/**
 * Choose an IANA time zone by typing a city or region ("hobart", "new york"). Each row shows the
 * zone's abbreviation and offset now, so daylight saving is visible. The value is the IANA name.
 */
export function TimeZoneSelect({ suggested, zones, locale: localeProp, placeholder = "Choose a time zone", icon, ...rest }: TimeZoneSelectProps) {
  const locale = useLocale(localeProp)
  const options = useMemo(
    () => timeZoneOptions({ suggested, zones, locale }),
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- identity follows the ids, not the array instances
    [suggested?.join(), zones?.join(), locale]
  )
  return <Combobox<string> {...rest} options={options} placeholder={placeholder} icon={icon === undefined ? <IconClock /> : icon} />
}

export interface TimeZoneFieldProps extends FieldChrome, Omit<TimeZoneSelectProps, "value" | "defaultValue" | "onValueChange" | "name" | "onBlur" | "invalid" | "required" | "disabled" | "className"> {
  /** Show the zone's offset and local time now as the hint when none is given. Default true. */
  describe?: boolean
}

/** TimeZoneSelect bound to a `string | null` form field (IANA name). Pair it with `timeZoneSchema()`. */
export function TimeZoneField({ label, hint, optional, required, aside, className, disabled, describe = true, width = "medium", ...control }: TimeZoneFieldProps) {
  const { field, error, root } = useBoundField<string | null>()
  const value = field.state.value
  const locale = useLocale(control.locale)
  const derived = describe && value ? describeNow(value, locale) : undefined
  return (
    <Field {...root} label={label} hint={hint ?? derived} optional={optional} required={required} aside={aside} className={className} disabled={disabled}>
      <TimeZoneSelect
        {...control}
        width={width}
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

/** "UTC+11:00 · 2:41 pm there now". */
function describeNow(id: string, locale: string) {
  try {
    const info = describeTimeZone(id, { locale })
    const time = dateTimeFormat(locale, { timeZone: id, hour: "numeric", minute: "2-digit" }).format(new Date())
    return `${[info.abbreviation, info.offset].filter(Boolean).join(" · ")} · ${time} there now`
  } catch {
    return undefined
  }
}
