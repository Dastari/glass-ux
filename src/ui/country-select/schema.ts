import { getCountrySelectMessages } from "./messages.js"
import { z } from "zod"
import { isCountryCode } from "./countries.js"

/** An ISO 3166-1 code, or null when not required: countrySchema({ required: true }) → "Choose a country". */
export function countrySchema(options: { required?: boolean; /** Locale for validation wording. Defaults to getLocale(). */ locale?: string } = {}) {
  return z
    .string()
    .nullable()
    .superRefine((value, context) => {
      if (!value) {
        if (options.required) context.addIssue({ code: "custom", message: getCountrySelectMessages(options.locale).chooseACountry })
        return
      }
      if (!isCountryCode(value)) context.addIssue({ code: "custom", message: getCountrySelectMessages(options.locale).chooseACountryFromTheList })
    })
}
