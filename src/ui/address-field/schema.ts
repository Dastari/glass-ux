import { getAddressFieldMessages } from "./messages.js"
import { z } from "zod"
import { addressConvention, isPostcode, type AddressValue } from "./address.js"

export interface AddressSchemaOptions {
  /** Locale for validation wording. Defaults to getLocale(). */
  locale?: string
  /** An address must be given (a street or a locality, and a country). Default false: empty is fine. */
  required?: boolean
  /** The position must be known (from the lookup or the pin). Default false: the server can geocode. */
  requireLocation?: boolean
}

const region = z.object({ code: z.string(), name: z.string() })
const point = z.object({ lat: z.number(), lng: z.number() })

/**
 * An AddressValue. Messages land on the part to fix — `line1`, `locality`, `postcode`,
 * `country` — so AddressField shows each on its own row:
 *
 *   addressSchema({ required: true }) → "Enter the street address", "Enter the suburb or town",
 *                                       "Enter a 4-digit postcode, such as 7000", "Choose a country"
 *
 * An empty address passes unless `required`. A PO Box is a street line.
 */
export function addressSchema(options: AddressSchemaOptions = {}) {
  return z
    .object({
      line1: z.string().max(120, { error: () => getAddressFieldMessages(options.locale).use120CharactersOrFewer }),
      line2: z.string().max(120, { error: () => getAddressFieldMessages(options.locale).use120CharactersOrFewer }),
      locality: z.string().max(80, { error: () => getAddressFieldMessages(options.locale).use80CharactersOrFewer }),
      region,
      postcode: z.string().max(12, { error: () => getAddressFieldMessages(options.locale).use12CharactersOrFewer }),
      country: region,
      location: point.nullable(),
      pinned: z.boolean(),
    })
    .superRefine((value: AddressValue, context) => {
      const started = Boolean(value.line1.trim() || value.line2.trim() || value.locality.trim() || value.postcode.trim() || value.location)
      if (!started && !options.required) return
      const convention = addressConvention(value.country.code, getAddressFieldMessages(options.locale))
      if (!value.line1.trim()) context.addIssue({ code: "custom", path: ["line1"], message: getAddressFieldMessages(options.locale).enterTheStreetAddressOrAPoBox })
      if (!value.locality.trim()) context.addIssue({ code: "custom", path: ["locality"], message: getAddressFieldMessages(options.locale).enterThe(convention.locality.toLowerCase()) })
      if (!value.country.code) context.addIssue({ code: "custom", path: ["country"], message: getAddressFieldMessages(options.locale).chooseACountry })
      if (value.postcode.trim() && !isPostcode(value.country.code, value.postcode)) {
        const example = convention.postcodeExample ? getAddressFieldMessages(options.locale).suchAs(convention.postcodeExample) : ""
        context.addIssue({ code: "custom", path: ["postcode"], message: getAddressFieldMessages(options.locale).checkThe(convention.postcode.toLowerCase(), example) })
      }
      if (options.requireLocation && !value.location) context.addIssue({ code: "custom", path: ["line1"], message: getAddressFieldMessages(options.locale).chooseTheAddressFromTheSuggestionsOrPlace })
    })
}
