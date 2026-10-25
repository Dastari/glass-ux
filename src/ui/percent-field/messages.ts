import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for percentField. */
export const percentFieldMessages = defineMessages("percentField", {
  enterAPercentage: "Enter a percentage",
  enterAPercentageFromTo: (value0: unknown, value1: unknown) => `Enter a percentage from ${value0} to ${value1}`,
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    percentField: typeof percentFieldMessages.defaults
  }
}

/** Resolve percentField wording outside React; pass the component's locale. */
export function getPercentFieldMessages(locale = getLocale()): typeof percentFieldMessages.defaults {
  return resolveMessages(percentFieldMessages.namespace, percentFieldMessages.defaults, locale)
}
