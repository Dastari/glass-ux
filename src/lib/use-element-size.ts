import { useLayoutEffect, useState, type RefObject } from "react"
import { observeElementSize } from "./resize-observer.js"

export interface ElementSize {
  /** Available width or named width tier. */
  width: number
  /** Available height used for the component’s size tier. */
  height: number
}

const useIsomorphicLayoutEffect = typeof window === "undefined" ? () => {} : useLayoutEffect

export { observeElementSize, observeElementSizes, type ElementSizeGroup, type ElementSizeListener } from "./resize-observer.js"

export interface ElementSizeOptions {
  /**
   * "content" (default): the content box. "client": the area inside any scrollbar — use
   * it to fit columns or items into a scroll container without guessing scrollbar width.
   */
  box?: "content" | "client"
}

/**
 * The size of an element, updated on resize. Use it only where CSS container queries
 * cannot decide (counting how many tabs or columns fit, collapsing an ActionBar); prefer
 * `@container` for styling. Measures before paint so the first frame is correct.
 * @example
 * const ref = useRef<HTMLDivElement>(null)
 * const { width, height } = useElementSize(ref)
 */
export function useElementSize(ref: RefObject<HTMLElement | null>, { box = "content" }: ElementSizeOptions = {}): ElementSize {
  const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 })

  useIsomorphicLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const update = (width: number, height: number) =>
      setSize((current) => (current.width === width && current.height === height ? current : { width, height }))
    const measure = (entry?: ResizeObserverEntry) => {
      if (box === "client") return update(element.clientWidth, element.clientHeight)
      const size = entry?.contentBoxSize?.[0]
      if (size) return update(size.inlineSize, size.blockSize)
      const rect = element.getBoundingClientRect()
      update(rect.width, rect.height)
    }
    measure()
    return observeElementSize(element, measure)
  }, [ref, box])

  return size
}
