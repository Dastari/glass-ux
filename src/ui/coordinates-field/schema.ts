import { getCoordinatesFieldMessages } from "./messages.js"
import { z } from "zod"
import { isLatitude, isLongitude, type LatLng } from "./coordinates.js"

/**
 * A `{ lat, lng }` point, or null when not required. CoordinatesInput holds NaN while its text
 * cannot be read, and the numbers it read when they are out of range, so the messages say which:
 *
 *   coordinatesSchema({ required: true }) → "Enter a latitude and longitude, such as -42.88334, 147.32688"
 *                                         → "Latitude must be between -90 and 90"
 */
export function coordinatesSchema(options: { required?: boolean; /** Locale for validation wording. Defaults to getLocale(). */ locale?: string } = {}) {
  return z
    .custom<LatLng | null>((value) => value === null || (typeof value === "object" && value !== null && "lat" in value && "lng" in value), { error: () => getCoordinatesFieldMessages(options.locale).invalidCoordinates })
    .superRefine((value, context) => {
      if (value === null) {
        if (options.required) context.addIssue({ code: "custom", message: getCoordinatesFieldMessages(options.locale).invalidCoordinates })
        return
      }
      if (!Number.isFinite(value.lat) || !Number.isFinite(value.lng)) context.addIssue({ code: "custom", message: getCoordinatesFieldMessages(options.locale).invalidCoordinates })
      else if (!isLatitude(value.lat)) context.addIssue({ code: "custom", message: getCoordinatesFieldMessages(options.locale).latitudeRange })
      else if (!isLongitude(value.lng)) context.addIssue({ code: "custom", message: getCoordinatesFieldMessages(options.locale).longitudeRange })
    })
}
