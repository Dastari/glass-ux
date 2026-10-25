import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for tree. */
export const treeMessages = defineMessages("tree", {
  noMatchFor: (value0: unknown) => `No match for “${value0}”`,
  loading: "Loading…",
  couldnTLoad: "Couldn't load",
  couldnTLoadMore: "Couldn't load more",
  loadMore: "Load more",
  retry: (value0: unknown) => `${value0} · Retry`,
  loading2: "Loading",
  retry2: "Retry",
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
