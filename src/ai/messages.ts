import { defineMessages, resolveMessages } from "../lib/i18n/index.js"
import { getLocale } from "../lib/locale/locale.js"

/** English defaults for ai. */
export const aiMessages = defineMessages("ai", {
  item: "Item",
  items: "Items",
  minS: (value0: unknown, value1: unknown, value2: unknown, value3: unknown) => `${value0}${value1}min ${value2}${value3}s`,
  inAMinute: "in a minute",
  inMin: (value0: unknown, value1: unknown) => `in ${value0}${value1}min`,
  inH: (value0: unknown, value1: unknown) => `in ${value0}${value1}h`,
  inDays: (value0: unknown) => `in ${value0} days`,
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
