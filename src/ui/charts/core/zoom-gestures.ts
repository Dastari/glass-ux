/**
 * Pointer gestures that zoom a plot's x window, bound to the plot's layer element:
 *
 *   drag (mouse, pen)        draws a brush rectangle; release zooms to it
 *   Ctrl/⌘ + wheel           zooms around the pointer (a trackpad pinch arrives as this);
 *                            a plain wheel is left alone, so the page scrolls as before
 *   two-finger pinch (touch) zooms and pans with the fingers; one finger still scrubs
 *
 * Nothing updates React state while a gesture runs (R18.5): the rectangle is styled
 * directly and the window goes to `preview`, which the plot applies as a transform; the
 * window is committed once, when the gesture ends (the wheel, after a short pause).
 */
import { useEffect, useRef, type RefObject } from "react"
import { clampWindow, type XWindow } from "./zoom.js"

export interface ZoomGeometry {
  /** The committed window. */
  view: XWindow
  /** The whole x range. */
  full: XWindow
  /** The narrowest window. */
  min: number
  /** The plot's left and right edges, px from the layer's left. */
  x0: number
  x1: number
}

export interface ZoomGestureOptions {
  /** Turn the gestures on. */
  enabled: boolean
  /** The current geometry (read when a gesture starts and moves). */
  geometry: () => ZoomGeometry
  /** Show a window while the gesture runs (null: back to the committed one). */
  preview: (window: XWindow | null) => void
  /** The gesture's result. */
  commit: (window: XWindow) => void
  /** The brush rectangle element, styled directly while dragging. */
  rect: RefObject<HTMLElement | null>
  /** A gesture took over the pointer: hide the crosshair and tooltip. */
  onStart?: () => void
}

/** Pixels a press must travel before it becomes a drag (a shorter one stays a click). */
const DRAG_START = 4
/** The wheel commits once it has been still this long. */
const WHEEL_SETTLE = 160

export function useZoomGestures(layer: RefObject<HTMLElement | null>, options: ZoomGestureOptions) {
  const latest = useRef(options)
  useEffect(() => {
    latest.current = options
  })

  useEffect(() => {
    const element = layer.current
    if (!element || !options.enabled) return
    const local = (event: { clientX: number }) => event.clientX - element.getBoundingClientRect().left
    const toX = (px: number, window: XWindow, g: ZoomGeometry) => window[0] + ((px - g.x0) / Math.max(1, g.x1 - g.x0)) * (window[1] - window[0])

    // ── Drag to select ──────────────────────────────────────────────────────────
    let drag: { id: number; start: number; active: boolean; end: number } | null = null
    const showRect = (from: number, to: number) => {
      const rect = latest.current.rect.current
      if (!rect) return
      const g = latest.current.geometry()
      const left = Math.max(g.x0, Math.min(from, to))
      const right = Math.min(g.x1, Math.max(from, to))
      rect.style.left = `${left}px`
      rect.style.width = `${Math.max(0, right - left)}px`
      rect.toggleAttribute("data-active", true)
    }
    const hideRect = () => latest.current.rect.current?.removeAttribute("data-active")

    // ── Pinch (touch) ───────────────────────────────────────────────────────────
    const touches = new Map<number, number>()
    let pinch: { a: number; b: number; window: XWindow | null } | null = null

    const onDown = (event: PointerEvent) => {
      if (event.pointerType === "touch") {
        touches.set(event.pointerId, local(event))
        if (touches.size === 2) {
          const g = latest.current.geometry()
          const [p, q] = [...touches.values()].toSorted((m, n) => m - n) as [number, number]
          pinch = { a: toX(p, g.view, g), b: toX(q, g.view, g), window: null }
          for (const id of touches.keys()) element.setPointerCapture?.(id)
          latest.current.onStart?.()
        }
        return
      }
      if (event.button !== 0 || event.ctrlKey || event.metaKey) return
      drag = { id: event.pointerId, start: local(event), active: false, end: local(event) }
    }
    const onMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") {
        if (!touches.has(event.pointerId)) return
        touches.set(event.pointerId, local(event))
        if (!pinch || touches.size < 2) return
        event.preventDefault()
        const g = latest.current.geometry()
        const [p, q] = [...touches.values()].toSorted((m, n) => m - n) as [number, number]
        if (q - p < 12) return
        const span = ((pinch.b - pinch.a) * (g.x1 - g.x0)) / (q - p)
        const from = pinch.a - ((p - g.x0) / Math.max(1, g.x1 - g.x0)) * span
        pinch.window = clampWindow([from, from + span], g.full, g.min)
        latest.current.onStart?.()
        latest.current.preview(pinch.window)
        return
      }
      if (!drag || event.pointerId !== drag.id) return
      drag.end = local(event)
      if (!drag.active && Math.abs(drag.end - drag.start) >= DRAG_START) {
        drag.active = true
        element.setPointerCapture?.(drag.id)
        element.toggleAttribute("data-brushing", true)
        latest.current.onStart?.()
      }
      if (drag.active) showRect(drag.start, drag.end)
    }
    const onUp = (event: PointerEvent) => {
      if (event.pointerType === "touch") {
        touches.delete(event.pointerId)
        if (pinch && touches.size < 2) {
          const done = pinch.window
          pinch = null
          latest.current.preview(null)
          if (done) latest.current.commit(done)
        }
        return
      }
      if (!drag || event.pointerId !== drag.id) return
      const finished = drag
      drag = null
      element.removeAttribute("data-brushing")
      hideRect()
      if (!finished.active || event.type === "pointercancel") return
      const g = latest.current.geometry()
      const left = Math.max(g.x0, Math.min(finished.start, finished.end))
      const right = Math.min(g.x1, Math.max(finished.start, finished.end))
      if (right - left < DRAG_START) return
      latest.current.commit([toX(left, g.view, g), toX(right, g.view, g)])
    }

    // ── Ctrl + wheel ───────────────────────────────────────────────────────────
    let wheel: XWindow | null = null
    let settle: ReturnType<typeof setTimeout> | undefined
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return
      event.preventDefault()
      const g = latest.current.geometry()
      const base = wheel ?? g.view
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1)
      const factor = Math.exp(Math.max(-1, Math.min(1, delta * 0.01)))
      const at = toX(local(event), base, g)
      const span = (base[1] - base[0]) * factor
      const t = (at - base[0]) / Math.max(1e-9, base[1] - base[0])
      wheel = clampWindow([at - t * span, at - t * span + span], g.full, g.min)
      latest.current.onStart?.()
      latest.current.preview(wheel)
      clearTimeout(settle)
      settle = setTimeout(() => {
        const done = wheel
        wheel = null
        latest.current.preview(null)
        if (done) latest.current.commit(done)
      }, WHEEL_SETTLE)
    }

    element.addEventListener("pointerdown", onDown)
    element.addEventListener("pointermove", onMove)
    element.addEventListener("pointerup", onUp)
    element.addEventListener("pointercancel", onUp)
    element.addEventListener("wheel", onWheel, { passive: false })
    return () => {
      clearTimeout(settle)
      element.removeEventListener("pointerdown", onDown)
      element.removeEventListener("pointermove", onMove)
      element.removeEventListener("pointerup", onUp)
      element.removeEventListener("pointercancel", onUp)
      element.removeEventListener("wheel", onWheel)
      element.removeAttribute("data-brushing")
    }
  }, [layer, options.enabled])
}

/**
 * The transform that shows `next` in a plot drawn for `view`: x' = scale · x + shift, for an
 * SVG `matrix(scale 0 0 1 shift 0)`. The plot runs from x0 to x1.
 */
export function previewMatrix(view: XWindow, next: XWindow, x0: number, x1: number): { scale: number; shift: number } {
  const width = x1 - x0
  const scale = (view[1] - view[0]) / Math.max(1e-9, next[1] - next[0])
  const shift = x0 + ((view[0] - next[0]) * width) / Math.max(1e-9, next[1] - next[0]) - x0 * scale
  return { scale, shift }
}
