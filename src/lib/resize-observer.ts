/** Called with the element's latest ResizeObserver entry. */
export type ElementSizeListener = (entry: ResizeObserverEntry) => void

interface SharedObserver {
  /** function Object() { [native code] } */
  constructor: typeof ResizeObserver
  observer: ResizeObserver
  listeners: Map<Element, Set<ElementSizeListener>>
  /** Group callbacks marked during the current delivery, run once each after it. */
  pending: Set<() => void>
}

let shared: SharedObserver | null = null

/** Run a listener so that one failing subscriber does not stop the others. */
function run(callback: () => void) {
  try {
    callback()
  } catch (error) {
    queueMicrotask(() => {
      throw error
    })
  }
}

/** The shared observer, recreated if the global constructor was replaced (test stubs, polyfills). */
function sharedObserver(): SharedObserver {
  if (shared?.constructor === ResizeObserver) return shared
  const listeners = new Map<Element, Set<ElementSizeListener>>()
  const pending = new Set<() => void>()
  const observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const subscribed = listeners.get(entry.target)
      if (!subscribed) continue
      // A copy: a listener may subscribe or unsubscribe while the set is iterated.
      for (const listener of Array.from(subscribed)) run(() => listener(entry))
    }
    const callbacks = [...pending]
    pending.clear()
    for (const callback of callbacks) run(callback)
  })
  shared = { constructor: ResizeObserver, observer, listeners, pending }
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

/** A set of observed elements sharing one callback; see {@link observeElementSizes}. */
export interface ElementSizeGroup {
  /** Observe an element (again observing an element already in the group does nothing). */
  observe(element: Element): void
  /** Stop observing one element. */
  unobserve(element: Element): void
  /** Stop observing every element and drop a pending call. The group can observe again. */
  disconnect(): void
}

/**
 * Observe several elements with one callback, called once per ResizeObserver delivery in
 * which any of them changed size (including their initial entries). It replaces a
 * component-owned `new ResizeObserver(callback)` with the shared observer, keeping its
 * once-per-delivery timing.
 */
export function observeElementSizes(callback: () => void): ElementSizeGroup {
  const subscriptions = new Map<Element, () => void>()
  // A fresh function per group, so two groups with the same callback each run it.
  const flush = () => callback()
  const notify = () => sharedObserver().pending.add(flush)
  return {
    observe(element) {
      if (subscriptions.has(element)) return
      subscriptions.set(element, observeElementSize(element, notify))
    },
    unobserve(element) {
      subscriptions.get(element)?.()
      subscriptions.delete(element)
    },
    disconnect() {
      for (const unsubscribe of subscriptions.values()) unsubscribe()
      subscriptions.clear()
      shared?.pending.delete(flush)
    },
  }
}
