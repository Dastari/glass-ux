import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for button. */
export const buttonMessages = defineMessages("button", {
  done: "Done",
  failed: "Failed",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    button: typeof buttonMessages.defaults
  }
}

/** Resolve button wording outside React; pass the component's locale. */
export function getButtonMessages(locale = getLocale()): typeof buttonMessages.defaults {
  return resolveMessages(buttonMessages.namespace, buttonMessages.defaults, locale)
}
