import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for status-bar. */
export const statusBarMessages = defineMessages("statusBar", {
  moreStatus: (count: string) => `More status (${count})`,
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    statusBar: typeof statusBarMessages.defaults
  }
}

/** Resolve status-bar wording outside React; pass the component's locale. */
export function getStatusBarMessages(locale = getLocale()): typeof statusBarMessages.defaults {
  return resolveMessages(statusBarMessages.namespace, statusBarMessages.defaults, locale)
}
