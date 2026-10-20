/**
 * The top layer a pointer drag lives in: the preview and the shield. Shared by the drag and drop
 * manager and by DataTable row reordering, so both lift, cursor and scroll the same way.
 */

/**
 * Show an element in the top layer, above dialogs and outside every ancestor's transform. In
 * an open modal <dialog> it mounts inside the dialog, since everything outside is inert.
 * Without popover support it stays a fixed element at the top of the stacking order.
 */
export function raise(element: HTMLElement, from: Element) {
  const modal = from.closest("dialog")
  const host = modal && modal.matches(":modal") ? modal : document.body
  host.append(element)
  if (typeof element.showPopover !== "function") return
  element.setAttribute("popover", "manual")
  try {
    element.showPopover()
  } catch {
    // Not allowed here: a closed popover would stay hidden, so fall back to a fixed element.
    element.removeAttribute("popover")
  }
}

/**
 * Scroll by a wheel delta from the element under the pointer outwards, as the browser would:
 * each axis goes to the innermost container that can still move that way, what is left
 * passes outward, and `overscroll-behavior: contain | none` on a scrolling container stops it.
 */
function chainScroll(from: Element | null, dx: number, dy: number) {
  let restX = dx
  let restY = dy
  for (let node = from instanceof HTMLElement ? from : (from?.parentElement ?? null); node && node !== document.body && node !== document.documentElement && (restX || restY); node = node.parentElement) {
    const style = getComputedStyle(node)
    if (restY && /(auto|scroll|overlay)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 1) {
      const before = node.scrollTop
      node.scrollTop = before + restY
      restY = style.overscrollBehaviorY === "auto" ? restY - (node.scrollTop - before) : 0
    }
    if (restX && /(auto|scroll|overlay)/.test(style.overflowX) && node.scrollWidth > node.clientWidth + 1) {
      const before = node.scrollLeft
      node.scrollLeft = before + restX
      restX = style.overscrollBehaviorX === "auto" ? restX - (node.scrollLeft - before) : 0
    }
  }
  if (restX || restY) window.scrollBy(restX, restY)
}

/**
 * The transparent sheet over the page during a pointer drag. It shows the drag cursor, keeps
 * hover effects and hit-testing off everything beneath, and passes the wheel through to the
 * scroll container under the pointer.
 */
export function makeShield(from: Element) {
  const shield = document.createElement("div")
  shield.className = "fa-dnd-shield"
  shield.setAttribute("aria-hidden", "true")
  shield.addEventListener(
    "wheel",
    (event) => {
      if (event.ctrlKey) return
      event.preventDefault()
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1
      const dx = event.deltaX * unit
      const dy = event.deltaY * unit
      shield.style.pointerEvents = "none"
      const under = document.elementFromPoint(event.clientX, event.clientY)
      shield.style.pointerEvents = ""
      chainScroll(under, dx, dy)
    },
    { passive: false }
  )
  raise(shield, from)
  return shield
}
