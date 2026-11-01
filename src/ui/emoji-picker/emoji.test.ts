import { describe, expect, it } from "vitest"
import { EMOJI_DATA } from "./emoji-data.js"
import { applySkinTone, EMOJI_GROUPS, findEmoji, localiseEmoji, parseEmojiData, searchEmoji, stripSkinTone, type EmojiSet } from "./emoji.js"

const set: EmojiSet = parseEmojiData(EMOJI_DATA, "en")

describe("emoji data", () => {
  it("parses every group, with names and tones", () => {
    const total = EMOJI_GROUPS.reduce((sum, group) => sum + set[group].length, 0)
    expect(total).toBe(1870)
    const wave = findEmoji(set, "👋")
    expect(wave).toMatchObject({ emoji: "👋", name: "waving hand", tones: true })
    expect(findEmoji(set, "😀")).toMatchObject({ tones: false })
  })

  it("gives no tone to a sequence with two people", () => {
    expect(findEmoji(set, "🧑‍🤝‍🧑")?.tones).toBe(false)
  })

  it("finds an entry despite a tone or a variation selector", () => {
    expect(findEmoji(set, "👋🏽")?.emoji).toBe("👋")
    expect(findEmoji(set, "❤")?.name).toBe("red heart")
  })
})

describe("searchEmoji", () => {
  it("puts a name's start first, a word's start next, then anywhere", () => {
    const names = searchEmoji(set, "cat", "en").map((entry) => entry.name)
    expect(names[0]).toBe("cat")
    expect(names.indexOf("cat face")).toBeLessThan(names.indexOf("grinning cat"))
  })

  it("matches keywords, and folds accents and case", () => {
    expect(searchEmoji(set, "HAPPY", "en").length).toBeGreaterThan(0)
    expect(searchEmoji(set, "   ", "en")).toEqual([])
    expect(searchEmoji(localiseEmoji(set, { "😀": "visage souriant" }, "fr"), "VISAGE SOURIANT", "fr")[0]?.emoji).toBe("😀")
  })

  it("still finds the English when a locale's names are given", () => {
    const local = localiseEmoji(set, { "😀": "visage" }, "fr")
    expect(findEmoji(local, "😀")?.name).toBe("visage")
    expect(searchEmoji(local, "grinning face", "fr").map((entry) => entry.emoji)).toContain("😀")
  })
})

describe("skin tones", () => {
  it("adds and removes a modifier", () => {
    expect(applySkinTone("👋", 3)).toBe("👋🏽")
    expect(applySkinTone("👋", 0)).toBe("👋")
    expect(stripSkinTone("👋🏽")).toBe("👋")
  })

  it("replaces the variation selector and keeps a sequence joined", () => {
    expect(applySkinTone("☝️", 1)).toBe("☝🏻")
    expect(applySkinTone("👩‍💻", 5)).toBe("👩🏿‍💻")
  })
})
