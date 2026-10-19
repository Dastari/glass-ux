import { z } from "zod"
import { datePlaceholder, formatDateText, isIsoDate } from "./calendar-date.js"
import { formatTimeText, isTimeValue, timeToSeconds, type TimeTextOptions, type TimeValue } from "./time.js"
import { isWallClock, resolveWallClock, splitWallClock, type WallClock } from "./zoned-time.js"

export interface TimeSchemaOptions extends TimeTextOptions {
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
 */
export function timeSchema(options: TimeSchemaOptions = {}) {
  const show = (time: TimeValue) => formatTimeText(time, options)
  const example = `Enter a time such as ${show(options.seconds ? "09:30:00" : "09:30")}`
  const range =
    options.min && options.max
      ? `Enter a time from ${show(options.min)} to ${show(options.max)}`
      : options.max
        ? `Enter a time of ${show(options.max)} or earlier`
        : options.min
          ? `Enter a time of ${show(options.min)} or later`
          : example
  return z
    .custom<TimeValue | null>((value) => value === null || typeof value === "string", { message: example })
    .superRefine((value, context) => {
      if (value === null || !value.trim()) {
        if (options.required) context.addIssue({ code: "custom", message: "Enter a time" })
        return
      }
      if (!isTimeValue(value, { seconds: Boolean(options.seconds) })) {
        context.addIssue({ code: "custom", message: example })
        return
      }
      const at = timeToSeconds(value)
      if ((options.min && at < timeToSeconds(options.min)) || (options.max && at > timeToSeconds(options.max))) context.addIssue({ code: "custom", message: range })
    })
}

export interface DateTimeSchemaOptions extends Omit<TimeTextOptions, "seconds"> {
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
 *   dateTimeSchema({ min: "2026-10-21T09:00" }) → "Enter a date and time on or after 21/10/2026 9:00 am"
 */
export function dateTimeSchema(options: DateTimeSchemaOptions = {}) {
  const locale = options.locale ?? "en-AU"
  const show = (wall: WallClock) => {
    const parts = splitWallClock(wall)
    return parts ? `${formatDateText(parts.date, locale)} ${formatTimeText(parts.time, options)}` : wall
  }
  const timeExample = `Enter a time such as ${formatTimeText("09:30", options)}`
  const range =
    options.min && options.max
      ? `Enter a date and time from ${show(options.min)} to ${show(options.max)}`
      : options.max
        ? `Enter a date and time on or before ${show(options.max)}`
        : options.min
          ? `Enter a date and time on or after ${show(options.min)}`
          : "Enter a date and time"
  return z
    .custom<WallClock | null>((value) => value === null || typeof value === "string", { message: "Enter a date and time" })
    .superRefine((value, context) => {
      const issue = (message: string) => context.addIssue({ code: "custom", message })
      if (value === null || !value.trim()) {
        if (options.required) issue("Enter a date and time")
        return
      }
      if (!isWallClock(value)) {
        const cut = value.lastIndexOf("T")
        const date = (cut < 0 ? value : value.slice(0, cut)).trim()
        const time = (cut < 0 ? "" : value.slice(cut + 1)).trim()
        if (!date) issue("Enter a date")
        else if (!isIsoDate(date)) issue(`Enter a date as ${datePlaceholder(locale)}`)
        else if (!time) issue("Enter a time")
        else if (!isTimeValue(time)) issue(timeExample)
        else issue("Enter a date and time")
        return
      }
      const at = value.slice(0, 16)
      if ((options.min && at < options.min.slice(0, 16)) || (options.max && at > options.max.slice(0, 16))) return issue(range)
      if (options.timeZone && options.daylightSaving === "reject") {
        const kind = resolveWallClock(value, options.timeZone)?.kind
        if (kind === "gap") issue("This time does not exist during the daylight-saving change; choose another time")
        if (kind === "overlap") issue("This time occurs twice during the daylight-saving change; choose an unambiguous time")
      }
    })
}
