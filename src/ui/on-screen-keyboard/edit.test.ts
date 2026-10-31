import { describe, expect, it } from "vitest"
import { applyEdit, applyKey, editForKey, type EditState } from "./edit.js"

const at = (value: string, start = value.length, end = start): EditState => ({ value, selectionStart: start, selectionEnd: end })

describe("applyEdit", () => {
  it("inserts at the caret and replaces a selection", () => {
    expect(applyEdit(at("ac", 1), { type: "insert", text: "b" }).state).toEqual(at("abc", 2))
    const replaced = applyEdit(at("a big cat", 2, 5), { type: "insert", text: "fat" })
    expect(replaced.state).toEqual(at("a fat cat", 5))
    expect(replaced.change).toEqual({ from: 2, to: 5, text: "fat" })
    expect(replaced.inputType).toBe("insertText")
  })

  it("orders and clamps the selection", () => {
    expect(applyEdit({ value: "abc", selectionStart: 3, selectionEnd: 1 }, { type: "insert", text: "x" }).state.value).toBe("ax")
    expect(applyEdit({ value: "abc", selectionStart: 99, selectionEnd: 99 }, { type: "insert", text: "d" }).state.value).toBe("abcd")
  })

  it("deletes the previous grapheme, the selection, or nothing at the start", () => {
    expect(applyEdit(at("abc"), { type: "backspace" }).state).toEqual(at("ab"))
    expect(applyEdit(at("abc", 1, 3), { type: "backspace" }).state).toEqual(at("a", 1))
    const start = applyEdit(at("abc", 0), { type: "backspace" })
    expect(start.change).toBeNull()
    expect(start.state.value).toBe("abc")
  })

  it("deletes emoji and combining sequences whole", () => {
    expect(applyEdit(at("hi👩‍👩‍👧"), { type: "backspace" }).state.value).toBe("hi")
    expect(applyEdit(at("ok👍🏽"), { type: "backspace" }).state.value).toBe("ok")
    expect(applyEdit(at("café"), { type: "backspace" }).state.value).toBe("caf")
    expect(applyEdit(at("🇦🇺"), { type: "backspace" }).state.value).toBe("")
  })

  it("moves the caret by graphemes and collapses a selection", () => {
    expect(applyEdit(at("a👍🏽b", 5), { type: "move", by: -1 }).state).toEqual(at("a👍🏽b", 1))
    expect(applyEdit(at("a👍🏽b", 1), { type: "move", by: 1 }).state).toEqual(at("a👍🏽b", 5))
    expect(applyEdit(at("abcd", 1, 3), { type: "move", by: -1 }).state).toEqual(at("abcd", 1))
    expect(applyEdit(at("abcd", 1, 3), { type: "move", by: 1 }).state).toEqual(at("abcd", 3))
    expect(applyEdit(at("ab", 0), { type: "move", by: -1 }).state).toEqual(at("ab", 0))
  })

  it("clears", () => {
    const cleared = applyEdit(at("abc", 1), { type: "clear" })
    expect(cleared.state).toEqual(at("", 0))
    expect(cleared.inputType).toBe("deleteContent")
    expect(applyEdit(at(""), { type: "clear" }).change).toBeNull()
  })

  it("respects maxLength and readOnly", () => {
    expect(applyEdit(at("abc"), { type: "insert", text: "d" }, { maxLength: 3 }).change).toBeNull()
    expect(applyEdit(at("ab"), { type: "insert", text: ".com" }, { maxLength: 4 }).state.value).toBe("ab.c")
    expect(applyEdit(at("abc", 0, 3), { type: "insert", text: "x" }, { maxLength: 3 }).state.value).toBe("x")
    expect(applyEdit(at("a"), { type: "insert", text: "👍" }, { maxLength: 2 }).state.value).toBe("a")
    expect(applyEdit(at("abc"), { type: "backspace" }, { readOnly: true }).state.value).toBe("abc")
    expect(applyEdit(at("abc"), { type: "move", by: -1 }, { readOnly: true }).state.selectionStart).toBe(2)
  })

  it("composes Hangul while composing and keeps jamo apart otherwise", () => {
    const hangul = { compose: "hangul" as const }
    expect(applyEdit(at("가"), { type: "insert", text: "ㄱ" }, hangul).state).toEqual(at("각"))
    expect(applyEdit(at("각"), { type: "insert", text: "ㅏ" }, hangul).state).toEqual(at("가가"))
    expect(applyEdit(at("가"), { type: "insert", text: "ㄱ" }, { ...hangul, composing: false }).state.value).toBe("가ㄱ")
    expect(applyEdit(at("각"), { type: "backspace" }, hangul).state.value).toBe("가")
    expect(applyEdit(at("각"), { type: "backspace" }, { ...hangul, composing: false }).state.value).toBe("")
    // A syllable that would grow past maxLength is not split; a join that keeps the length is fine.
    expect(applyEdit(at("각"), { type: "insert", text: "ㅏ" }, { ...hangul, maxLength: 2 }).state.value).toBe("가가")
    expect(applyEdit(at("각"), { type: "insert", text: "ㅏ" }, { ...hangul, maxLength: 1 }).change).toBeNull()
    expect(applyEdit(at("가"), { type: "insert", text: "ㄱ" }, { ...hangul, maxLength: 1 }).state.value).toBe("각")
  })

  it("applies kana marks to the previous character", () => {
    expect(applyEdit(at("か"), { type: "mark", modifier: "dakuten" }).state.value).toBe("が")
    expect(applyEdit(at("つ"), { type: "mark", modifier: "small" }).state.value).toBe("っ")
    expect(applyEdit(at("あ"), { type: "mark", modifier: "dakuten" }).change).toBeNull()
  })
})

describe("applyKey", () => {
  it("maps keys to edits", () => {
    expect(editForKey("a")).toEqual({ type: "insert", text: "a" })
    expect(editForKey({ action: "space" })).toEqual({ type: "insert", text: " " })
    expect(editForKey({ action: "insert", text: ".com" })).toEqual({ type: "insert", text: ".com" })
    expect(editForKey({ action: "shift" })).toBeNull()
    expect(editForKey({ action: "enter" })).toBeNull()
    expect(editForKey({ action: "enter" }, true)).toEqual({ type: "newline" })
    expect(applyKey(at("a"), { action: "enter" }, { multiline: true })?.state.value).toBe("a\n")
    expect(applyKey(at("a"), { action: "layer", layer: "symbols" })).toBeNull()
  })
})
