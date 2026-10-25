import { getDatePickerMessages } from "./messages.js"
import { getLocale } from "../../lib/locale/locale.js"
import { dateTimeFormat } from "../../lib/locale/intl.js"
import { useLocale } from "../../lib/locale/use-locale.js"
import { Field } from "../field/index.js"
import { useBoundField, type FieldChrome } from "../form/context.js"
import { fromIsoDate } from "./calendar-date.js"
import { DateTimeInput, zoneLabel, type DateTimeInputProps } from "./date-time-input.js"
import { formatTimeText, type TimeValue } from "./time.js"
import { TimeInput, type TimeInputProps } from "./time-input.js"
import { isWallClock, resolveWallClock, splitWallClock, type WallClock } from "./zoned-time.js"

type Bound = "value" | "defaultValue" | "onValueChange" | "onReject" | "name" | "onBlur" | "invalid" | "required" | "disabled" | "className"

export interface TimeFieldProps extends FieldChrome, Omit<TimeInputProps, Bound> {}

/**
 * TimeInput bound to a `string | null` form field holding `HH:mm`. Pair it with `timeSchema()`
 * and the same locale, clock and bounds. Unreadable text reaches the form as typed and a time
 * outside min/max as read, so the schema can say which.
 */
export function TimeField({ label, hint, warning, optional, required, aside, className, disabled, ...control }: TimeFieldProps) {
  const { field, error, root } = useBoundField<TimeValue | null>()
  return (
    <Field {...root} label={label} hint={hint} warning={warning} optional={optional} required={required} aside={aside} className={className} disabled={disabled}>
      <TimeInput
        {...control}
        name={field.name}
        value={field.state.value}
        onValueChange={(next) => field.handleChange(next)}
        onReject={(next) => field.handleChange(next)}
        onBlur={field.handleBlur}
        required={required}
        disabled={disabled}
        invalid={Boolean(error)}
      />
    </Field>
  )
}

export interface DateTimeFieldProps extends FieldChrome, Omit<DateTimeInputProps, Bound> {
  /**
   * With `timeZone`, describe the zone as the hint when none is given ("Australia/Sydney · UTC+11:00"),
   * and explain a time a daylight-saving change skips (a warning) or repeats. Default true.
   */
  describe?: boolean
}

const shortDay = (date: string, locale: string) => dateTimeFormat(locale, { day: "numeric", month: "short" }).format(fromIsoDate(date))

/**
 * What the message line says about a wall-clock value in a zone: the zone and its offset, or how
 * a daylight-saving change reads it ("Clocks skip 2:30 am on 4 Oct; read as 3:30 am AEDT").
 * `options.locale` defaults to `getLocale()`.
 */
export function describeZonedValue(value: WallClock | null, timeZone: string, options: { locale?: string; hourCycle?: 12 | 24 } = {}): { hint?: string; warning?: string } {
  const locale = options.locale ?? getLocale()
  const resolved = value && isWallClock(value) ? resolveWallClock(value, timeZone) : null
  const zone = zoneLabel(timeZone, resolved?.epochMs ?? Date.now(), locale)
  if (!zone) return {}
  const name = timeZone.replace(/_/g, " ")
  const offset = zone.long.split(", ").at(-1)
  if (!resolved || resolved.kind === "exact" || !value) return { hint: `${name} · ${offset}` }
  const parts = splitWallClock(value)!
  const typed = formatTimeText(parts.time, { ...options, locale })
  const day = shortDay(parts.date, locale)
  if (resolved.kind === "gap") {
    const read = formatTimeText(resolved.wallClock.slice(11, 16), { ...options, locale })
    return { warning: getDatePickerMessages(locale).clocksSkipOnReadAs(typed, day, read, zone.short) }
  }
  return { hint: getDatePickerMessages(locale).occursTwiceOnReadAsThe(typed, day, zone.short) }
}

/**
 * DateTimeInput bound to a `string | null` form field holding a wall clock (`2026-10-21T09:30`).
 * Pair it with `dateTimeSchema()` and the same locale, bounds and zone. One label names both
 * parts; one message line serves both. An incomplete or unreadable entry reaches the form as
 * read, so the schema names the part to fix.
 */
export function DateTimeField({ label, hint, warning, optional, required, aside, className, disabled, describe = true, ...control }: DateTimeFieldProps) {
  const { field, error, root } = useBoundField<WallClock | null>()
  const value = field.state.value
  const locale = useLocale(control.locale)
  const derived = describe && control.timeZone ? describeZonedValue(value, control.timeZone, { ...control, locale }) : {}
  return (
    <Field
      {...root}
      label={label}
      hint={hint ?? derived.hint}
      warning={warning ?? derived.warning}
      optional={optional}
      required={required}
      aside={aside}
      className={className}
      disabled={disabled}
    >
      <DateTimeInput
        {...control}
        name={field.name}
        value={value}
        onValueChange={(next) => field.handleChange(next)}
        onReject={(next) => field.handleChange(next)}
        onBlur={field.handleBlur}
        required={required}
        disabled={disabled}
        invalid={Boolean(error)}
      />
    </Field>
  )
}
