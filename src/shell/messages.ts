import { defineMessages, resolveMessages } from "../lib/i18n/index.js"
import { getLocale } from "../lib/locale/locale.js"

/** English defaults for shell. */
export const shellMessages = defineMessages("shell", {
  resizeSectionNavigation: "Resize section navigation",
  overImagery: (value0: unknown) => `${value0} over-imagery`,
  hideInspector: "Hide inspector",
  collapseSectionNavigation: "Collapse section navigation",
  search: (value0: unknown) => `Search ${value0}`,
  more: "More",
  sectionNavigation: "Section navigation",
  thisSectionHasNoNavigation: "This section has no navigation",
  search2: "Search…",
  search3: "Search",
  switchToLightMode: "Switch to light mode",
  switchToDarkMode: "Switch to dark mode",
  showInspector: "Show inspector",
  unread: (value0: unknown, value1: unknown) => `, ${value0} unread ${value1}`,
  account: (value0: unknown, value1: unknown) => `Account: ${value0}${value1}`,
  timerOn: (value0: unknown) => `Timer on ${value0}`,
  runningFor: (value0: unknown, value1: unknown) => `${value0}, running for ${value1}`,
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
