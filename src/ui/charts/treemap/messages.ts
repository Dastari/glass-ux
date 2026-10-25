import { defineMessages, resolveMessages } from "../../../lib/i18n/index.js"
import { getLocale } from "../../../lib/locale/locale.js"

/** English defaults for treemap. */
export const treemapMessages = defineMessages("treemap", {
  name: "Name",
  pressEnterToOpen: " · press Enter to open",
  explore: (value0: unknown) => `${value0} — explore`,
  clickToOpen: "Click to open",
})

declare module "../../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    treemap: typeof treemapMessages.defaults
  }
}

/** Resolve treemap wording outside React; pass the component's locale. */
export function getTreemapMessages(locale = getLocale()): typeof treemapMessages.defaults {
  return resolveMessages(treemapMessages.namespace, treemapMessages.defaults, locale)
}
