import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for keymap. */
export const keymapMessages = defineMessages("keymap", {
  helpTitle: "Keyboard shortcuts",
  searchShortcuts: "Search shortcuts",
  noMatchFor: (query: string) => `No shortcuts match “${query}”`,
  general: "General",
  notSet: "Not set",
  change: (label: string) => `Change the shortcut for ${label}`,
  newShortcut: (label: string) => `New shortcut for ${label}`,
  pressKeys: "Press keys",
  save: "Save",
  cancel: "Cancel",
  reset: (label: string) => `Reset the shortcut for ${label}`,
  resetAll: "Reset all",
  alsoAssigned: (label: string) => `Also assigned to ${label}. Saving removes it there.`,
  startsTheSame: (label: string) => `${label} starts with the same keys, so one of them will not run.`,
  browserKeeps: "The browser keeps this shortcut, so it can't be used.",
  characterKeysOff: "Single-key shortcuts are turned off.",
  waitingForNextKey: "Waiting for the next key",
  chordStarted: (keys: string) => `${keys} pressed. Waiting for the next key.`,
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    keymap: typeof keymapMessages.defaults
  }
}

/** Resolve keymap wording outside React; pass the component's locale. */
export function getKeymapMessages(locale = getLocale()): typeof keymapMessages.defaults {
  return resolveMessages(keymapMessages.namespace, keymapMessages.defaults, locale)
}
