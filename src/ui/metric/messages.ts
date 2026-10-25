import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for metric. */
export const metricMessages = defineMessages("metric", {
  up: "Up",
  down: "Down",
  noChange: "No change",
  minimumAverageMaximum: (value0: unknown, value1: unknown, value2: unknown, value3: unknown, value4: unknown, value5: unknown) => `${value0}${value1}: minimum ${value2}, average ${value3}, maximum ${value4}, latest ${value5}`,
  samplesAgo: (value0: unknown) => `${value0} samples ago`,
  min: "Min",
  avg: "Avg",
  max: "Max",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    metric: typeof metricMessages.defaults
  }
}

/** Resolve metric wording outside React; pass the component's locale. */
export function getMetricMessages(locale = getLocale()): typeof metricMessages.defaults {
  return resolveMessages(metricMessages.namespace, metricMessages.defaults, locale)
}
