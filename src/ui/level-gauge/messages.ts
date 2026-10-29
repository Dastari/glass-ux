import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for levelGauge. */
export const levelGaugeMessages = defineMessages("levelGauge", {
  notRated: "Not rated",
  previously: "Previously",
  named: ({ label, value }: { label: string; value: string }) => `${label}: ${value}`,
  withPrevious: ({ label, value, previousLabel, previous }: { label: string; value: string; previousLabel: string; previous: string }) =>
    `${label}: ${value} (${previousLabel}: ${previous})`,
  previousLine: ({ previousLabel, previous }: { previousLabel: string; previous: string }) => `${previousLabel}: ${previous}`,
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    levelGauge: typeof levelGaugeMessages.defaults
  }
}

/** Resolve levelGauge wording outside React; pass the component's locale. */
export function getLevelGaugeMessages(locale = getLocale()): typeof levelGaugeMessages.defaults {
  return resolveMessages(levelGaugeMessages.namespace, levelGaugeMessages.defaults, locale)
}
