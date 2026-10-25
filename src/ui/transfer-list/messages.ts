import { defineMessages } from "../../lib/i18n/catalog.js"

const english = {
  available: "Available",
  assigned: "Assigned",
  search: (list: string) => `Search ${list}`,
  selectAll: (list: string) => `Select all in ${list}`,
  /** The header count: how many are selected of how many are listed. */
  count: (selected: number, total: number) => (selected > 0 ? `${selected} of ${total} selected` : total === 1 ? "1 item" : `${total} items`),
  moveSelected: (list: string) => `Move selected to ${list}`,
  moveAll: (list: string) => `Move all to ${list}`,
  nothingSelected: "Select items to move first",
  nothingToMove: (list: string) => `Nothing to move in ${list}`,
  emptyAvailable: "No items available",
  emptyAssigned: "No items assigned",
  noMatch: (query: string) => `No match for “${query}”`,
  moved: (count: number, list: string) => (count === 1 ? `1 item moved to ${list}` : `${count} items moved to ${list}`),
  reordered: ({ label, position, total }: { label: string; position: number; total: number }) => `${label}, position ${position} of ${total}`,
  reorderHint: "Alt+Up or Alt+Down moves the focused item.",
  reorder: (label: string) => `Reorder ${label}`,
}

/** TransferList's English wording. */
export const transferListMessages = defineMessages("transferList", english)

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    transferList: typeof transferListMessages.defaults
  }
}
