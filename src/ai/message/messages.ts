import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for message. */
export const messageMessages = defineMessages("message", {
  you: "You",
  editMessage: "Edit message",
  copyMessage: "Copy message",
  thisResponseDidNotComplete: "This response did not complete.",
  retrying: "Retrying…",
  retried: "Retried",
  retry: "Retry",
  theAiServiceEndedThisRunWithoutAn: "The AI service ended this run without an answer.",
  assistant: "Assistant",
  regenerating: "Regenerating…",
  regenerated: "Regenerated",
  regenerate: "Regenerate",
  youStoppedThisResponse: "You stopped this response.",
  copyResponse: "Copy response",
  feedback: "Feedback",
  goodResponse: "Good response",
  badResponse: "Bad response",
  openInAWindow: "Open in a window",
  turn: (value0: unknown) => `Turn ${value0}`,
  removedUnderTheConversationRetentionPolicy: "Removed under the conversation retention policy.",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    message: typeof messageMessages.defaults
  }
}

/** Resolve message wording outside React; pass the component's locale. */
export function getMessageMessages(locale = getLocale()): typeof messageMessages.defaults {
  return resolveMessages(messageMessages.namespace, messageMessages.defaults, locale)
}
