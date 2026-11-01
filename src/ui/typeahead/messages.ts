import { defineMessages, plural, resolveMessages } from "../../lib/i18n/index.js"
import { numberFormat } from "../../lib/locale/intl.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for typeahead. */
export const typeaheadMessages = defineMessages("typeahead", {
  noResults: "No results",
  searching: "Searching…",
  resultCount: (count: number, locale = "en-US") =>
    plural(locale, count, {
      one: `${numberFormat(locale).format(count)} result`,
      other: `${numberFormat(locale).format(count)} results`,
    }),
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    typeahead: typeof typeaheadMessages.defaults
  }
}

/** Resolve typeahead wording outside React; pass the component's locale. */
export function getTypeaheadMessages(locale = getLocale()): typeof typeaheadMessages.defaults {
  return resolveMessages(typeaheadMessages.namespace, typeaheadMessages.defaults, locale)
}
