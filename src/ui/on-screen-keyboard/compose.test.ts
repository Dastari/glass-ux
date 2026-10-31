import { describe, expect, it } from "vitest"
import { hangulBackspace, hangulInput, isHangul, kanaModify, toHiragana, toKatakana } from "./compose.js"

/** Type jamo one after another, composing each into the last character. */
function type(...jamo: string[]): string {
  let text = ""
  for (const each of jamo) {
    const previous = text.slice(-1)
    text = text.slice(0, -1) + hangulInput(previous, each)
  }
  return text
}

describe("Hangul composition", () => {
  it.each([
    [["ㄱ", "ㅏ"], "가"],
    [["ㄱ", "ㅏ", "ㄱ"], "각"],
    [["ㄱ", "ㅏ", "ㄱ", "ㅅ"], "갃"],
    [["ㄱ", "ㅏ", "ㄱ", "ㅅ", "ㅏ"], "각사"],
    [["ㄱ", "ㅏ", "ㄱ", "ㅏ"], "가가"],
    [["ㄱ", "ㅗ", "ㅏ"], "과"],
    [["ㄱ", "ㅗ", "ㅏ", "ㅣ"], "괘"],
    [["ㄱ", "ㅜ", "ㅓ"], "궈"],
    [["ㅇ", "ㅡ", "ㅣ"], "의"],
    [["ㅎ", "ㅏ", "ㄴ", "ㄱ", "ㅜ", "ㄱ"], "한국"],
    [["ㅇ", "ㅣ", "ㅆ", "ㅇ", "ㅓ"], "있어"],
    [["ㄷ", "ㅏ", "ㄹ", "ㄱ"], "닭"],
    [["ㄷ", "ㅏ", "ㄹ", "ㄱ", "ㅇ", "ㅣ"], "닭이"],
    [["ㅂ", "ㅏ", "ㄲ"], "밖"],
    [["ㅃ", "ㅏ", "ㄸ"], "빠ㄸ"],
    [["ㅉ", "ㅏ"], "짜"],
    [["ㄱ", "ㄱ"], "ㄱㄱ"],
    [["ㅗ", "ㅏ"], "ㅘ"],
  ])("%j → %s", (jamo, expected) => {
    expect(type(...jamo)).toBe(expected)
  })

  it("moves the second consonant of a compound final to the next syllable", () => {
    expect(hangulInput("갃", "ㅏ")).toBe("각사")
    expect(hangulInput("닭", "ㅏ")).toBe("달가")
    expect(hangulInput("값", "ㅣ")).toBe("갑시")
  })

  it("decomposes one jamo per backspace", () => {
    expect(hangulBackspace("각")).toBe("가")
    expect(hangulBackspace("가")).toBe("ㄱ")
    expect(hangulBackspace("ㄱ")).toBe("")
    expect(hangulBackspace("과")).toBe("고")
    expect(hangulBackspace("괘")).toBe("과")
    expect(hangulBackspace("갃")).toBe("각")
    expect(hangulBackspace("ㅘ")).toBe("ㅗ")
    expect(hangulBackspace("a")).toBeNull()
  })

  it("recognises Hangul", () => {
    expect(isHangul("가")).toBe(true)
    expect(isHangul("ㄱ")).toBe(true)
    expect(isHangul("ㅏ")).toBe(true)
    expect(isHangul("a")).toBe(false)
    expect(isHangul("가가")).toBe(false)
  })
})

describe("kana marks", () => {
  it("toggles the voicing mark", () => {
    expect(kanaModify("か", "dakuten")).toBe("が")
    expect(kanaModify("が", "dakuten")).toBe("か")
    expect(kanaModify("う", "dakuten")).toBe("ゔ")
    expect(kanaModify("カ", "dakuten")).toBe("ガ")
    expect(kanaModify("あ", "dakuten")).toBeNull()
  })

  it("toggles the semi-voicing mark and swaps between the marks", () => {
    expect(kanaModify("は", "handakuten")).toBe("ぱ")
    expect(kanaModify("ぱ", "handakuten")).toBe("は")
    expect(kanaModify("ば", "handakuten")).toBe("ぱ")
    expect(kanaModify("ぱ", "dakuten")).toBe("ば")
    expect(kanaModify("か", "handakuten")).toBeNull()
  })

  it("toggles the small form", () => {
    expect(kanaModify("つ", "small")).toBe("っ")
    expect(kanaModify("っ", "small")).toBe("つ")
    expect(kanaModify("ヨ", "small")).toBe("ョ")
    expect(kanaModify("か", "small")).toBeNull()
  })

  it("switches script", () => {
    expect(toKatakana("ひらがな")).toBe("ヒラガナ")
    expect(toHiragana("カタカナー")).toBe("かたかなー")
  })
})
