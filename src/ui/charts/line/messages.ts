import { defineMessages, resolveMessages } from "../../../lib/i18n/index.js"
import { getLocale } from "../../../lib/locale/locale.js"

/** English defaults for line. */
export const lineMessages = defineMessages("line", {
  noSamplesAvailableVisualBridgeOnly: "No samples available · visual bridge only",
  dashedLinesJoinReadingsAcrossTimesWithNo: "Dashed lines join readings across times with no samples.",
  time: "Time",
  count1InSamples: (value0: unknown, value1: unknown) => `${value0} (1 in ${value1} samples)`,
  inspectValuesEnterSelects: (value0: unknown) => `${value0} — inspect values, Enter selects`,
  inspectValues: (value0: unknown) => `${value0} — inspect values`,
  total: (value0: unknown) => `Total ${value0}`,
  selected: " · selected",
})

declare module "../../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    line: typeof lineMessages.defaults
  }
}

/** Resolve line wording outside React; pass the component's locale. */
export function getLineMessages(locale = getLocale()): typeof lineMessages.defaults {
  return resolveMessages(lineMessages.namespace, lineMessages.defaults, locale)
}
