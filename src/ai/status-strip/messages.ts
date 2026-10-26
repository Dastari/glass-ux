import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for statusStrip. */
export const statusStripMessages = defineMessages("statusStrip", {
  live: "Live",
  reconnectStatus: ({ attempt, time }: { attempt?: number; time?: string }) => `Reconnecting${attempt ? ` · attempt ${attempt}` : ""}${time ? ` · ${time}` : ""}`,
  reloaded: "Conversation reloaded from the server",
  offlineHistoryStaysReadable: "Offline · history stays readable",
  retryNow: "Retry now",
  budgetUsage: ({ used, maximum, unit }: { used: string; maximum: string; unit: string }) => `${used} of ${maximum} ${unit}`,
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
