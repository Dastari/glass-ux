/**
 * Whether a key event's target is rich text entry, where modifier shortcuts belong to the
 * editor (Ctrl+B is bold, Ctrl+I italic): a contenteditable region, an element with
 * role="textbox" (a custom editor) or a `[data-keyboard-capture]` region. Plain inputs and
 * textareas are not: they have no use for those chords.
 */
export function isRichTextTarget(target: EventTarget | null): boolean {
  if (typeof HTMLElement === "undefined" || !(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  return Boolean(target.closest("[contenteditable]:not([contenteditable='false']), [role='textbox'], [data-keyboard-capture]"))
}

/** Whether a key event's target takes typed characters: an input, textarea, select or rich text. */
export function isTextEntryTarget(target: EventTarget | null): boolean {
  if (typeof HTMLElement === "undefined" || !(target instanceof HTMLElement)) return false
  return /^(input|textarea|select)$/i.test(target.tagName) || isRichTextTarget(target)
}
