import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for timeZoneSelect. */
export const timeZoneSelectMessages = defineMessages("timeZoneSelect", {
  chooseATimeZone: "Choose a time zone",
  chooseATimeZoneFromTheList: "Choose a time zone from the list",
  suggested: "Suggested",
  allTimeZones: "All time zones",
  thereNow: (zone: string, time: string) => `${zone} · ${time} there now`,
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    timeZoneSelect: typeof timeZoneSelectMessages.defaults
  }
}

/** Resolve timeZoneSelect wording outside React; pass the component's locale. */
export function getTimeZoneSelectMessages(locale = getLocale()): typeof timeZoneSelectMessages.defaults {
  return resolveMessages(timeZoneSelectMessages.namespace, timeZoneSelectMessages.defaults, locale)
}
