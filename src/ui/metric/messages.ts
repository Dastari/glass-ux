import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for metric. */
export const metricMessages = defineMessages("metric", {
  up: "Up",
  down: "Down",
  noChange: "No change",
  minimumAverageMaximum: ({ label, range, minimum, average, maximum, current }: { label: string; range: string; minimum: string; average: string; maximum: string; current: string }) => `${label}${range ? `, ${range}` : ""}: minimum ${minimum}, average ${average}, maximum ${maximum}, latest ${current}`,
  samplesAgo: (count: number) => `${count} samples ago`,
  min: (value: string) => `Min ${value}`,
  avg: (value: string) => `Avg ${value}`,
  max: (value: string) => `Max ${value}`,
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
