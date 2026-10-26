import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for sources. */
export const sourcesMessages = defineMessages("sources", {
  source: (index: number, title: string) => `Source ${index}: ${title}`,
  sources: "Sources",
  opensInANewTab: "Opens in a new tab",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    sources: typeof sourcesMessages.defaults
  }
}

/** Resolve sources wording outside React; pass the component's locale. */
export function getSourcesMessages(locale = getLocale()): typeof sourcesMessages.defaults {
  return resolveMessages(sourcesMessages.namespace, sourcesMessages.defaults, locale)
}
