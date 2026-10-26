import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for coordinatesField. */
export const coordinatesFieldMessages = defineMessages("coordinatesField", {
  geolocationBlocked: "Location is blocked for this site. Allow it in the browser's site settings, then try again.",
  geolocationUnavailable: "This device could not work out where it is. Try again outside, or enter the coordinates.",
  geolocationTimeout: "Finding the location took too long. Try again, or enter the coordinates.",
  theLocationIsNotAvailable: "The location is not available",
  locationNotFound: "Location not found",
  copyCoordinates: "Copy coordinates",
  pickOnMap: "Pick on map",
  pickThePointClickTheMapOrDrag: "Pick the point: click the map or drag the pin",
  clickTheMapToPlaceThePinThen: "Click the map to place the pin, then drag it to adjust.",
  useMyLocation: "Use my location",
  geolocationPermission: "Location is blocked for this site. Allow it in the browser's site settings.",
  invalidCoordinates: "Enter a latitude and longitude, such as -42.88334, 147.32688",
  thatLinkHasNoCoordinatesInIt: "That link has no coordinates in it — copy them from the map instead",
  latitudeRange: 'Latitude must be between -90 and 90',
  longitudeRange: 'Longitude must be between -180 and 180',
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    coordinatesField: typeof coordinatesFieldMessages.defaults
  }
}

/** Resolve coordinatesField wording outside React; pass the component's locale. */
export function getCoordinatesFieldMessages(locale = getLocale()): typeof coordinatesFieldMessages.defaults {
  return resolveMessages(coordinatesFieldMessages.namespace, coordinatesFieldMessages.defaults, locale)
}
