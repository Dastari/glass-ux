import { defineMessages, resolveMessages } from "../../../lib/i18n/index.js"
import { getLocale } from "../../../lib/locale/locale.js"

/** English defaults for pie. */
export const pieMessages = defineMessages("pie", {
  other: (count: number) => `Other (${count})`,
  total: "Total",
  category: "Category",
  value: "Value",
  share: "Share",
  inspectSlices: (label: string) => `${label} — inspect slices`,
})

declare module "../../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    pie: typeof pieMessages.defaults
  }
}

/** Resolve pie wording outside React; pass the component's locale. */
export function getPieMessages(locale = getLocale()): typeof pieMessages.defaults {
  return resolveMessages(pieMessages.namespace, pieMessages.defaults, locale)
}
