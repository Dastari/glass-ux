import { segmenter } from "../../lib/locale/intl.js"
import { hangulBackspace, hangulInput, isHangul, kanaModify, type KanaModifier } from "./compose.js"
import type { KeyboardKey } from "./layouts.js"

/** Text and selection: what an edit reads and returns. Offsets are UTF-16 code units, as in the DOM. */
export interface EditState {
  value: string
  selectionStart: number
  selectionEnd: number
}

/** An edit the keyboard makes. */
export type EditCommand =
  | { type: "insert"; text: string }
  | { type: "backspace" }
  | { type: "clear" }
  | { type: "move"; by: -1 | 1 }
  | { type: "mark"; modifier: KanaModifier }
  | { type: "newline" }

/** What constrains an edit. */
export interface EditOptions {
  /** The language of the text, for grapheme boundaries. */
  locale?: string
  /** The layout's composition engine. */
  compose?: "hangul" | "kana" | undefined
  /**
   * Whether the text before the caret is still being composed (typed by the keyboard without
   * the caret moving since). Hangul joins jamo into that syllable and Backspace takes off one
   * jamo; otherwise each jamo starts afresh and Backspace removes a whole character. Default true.
   */
  composing?: boolean
  /** The most code units the value may hold (an input's maxLength); text that does not fit is cut. */
  maxLength?: number | undefined
  /** Nothing changes. */
  readOnly?: boolean
}

/** The new state, and the range of the old value that changed, for writing to a target. */
export interface EditResult {
  state: EditState
  /** The replaced range of the old value and its new text; null when the value is unchanged. */
  change: { from: number; to: number; text: string } | null
  /** The `InputEvent.inputType` that describes the edit ("insertText", "deleteContentBackward", …). */
  inputType: string
}

const clamp = (value: number, max: number) => Math.max(0, Math.min(max, Number.isFinite(value) ? value : max))

/** The selection ordered and inside the value. */
export function normalizeSelection({ value, selectionStart, selectionEnd }: EditState): EditState {
  const start = clamp(selectionStart, value.length)
  const end = clamp(selectionEnd, value.length)
  return { value, selectionStart: Math.min(start, end), selectionEnd: Math.max(start, end) }
}

/** The length of the grapheme that ends at `offset` (an emoji family, a letter with its marks). */
export function graphemeBefore(value: string, offset: number, locale?: string): number {
  if (offset <= 0) return 0
  // A grapheme is short; segment only the tail before the caret.
  const tail = value.slice(Math.max(0, offset - 64), offset)
  const segments = segmenter(locale)
  if (segments) {
    let last = ""
    for (const part of segments.segment(tail)) last = part.segment
    return last.length || 1
  }
  const code = value.codePointAt(offset - 2)
  return code !== undefined && code > 0xffff && offset >= 2 ? 2 : 1
}

/** The length of the grapheme that starts at `offset`. */
export function graphemeAfter(value: string, offset: number, locale?: string): number {
  if (offset >= value.length) return 0
  const head = value.slice(offset, offset + 64)
  const segments = segmenter(locale)
  if (segments) {
    for (const part of segments.segment(head)) return part.segment.length
  }
  return (value.codePointAt(offset) ?? 0) > 0xffff ? 2 : 1
}

function result(state: EditState, from: number, to: number, text: string, inputType: string): EditResult {
  const value = state.value.slice(0, from) + text + state.value.slice(to)
  if (value === state.value) {
    const caret = from + text.length
    return { state: { value, selectionStart: caret, selectionEnd: caret }, change: null, inputType }
  }
  const caret = from + text.length
  return { state: { value, selectionStart: caret, selectionEnd: caret }, change: { from, to, text }, inputType }
}

const unchanged = (state: EditState, inputType = ""): EditResult => ({ state, change: null, inputType })

/** Cut `text` to the room left under maxLength, by whole code points. */
function fit(text: string, room: number): string {
  if (text.length <= room) return text
  let out = ""
  for (const char of text) {
    if (out.length + char.length > room) break
    out += char
  }
  return out
}

function insert(state: EditState, text: string, options: EditOptions, inputType = "insertText"): EditResult {
  const { value, selectionStart: start, selectionEnd: end } = state
  let from = start
  let replacement = text
  // Hangul: a jamo typed after the syllable being composed joins it (가 + ㄱ → 각).
  if (options.compose === "hangul" && options.composing !== false && start === end && start > 0 && isHangul(text)) {
    const previous = value.slice(start - 1, start)
    if (isHangul(previous)) {
      const joined = hangulInput(previous, text)
      if (joined !== previous + text) {
        from = start - 1
        replacement = joined
      }
    }
  }
  if (options.maxLength !== undefined && options.maxLength >= 0) {
    const room = options.maxLength - (value.length - (end - from))
    if (replacement.length > room) {
      // A joined syllable that no longer fits falls back to the plain jamo.
      if (from !== start) return insert(state, text, { ...options, composing: false }, inputType)
      replacement = fit(replacement, Math.max(0, room))
      if (!replacement) return unchanged(state)
    }
  }
  return result(state, from, end, replacement, inputType)
}

function backspace(state: EditState, options: EditOptions): EditResult {
  const { value, selectionStart: start, selectionEnd: end } = state
  if (start !== end) return result(state, start, end, "", "deleteContentBackward")
  if (start === 0) return unchanged(state)
  if (options.compose === "hangul" && options.composing !== false) {
    const smaller = hangulBackspace(value.slice(start - 1, start))
    if (smaller !== null) return result(state, start - 1, start, smaller, "deleteContentBackward")
  }
  return result(state, start - graphemeBefore(value, start, options.locale), start, "", "deleteContentBackward")
}

function move(state: EditState, by: -1 | 1, locale: string | undefined): EditResult {
  const { value, selectionStart: start, selectionEnd: end } = state
  let caret: number
  if (start !== end) caret = by < 0 ? start : end
  else caret = by < 0 ? start - graphemeBefore(value, start, locale) : start + graphemeAfter(value, start, locale)
  return unchanged({ value, selectionStart: caret, selectionEnd: caret })
}

function mark(state: EditState, modifier: KanaModifier): EditResult {
  const { value, selectionStart: start, selectionEnd: end } = state
  if (start !== end || start === 0) return unchanged(state)
  const size = graphemeBefore(value, start, "ja")
  const previous = value.slice(start - size, start)
  const marked = kanaModify(previous, modifier)
  return marked === null ? unchanged(state) : result(state, start - size, start, marked, "insertReplacementText")
}

/**
 * Apply an edit to a value and its selection. Insert replaces the selection; Backspace
 * deletes the selection or the grapheme before the caret (Hangul being composed loses one
 * jamo instead); Clear empties the value; Move steps the caret by a grapheme; Mark applies a
 * kana mark to the kana before the caret. Respects maxLength and readOnly. Pure.
 * @example applyEdit({ value: "ab", selectionStart: 2, selectionEnd: 2 }, { type: "backspace" }).state.value === "a"
 */
export function applyEdit(state: EditState, command: EditCommand, options: EditOptions = {}): EditResult {
  const current = normalizeSelection(state)
  if (options.readOnly && command.type !== "move") return unchanged(current)
  switch (command.type) {
    case "insert":
      return command.text ? insert(current, command.text, options) : unchanged(current)
    case "newline":
      return insert(current, "\n", { ...options, compose: undefined }, "insertLineBreak")
    case "backspace":
      return backspace(current, options)
    case "clear":
      return current.value ? result(current, 0, current.value.length, "", "deleteContent") : unchanged(current)
    case "move":
      return move(current, command.by, options.locale)
    case "mark":
      return mark(current, command.modifier)
  }
}

/**
 * The edit a key makes, or null for keys that do not edit (Shift, layer and layout keys,
 * Hide, Enter outside a multi-line target). Enter inserts a line break when `multiline`.
 */
export function editForKey(key: KeyboardKey, multiline = false): EditCommand | null {
  if (typeof key === "string") return { type: "insert", text: key }
  switch (key.action) {
    case "insert":
      return key.text ? { type: "insert", text: key.text } : null
    case "space":
      return { type: "insert", text: key.text ?? " " }
    case "backspace":
      return { type: "backspace" }
    case "clear":
      return { type: "clear" }
    case "left":
      return { type: "move", by: -1 }
    case "right":
      return { type: "move", by: 1 }
    case "dakuten":
    case "handakuten":
    case "small":
      return { type: "mark", modifier: key.action }
    case "enter":
      return multiline ? { type: "newline" } : null
    default:
      return null
  }
}

/**
 * Apply a key to a value and its selection: {@link editForKey} then {@link applyEdit}. Returns
 * null for keys that do not edit.
 */
export function applyKey(state: EditState, key: KeyboardKey, options: EditOptions & { multiline?: boolean } = {}): EditResult | null {
  const command = editForKey(key, options.multiline)
  return command ? applyEdit(state, command, options) : null
}
