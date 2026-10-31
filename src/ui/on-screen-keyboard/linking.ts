import { mediaList } from "../../lib/use-media-query.js"
import type { BuiltInLayoutId } from "./layouts.js"
import { isKeyboardTarget, isTextControl, readTarget, type KeyboardTargetElement } from "./target.js"

/**
 * When linked inputs get `inputmode="none"`, so the device's own keyboard stays closed while
 * the on-screen keyboard serves them: `never`, `touch` (only where the primary pointer is
 * coarse, `(pointer: coarse)`), or `always`.
 */
export type ReplaceNativePolicy = "never" | "touch" | "always"

/** Whether the policy suppresses the native keyboard here and now. */
export function replacesNative(policy: ReplaceNativePolicy): boolean {
  if (policy === "always") return true
  if (policy === "never" || typeof matchMedia !== "function") return false
  return mediaList("(pointer: coarse)").matches
}

/** The inputmode each suppressed element had before ("" when it had none), so it can be put back. */
const saved = new WeakMap<Element, string | null>()

/** Set `inputmode="none"` on an element, remembering what it had. Idempotent. */
export function suppressNative(element: Element): void {
  if (!saved.has(element)) saved.set(element, element.getAttribute("inputmode"))
  if (element.getAttribute("inputmode") !== "none") element.setAttribute("inputmode", "none")
}

/** Put back the inputmode an element had before `suppressNative`. Does nothing if it was not suppressed. */
export function restoreNative(element: Element): void {
  if (!saved.has(element)) return
  const previous = saved.get(element) ?? null
  saved.delete(element)
  if (previous === null) element.removeAttribute("inputmode")
  else element.setAttribute("inputmode", previous)
}

/** Whether `suppressNative` holds the element. */
export function isSuppressed(element: Element): boolean {
  return saved.has(element)
}

/** The element's own inputmode, ignoring the "none" the keyboard set. */
export function ownInputMode(element: Element): string | null {
  return saved.has(element) ? (saved.get(element) ?? null) : element.getAttribute("inputmode")
}

/** Whether the keyboard can type into the element now: a text control or contenteditable element that is neither disabled nor read-only. */
export function canServe(element: Element | null | undefined): element is KeyboardTargetElement {
  if (!isKeyboardTarget(element)) return false
  const state = readTarget(element)
  return !state.disabled && !state.readOnly
}

/**
 * The built-in layout an input asks for through its `inputmode` or `type`: number pads for
 * `numeric`, `decimal` and `tel`, and the email and URL layouts. Undefined for text.
 */
export function layoutForInput(element: Element): BuiltInLayoutId | undefined {
  switch (ownInputMode(element)) {
    case "numeric":
      return "numeric"
    case "decimal":
      return "decimal"
    case "tel":
      return "phone"
    case "email":
      return "email"
    case "url":
      return "url"
    case "text":
    case "search":
      return undefined
  }
  if (!isTextControl(element) || element.tagName !== "INPUT") return undefined
  switch ((element as HTMLInputElement).type) {
    case "number":
      return "decimal"
    case "tel":
      return "phone"
    case "email":
      return "email"
    case "url":
      return "url"
    default:
      return undefined
  }
}
