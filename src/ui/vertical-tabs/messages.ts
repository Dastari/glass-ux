import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for verticalTabs. */
export const verticalTabsMessages = defineMessages("verticalTabs", {
  unsavedChanges: "unsaved changes",
  hasErrors: "has errors",
  saved: "saved",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    verticalTabs: typeof verticalTabsMessages.defaults
  }
}

/** Resolve verticalTabs wording outside React; pass the component's locale. */
export function getVerticalTabsMessages(locale = getLocale()): typeof verticalTabsMessages.defaults {
  return resolveMessages(verticalTabsMessages.namespace, verticalTabsMessages.defaults, locale)
}
