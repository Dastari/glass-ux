import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for popover. */
export const popoverMessages = defineMessages("popover", {
  close: "Close",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    popover: typeof popoverMessages.defaults
  }
}

/** Resolve popover wording outside React; pass the component's locale. */
export function getPopoverMessages(locale = getLocale()): typeof popoverMessages.defaults {
  return resolveMessages(popoverMessages.namespace, popoverMessages.defaults, locale)
}
