import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for durationField. */
export const durationFieldMessages = defineMessages("durationField", {
  enterADurationFromTo: (minimum: string, maximum: string) => `Enter a duration from ${minimum} to ${maximum}`,
  enterADurationUpTo: (maximum: string) => `Enter a duration up to ${maximum}`,
  enterADurationOfOrMore: (minimum: string) => `Enter a duration of ${minimum} or more`,
  enterADuration: "Enter a duration",
  invalidDuration: "Enter a duration, such as 1h 30m",
  durationExamples: "Enter a duration such as 1h 30m, 90m or 1:30",
  example: "1h 30m",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    durationField: typeof durationFieldMessages.defaults
  }
}

/** Resolve durationField wording outside React; pass the component's locale. */
export function getDurationFieldMessages(locale = getLocale()): typeof durationFieldMessages.defaults {
  return resolveMessages(durationFieldMessages.namespace, durationFieldMessages.defaults, locale)
}
