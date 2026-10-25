import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for multiSelect. */
export const multiSelectMessages = defineMessages("multiSelect", {
  selected: (value0: unknown) => `${value0} selected`,
  more: "more:",
  showOptions: "Show options",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    multiSelect: typeof multiSelectMessages.defaults
  }
}

/** Resolve multiSelect wording outside React; pass the component's locale. */
export function getMultiSelectMessages(locale = getLocale()): typeof multiSelectMessages.defaults {
  return resolveMessages(multiSelectMessages.namespace, multiSelectMessages.defaults, locale)
}
