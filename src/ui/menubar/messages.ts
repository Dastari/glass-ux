import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for menubar. */
export const menubarMessages = defineMessages("menubar", {
  menu: "Menu",
  loading: "Loading",
  loadFailed: "These items could not be loaded.",
  retry: "Try again",
  empty: "No items",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    menubar: typeof menubarMessages.defaults
  }
}

/** Resolve menubar wording outside React; pass the component's locale. */
export function getMenubarMessages(locale = getLocale()): typeof menubarMessages.defaults {
  return resolveMessages(menubarMessages.namespace, menubarMessages.defaults, locale)
}
