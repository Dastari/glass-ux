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
  const [edges, setEdges] = useState<ScrollEdges>(NONE)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const root = rootSelector ? element.parentElement?.closest<HTMLElement>(rootSelector) : null
    let frame = 0
    const measure = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const { scrollTop, scrollHeight, clientHeight, scrollLeft, scrollWidth, clientWidth } = element
        const next = {
          top: scrollTop > threshold,
          bottom: scrollTop + clientHeight < scrollHeight - threshold,
          left: Math.abs(scrollLeft) > threshold,
          right: Math.abs(scrollLeft) + clientWidth < scrollWidth - threshold,
        }
        if (root) for (const [edge, name] of ROOT_ATTRIBUTES) root.toggleAttribute(name, next[edge])
        setEdges((current) =>
          current.top === next.top && current.bottom === next.bottom && current.left === next.left && current.right === next.right
            ? current
            : next
        )
      })
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
  }, [ref, threshold, rootSelector])

  return edges
}
