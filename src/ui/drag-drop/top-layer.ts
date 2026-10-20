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

/**
 * Attributes a re-themed island sets on an ancestor (themes.css, fonts.css), each with the
 * selector of an ancestor that sets it. Components reuse `data-mode` for their own state
 * (DataTable, Calendar, Breadcrumb), so only light and dark count as a mode island. Glass,
 * density and motion are root-only settings, which the top layer inherits anyway.
 */
const THEME_ATTRIBUTES: [name: string, island: string][] = [
  ["data-mode", '[data-mode="light"], [data-mode="dark"]'],
  ["data-palette", "[data-palette]"],
  ["data-font-sans", "[data-font-sans]"],
  ["data-font-display", "[data-font-display]"],
  ["data-font-mono", "[data-font-mono]"],
]

/**
 * The top layer inherits the page's theme, not the source's: give the preview the nearest
 * island's mode, palette and fonts so it keeps the colours it had where it was picked up.
 */
export function adoptTheme(preview: HTMLElement, from: Element) {
  for (const [name, selector] of THEME_ATTRIBUTES) {
    const island = from.closest(selector)
    const value = island?.getAttribute(name)
    if (island && island !== document.documentElement && value) preview.setAttribute(name, value)
  }
}
