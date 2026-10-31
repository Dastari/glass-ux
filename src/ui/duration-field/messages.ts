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
  // Words people type for each unit, lower case and separated by spaces. They are read in addition to
  // English and to the words the runtime writes for the locale, so a pack lists only usual extras.
  weekWords: "w wk wks week weeks",
  dayWords: "d day days",
  hourWords: "h hr hrs hour hours",
  minuteWords: "m min mins minute minutes",
  secondWords: "s sec secs second seconds",
  // Words that may join the parts of a spelled-out duration ("1 hour and 15 minutes").
  joiningWords: "and",
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
