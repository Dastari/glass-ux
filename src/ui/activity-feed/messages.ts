import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for activityFeed. */
export const activityFeedMessages = defineMessages("activityFeed", {
  noActivity: "No activity",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    activityFeed: typeof activityFeedMessages.defaults
  }
}

/** Resolve activityFeed wording outside React; pass the component's locale. */
export function getActivityFeedMessages(locale = getLocale()): typeof activityFeedMessages.defaults {
  return resolveMessages(activityFeedMessages.namespace, activityFeedMessages.defaults, locale)
}
