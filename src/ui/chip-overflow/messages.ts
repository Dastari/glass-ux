import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for chipOverflow. */
export const chipOverflowMessages = defineMessages("chipOverflow", {
  more: (count: number, noun: string) => `${count} more ${noun}`,
  search: (noun: string) => `Search ${noun}`,
  noMatches: "No matches",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    chipOverflow: typeof chipOverflowMessages.defaults
  }
}

/** Resolve chipOverflow wording outside React; pass the component's locale. */
export function getChipOverflowMessages(locale = getLocale()): typeof chipOverflowMessages.defaults {
  return resolveMessages(chipOverflowMessages.namespace, chipOverflowMessages.defaults, locale)
}
