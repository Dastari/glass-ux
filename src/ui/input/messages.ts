import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for input. */
export const inputMessages = defineMessages("input", {
  clear: "Clear",
  hidePassword: "Hide password",
  showPassword: "Show password",
  search: "Search",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    input: typeof inputMessages.defaults
  }
}

/** Resolve input wording outside React; pass the component's locale. */
export function getInputMessages(locale = getLocale()): typeof inputMessages.defaults {
  return resolveMessages(inputMessages.namespace, inputMessages.defaults, locale)
}
