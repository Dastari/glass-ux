import { defineMessages, resolveMessages } from "../lib/i18n/index.js"
import { getLocale } from "../lib/locale/locale.js"

/** English defaults for shell. */
export const shellMessages = defineMessages("shell", {
  resizeSectionNavigation: "Resize section navigation",
  hideInspector: "Hide inspector",
  collapseSectionNavigation: "Collapse section navigation",
  search: (noun: string) => `Search ${noun}`,
  more: "More",
  sectionNavigation: "Section navigation",
  thisSectionHasNoNavigation: "This section has no navigation",
  searchPlaceholder: "Search…",
  searchLabel: "Search",
  switchToLightMode: "Switch to light mode",
  switchToDarkMode: "Switch to dark mode",
  showInspector: "Show inspector",
  account: (name: string, unread: number) => `Account: ${name}${unread > 0 ? `, ${unread} unread ${unread === 1 ? "notification" : "notifications"}` : ""}`,
  timerOn: (label: string) => `Timer on ${label}`,
  runningFor: (name: string, time: string) => `${name}, running for ${time}`,
})

declare module "../lib/i18n/catalog.js" {
  interface MessageCatalog {
    shell: typeof shellMessages.defaults
  }
}

/** Resolve shell wording outside React; pass the component's locale. */
export function getShellMessages(locale = getLocale()): typeof shellMessages.defaults {
  return resolveMessages(shellMessages.namespace, shellMessages.defaults, locale)
}
