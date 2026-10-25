import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for field. */
export const fieldMessages = defineMessages("field", {
  optional: "Optional",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    field: typeof fieldMessages.defaults
  }
}

/** Resolve field wording outside React; pass the component's locale. */
export function getFieldMessages(locale = getLocale()): typeof fieldMessages.defaults {
  return resolveMessages(fieldMessages.namespace, fieldMessages.defaults, locale)
}
