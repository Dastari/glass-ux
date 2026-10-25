import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for badge. */
export const badgeMessages = defineMessages("badge", {
  online: "Online",
  offline: "Offline",
  warning: "Warning",
  error: "Error",
  installing: "Installing",
  maintenance: "Maintenance",
  connecting: "Connecting",
  live: "Live",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    badge: typeof badgeMessages.defaults
  }
}

/** Resolve badge wording outside React; pass the component's locale. */
export function getBadgeMessages(locale = getLocale()): typeof badgeMessages.defaults {
  return resolveMessages(badgeMessages.namespace, badgeMessages.defaults, locale)
}
