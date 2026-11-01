import { defineMessages, plural, resolveMessages } from "../../lib/i18n/index.js"
import { numberFormat } from "../../lib/locale/intl.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for notificationList. */
export const notificationListMessages = defineMessages("notificationList", {
  notifications: "Notifications",
  filterLabel: "Filter notifications",
  all: "All",
  unread: "Unread",
  unreadPrefix: "Unread:",
  today: "Today",
  yesterday: "Yesterday",
  markRead: (title: string) => `Mark read: ${title}`,
  markUnread: (title: string) => `Mark unread: ${title}`,
  dismiss: (title: string) => `Dismiss: ${title}`,
  markAllRead: "Mark all read",
  nothingUnread: "Nothing is unread",
  empty: "No notifications",
  emptyFilter: (filter: string) => `No notifications in ${filter}`,
  showAll: "Show all",
  loadFailed: "Notifications did not load. Check the connection and retry.",
  retry: "Retry",
  loadMore: "Load more",
  loadingMore: "Loading more",
  loadMoreFailed: "Older notifications did not load.",
  newCount: (count: number, locale = "en-US") => `${numberFormat(locale).format(count)} new`,
  showNew: (count: number, locale = "en-US") =>
    plural(locale, count, {
      one: `Show ${numberFormat(locale).format(count)} new notification`,
      other: `Show ${numberFormat(locale).format(count)} new notifications`,
    }),
  arrived: (count: number, locale = "en-US") =>
    plural(locale, count, {
      one: `${numberFormat(locale).format(count)} new notification`,
      other: `${numberFormat(locale).format(count)} new notifications`,
    }),
  loaded: (count: number, locale = "en-US") =>
    plural(locale, count, {
      one: `${numberFormat(locale).format(count)} older notification loaded`,
      other: `${numberFormat(locale).format(count)} older notifications loaded`,
    }),
  markedRead: "Marked read",
  markedUnread: "Marked unread",
  allMarkedRead: "All notifications marked read",
  dismissed: "Notification dismissed",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    notificationList: typeof notificationListMessages.defaults
  }
}

/** Resolve notificationList wording outside React; pass the component's locale. */
export function getNotificationListMessages(locale = getLocale()): typeof notificationListMessages.defaults {
  return resolveMessages(notificationListMessages.namespace, notificationListMessages.defaults, locale)
}
