import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for autocomplete. */
export const autocompleteMessages = defineMessages("autocomplete", {
  clear: "Clear",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    autocomplete: typeof autocompleteMessages.defaults
  }
}

/** Resolve autocomplete wording outside React; pass the component's locale. */
export function getAutocompleteMessages(locale = getLocale()): typeof autocompleteMessages.defaults {
  return resolveMessages(autocompleteMessages.namespace, autocompleteMessages.defaults, locale)
}
