import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { tokenDuration } from "../lib/motion.js"
import { pinchCamera, spread, wheelPixels, wheelZoom, zoomAround, type PanZoomCamera, type PanZoomPoint } from "../lib/pan-zoom.js"

export type { PanZoomCamera, PanZoomPoint } from "../lib/pan-zoom.js"
export { cameraTransform, containCamera } from "../lib/pan-zoom.js"

/** A wheel gesture reports its result once it has been still this long. */
const WHEEL_SETTLE_MS = 160

export interface PanZoomOptions {
  /** Called at most once per animation frame with the camera to show. Write a transform here (`cameraTransform`), not React state (R14.7, R18.5). */
  onFrame: (camera: PanZoomCamera) => void
  /** Called with the settled camera when a gesture ends: on release, when the wheel rests, or after a key or a command. Commit to state here. */
  onCommit?: (camera: PanZoomCamera) => void
  /** Called when the person starts moving the camera, before its first frame; a pinned fit can let go here. */
  onGestureStart?: () => void
  /** The starting camera. Default `{ x: 0, y: 0, k: 1 }`. */
  defaultCamera?: PanZoomCamera
  /** The smallest scale, or a function read at each use. Default 0.25. */
  minZoom?: number | (() => number)
  /** The largest scale, or a function read at each use. Default 4. */
  maxZoom?: number | (() => number)
  /** What `+`, `-` and `zoomIn`/`zoomOut` multiply by. Default 1.25. */
  zoomStep?: number
  /** `zoom`: the wheel zooms around the pointer. `pan`: it pans, and Ctrl, Command or a trackpad pinch zooms. `none`: leave it to the page. Default `zoom`. */
  wheel?: "zoom" | "pan" | "none"
  /** `+`, `-` and `0` act while the stage has focus, and the arrows pan when `arrows` is true. Default true. */
  keyboard?: boolean
  /** Let the arrow keys pan. Default true; turn off where they mean something else. */
  arrows?: boolean
  /** How far an arrow key pans, in pixels; Shift takes three steps. Default 48. */
  arrowStep?: number
  /** Pixels a press must travel before it pans, so a shorter one stays a click. Default 4. */
  dragThreshold?: number
  /** Whether a press may pan: false leaves it to the target, such as a card with its own drag. Default: every press. */
  canPan?: (event: PointerEvent) => boolean
  /** Adjust a camera before it shows, such as keeping a picture in the stage (`containCamera`). */
  constrain?: (camera: PanZoomCamera, stage: { width: number; height: number }) => PanZoomCamera
  /** Turn the gestures and keys off; commands still work. */
  disabled?: boolean
}

export interface PanZoom {
  /** Attach to the stage element: it takes the pointer, wheel and key listeners and `touch-action: none`. Give it a `tabIndex` for the keys. */
  ref: (element: HTMLElement | null) => void
  /** The camera now, including a gesture still running. */
  camera: () => PanZoomCamera
  /** Show a camera; `animate` eases there on the motion tokens, at once under reduced motion. */
  moveTo: (camera: PanZoomCamera, options?: { animate?: boolean }) => void
  /** Scale by a factor around a stage point, by default its centre. */
  zoomBy: (factor: number, point?: PanZoomPoint, options?: { animate?: boolean }) => void
  /** One `zoomStep` closer, around the centre. */
  zoomIn: () => void
  /** One `zoomStep` further, around the centre. */
  zoomOut: () => void
  /** Move the content by pixels. */
  panBy: (dx: number, dy: number) => void
  /** Back to `defaultCamera`. */
  reset: () => void
}

const resolve = (limit: number | (() => number)) => (typeof limit === "function" ? limit() : limit)

/**
 * Pan and zoom one stage by drag, wheel, pinch and keys, for content moved by a single transform:
 * a picture, a diagram, a floor plan. It holds the camera in a ref and calls `onFrame` once per
 * frame and `onCommit` when a gesture ends, so nothing re-renders while the content moves. Style
 * the content with `transform-origin: 0 0`. A drag does not start on a press alone and a click
 * that ended a drag is swallowed, so controls in the stage keep working. Coordinates are physical:
 * spatial content does not mirror in right-to-left languages (R5.11).
 *
 *   const stage = usePanZoom({ onFrame: (camera) => { content.current!.style.transform = cameraTransform(camera) } })
 *   <div ref={stage.ref} tabIndex={0} role="application" aria-label="Floor plan"><div ref={content}>…</div></div>
 */
export function usePanZoom(options: PanZoomOptions): PanZoom {
  const latest = useRef(options)
  latest.current = options
  const camera = useRef(options.defaultCamera ?? { x: 0, y: 0, k: 1 })
  const start = useRef(camera.current)
  const frame = useRef(0)
  const animation = useRef(0)
  const settle = useRef<ReturnType<typeof setTimeout>>(undefined)
  const [element, setElement] = useState<HTMLElement | null>(null)
  const stage = useRef<HTMLElement | null>(null)
  stage.current = element

  const box = useCallback(() => ({ width: stage.current?.clientWidth ?? 0, height: stage.current?.clientHeight ?? 0 }), [])
  const limits = useCallback(() => ({ min: resolve(latest.current.minZoom ?? 0.25), max: resolve(latest.current.maxZoom ?? 4) }), [])

  const show = useCallback(
    (next: PanZoomCamera) => {
      camera.current = latest.current.constrain?.(next, box()) ?? next
      cancelAnimationFrame(frame.current)
      frame.current = requestAnimationFrame(() => latest.current.onFrame(camera.current))
    },
    [box],
  )
  const commit = useCallback(() => latest.current.onCommit?.(camera.current), [])

  const moveTo = useCallback<PanZoom["moveTo"]>(
    (target, { animate = false } = {}) => {
      cancelAnimationFrame(animation.current)
      clearTimeout(settle.current)
      const duration = animate ? tokenDuration("--duration-slow", 0) : 0
      if (duration < 20) {
        show(target)
        commit()
        return
      }
      const from = camera.current
      const began = performance.now()
      const step = (now: number) => {
        const t = Math.min(1, (now - began) / duration)
        const eased = 1 - (1 - t) ** 3
        show({ x: from.x + (target.x - from.x) * eased, y: from.y + (target.y - from.y) * eased, k: from.k + (target.k - from.k) * eased })
        if (t < 1) animation.current = requestAnimationFrame(step)
        else commit()
      }
      animation.current = requestAnimationFrame(step)
    },
    [show, commit],
  )

  const zoomBy = useCallback<PanZoom["zoomBy"]>(
    (factor, point, moveOptions) => {
      const { width, height } = box()
      const { min, max } = limits()
      moveTo(zoomAround(camera.current, factor, point ?? { x: width / 2, y: height / 2 }, min, max), moveOptions)
    },
    [box, limits, moveTo],
  )
  const panBy = useCallback<PanZoom["panBy"]>((dx, dy) => moveTo({ ...camera.current, x: camera.current.x + dx, y: camera.current.y + dy }), [moveTo])
  const reset = useCallback(() => moveTo(start.current, { animate: true }), [moveTo])
  const zoomIn = useCallback(() => zoomBy(latest.current.zoomStep ?? 1.25, undefined, { animate: true }), [zoomBy])
  const zoomOut = useCallback(() => zoomBy(1 / (latest.current.zoomStep ?? 1.25), undefined, { animate: true }), [zoomBy])

  const disabled = options.disabled ?? false
  useEffect(() => {
    if (!element || disabled) return
    const pointers = new Map<number, PanZoomPoint>()
    let gesture: { x: number; y: number; camera: PanZoomCamera; panning: boolean; pinch?: ReturnType<typeof spread> } | null = null
    let dragged = false
    const local = (event: { clientX: number; clientY: number }) => {
      const rect = element.getBoundingClientRect()
      return { x: event.clientX - rect.left, y: event.clientY - rect.top }
    }
    const begin = () => latest.current.onGestureStart?.()

    const down = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) return
      if (latest.current.canPan?.(event) === false) return
      cancelAnimationFrame(animation.current)
      const point = local(event)
      pointers.set(event.pointerId, point)
      dragged = false
      const [a, b] = [...pointers.values()]
      if (a && b) {
        for (const id of pointers.keys()) if (!element.hasPointerCapture(id)) element.setPointerCapture(id)
        if (!gesture?.panning) begin()
        gesture = { x: 0, y: 0, camera: camera.current, panning: true, pinch: spread(a, b) }
        return
      }
      gesture = { x: point.x, y: point.y, camera: camera.current, panning: false }
    }
    const move = (event: PointerEvent) => {
      const current = gesture
      if (!current || !pointers.has(event.pointerId)) return
      const point = local(event)
      pointers.set(event.pointerId, point)
      const [a, b] = [...pointers.values()]
      if (current.pinch && a && b) {
        const { min, max } = limits()
        show(pinchCamera(current.camera, current.pinch, spread(a, b), min, max))
        return
      }
      const dx = point.x - current.x
      const dy = point.y - current.y
      if (!current.panning) {
        if (Math.hypot(dx, dy) < (latest.current.dragThreshold ?? 4)) return
        current.panning = true
        dragged = true
        element.setPointerCapture(event.pointerId)
        begin()
      }
      show({ ...current.camera, x: current.camera.x + dx, y: current.camera.y + dy })
    }
    const up = (event: PointerEvent) => {
      if (!pointers.delete(event.pointerId)) return
      const [rest] = [...pointers.values()]
      if (rest && gesture?.pinch) {
        // One finger left: carry on as a pan from here.
        gesture = { x: rest.x, y: rest.y, camera: camera.current, panning: true }
        return
      }
      if (pointers.size > 0) return
      const moved = gesture?.panning
      gesture = null
      if (moved) commit()
    }
    // A press that became a drag is not a click on whatever it started over.
    const click = (event: MouseEvent) => {
      if (!dragged) return
      dragged = false
      event.stopPropagation()
      event.preventDefault()
    }
    // A non-passive listener, so the page does not scroll.
    const wheel = (event: WheelEvent) => {
      const mode = latest.current.wheel ?? "zoom"
      if (mode === "none") return
      event.preventDefault()
      begin()
      const { height } = box()
      const pixels = (delta: number) => wheelPixels(delta, event.deltaMode, height)
      if (mode === "zoom" || event.ctrlKey || event.metaKey) {
        const { min, max } = limits()
        show(zoomAround(camera.current, wheelZoom(pixels(event.deltaY), event.ctrlKey || mode === "pan"), local(event), min, max))
      } else {
        const sideways = event.shiftKey && !event.deltaX
        show({ ...camera.current, x: camera.current.x - pixels(sideways ? event.deltaY : event.deltaX), y: camera.current.y - pixels(sideways ? 0 : event.deltaY) })
      }
      clearTimeout(settle.current)
      settle.current = setTimeout(commit, WHEEL_SETTLE_MS)
    }
    const key = (event: KeyboardEvent) => {
      const { keyboard = true, arrows = true, arrowStep = 48 } = latest.current
      if (!keyboard || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return
      const step = arrowStep * (event.shiftKey ? 3 : 1)
      const moves: Record<string, () => void> = {
        "+": zoomIn,
        "=": zoomIn,
        "-": zoomOut,
        _: zoomOut,
        "0": reset,
        ...(arrows && {
          ArrowLeft: () => panBy(step, 0),
          ArrowRight: () => panBy(-step, 0),
          ArrowUp: () => panBy(0, step),
          ArrowDown: () => panBy(0, -step),
        }),
      }
      const run = moves[event.key]
      if (!run) return
      event.preventDefault()
      run()
    }

    const touchAction = element.style.touchAction
    element.style.touchAction = "none"
    element.addEventListener("pointerdown", down)
    element.addEventListener("pointermove", move)
    element.addEventListener("pointerup", up)
    element.addEventListener("pointercancel", up)
    element.addEventListener("click", click, true)
    element.addEventListener("wheel", wheel, { passive: false })
    element.addEventListener("keydown", key)
    return () => {
      element.style.touchAction = touchAction
      element.removeEventListener("pointerdown", down)
      element.removeEventListener("pointermove", move)
      element.removeEventListener("pointerup", up)
      element.removeEventListener("pointercancel", up)
      element.removeEventListener("click", click, true)
      element.removeEventListener("wheel", wheel)
      element.removeEventListener("keydown", key)
    }
  }, [element, disabled, box, limits, show, commit, zoomIn, zoomOut, panBy, reset])

  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current)
      cancelAnimationFrame(animation.current)
      clearTimeout(settle.current)
    },
    [],
  )

  return useMemo(() => ({ ref: setElement, camera: () => camera.current, moveTo, zoomBy, zoomIn, zoomOut, panBy, reset }), [moveTo, zoomBy, zoomIn, zoomOut, panBy, reset])
}
