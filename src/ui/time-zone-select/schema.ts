import { getTimeZoneSelectMessages } from "./messages.js"
import { z } from "zod"
import { isTimeZone } from "./time-zones.js"

/** An IANA zone name, or null when not required: timeZoneSchema({ required: true }) → "Choose a time zone". */
export function timeZoneSchema(options: { required?: boolean; /** Locale for validation wording. Defaults to getLocale(). */ locale?: string } = {}) {
  return z
    .string()
    .nullable()
    .superRefine((value, context) => {
      if (!value) {
        if (options.required) context.addIssue({ code: "custom", message: getTimeZoneSelectMessages(options.locale).chooseATimeZone })
        return
      }
      if (!isTimeZone(value)) context.addIssue({ code: "custom", message: getTimeZoneSelectMessages(options.locale).chooseATimeZoneFromTheList })
    })
}
