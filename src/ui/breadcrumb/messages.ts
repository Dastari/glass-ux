import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for breadcrumb. */
export const breadcrumbMessages = defineMessages("breadcrumb", {
  breadcrumb: "Breadcrumb",
  backTo: (label: string) => `Back to ${label}`,
  showMore: (count: number) => `Show ${count} more`,
  switchFrom: (label: string) => `Switch from ${label}`,
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
