/**
 * One pointer gesture on the scheduler: a drag to move or resize an event, or to select a
 * stretch of empty time. Mouse and pen begin past a small threshold; touch either holds for a
 * moment first (so a swipe still scrolls the grid) or never drags at all (a tap). Moves are
 * reported to the caller, which writes styles to the elements it moves and commits at the end,
 * so nothing re-renders per frame (R18.5). Near the scroller's edges the gesture scrolls it.
 */

export interface Point {
  x: number
  y: number
}

export interface GestureHandlers {
  /** The gesture began: past the threshold, or after a touch hold. */
  begin?: (point: Point) => void
  /** The pointer moved (or the scroller scrolled under it) after the gesture began. */
  move: (point: Point) => void
  /** Released. `began` is false for a click or a tap. */
  end: (point: Point, began: boolean) => void
  /** Escape, a cancelled pointer, or a lost window. */
  cancel: () => void
}

export interface GestureOptions {
  /** "hold": touch drags after a short press; "tap": touch never drags. */
  touch: "hold" | "tap"
  /** Scrolled while the pointer nears its top or bottom edge. */
  scroller?: HTMLElement | null
}

const THRESHOLD = 4
const TOUCH_SLOP = 8
const HOLD_MS = 380
const EDGE = 40
const SPEED = 14

/** Follow a pointer from its pointerdown. Returns a function that abandons the gesture. */
export function trackPointer(down: { pointerId: number; pointerType: string; clientX: number; clientY: number }, handlers: GestureHandlers, options: GestureOptions): () => void {
  const start = { x: down.clientX, y: down.clientY }
  let last = start
  let began = false
  let done = false
  let frame = 0
  const touch = down.pointerType === "touch"
  let holdTimer = 0

  const begin = () => {
    if (began || done) return
    began = true
    document.documentElement.setAttribute("data-scheduler-gesture", "")
    handlers.begin?.(last)
    handlers.move(last)
    if (options.scroller) frame = requestAnimationFrame(edgeScroll)
  }

  const edgeScroll = () => {
    const scroller = options.scroller
    if (!scroller || done) return
    const rect = scroller.getBoundingClientRect()
    let delta = 0
    if (last.y < rect.top + EDGE) delta = -SPEED * Math.min(1, (rect.top + EDGE - last.y) / EDGE)
    else if (last.y > rect.bottom - EDGE) delta = SPEED * Math.min(1, (last.y - rect.bottom + EDGE) / EDGE)
    if (delta) {
      const before = scroller.scrollTop
      scroller.scrollTop += delta
      if (scroller.scrollTop !== before) handlers.move(last)
    }
    frame = requestAnimationFrame(edgeScroll)
  }

  const finish = () => {
    done = true
    window.clearTimeout(holdTimer)
    cancelAnimationFrame(frame)
    window.removeEventListener("pointermove", onMove)
    window.removeEventListener("pointerup", onUp)
    window.removeEventListener("pointercancel", onCancel)
    window.removeEventListener("keydown", onKey, true)
    window.removeEventListener("blur", onCancel)
    window.removeEventListener("touchmove", onTouchMove)
    window.removeEventListener("contextmenu", onContextMenu, true)
    document.documentElement.removeAttribute("data-scheduler-gesture")
  }

  const onMove = (event: PointerEvent) => {
    if (event.pointerId !== down.pointerId) return
    last = { x: event.clientX, y: event.clientY }
    const distance = Math.hypot(last.x - start.x, last.y - start.y)
    if (!began) {
      if (touch) {
        // Moving before the hold is a scroll or a swipe, not a drag.
        if (distance > TOUCH_SLOP) {
          finish()
          handlers.cancel()
        }
        return
      }
      if (distance < THRESHOLD) return
      begin()
      return
    }
    handlers.move(last)
  }
  const onUp = (event: PointerEvent) => {
    if (event.pointerId !== down.pointerId) return
    last = { x: event.clientX, y: event.clientY }
    const wasBegun = began
    finish()
    handlers.end(last, wasBegun)
  }
  const onCancel = () => {
    finish()
    handlers.cancel()
  }
  const onKey = (event: KeyboardEvent) => {
    if (event.key !== "Escape") return
    event.preventDefault()
    event.stopPropagation()
    onCancel()
  }
  // Once a touch drag has begun, the page must not scroll under it.
  const onTouchMove = (event: TouchEvent) => {
    if (began && event.cancelable) event.preventDefault()
  }
  const onContextMenu = (event: Event) => {
    if (touch) event.preventDefault()
  }

  window.addEventListener("pointermove", onMove)
  window.addEventListener("pointerup", onUp)
  window.addEventListener("pointercancel", onCancel)
  window.addEventListener("keydown", onKey, true)
  window.addEventListener("blur", onCancel)
  if (touch) {
    window.addEventListener("touchmove", onTouchMove, { passive: false })
    window.addEventListener("contextmenu", onContextMenu, true)
    if (options.touch === "hold") holdTimer = window.setTimeout(begin, HOLD_MS)
  }
  return () => {
    if (done) return
    finish()
  }
}
