import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for tree. */
export const treeMessages = defineMessages("tree", {
  noMatchFor: (query: string) => `No match for “${query}”`,
  loading: "Loading…",
  couldnTLoad: "Couldn't load",
  couldnTLoadMore: "Couldn't load more",
  loadMore: "Load more",
  retry: (reason: string) => `${reason} · Retry`,
  loadingStatus: "Loading",
  retryAction: "Retry",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    tree: typeof treeMessages.defaults
  }
}

/** Resolve tree wording outside React; pass the component's locale. */
export function getTreeMessages(locale = getLocale()): typeof treeMessages.defaults {
  return resolveMessages(treeMessages.namespace, treeMessages.defaults, locale)
}
