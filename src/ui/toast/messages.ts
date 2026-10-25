import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for toast. */
export const toastMessages = defineMessages("toast", {
  dismiss: "Dismiss",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    toast: typeof toastMessages.defaults
  }
}

/** Resolve toast wording outside React; pass the component's locale. */
export function getToastMessages(locale = getLocale()): typeof toastMessages.defaults {
  return resolveMessages(toastMessages.namespace, toastMessages.defaults, locale)
}
