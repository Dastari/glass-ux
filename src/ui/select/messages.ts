import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for select. */
export const selectMessages = defineMessages("select", {
  choose: "Choose…",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    select: typeof selectMessages.defaults
  }
}

/** Resolve select wording outside React; pass the component's locale. */
export function getSelectMessages(locale = getLocale()): typeof selectMessages.defaults {
  return resolveMessages(selectMessages.namespace, selectMessages.defaults, locale)
}
