import { defineMessages, resolveMessages } from "../../../lib/i18n/index.js"
import { getLocale } from "../../../lib/locale/locale.js"

/** English defaults for scatter. */
export const scatterMessages = defineMessages("scatter", {
  item: "Item",
  series: "Series",
  items: "items",
  inspectPoints: (label: string) => `${label} — inspect points`,
  count: "Count",
  range: "Range",
})

declare module "../../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    scatter: typeof scatterMessages.defaults
  }
}

/** Resolve scatter wording outside React; pass the component's locale. */
export function getScatterMessages(locale = getLocale()): typeof scatterMessages.defaults {
  return resolveMessages(scatterMessages.namespace, scatterMessages.defaults, locale)
}
