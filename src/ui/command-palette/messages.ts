import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for commandPalette. */
export const commandPaletteMessages = defineMessages("commandPalette", {
  recent: "Recent",
  actions: "Actions",
  navigation: "Navigation",
  typeACommandOrSearch: "Type a command or search",
  searchCommands: "Search commands",
  results: "Results",
  searching: "Searching",
  noCommandsMatch: (value0: unknown) => `No commands match “${value0}”`,
  navigate: "Navigate",
  run: "Run",
  close: "Close",
  commandPalette: "Command palette",
  closeCommandPalette: "Close command palette",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    commandPalette: typeof commandPaletteMessages.defaults
  }
}

/** Resolve commandPalette wording outside React; pass the component's locale. */
export function getCommandPaletteMessages(locale = getLocale()): typeof commandPaletteMessages.defaults {
  return resolveMessages(commandPaletteMessages.namespace, commandPaletteMessages.defaults, locale)
}
