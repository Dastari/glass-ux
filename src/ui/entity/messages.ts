import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for entity. */
export const entityMessages = defineMessages("entity", {
  actionsFor: (name: string) => `Actions for ${name}`,
  remove: (name: string) => `Remove ${name}`,
  loading: "Loading",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    entity: typeof entityMessages.defaults
  }
}

/** Resolve entity wording outside React; pass the component's locale. */
export function getEntityMessages(locale = getLocale()): typeof entityMessages.defaults {
  return resolveMessages(entityMessages.namespace, entityMessages.defaults, locale)
}
