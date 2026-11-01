import { defineMessages, resolveMessages } from "../../../lib/i18n/index.js"
import { getLocale } from "../../../lib/locale/locale.js"

/** English defaults for radar. */
export const radarMessages = defineMessages("radar", {
  measure: "Measure",
  inspectMeasures: (label: string) => `${label} — inspect measures`,
  inspectMeasuresEnterSelects: (label: string) => `${label} — inspect measures, Enter selects`,
})

declare module "../../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    radar: typeof radarMessages.defaults
  }
}

/** Resolve radar wording outside React; pass the component's locale. */
export function getRadarMessages(locale = getLocale()): typeof radarMessages.defaults {
  return resolveMessages(radarMessages.namespace, radarMessages.defaults, locale)
}
