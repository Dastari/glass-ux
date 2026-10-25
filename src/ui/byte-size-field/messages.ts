import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for byteSizeField. */
export const byteSizeFieldMessages = defineMessages("byteSizeField", {
  enterASizeFromTo: (minimum: string, maximum: string) => `Enter a size from ${minimum} to ${maximum}`,
  enterASizeUpTo: (maximum: string) => `Enter a size up to ${maximum}`,
  enterASizeOfOrMore: (minimum: string) => `Enter a size of ${minimum} or more`,
  enterASize: "Enter a size",
  invalidSize: "Enter a size, such as 500 MB",
  sizeExamples: "Enter a size such as 500 MB or 1.5 GB",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    byteSizeField: typeof byteSizeFieldMessages.defaults
  }
}

/** Resolve byteSizeField wording outside React; pass the component's locale. */
export function getByteSizeFieldMessages(locale = getLocale()): typeof byteSizeFieldMessages.defaults {
  return resolveMessages(byteSizeFieldMessages.namespace, byteSizeFieldMessages.defaults, locale)
}
