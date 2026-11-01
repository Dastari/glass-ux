import { defineMessages, plural, resolveMessages } from "../../lib/i18n/index.js"
import { numberFormat } from "../../lib/locale/intl.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for findBar. */
export const findBarMessages = defineMessages("findBar", {
  find: "Find",
  replaceWith: "Replace with",
  previousMatch: "Previous match",
  nextMatch: "Next match",
  close: "Close find",
  showReplace: "Show replace",
  hideReplace: "Hide replace",
  replace: "Replace",
  replaceAll: "Replace all",
  noMatches: "No matches",
  searching: "Searching…",
  /** A position beside the count. `total` is already formatted. */
  position: (current: string, total: string) => `${current} of ${total}`,
  /** A count still climbing. */
  atLeast: (count: string) => `${count}+`,
  matchCount: (count: number, locale = "en-US") =>
    plural(locale, count, {
      one: `${numberFormat(locale).format(count)} match`,
      other: `${numberFormat(locale).format(count)} matches`,
    }),
  matchPosition: (current: string, total: string) => `Match ${current} of ${total}`,
  matchWhileSearching: (current: string) => `Match ${current}, still searching`,
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    findBar: typeof findBarMessages.defaults
  }
}

/** Resolve findBar wording outside React; pass the component's locale. */
export function getFindBarMessages(locale = getLocale()): typeof findBarMessages.defaults {
  return resolveMessages(findBarMessages.namespace, findBarMessages.defaults, locale)
}
