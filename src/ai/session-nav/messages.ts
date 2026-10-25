import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for sessionNav. */
export const sessionNavMessages = defineMessages("sessionNav", {
  today: "Today",
  yesterday: "Yesterday",
  thisWeek: "This week",
  earlier: "Earlier",
  working: "Working",
  waitingForYou: "Waiting for you",
  runFailed: "Run failed",
  answered: "Answered",
  allOrganisations: "All organisations",
  all: "All",
  unread: "Unread",
  conversationTitle: "Conversation title",
  openInWindow: "Open in window",
  rename: "Rename",
  archive: "Archive",
  archived: (value0: unknown) => `Archived "${value0}"`,
  restore: "Restore",
  restored: (value0: unknown) => `Restored "${value0}"`,
  stopTheRunningResponseFirst: "Stop the running response first",
  delete: (value0: unknown) => `Delete "${value0}"?`,
  theConversationItsFilesAndItsHistoryAre: "The conversation, its files and its history are removed. This cannot be undone.",
  deleteConversation: "Delete conversation",
  deleted: (value0: unknown) => `Deleted "${value0}"`,
  allOrganisations2: "all organisations",
  newChat: "New chat",
  searchConversations: "Search conversations",
  views: "Views",
  conversationHistory: "Conversation history",
  archivedChats: "Archived chats",
  projects: "Projects",
  noConversationsMatch: (value0: unknown) => `No conversations match "${value0}"`,
  noArchivedConversations: "No archived conversations",
  noConversationsYet: "No conversations yet",
  aiSettings: "AI settings",
  unreadSuffix: ", unread",
  deleteAction: "Delete",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    sessionNav: typeof sessionNavMessages.defaults
  }
}

/** Resolve sessionNav wording outside React; pass the component's locale. */
export function getSessionNavMessages(locale = getLocale()): typeof sessionNavMessages.defaults {
  return resolveMessages(sessionNavMessages.namespace, sessionNavMessages.defaults, locale)
}
