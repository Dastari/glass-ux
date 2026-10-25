import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"
/** Display labels for keyboard keys; ARIA key tokens remain standard. */
export const kbdMessages = defineMessages("kbd", {"ctrl": "Ctrl", "alt": "Alt", "shift": "Shift", "win": "Win", "enter": "Enter", "esc": "Esc", "backspace": "Backspace", "deleteKey": "Del", "tab": "Tab", "space": "Space", "menu": "Menu"})
declare module "../../lib/i18n/catalog.js" { interface MessageCatalog { kbd: typeof kbdMessages.defaults } }
/** Keyboard display labels outside React. */
export function getKbdMessages(locale = getLocale()): typeof kbdMessages.defaults { return resolveMessages("kbd", kbdMessages.defaults, locale) }
