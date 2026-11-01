import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { numberFormat } from "../../lib/locale/intl.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for diffView. */
export const diffViewMessages = defineMessages("diffView", {
  added: "Added",
  removed: "Removed",
  summary: ({ label, added, removed, locale = "en-US" }: { label: string; added: number; removed: number; locale?: string }) =>
    `${label}: ${numberFormat(locale).format(added)} added, ${numberFormat(locale).format(removed)} removed`,
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    diffView: typeof diffViewMessages.defaults
  }
}

/** Resolve diffView wording outside React; pass the component's locale. */
export function getDiffViewMessages(locale = getLocale()): typeof diffViewMessages.defaults {
  return resolveMessages(diffViewMessages.namespace, diffViewMessages.defaults, locale)
}
