import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for pagination. */
export const paginationMessages = defineMessages("pagination", {
  pages: "Pages",
  firstPage: "First page",
  previousPage: "Previous page",
  nextPage: "Next page",
  lastPage: "Last page",
  perPage: (value0: unknown) => `${value0} per page`,
  rowsPerPage: "Rows per page",
  pageOf: (value0: unknown) => `Page, of ${value0}`,
  of: "of",
  noRows: "No rows",
  count0Of: (value0: unknown) => `0 of ${value0}`,
  of2: (value0: unknown, value1: unknown) => `${value0} of ${value1}`,
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    pagination: typeof paginationMessages.defaults
  }
}

/** Resolve pagination wording outside React; pass the component's locale. */
export function getPaginationMessages(locale = getLocale()): typeof paginationMessages.defaults {
  return resolveMessages(paginationMessages.namespace, paginationMessages.defaults, locale)
}
