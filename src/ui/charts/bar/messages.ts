import { defineMessages, resolveMessages } from "../../../lib/i18n/index.js"
import { getLocale } from "../../../lib/locale/locale.js"

/** English defaults for bar. */
export const barMessages = defineMessages("bar", {
  category: "Category",
  total: "Total",
  more: "more",
  inspectValues: (label: string) => `${label} — inspect values`,
  totalValue: (value: string) => `Total ${value}`,
})

declare module "../../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    bar: typeof barMessages.defaults
  }
}

/** Resolve bar wording outside React; pass the component's locale. */
export function getBarMessages(locale = getLocale()): typeof barMessages.defaults {
  return resolveMessages(barMessages.namespace, barMessages.defaults, locale)
}
