import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for the sidebar: its toggles, resize handle, filter and row actions. */
export const sidebarMessages = defineMessages("sidebar", {
  toggleSidebar: "Toggle sidebar",
  expandSidebar: "Expand sidebar",
  collapseSidebar: "Collapse sidebar",
  closeSidebar: "Close sidebar",
  resizeSidebar: "Resize sidebar",
  moreActions: "More actions",
  expandGroup: ({ group }: { group: string }) => `Expand ${group}`,
  collapseGroup: ({ group }: { group: string }) => `Collapse ${group}`,
  filterPlaceholder: "Filter",
  filterNavigation: "Filter navigation",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    sidebar: typeof sidebarMessages.defaults
  }
}

/** Resolve the sidebar's wording outside React; pass the component's locale. */
export function getSidebarMessages(locale = getLocale()): typeof sidebarMessages.defaults {
  return resolveMessages(sidebarMessages.namespace, sidebarMessages.defaults, locale)
}
