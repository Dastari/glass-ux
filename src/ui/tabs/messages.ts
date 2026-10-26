import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for tabs. */
export const tabsMessages = defineMessages("tabs", {
  more: "More",
  moreTabs: (count: number) => `More tabs (${count})`,
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    tabs: typeof tabsMessages.defaults
  }
}

/** Resolve tabs wording outside React; pass the component's locale. */
export function getTabsMessages(locale = getLocale()): typeof tabsMessages.defaults {
  return resolveMessages(tabsMessages.namespace, tabsMessages.defaults, locale)
}
