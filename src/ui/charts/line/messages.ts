import { defineMessages, resolveMessages } from "../../../lib/i18n/index.js"
import { getLocale } from "../../../lib/locale/locale.js"

/** English defaults for line. */
export const lineMessages = defineMessages("line", {
  gapLabel: "No samples available · visual bridge only",
  gapDescription: "Dashed lines join readings across times with no samples.",
  time: "Time",
  sampleInterval: (label: string, interval: number) => `${label} (1 in ${interval} samples)`,
  inspectValuesEnterSelects: (label: string) => `${label} — inspect values, Enter selects`,
  inspectValues: (label: string) => `${label} — inspect values`,
  total: (value: string) => `Total ${value}`,
  selectionLabel: " · selected",
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
