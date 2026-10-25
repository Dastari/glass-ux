import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for progress. */
export const progressMessages = defineMessages("progress", {
  inProgress: "In progress",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    progress: typeof progressMessages.defaults
  }
}

/** Resolve progress wording outside React; pass the component's locale. */
export function getProgressMessages(locale = getLocale()): typeof progressMessages.defaults {
  return resolveMessages(progressMessages.namespace, progressMessages.defaults, locale)
}
