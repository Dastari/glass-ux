import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for the on-screen keyboard: key names, layer labels and announcements. */
export const onScreenKeyboardMessages = defineMessages("onScreenKeyboard", {
  keyboard: ({ layout }: { layout: string }) => `${layout} keyboard`,
  instructions: "Arrow keys move between keys. Enter types the focused key; hold Enter for accented characters.",
  space: "Space",
  backspace: "Backspace",
  enter: "Enter",
  search: "Search",
  go: "Go",
  done: "Done",
  next: "Next",
  send: "Send",
  shift: "Shift",
  capsLock: "Caps Lock",
  capsLockOn: "Caps Lock on",
  capsLockOff: "Caps Lock off",
  symbols: "Symbols",
  moreSymbols: "More symbols",
  letters: "Letters",
  symbolsKey: "?123",
  lettersKey: "ABC",
  moreSymbolsKey: "#+=",
  switchLayout: ({ layout }: { layout: string }) => `Switch to ${layout}`,
  layoutChanged: ({ layout }: { layout: string }) => `${layout} keyboard`,
  layerChanged: ({ layer }: { layer: string }) => `${layer} keys`,
  hide: "Hide keyboard",
  show: "Show keyboard",
  clear: "Clear",
  moveLeft: "Move left",
  moveRight: "Move right",
  alternatesFor: ({ key }: { key: string }) => `Alternatives for ${key}`,
  dakuten: "Dakuten",
  handakuten: "Handakuten",
  smallKana: "Small kana",
  katakana: "Katakana",
  hiragana: "Hiragana",
  keyboardToggle: "On-screen keyboard",
  keyboardPanel: "On-screen keyboard",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    onScreenKeyboard: typeof onScreenKeyboardMessages.defaults
  }
}

/** Resolve the on-screen keyboard's wording outside React; pass the component's locale. */
export function getOnScreenKeyboardMessages(locale = getLocale()): typeof onScreenKeyboardMessages.defaults {
  return resolveMessages(onScreenKeyboardMessages.namespace, onScreenKeyboardMessages.defaults, locale)
}
