import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for landing. */
export const landingMessages = defineMessages("landing", {
  whatCanIHelpYouWith: "What can I help you with?",
  helpYou: "help you",
  suggestions: "Suggestions",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    landing: typeof landingMessages.defaults
  }
}

/** Resolve landing wording outside React; pass the component's locale. */
export function getLandingMessages(locale = getLocale()): typeof landingMessages.defaults {
  return resolveMessages(landingMessages.namespace, landingMessages.defaults, locale)
}
