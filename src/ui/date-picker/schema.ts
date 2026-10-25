import { getDatePickerMessages } from "./messages.js"
import { z } from "zod"
import { getLocale } from "../../lib/locale/locale.js"
import { datePlaceholder, formatDateText, isIsoDate } from "./calendar-date.js"
import { formatTimeText, isTimeValue, timeToSeconds, type TimeTextOptions, type TimeValue } from "./time.js"
import { isWallClock, resolveWallClock, splitWallClock, type WallClock } from "./zoned-time.js"

export interface TimeSchemaOptions extends TimeTextOptions {
  /** Locale for validation wording. Defaults to getLocale(). */
  locale?: string
  /** Empty is an error ("Enter a time"). Default false. */
  required?: boolean
  /** Earliest allowed time. */
  min?: TimeValue
  /** Latest allowed time. */
  max?: TimeValue
}

/**
 * A time of day (`HH:mm`, or `HH:mm:ss` with `seconds`), or null when not required. Pass the
 * field's locale, hour cycle and bounds so the messages show times as the field does:
 *
 *   timeSchema({ required: true, min: "09:00", max: "17:00" }) → "Enter a time from 9:00 am to 5:00 pm"
 *
 * TimeField hands unreadable text to the form as typed, so it gets "Enter a time such as 9:30 am".
 * Without `locale`, messages use `getLocale()` when a value is checked, so a schema created at
 * import time still follows `configureLocale()` called later. A `LocaleProvider` cannot reach a
 * schema: pass its locale explicitly.
 */
export function timeSchema(options: TimeSchemaOptions = {}) {
  const messages = () => {
    const text = { ...options, locale: options.locale ?? getLocale() }
    const show = (time: TimeValue) => formatTimeText(time, text)
    const example = getDatePickerMessages(options.locale).enterATimeSuchAs(show(options.seconds ? "09:30:00" : "09:30"))
    const range =
      options.min && options.max
        ? getDatePickerMessages(options.locale).enterATimeFromTo(show(options.min), show(options.max))
        : options.max
          ? getDatePickerMessages(options.locale).enterATimeOfOrEarlier(show(options.max))
          : options.min
            ? getDatePickerMessages(options.locale).enterATimeOfOrLater(show(options.min))
            : example
    return { example, range }
  }
  return z
    .custom<TimeValue | null>((value) => value === null || typeof value === "string", { error: () => messages().example })
    .superRefine((value, context) => {
      if (value === null || !value.trim()) {
        if (options.required) context.addIssue({ code: "custom", message: getDatePickerMessages(options.locale).enterATime })
        return
      }
      if (!isTimeValue(value, { seconds: Boolean(options.seconds) })) {
        context.addIssue({ code: "custom", message: messages().example })
        return
      }
      const at = timeToSeconds(value)
      if ((options.min && at < timeToSeconds(options.min)) || (options.max && at > timeToSeconds(options.max))) context.addIssue({ code: "custom", message: messages().range })
    })
}

export interface DateTimeSchemaOptions extends Omit<TimeTextOptions, "seconds"> {
  /** Locale for validation wording. Defaults to getLocale(). */
  locale?: string
  /** Empty is an error ("Enter a date and time"). Default false. */
  required?: boolean
  /** Earliest allowed wall-clock date and time. */
  min?: WallClock
  /** Latest allowed wall-clock date and time. */
  max?: WallClock
  /** IANA zone the wall clock is read in; needed for `daylightSaving: "reject"`. */
  timeZone?: string
  /**
   * resolve (default): a time skipped or repeated by a daylight-saving change is valid and is
   * resolved as `resolveWallClock` does (the field explains it). reject: it is an error.
   */
  daylightSaving?: "resolve" | "reject"
}

/**
 * A wall-clock date and time (`2026-10-21T09:30`), or null when not required. DateTimeField
 * hands an incomplete or unreadable entry to the form as read, so the message names the part:
 *
 *   dateTimeSchema({ required: true }) → "Enter a date and time"
 *                                      → "Enter a time" (a day without a time)
 *                                      → "Enter a date as dd/mm/yyyy"
 *   dateTimeSchema({ min: "2026-10-21T09:00" }) → "Enter a date and time on or after 21/10/2026 9:00 am" (en-AU)
 *
 * Without `locale`, messages use `getLocale()` when a value is checked (see `timeSchema`).
 */
export function dateTimeSchema(options: DateTimeSchemaOptions = {}) {
  const messages = () => {
    const locale = options.locale ?? getLocale()
    const text = { ...options, locale }
    const show = (wall: WallClock) => {
      const parts = splitWallClock(wall)
      return parts ? `${formatDateText(parts.date, locale)} ${formatTimeText(parts.time, text)}` : wall
    }
    const range =
      options.min && options.max
        ? getDatePickerMessages(options.locale).enterADateAndTimeFromTo(show(options.min), show(options.max))
        : options.max
          ? getDatePickerMessages(options.locale).enterADateAndTimeOnOrBefore(show(options.max))
          : options.min
            ? getDatePickerMessages(options.locale).enterADateAndTimeOnOrAfter(show(options.min))
            : getDatePickerMessages(options.locale).enterADateAndTime
    return { locale, range, timeExample: getDatePickerMessages(options.locale).enterATimeSuchAs(formatTimeText("09:30", text)) }
  }
  return z
    .custom<WallClock | null>((value) => value === null || typeof value === "string", { message: getDatePickerMessages(options.locale).enterADateAndTime })
    .superRefine((value, context) => {
      const issue = (message: string) => context.addIssue({ code: "custom", message })
      if (value === null || !value.trim()) {
        if (options.required) issue(getDatePickerMessages(options.locale).enterADateAndTime)
        return
      }
      if (!isWallClock(value)) {
        const cut = value.lastIndexOf("T")
        const date = (cut < 0 ? value : value.slice(0, cut)).trim()
        const time = (cut < 0 ? "" : value.slice(cut + 1)).trim()
        if (!date) issue(getDatePickerMessages(options.locale).enterADate)
        else if (!isIsoDate(date)) issue(getDatePickerMessages(options.locale).enterADateAs(datePlaceholder(messages().locale)))
        else if (!time) issue(getDatePickerMessages(options.locale).enterATime)
        else if (!isTimeValue(time)) issue(messages().timeExample)
        else issue(getDatePickerMessages(options.locale).enterADateAndTime)
        return
      }
      const at = value.slice(0, 16)
      if ((options.min && at < options.min.slice(0, 16)) || (options.max && at > options.max.slice(0, 16))) return issue(messages().range)
      if (options.timeZone && options.daylightSaving === "reject") {
        const kind = resolveWallClock(value, options.timeZone)?.kind
        if (kind === "gap") issue(getDatePickerMessages(options.locale).thisTimeDoesNotExistDuringTheDaylightSaving)
        if (kind === "overlap") issue(getDatePickerMessages(options.locale).thisTimeOccursTwiceDuringTheDaylightSavingChange)
      }
    })
}
