import { z } from "zod"
import { isTimeZone } from "./time-zones.js"

/** An IANA zone name, or null when not required: timeZoneSchema({ required: true }) → "Choose a time zone". */
export function timeZoneSchema(options: { required?: boolean } = {}) {
  return z
    .string()
    .nullable()
    .superRefine((value, context) => {
      if (!value) {
        if (options.required) context.addIssue({ code: "custom", message: "Choose a time zone" })
        return
      }
      if (!isTimeZone(value)) context.addIssue({ code: "custom", message: "Choose a time zone from the list" })
    })
}
