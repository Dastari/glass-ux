import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for breadcrumb. */
export const breadcrumbMessages = defineMessages("breadcrumb", {
  breadcrumb: "Breadcrumb",
  backTo: (value0: unknown) => `Back to ${value0}`,
  showMore: (value0: unknown) => `Show ${value0} more`,
  switchFrom: (value0: unknown) => `Switch from ${value0}`,
  switch: "Switch",
  search: "Search",
  noMatchFor: (query: string) => `No match for “${query}”`,
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    breadcrumb: typeof breadcrumbMessages.defaults
  }
}

/** Resolve breadcrumb wording outside React; pass the component's locale. */
export function getBreadcrumbMessages(locale = getLocale()): typeof breadcrumbMessages.defaults {
  return resolveMessages(breadcrumbMessages.namespace, breadcrumbMessages.defaults, locale)
}
