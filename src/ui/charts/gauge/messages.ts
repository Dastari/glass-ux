import { defineMessages, resolveMessages } from "../../../lib/i18n/index.js"
import { getLocale } from "../../../lib/locale/locale.js"

/** English defaults for gauge. */
export const gaugeMessages = defineMessages("gauge", {
  measure: "Measure",
  value: "Value",
  range: "Range",
  ofMax: "Of max",
})

declare module "../../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    gauge: typeof gaugeMessages.defaults
  }
}

/** Resolve gauge wording outside React; pass the component's locale. */
export function getGaugeMessages(locale = getLocale()): typeof gaugeMessages.defaults {
  return resolveMessages(gaugeMessages.namespace, gaugeMessages.defaults, locale)
}
