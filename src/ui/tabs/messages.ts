import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for tabs. */
export const tabsMessages = defineMessages("tabs", {
  more: "More",
  moreTabs: (count: number) => `More tabs (${count})`,
  closeTab: (label: string) => `Close ${label}`,
  close: "Close",
  unsaved: "Unsaved changes",
  preview: "Preview",
  keepOpen: "Keep open",
  moveEarlier: "Move earlier",
  moveLater: "Move later",
  tabActions: (label: string) => `Actions for ${label}`,
  closeHint: "Press Delete to close.",
  moveHint: "Press Shift and an arrow key to move.",
  closeAndMoveHint: "Press Delete to close, or Shift and an arrow key to move.",
  movedTo: ({ label, position, total }: { label: string; position: string; total: string }) => `${label} moved to position ${position} of ${total}`,
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    tabs: typeof tabsMessages.defaults
  }
}

/** Resolve tabs wording outside React; pass the component's locale. */
export function getTabsMessages(locale = getLocale()): typeof tabsMessages.defaults {
  return resolveMessages(tabsMessages.namespace, tabsMessages.defaults, locale)
}
