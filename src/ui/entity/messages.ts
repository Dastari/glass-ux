import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for entity. */
export const entityMessages = defineMessages("entity", {
  actionsFor: (value0: unknown) => `Actions for ${value0}`,
  remove: (value0: unknown) => `Remove ${value0}`,
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
