import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for byteSizeField. */
export const byteSizeFieldMessages = defineMessages("byteSizeField", {
  enterASizeFromTo: (value0: unknown, value1: unknown) => `Enter a size from ${value0} to ${value1}`,
  enterASizeUpTo: (value0: unknown) => `Enter a size up to ${value0}`,
  enterASizeOfOrMore: (value0: unknown) => `Enter a size of ${value0} or more`,
  enterASize: "Enter a size",
  enterASizeSuchAs500Mb: "Enter a size, such as 500 MB",
  enterASizeSuchAs500MbOr: "Enter a size such as 500 MB or 1.5 GB",
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
