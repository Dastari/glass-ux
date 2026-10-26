import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for reasoning. */
export const reasoningMessages = defineMessages("reasoning", {
  thinking: (time: string) => `Thinking ${time}`,
  thoughtFor: (time: string) => `Thought for ${time}`,
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    reasoning: typeof reasoningMessages.defaults
  }
}

/** Resolve reasoning wording outside React; pass the component's locale. */
export function getReasoningMessages(locale = getLocale()): typeof reasoningMessages.defaults {
  return resolveMessages(reasoningMessages.namespace, reasoningMessages.defaults, locale)
}
