import { defineMessages, resolveMessages } from "../../../lib/i18n/index.js"
import { getLocale } from "../../../lib/locale/locale.js"

/** English defaults for sunburst. */
export const sunburstMessages = defineMessages("sunburst", {
  name: "Name",
  pressEscapeToGoUp: (label: string) => `${label} · press Escape to go up`,
  pressEnterToOpen: (label: string) => `${label} · press Enter to open`,
  explore: (label: string) => `${label} — explore`,
  clickToGoBackTo: (label: string) => `Click to go back to ${label}`,
  clickToOpen: "Click to open",
  backTo: (label: string) => `Back to ${label}`,
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
