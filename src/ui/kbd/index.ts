import "./messages.js"
export { Kbd, useAriaShortcut, useCharacterShortcuts, usePlatform, type KbdProps } from "./kbd.js"
export {
  ariaShortcut,
  canonicalShortcut,
  canonicalStep,
  characterShortcutsEnabled,
  configureShortcuts,
  detectPlatform,
  formatShortcut,
  isCharacterShortcut,
  isChord,
  matchesShortcut,
  parseShortcut,
  shortcutAllowed,
  shortcutFromEvent,
  shortcutKeys,
  shortcutSteps,
  type Platform,
  type ShortcutConfig,
} from "./shortcut.js"
