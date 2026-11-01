import { defineMessages, plural, resolveMessages } from "../../lib/i18n/index.js"
import { numberFormat } from "../../lib/locale/intl.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for commentThread. */
export const commentThreadMessages = defineMessages("commentThread", {
  comments: "Comments",
  threadOn: (anchor: string) => `Comments on ${anchor}`,
  count: (count: number, locale = "en-US") =>
    plural(locale, count, {
      one: `${numberFormat(locale).format(count)} comment`,
      other: `${numberFormat(locale).format(count)} comments`,
    }),
  empty: "No comments",
  loadFailed: "Comments did not load. Check the connection and retry.",
  retry: "Retry",
  discard: "Discard",
  composerLabel: "Write a comment",
  composerPlaceholder: "Write a comment…",
  replyLabel: (name: string) => `Reply to ${name}`,
  replyPlaceholder: "Write a reply…",
  send: "Send",
  sendHint: "Press Ctrl or ⌘ and Enter to send",
  nothingToSend: "Write something to send",
  cancel: "Cancel",
  save: "Save",
  saving: "Saving",
  editLabel: "Edit comment",
  saveFailed: "The change did not save. Try again.",
  actionsFor: (name: string) => `Comment actions: ${name}`,
  edit: "Edit",
  delete: "Delete",
  deleteTitle: (name: string) => `Delete this comment by ${name}?`,
  deleteDescription: "The comment is removed for everyone. Its replies stay.",
  deleting: "Deleting",
  deleted: "Comment deleted",
  edited: "edited",
  sending: "Sending…",
  notSent: "Not sent",
  resolve: "Resolve",
  reopen: "Reopen",
  resolved: "Resolved",
  showComments: (count: number, locale = "en-US") =>
    plural(locale, count, {
      one: `Show ${numberFormat(locale).format(count)} comment`,
      other: `Show ${numberFormat(locale).format(count)} comments`,
    }),
  hideComments: "Hide comments",
  newCount: (count: number, locale = "en-US") => `${numberFormat(locale).format(count)} new`,
  showNew: (count: number, locale = "en-US") =>
    plural(locale, count, {
      one: `Show ${numberFormat(locale).format(count)} new comment`,
      other: `Show ${numberFormat(locale).format(count)} new comments`,
    }),
  arrived: (count: number, locale = "en-US") =>
    plural(locale, count, {
      one: `${numberFormat(locale).format(count)} new comment`,
      other: `${numberFormat(locale).format(count)} new comments`,
    }),
  announceSent: "Comment sent",
  announceFailed: "Comment not sent. Retry is available.",
  announceSaved: "Comment saved",
  announceResolved: "Thread resolved",
  announceReopened: "Thread reopened",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    commentThread: typeof commentThreadMessages.defaults
  }
}

/** Resolve commentThread wording outside React; pass the component's locale. */
export function getCommentThreadMessages(locale = getLocale()): typeof commentThreadMessages.defaults {
  return resolveMessages(commentThreadMessages.namespace, commentThreadMessages.defaults, locale)
}
