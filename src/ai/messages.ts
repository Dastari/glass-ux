import { defineMessages, resolveMessages } from "../lib/i18n/index.js"
import { getLocale } from "../lib/locale/locale.js"

/** English defaults for ai. */
export const aiMessages = defineMessages("ai", {
  item: "Item",
  items: "Items",
})

declare module "../lib/i18n/catalog.js" {
  interface MessageCatalog {
    ai: typeof aiMessages.defaults
  }
}

/** Resolve ai wording outside React; pass the component's locale. */
export function getAiMessages(locale = getLocale()): typeof aiMessages.defaults {
  return resolveMessages(aiMessages.namespace, aiMessages.defaults, locale)
}
