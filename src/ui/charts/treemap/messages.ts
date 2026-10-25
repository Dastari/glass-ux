import { defineMessages, resolveMessages } from "../../../lib/i18n/index.js"
import { getLocale } from "../../../lib/locale/locale.js"

/** English defaults for treemap. */
export const treemapMessages = defineMessages("treemap", {
  name: "Name",
  pressEnterToOpen: (label: string) => `${label} · press Enter to open`,
  explore: (label: string) => `${label} — explore`,
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
