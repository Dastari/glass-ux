import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for durationField. */
export const durationFieldMessages = defineMessages("durationField", {
  enterADurationFromTo: (value0: unknown, value1: unknown) => `Enter a duration from ${value0} to ${value1}`,
  enterADurationUpTo: (value0: unknown) => `Enter a duration up to ${value0}`,
  enterADurationOfOrMore: (value0: unknown) => `Enter a duration of ${value0} or more`,
  enterADuration: "Enter a duration",
  enterADurationSuchAs1h30m: "Enter a duration, such as 1h 30m",
  enterADurationSuchAs1h30m90m: "Enter a duration such as 1h 30m, 90m or 1:30",
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
