import { useDirection } from "./locale/direction.js"
import { useEffect, useState, type RefObject } from "react"
import { observeElementSizes } from "./resize-observer.js"

export interface ScrollEdges {
  /** Content is scrolled away from the top (show the header edge). */
  top: boolean
  /** More content below (show the footer edge). */
  bottom: boolean
  left: boolean
  right: boolean
}

const NONE: ScrollEdges = { top: false, bottom: false, left: false, right: false }

export interface ScrollEdgesOptions {
  /** Pixels of scroll before an edge counts as scrolled. @defaultValue 1 */
  threshold?: number
  /**
   * A selector for the nearest ancestor that mirrors the edges as `data-scrolled-top`,
   * `data-scrolled-bottom`, `data-scrolled-left` and `data-scrolled-right`. Styles for a
   * header or footer elsewhere in that ancestor then select on the ancestor's attribute
   * instead of `:has()`, which would re-check the whole subtree on every flip.
   */
  root?: string
}

const ROOT_ATTRIBUTES = [
  ["top", "data-scrolled-top"],
  ["bottom", "data-scrolled-bottom"],
  ["left", "data-scrolled-left"],
  ["right", "data-scrolled-right"],
] as const

/**
 * Track which edges of a scroll container have content beyond them. R5.8: a header or
 * footer shows its hairline only while content scrolls beneath it. Apply the result as
 * `data-scrolled-top` / `data-scrolled-bottom` on the frame, or pass `root` to have the
 * nearest matching ancestor carry those attributes without a re-render.
 */
export function useScrollEdges(
  ref: RefObject<HTMLElement | null>,
  options: number | ScrollEdgesOptions = 1
): ScrollEdges {
  const { threshold = 1, root: rootSelector } = typeof options === "number" ? { threshold: options } : options
  const direction = useDirection()
  const [edges, setEdges] = useState<ScrollEdges>(NONE)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const root = rootSelector ? element.parentElement?.closest<HTMLElement>(rootSelector) : null
    let frame = 0
    let last = NONE
    const update = () => {
      frame = 0
      const { scrollTop, scrollHeight, clientHeight, scrollLeft, scrollWidth, clientWidth } = element
      // Reading the direction forces a style recalculation, so it is read only when it decides
      // anything: with horizontal overflow at offset 0. A scrolled offset is negative right to left.
      const overflowsX = scrollWidth > clientWidth + threshold
      const rtl = overflowsX && (scrollLeft < 0 || (scrollLeft === 0 && getComputedStyle(element).direction === "rtl"))
      const away = Math.abs(scrollLeft) > threshold
      const remaining = Math.abs(scrollLeft) + clientWidth < scrollWidth - threshold
      const next = {
        top: scrollTop > threshold,
        bottom: scrollTop + clientHeight < scrollHeight - threshold,
        left: rtl ? remaining : away,
        right: rtl ? away : remaining,
      }
      // Most scroll frames change no edge: then nothing is written and nothing re-renders.
      if (next.top === last.top && next.bottom === last.bottom && next.left === last.left && next.right === last.right) return
      last = next
      if (root) for (const [edge, name] of ROOT_ATTRIBUTES) root.toggleAttribute(name, next[edge])
      setEdges(next)
    }
    // One frame per burst of scroll events, scheduled once rather than cancelled and rescheduled.
    const measure = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    measure()
    element.addEventListener("scroll", measure, { passive: true })
    const resize = observeElementSizes(measure)
    resize.observe(element)
    for (const child of element.children) resize.observe(child)
    return () => {
      cancelAnimationFrame(frame)
      element.removeEventListener("scroll", measure)
      resize.disconnect()
      if (root) for (const [, name] of ROOT_ATTRIBUTES) root.removeAttribute(name)
    }
  }, [ref, threshold, rootSelector, direction])

  return edges
}
