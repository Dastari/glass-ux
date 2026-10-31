import type { EditResult, EditState } from "./edit.js"

/** The input types whose value can be edited at the caret. Others (email, number) take text at the end. */
const SELECTABLE = new Set(["text", "search", "url", "tel", "password"])

/** An element the keyboard can type into: an input, a textarea or a contenteditable element. */
export type KeyboardTargetElement = HTMLInputElement | HTMLTextAreaElement | HTMLElement

/** What the keyboard reads from its target before an edit. */
export interface TargetState extends EditState {
  /** The input's maxLength, when it has one. */
  maxLength: number | undefined
  readOnly: boolean
  disabled: boolean
  /** Enter adds a line (textarea, contenteditable) instead of submitting. */
  multiline: boolean
  /** The target's enterkeyhint attribute ("search", "go", "done", "next", "send"), if any. */
  enterKeyHint: string | null
}

/** Whether the element is an input or a textarea (from any window). */
export function isTextControl(element: Element | null | undefined): element is HTMLInputElement | HTMLTextAreaElement {
  return element?.tagName === "INPUT" || element?.tagName === "TEXTAREA"
}

/** Whether a text control has a caret and selection the keyboard can use. */
export function hasSelection(element: HTMLInputElement | HTMLTextAreaElement): boolean {
  return element.tagName === "TEXTAREA" || SELECTABLE.has((element as HTMLInputElement).type)
}

/** Whether the element can be a keyboard target: a text control or a contenteditable element. */
export function isKeyboardTarget(element: Element | null | undefined): element is KeyboardTargetElement {
  if (isTextControl(element)) {
    if (element.tagName === "TEXTAREA") return true
    return !/^(checkbox|radio|button|submit|reset|file|image|range|color|hidden)$/.test((element as HTMLInputElement).type)
  }
  return !!element && (element as HTMLElement).isContentEditable === true
}

function editableRange(element: HTMLElement): Range | null {
  const selection = element.ownerDocument.getSelection()
  if (!selection || !selection.rangeCount) return null
  const range = selection.getRangeAt(0)
  return element.contains(range.startContainer) && element.contains(range.endContainer) ? range : null
}

/** Read the value, selection and constraints of a target. */
export function readTarget(element: KeyboardTargetElement): TargetState {
  const enterKeyHint = element.getAttribute("enterkeyhint")
  if (isTextControl(element)) {
    const value = element.value
    const selectable = hasSelection(element)
    return {
      value,
      selectionStart: selectable ? (element.selectionStart ?? value.length) : value.length,
      selectionEnd: selectable ? (element.selectionEnd ?? value.length) : value.length,
      maxLength: element.maxLength >= 0 ? element.maxLength : undefined,
      readOnly: element.readOnly,
      disabled: element.disabled,
      multiline: element.tagName === "TEXTAREA",
      enterKeyHint,
    }
  }
  // contenteditable: the text up to the caret and the selected text are all an edit needs.
  const range = editableRange(element)
  let before = element.textContent ?? ""
  let selected = ""
  if (range) {
    const head = element.ownerDocument.createRange()
    head.selectNodeContents(element)
    head.setEnd(range.startContainer, range.startOffset)
    before = head.toString()
    selected = range.toString()
  }
  return {
    value: before + selected,
    selectionStart: before.length,
    selectionEnd: before.length + selected.length,
    maxLength: undefined,
    readOnly: !element.isContentEditable,
    disabled: element.getAttribute("aria-disabled") === "true",
    multiline: true,
    enterKeyHint,
  }
}

function inputEvent(element: Element, inputType: string, data: string | null): Event {
  const view = element.ownerDocument.defaultView
  const Input = view?.InputEvent
  return Input ? new Input("input", { bubbles: true, inputType, data }) : new Event("input", { bubbles: true })
}

/**
 * Write an edit to a text control: the native value setter, so a React-controlled input sees
 * the change, then a bubbling `input` event, then the caret.
 */
function writeTextControl(element: HTMLInputElement | HTMLTextAreaElement, edit: EditResult): void {
  const { state, change, inputType } = edit
  if (change) {
    const view = element.ownerDocument.defaultView
    const prototype = element.tagName === "TEXTAREA" ? view?.HTMLTextAreaElement.prototype : view?.HTMLInputElement.prototype
    const setter = prototype ? Object.getOwnPropertyDescriptor(prototype, "value")?.set : undefined
    if (setter) setter.call(element, state.value)
    else element.value = state.value
    element.dispatchEvent(inputEvent(element, inputType, change.text || null))
  }
  if (hasSelection(element)) {
    // A controlled input that refused the value keeps its own; keep the caret inside it.
    const length = element.value.length
    element.setSelectionRange(Math.min(state.selectionStart, length), Math.min(state.selectionEnd, length))
  }
}

/** Write an edit to a contenteditable element with the browser's editing commands (undo works). */
function writeEditable(element: HTMLElement, edit: EditResult, before: EditState): void {
  const document = element.ownerDocument
  const selection = document.getSelection()
  if (!selection) return
  if (document.activeElement !== element && !element.contains(document.activeElement)) element.focus({ preventScroll: true })
  if (!editableRange(element)) {
    selection.selectAllChildren(element)
    selection.collapseToEnd()
  }
  const { change, inputType, state } = edit
  if (!change) {
    // A caret move.
    if (state.selectionStart !== before.selectionStart || state.selectionEnd !== before.selectionEnd)
      selection.modify("move", state.selectionStart < before.selectionStart ? "backward" : "forward", "character")
    return
  }
  if (inputType === "deleteContent") {
    selection.selectAllChildren(element)
    document.execCommand("delete")
    return
  }
  // Extend backward over the characters the edit replaces before the caret (a composed syllable).
  const wanted = before.selectionEnd - change.from
  for (let step = 0; step < 8 && selection.toString().length < wanted; step++) selection.modify("extend", "backward", "character")
  if (change.text === "\n") document.execCommand("insertLineBreak")
  else if (change.text) document.execCommand("insertText", false, change.text)
  else document.execCommand("delete")
}

/** Write an edit to a target: an input, a textarea or a contenteditable element. */
export function writeTarget(element: KeyboardTargetElement, edit: EditResult, before: EditState): void {
  if (isTextControl(element)) writeTextControl(element, edit)
  else writeEditable(element, edit, before)
}

/** The element a `target` prop refers to: a ref's current element or the element itself. */
export function resolveTarget(target: { current: HTMLElement | null } | HTMLElement | null | undefined): KeyboardTargetElement | null {
  if (!target) return null
  const element = "current" in target && !(target instanceof Node) ? target.current : (target as HTMLElement)
  return isKeyboardTarget(element) ? element : null
}

/**
 * Enter on a single-line input: a cancelable Enter keydown on the input first, so handlers
 * that listen for Enter run; unless one prevents it, the input's form is submitted the way
 * pressing Enter would (requestSubmit, which validates and fires submit).
 */
export function submitFromTarget(element: KeyboardTargetElement): void {
  const view = element.ownerDocument.defaultView
  const Keyboard = view?.KeyboardEvent ?? KeyboardEvent
  const keydown = new Keyboard("keydown", { key: "Enter", code: "Enter", bubbles: true, cancelable: true })
  if (!element.dispatchEvent(keydown)) return
  element.dispatchEvent(new Keyboard("keyup", { key: "Enter", code: "Enter", bubbles: true }))
  if (element.tagName !== "INPUT") return
  const form = (element as HTMLInputElement).form
  if (form && typeof form.requestSubmit === "function") form.requestSubmit()
}
