import { useLayoutEffect, useState, type RefObject } from "react"

export interface ElementSize {
  /** Available width or named width tier. */
  width: number
  /** Available height used for the component’s size tier. */
  height: number
}

const useIsomorphicLayoutEffect = typeof window === "undefined" ? () => {} : useLayoutEffect

/** Called with the element's latest ResizeObserver entry. */
export type ElementSizeListener = (entry: ResizeObserverEntry) => void

interface SharedObserver {
  constructor: typeof ResizeObserver
  observer: ResizeObserver
  listeners: Map<Element, Set<ElementSizeListener>>
}

let shared: SharedObserver | null = null

/** The shared observer, recreated if the global constructor was replaced (test stubs, polyfills). */
function sharedObserver(): SharedObserver {
  if (shared?.constructor === ResizeObserver) return shared
  const listeners = new Map<Element, Set<ElementSizeListener>>()
  const observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const subscribed = listeners.get(entry.target)
      if (!subscribed) continue
      for (const listener of subscribed) listener(entry)
    }
  })
  shared = { constructor: ResizeObserver, observer, listeners }
  return shared
}

/**
 * Subscribe to an element's size through one ResizeObserver shared by every caller, so a
 * page with many measured elements delivers all of a frame's changes in a single
 * callback. The listener receives an initial entry once the element has been laid out,
 * then one per size change. Returns an unsubscribe function. Without ResizeObserver
 * (server rendering, some test environments) it does nothing.
 */
export function observeElementSize(element: Element, listener: ElementSizeListener): () => void {
  if (typeof ResizeObserver === "undefined") return () => {}
  const { observer, listeners } = sharedObserver()
  let subscribed = listeners.get(element)
  if (subscribed) {
    // Re-observing resets the reported size, so the new listener receives its initial entry.
    observer.unobserve?.(element)
  } else {
    subscribed = new Set()
    listeners.set(element, subscribed)
  }
  subscribed.add(listener)
  observer.observe(element)
  return () => {
    const current = listeners.get(element)
    if (!current?.delete(listener) || current.size) return
    listeners.delete(element)
    observer.unobserve?.(element)
  }
}

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
 * @container for styling. Measures before paint so the first frame is correct.
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
