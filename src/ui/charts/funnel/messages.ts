import { defineMessages, resolveMessages } from "../../../lib/i18n/index.js"
import { getLocale } from "../../../lib/locale/locale.js"

/** English defaults for funnel. */
export const funnelMessages = defineMessages("funnel", {
  stage: "Stage",
  value: "Value",
  ofFirst: "Of first stage",
  ofPrevious: "Of previous stage",
  dropOff: "Drop-off",
  overall: "Overall",
  inspectStages: (label: string) => `${label} — inspect stages`,
  inspectStagesEnterSelects: (label: string) => `${label} — inspect stages, Enter selects`,
  ofFirstValue: (share: string) => `${share} of first stage`,
  ofPreviousValue: (share: string) => `${share} of previous stage`,
  dropOffValue: (value: string) => `${value} dropped off`,
})

declare module "../../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    funnel: typeof funnelMessages.defaults
  }
}

/** Resolve funnel wording outside React; pass the component's locale. */
export function getFunnelMessages(locale = getLocale()): typeof funnelMessages.defaults {
  return resolveMessages(funnelMessages.namespace, funnelMessages.defaults, locale)
}
