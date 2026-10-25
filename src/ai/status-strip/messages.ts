import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for statusStrip. */
export const statusStripMessages = defineMessages("statusStrip", {
  live: "Live",
  attempt: (value0: unknown) => ` · attempt ${value0}`,
  conversationReloadedFromTheServer: "Conversation reloaded from the server",
  offlineHistoryStaysReadable: "Offline · history stays readable",
  retryNow: "Retry now",
  of: (value0: unknown, value1: unknown, value2: unknown) => `${value0} of ${value1} ${value2}`,
  reconnecting: 'Reconnecting',
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    statusStrip: typeof statusStripMessages.defaults
  }
}

/** Resolve statusStrip wording outside React; pass the component's locale. */
export function getStatusStripMessages(locale = getLocale()): typeof statusStripMessages.defaults {
  return resolveMessages(statusStripMessages.namespace, statusStripMessages.defaults, locale)
}
