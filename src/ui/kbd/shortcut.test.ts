import { afterEach, describe, expect, it } from "vitest"
import { characterShortcutsEnabled, configureShortcuts, isCharacterShortcut, shortcutAllowed } from "./shortcut.js"

afterEach(() => configureShortcuts({ characterKeys: true }))

describe("single-character shortcuts", () => {
  it("tells character keys from chords and named keys", () => {
    for (const shortcut of ["c", "?", "shift+/", "g e", "1", "shift+a"]) expect(isCharacterShortcut(shortcut), shortcut).toBe(true)
    for (const shortcut of ["mod+k", "ctrl+alt+n", "alt+c", "meta+s", "esc", "f2", "enter", "arrowup", "shift+f10", "mod+g e"]) expect(isCharacterShortcut(shortcut), shortcut).toBe(false)
  })

  it("are on by default and switch off and on again with configureShortcuts", () => {
    expect(characterShortcutsEnabled()).toBe(true)
    expect(shortcutAllowed("g e")).toBe(true)
    configureShortcuts({ characterKeys: false })
    expect(characterShortcutsEnabled()).toBe(false)
    expect(shortcutAllowed("g e")).toBe(false)
    expect(shortcutAllowed("c")).toBe(false)
    expect(shortcutAllowed("mod+k")).toBe(true)
    expect(shortcutAllowed("f2")).toBe(true)
    configureShortcuts({})
    expect(characterShortcutsEnabled()).toBe(false)
    configureShortcuts({ characterKeys: true })
    expect(shortcutAllowed("g e")).toBe(true)
  })
})
