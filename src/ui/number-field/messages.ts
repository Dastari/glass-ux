import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for numberField. */
export const numberFieldMessages = defineMessages("numberField", {
  decrease: "Decrease",
  increase: "Increase",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    numberField: typeof numberFieldMessages.defaults
  }
}

/** Resolve numberField wording outside React; pass the component's locale. */
export function getNumberFieldMessages(locale = getLocale()): typeof numberFieldMessages.defaults {
  return resolveMessages(numberFieldMessages.namespace, numberFieldMessages.defaults, locale)
}
