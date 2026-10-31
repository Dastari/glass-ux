import "./messages.js"
export { Kbd, useAriaShortcut, useCharacterShortcuts, usePlatform, type KbdProps } from "./kbd.js"
export {
  ariaShortcut,
  characterShortcutsEnabled,
  configureShortcuts,
  detectPlatform,
  formatShortcut,
  isCharacterShortcut,
  matchesShortcut,
  parseShortcut,
  shortcutAllowed,
  shortcutKeys,
  type Platform,
  type ShortcutConfig,
} from "./shortcut.js"
