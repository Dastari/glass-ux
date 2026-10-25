import { defineMessages, resolveMessages } from "../../../lib/i18n/index.js"
import { getLocale } from "../../../lib/locale/locale.js"

/** English defaults for heatmap. */
export const heatmapMessages = defineMessages("heatmap", {
  category: "Category",
  time: "Time",
  peak: "Peak",
  inspectCells: (value0: unknown) => `${value0} — inspect cells`,
  acrossAllRows: (value0: unknown) => `${value0} across all rows`,
})

declare module "../../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    heatmap: typeof heatmapMessages.defaults
  }
}

/** Resolve heatmap wording outside React; pass the component's locale. */
export function getHeatmapMessages(locale = getLocale()): typeof heatmapMessages.defaults {
  return resolveMessages(heatmapMessages.namespace, heatmapMessages.defaults, locale)
}
