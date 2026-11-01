/**
 * Write text to the clipboard. Uses the async Clipboard API where the page has it (a secure
 * context, with permission) and falls back to a hidden textarea and `execCommand("copy")`
 * where it does not, such as an `http:` page on a LAN host. Rejects when neither can copy.
 * A rejection from the Clipboard API itself (permission refused) passes through unchanged.
 * Call it from a user gesture; browsers refuse a copy that no gesture started.
 */
export async function writeClipboardText(text: string): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  if (typeof document === "undefined") throw new Error("Clipboard unavailable")
  const area = document.createElement("textarea")
  area.value = text
  area.setAttribute("readonly", "")
  area.style.position = "fixed"
  area.style.opacity = "0"
  document.body.append(area)
  area.select()
  const done = document.execCommand("copy")
  area.remove()
  if (!done) throw new Error("Clipboard unavailable")
}
