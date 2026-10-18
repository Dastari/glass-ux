import { useEffect, type RefObject } from "react"

/** Pixels per line for `deltaMode` 1 wheels (Firefox): about one line of body text. */
const LINE_PX = 20

interface WheelDelta {
  deltaX: number
  deltaY: number
  deltaMode: number
  ctrlKey: boolean
}

/**
 * Scroll `scroller` by a wheel that landed on `source`, a box outside it (the sticky header).
 * Only the axes the scroller can still move along are taken; the rest is left to the page.
 * Returns whether the wheel was used, so the caller cancels it.
 */
export function forwardWheel(scroller: HTMLElement, event: WheelDelta): boolean {
  // Ctrl + wheel (and a trackpad pinch) zooms the page.
  if (event.ctrlKey) return false
  const unit = event.deltaMode === 1 ? LINE_PX : event.deltaMode === 2 ? scroller.clientHeight : 1
  const top = event.deltaY * unit
  const left = event.deltaX * unit
  const { scrollTop, scrollHeight, clientHeight, scrollLeft, scrollWidth, clientWidth } = scroller
  const canY = top < 0 ? scrollTop > 0 : top > 0 && scrollTop + clientHeight < scrollHeight - 1
  // scrollLeft is negative in a right-to-left table; its magnitude is the distance from the start.
  const fromStart = Math.abs(scrollLeft)
  const towardEnd = scroller.ownerDocument.defaultView?.getComputedStyle(scroller).direction === "rtl" ? -left : left
  const canX = towardEnd < 0 ? fromStart > 0 : towardEnd > 0 && fromStart + clientWidth < scrollWidth - 1
  if (!canY && !canX) return false
  scroller.scrollBy({ top: canY ? top : 0, left: canX ? left : 0 })
  return true
}

/**
 * A wheel over the header row scrolls the rows, as it would if the header were inside the
 * scroller. Listens on the header only: a non-passive listener makes its region wait for the
 * main thread, and the body keeps scrolling on the compositor.
 */
export function useHeaderWheel(
  headRef: RefObject<HTMLElement | null>,
  scrollRef: RefObject<HTMLElement | null>,
  active: boolean,
) {
  useEffect(() => {
    const head = headRef.current
    if (!active || !head) return
    const onWheel = (event: WheelEvent) => {
      const scroller = scrollRef.current
      if (!event.defaultPrevented && scroller && forwardWheel(scroller, event)) event.preventDefault()
    }
    head.addEventListener("wheel", onWheel, { passive: false })
    return () => head.removeEventListener("wheel", onWheel)
  }, [headRef, scrollRef, active])
}
