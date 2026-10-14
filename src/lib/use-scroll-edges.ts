import { useEffect, useState, type RefObject } from "react"

export interface ScrollEdges {
  /** Content is scrolled away from the top (show the header edge). */
  top: boolean
  /** More content below (show the footer edge). */
  bottom: boolean
  left: boolean
  right: boolean
}

const NONE: ScrollEdges = { top: false, bottom: false, left: false, right: false }

/**
 * Track which edges of a scroll container have content beyond them. R5.8: a header or
 * footer shows its hairline only while content scrolls beneath it. Apply the result as
 * `data-scrolled-top` / `data-scrolled-bottom` on the frame.
 */
export function useScrollEdges(ref: RefObject<HTMLElement | null>, threshold = 1): ScrollEdges {
  const [edges, setEdges] = useState<ScrollEdges>(NONE)

  useEffect(() => {
    const element = ref.current
    if (!element) return
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
        setEdges((current) =>
          current.top === next.top && current.bottom === next.bottom && current.left === next.left && current.right === next.right
            ? current
            : next
        )
      })
    }
    measure()
    element.addEventListener("scroll", measure, { passive: true })
    const resize = new ResizeObserver(measure)
    resize.observe(element)
    for (const child of element.children) resize.observe(child)
    return () => {
      cancelAnimationFrame(frame)
      element.removeEventListener("scroll", measure)
      resize.disconnect()
    }
  }, [ref, threshold])

  return edges
}
