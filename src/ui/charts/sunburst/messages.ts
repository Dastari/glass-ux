import { defineMessages, resolveMessages } from "../../../lib/i18n/index.js"
import { getLocale } from "../../../lib/locale/locale.js"

/** English defaults for sunburst. */
export const sunburstMessages = defineMessages("sunburst", {
  name: "Name",
  pressEscapeToGoUp: " · press Escape to go up",
  pressEnterToOpen: " · press Enter to open",
  explore: (value0: unknown) => `${value0} — explore`,
  clickToGoBackTo: (value0: unknown) => `Click to go back to ${value0}`,
  clickToOpen: "Click to open",
  backTo: (value0: unknown) => `Back to ${value0}`,
})

declare module "../../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    sunburst: typeof sunburstMessages.defaults
  }
}

/** Resolve sunburst wording outside React; pass the component's locale. */
export function getSunburstMessages(locale = getLocale()): typeof sunburstMessages.defaults {
  return resolveMessages(sunburstMessages.namespace, sunburstMessages.defaults, locale)
}
