import { kbdMessages, getKbdMessages } from "./messages.js"
/**
 * Keyboard shortcuts as data: "mod+shift+r", "ctrl+k", "shift+f10", "esc".
 *
 * `mod` is ⌘ on Apple platforms and Ctrl elsewhere. Modifiers can be written in any
 * order; they are always displayed in the platform's canonical order (macOS ⌃⌥⇧⌘,
 * others Ctrl+Alt+Shift). Pure functions, so menus, the palette and tests share them.
 */

export type Platform = "mac" | "other"

const MODIFIERS = ["ctrl", "alt", "shift", "mod", "meta"] as const
type Modifier = (typeof MODIFIERS)[number]

export interface ParsedShortcut {
  modifiers: Set<Modifier>
  key: string
}

const ALIASES: Record<string, string> = {
  cmd: "mod",
  command: "mod",
  control: "ctrl",
  option: "alt",
  opt: "alt",
  escape: "esc",
  return: "enter",
  del: "delete",
  up: "arrowup",
  down: "arrowdown",
  left: "arrowleft",
  right: "arrowright",
  spacebar: "space",
}

/** Parses a shortcut string such as `"mod+shift+K"` into its modifiers and key, case-insensitively and with aliases normalised (`escape` → `esc`, `up` → `arrowup`); the last non-modifier part is the key. */
export function parseShortcut(shortcut: string): ParsedShortcut {
  const parts = shortcut
    .toLowerCase()
    .split("+")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => ALIASES[part] ?? part)
  const modifiers = new Set<Modifier>()
  let key = ""
  for (const part of parts) {
    if ((MODIFIERS as readonly string[]).includes(part)) modifiers.add(part as Modifier)
    else key = part
  }
  return { modifiers, key }
}

const MAC_GLYPH: Record<Modifier, string> = { ctrl: "⌃", alt: "⌥", shift: "⇧", mod: "⌘", meta: "⌘" }
const MAC_ORDER: Modifier[] = ["ctrl", "alt", "shift", "mod", "meta"]
function modifierLabels(messages: typeof kbdMessages.defaults): Record<Modifier, string> { return { ctrl: messages.ctrl, alt: messages.alt, shift: messages.shift, mod: messages.ctrl, meta: messages.win } }
const OTHER_ORDER: Modifier[] = ["mod", "ctrl", "alt", "shift", "meta"]

function keyLabels(messages: typeof kbdMessages.defaults): Record<Platform, Record<string, string>> { return {
  mac: {
    enter: "↵",
    esc: "esc",
    backspace: "⌫",
    delete: "⌦",
    tab: "⇥",
    space: messages.space,
    arrowup: "↑",
    arrowdown: "↓",
    arrowleft: "←",
    arrowright: "→",
    contextmenu: messages.menu,
  },
  other: {
    enter: messages.enter,
    esc: messages.esc,
    backspace: messages.backspace,
    delete: messages.deleteKey,
    tab: messages.tab,
    space: messages.space,
    arrowup: "↑",
    arrowdown: "↓",
    arrowleft: "←",
    arrowright: "→",
    contextmenu: messages.menu,
  },
} }

function keyLabel(key: string, platform: Platform, messages = kbdMessages.defaults) {
  const named = keyLabels(messages)[platform][key]
  if (named) return named
  if (/^f\d{1,2}$/.test(key)) return key.toUpperCase()
  return key.length === 1 ? key.toUpperCase() : key.charAt(0).toUpperCase() + key.slice(1)
}

/** The individual keycaps for a shortcut, in display order: ["⇧", "⌘", "R"] or ["Ctrl", "Shift", "R"]. */
export function shortcutKeys(shortcut: string, platform: Platform, messages: ReturnType<typeof getKbdMessages> = getKbdMessages()): string[] {
  const { modifiers, key } = parseShortcut(shortcut)
  const order = platform === "mac" ? MAC_ORDER : OTHER_ORDER
  const seen = new Set<string>()
  const caps: string[] = []
  for (const modifier of order) {
    if (!modifiers.has(modifier)) continue
    const label = platform === "mac" ? MAC_GLYPH[modifier] : modifierLabels(messages)[modifier]
    if (seen.has(label)) continue
    seen.add(label)
    caps.push(label)
  }
  if (key) caps.push(keyLabel(key, platform, messages))
  return caps
}

/** One string: "⇧⌘R" on macOS, "Ctrl+Shift+R" elsewhere. */
export function formatShortcut(shortcut: string, platform: Platform, messages: ReturnType<typeof getKbdMessages> = getKbdMessages()): string {
  const caps = shortcutKeys(shortcut, platform, messages)
  return platform === "mac" ? caps.join("") : caps.join("+")
}

/** The spoken form for aria-keyshortcuts ("Control+Shift+R", "Meta+K"). */
export function ariaShortcut(shortcut: string, platform: Platform): string {
  const { modifiers, key } = parseShortcut(shortcut)
  const names: string[] = []
  if (modifiers.has("ctrl") || (modifiers.has("mod") && platform === "other")) names.push("Control")
  if (modifiers.has("alt")) names.push("Alt")
  if (modifiers.has("shift")) names.push("Shift")
  if (modifiers.has("meta") || (modifiers.has("mod") && platform === "mac")) names.push("Meta")
  if (key) names.push(key.length === 1 ? key.toUpperCase() : keyLabel(key, "other"))
  return names.join("+")
}

const EVENT_KEY: Record<string, string> = { escape: "esc", " ": "space" }

/** Whether a keyboard event is this shortcut on this platform. */
export function matchesShortcut(
  event: Pick<KeyboardEvent, "key" | "metaKey" | "ctrlKey" | "altKey" | "shiftKey">,
  shortcut: string,
  platform: Platform
): boolean {
  const { modifiers, key } = parseShortcut(shortcut)
  const wantMeta = modifiers.has("meta") || (modifiers.has("mod") && platform === "mac")
  const wantCtrl = modifiers.has("ctrl") || (modifiers.has("mod") && platform === "other")
  if (event.metaKey !== wantMeta || event.ctrlKey !== wantCtrl) return false
  if (event.altKey !== modifiers.has("alt") || event.shiftKey !== modifiers.has("shift")) return false
  const pressed = event.key.toLowerCase()
  return (EVENT_KEY[pressed] ?? pressed) === key
}

/** Returns "mac" on macOS and iOS devices (from the user-agent platform), otherwise "other"; "other" when there is no `navigator` (server rendering). */
export function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "other"
  const data = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData
  const name = data?.platform ?? navigator.platform ?? navigator.userAgent
  return /mac|iphone|ipad|ipod/i.test(name) ? "mac" : "other"
}
