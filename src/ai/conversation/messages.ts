import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for conversation. */
export const conversationMessages = defineMessages("conversation", {
  conversation: "Conversation",
  newMessages: "New messages",
  scrollToEnd: "Scroll to end",
  conversationTurns: "Conversation turns",
  prompt: (value0: unknown, value1: unknown) => `Prompt ${value0}: ${value1}`,
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    conversation: typeof conversationMessages.defaults
  }
}

/** Resolve conversation wording outside React; pass the component's locale. */
export function getConversationMessages(locale = getLocale()): typeof conversationMessages.defaults {
  return resolveMessages(conversationMessages.namespace, conversationMessages.defaults, locale)
}
