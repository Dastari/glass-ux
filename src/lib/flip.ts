import { useEffect, useLayoutEffect, useRef, type RefObject } from "react"
import { motionScale, tokenDuration } from "./motion.js"

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect

interface Box {
  x: number
  y: number
  w: number
  h: number
}

const layoutBox = (element: HTMLElement): Box => ({
  x: element.offsetLeft,
  y: element.offsetTop,
  w: element.offsetWidth,
  h: element.offsetHeight,
})

/**
 * Where `element` is drawn now: its previous layout box under the transform a running
 * animation applies (transform-origin 0 0), so a retarget starts from the visible place.
 */
function visibleBox(element: HTMLElement, last: Box): Box {
  const transform = getComputedStyle(element).transform
  if (!transform || transform === "none") return last
  const matrix = new DOMMatrixReadOnly(transform)
  return { x: last.x + matrix.e, y: last.y + matrix.f, w: last.w * matrix.a, h: last.h * matrix.d }
}

/**
 * Animate a box between layout positions with transform only ("first, last, invert, play").
 * When `key` changes the element is laid out once at its new geometry; this hook measures
 * the old and new boxes and plays a transform from the old one back to none, so no layout
 * runs while it moves. The element needs `transform-origin: 0 0` and must not use
 * `transform` for anything else. Durations are tokens (scaled by --motion-scale); under
 * reduced motion it jumps. A newly mounted element appears in place.
 */
export function useFlip(ref: RefObject<HTMLElement | null>, key: string, duration = "--duration-fast", easing = "--ease-standard"): void {
  const last = useRef<Box | null>(null)
  const animation = useRef<Animation | null>(null)
  useIsoLayoutEffect(() => {
    const element = ref.current
    if (!element) {
      last.current = null
      return
    }
    const next = layoutBox(element)
    const previous = last.current
    last.current = next
    if (!previous || typeof element.animate !== "function") return
    const from = visibleBox(element, previous)
    animation.current?.cancel()
    animation.current = null
    if (next.w === 0 || next.h === 0 || motionScale() < 0.1) return
    const dx = from.x - next.x
    const dy = from.y - next.y
    const sx = from.w / next.w
    const sy = from.h / next.h
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(sx - 1) < 0.002 && Math.abs(sy - 1) < 0.002) return
    const root = document.documentElement
    const ease = getComputedStyle(root).getPropertyValue(easing).trim() || "ease"
    animation.current = element.animate(
      [{ transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` }, { transform: "none" }],
      { duration: tokenDuration(duration, 140, root), easing: ease }
    )
  }, [key])
  useEffect(() => () => animation.current?.cancel(), [])
}
