import { plural } from "../../../lib/i18n/catalog.js"
import { defineMessages, resolveMessages } from "../../../lib/i18n/index.js"
import { getLocale } from "../../../lib/locale/locale.js"
import { numberFormat } from "../../../lib/locale/intl.js"

/** English defaults for sankey. */
export const sankeyMessages = defineMessages("sankey", {
  source: "Source",
  target: "Target",
  value: "Value",
  shareOfSource: "Share of source",
  total: "Total",
  flow: (source: string, target: string) => `${source} → ${target}`,
  incoming: "In",
  outgoing: "Out",
  ofSource: (share: string) => `${share} of source`,
  inspectFlows: (label: string) => `${label} — inspect flows`,
  inspectFlowsEnterSelects: (label: string) => `${label} — inspect flows, Enter selects`,
  loopsNotDrawn: (count: number, locale = "en-US") =>
    plural(locale, count, {
      one: `${numberFormat(locale).format(count)} flow that loops back is in the table but not drawn.`,
      other: `${numberFormat(locale).format(count)} flows that loop back are in the table but not drawn.`,
    }),
})

declare module "../../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    sankey: typeof sankeyMessages.defaults
  }
}

/** Resolve sankey wording outside React; pass the component's locale. */
export function getSankeyMessages(locale = getLocale()): typeof sankeyMessages.defaults {
  return resolveMessages(sankeyMessages.namespace, sankeyMessages.defaults, locale)
}
