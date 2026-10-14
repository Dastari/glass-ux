import { z } from "zod"
import { addressConvention, isPostcode, type AddressValue } from "./address.js"

export interface AddressSchemaOptions {
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
      line1: z.string().max(120, "Use 120 characters or fewer"),
      line2: z.string().max(120, "Use 120 characters or fewer"),
      locality: z.string().max(80, "Use 80 characters or fewer"),
      region,
      postcode: z.string().max(12, "Use 12 characters or fewer"),
      country: region,
      location: point.nullable(),
      pinned: z.boolean(),
    })
    .superRefine((value: AddressValue, context) => {
      const started = Boolean(value.line1.trim() || value.line2.trim() || value.locality.trim() || value.postcode.trim() || value.location)
      if (!started && !options.required) return
      const convention = addressConvention(value.country.code)
      if (!value.line1.trim()) context.addIssue({ code: "custom", path: ["line1"], message: "Enter the street address, or a PO Box" })
      if (!value.locality.trim()) context.addIssue({ code: "custom", path: ["locality"], message: `Enter the ${convention.locality.toLowerCase()}` })
      if (!value.country.code) context.addIssue({ code: "custom", path: ["country"], message: "Choose a country" })
      if (value.postcode.trim() && !isPostcode(value.country.code, value.postcode)) {
        const example = convention.postcodeExample ? `, such as ${convention.postcodeExample}` : ""
        context.addIssue({ code: "custom", path: ["postcode"], message: `Check the ${convention.postcode.toLowerCase()}${example}` })
      }
      if (options.requireLocation && !value.location) context.addIssue({ code: "custom", path: ["line1"], message: "Choose the address from the suggestions, or place the pin" })
    })
}
