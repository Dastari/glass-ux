import { z } from "zod"
import { COORDINATES_EXAMPLE, isLatitude, isLongitude, LATITUDE_RANGE, LONGITUDE_RANGE, type LatLng } from "./coordinates.js"

/**
 * A `{ lat, lng }` point, or null when not required. CoordinatesInput holds NaN while its text
 * cannot be read, and the numbers it read when they are out of range, so the messages say which:
 *
 *   coordinatesSchema({ required: true }) → "Enter a latitude and longitude, such as -42.88334, 147.32688"
 *                                         → "Latitude must be between -90 and 90"
 */
export function coordinatesSchema(options: { required?: boolean } = {}) {
  return z
    .custom<LatLng | null>((value) => value === null || (typeof value === "object" && value !== null && "lat" in value && "lng" in value), { message: COORDINATES_EXAMPLE })
    .superRefine((value, context) => {
      if (value === null) {
        if (options.required) context.addIssue({ code: "custom", message: COORDINATES_EXAMPLE })
        return
      }
      if (!Number.isFinite(value.lat) || !Number.isFinite(value.lng)) context.addIssue({ code: "custom", message: COORDINATES_EXAMPLE })
      else if (!isLatitude(value.lat)) context.addIssue({ code: "custom", message: LATITUDE_RANGE })
      else if (!isLongitude(value.lng)) context.addIssue({ code: "custom", message: LONGITUDE_RANGE })
    })
}
