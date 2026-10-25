import { numberFormat } from "../../lib/locale/intl.js"
import { defineMessages, resolveMessages, plural } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for jsonTree. */
export const jsonTreeMessages = defineMessages("jsonTree", {
  collapse: "Collapse",
  expand: "Expand",
  root: "root",
  showMoreOf: (name: string | number) => `Show more of ${name}`,
  itemCount: (count: number, locale = "en-US") => plural(locale, count, { one: `${numberFormat(locale).format(count)} item`, other: `${numberFormat(locale).format(count)} items` }),
  keyCount: (count: number, locale = "en-US") => plural(locale, count, { one: `${numberFormat(locale).format(count)} key`, other: `${numberFormat(locale).format(count)} keys` }),
  showMoreOfTotal: (count: string, total: string) => `Show ${count} more of ${total}`,
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    jsonTree: typeof jsonTreeMessages.defaults
  }
}

/** Resolve jsonTree wording outside React; pass the component's locale. */
export function getJsonTreeMessages(locale = getLocale()): typeof jsonTreeMessages.defaults {
  return resolveMessages(jsonTreeMessages.namespace, jsonTreeMessages.defaults, locale)
}
