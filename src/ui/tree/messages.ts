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
  rename: (label: string) => `Rename ${label}`,
  renameFailed: "Couldn't rename",
  moveUp: "Move up",
  moveDown: "Move down",
  moveIn: "Move into the item above",
  moveOut: "Move out of this folder",
  cannotMove: "Can't move there",
  clearSearchToMove: "Clear the search to move items",
  movedWithin: ({ label, position, total }: { label: string; position: string; total: string }) => `${label} moved to position ${position} of ${total}`,
  movedInto: ({ label, parent }: { label: string; parent: string }) => `${label} moved into ${parent}`,
  movedToTop: (label: string) => `${label} moved to the top level`,
  selectionLimited: (count: string) => `Selected the first ${count} rows`,
  renameHint: "Press F2 to rename.",
  moveHint: "Press Alt and an arrow key to move.",
  renameAndMoveHint: "Press F2 to rename, or Alt and an arrow key to move.",
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
