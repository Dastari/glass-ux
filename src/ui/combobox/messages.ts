import { numberFormat } from "../../lib/locale/intl.js"
import { defineMessages, resolveMessages, plural } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for combobox. */
export const comboboxMessages = defineMessages("combobox", {
  remove: (label: string) => `Remove ${label}`,
  noMatchesFor: (query: string) => `No matches for “${query}”`,
  noOptions: "No options",
  clear: "Clear",
  showOptions: "Show options",
  searchError: "Search failed — check the connection and retry.",
  retry: "Retry",
  type: "Type",
  more: "more",
  toSearch: "to search",
  moreResults: "more — refine your search",
  loadingResults: "Loading results",
  searchFailed: "Search failed",
  resultCount: (count: number, locale = "en-US") => plural(locale, count, { one: `${numberFormat(locale).format(count)} result`, other: `${numberFormat(locale).format(count)} results` }),
  typeMoreCharacters: (count: number, locale = "en-US") => plural(locale, count, { one: `Type ${count} more character to search`, other: `Type ${count} more characters to search` }),
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    combobox: typeof comboboxMessages.defaults
  }
}

/** Resolve combobox wording outside React; pass the component's locale. */
export function getComboboxMessages(locale = getLocale()): typeof comboboxMessages.defaults {
  return resolveMessages(comboboxMessages.namespace, comboboxMessages.defaults, locale)
}
