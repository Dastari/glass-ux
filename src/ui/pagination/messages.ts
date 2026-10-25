import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for pagination. */
export const paginationMessages = defineMessages("pagination", {
  pages: "Pages",
  firstPage: "First page",
  previousPage: "Previous page",
  nextPage: "Next page",
  lastPage: "Last page",
  perPage: (count: string) => `${count} per page`,
  rowsPerPage: "Rows per page",
  pageInput: (total: string) => `Page, of ${total}`,
  pageTotal: "of",
  noRows: "No rows",
  emptyRange: (total: string) => `0 of ${total}`,
  rowRange: (range: string, total: string) => `${range} of ${total}`,
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
