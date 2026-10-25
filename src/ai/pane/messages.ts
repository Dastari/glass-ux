import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for pane. */
export const paneMessages = defineMessages("pane", {
  assistant: "Assistant",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    pane: typeof paneMessages.defaults
  }
}

/** Resolve pane wording outside React; pass the component's locale. */
export function getPaneMessages(locale = getLocale()): typeof paneMessages.defaults {
  return resolveMessages(paneMessages.namespace, paneMessages.defaults, locale)
}
