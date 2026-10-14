import { describe, expect, it } from "vitest"
import { ariaShortcut, formatShortcut, matchesShortcut, shortcutKeys } from "./shortcut.js"

const key = (name: string, mods: Partial<Record<"metaKey" | "ctrlKey" | "altKey" | "shiftKey", boolean>> = {}) => ({
  key: name,
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  ...mods,
})

describe("shortcuts", () => {
  it("formats mod for each platform in canonical modifier order", () => {
    expect(formatShortcut("mod+shift+r", "mac")).toBe("⇧⌘R")
    expect(formatShortcut("shift+mod+r", "other")).toBe("Ctrl+Shift+R")
    expect(formatShortcut("mod+k", "other")).toBe("Ctrl+K")
    expect(shortcutKeys("mod+k", "mac")).toEqual(["⌘", "K"])
  })

  it("names special keys", () => {
    expect(formatShortcut("shift+f10", "other")).toBe("Shift+F10")
    expect(shortcutKeys("enter", "mac")).toEqual(["↵"])
    expect(shortcutKeys("escape", "other")).toEqual(["Esc"])
    expect(shortcutKeys("up", "other")).toEqual(["↑"])
  })

  it("matches events on the right platform only", () => {
    expect(matchesShortcut(key("k", { metaKey: true }), "mod+k", "mac")).toBe(true)
    expect(matchesShortcut(key("k", { ctrlKey: true }), "mod+k", "mac")).toBe(false)
    expect(matchesShortcut(key("K", { ctrlKey: true }), "mod+k", "other")).toBe(true)
    expect(matchesShortcut(key("R", { ctrlKey: true, shiftKey: true }), "mod+shift+r", "other")).toBe(true)
    expect(matchesShortcut(key("r", { ctrlKey: true }), "mod+shift+r", "other")).toBe(false)
  })

  it("describes shortcuts for aria-keyshortcuts", () => {
    expect(ariaShortcut("mod+shift+r", "mac")).toBe("Shift+Meta+R")
    expect(ariaShortcut("mod+k", "other")).toBe("Control+K")
  })
})
