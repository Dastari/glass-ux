/**
 * A tiny external store for the hover/focus position. The plot writes to it on pointer move
 * or arrow keys; only the components that show the position (crosshair, highlight, tooltip,
 * readout) subscribe — the marks never re-render on hover.
 */
import { useState, useSyncExternalStore } from "react"

export interface Store<T> {
  get: () => T
  /** Replaces the value and notifies subscribers; does nothing when `next` is the same value (`Object.is`). */
  set: (next: T) => void
  subscribe: (listener: () => void) => () => void
}

/** Creates a store holding `initial`; subscribers are notified only when `set` receives a different value. */
export function createStore<T>(initial: T): Store<T> {
  let value = initial
  const listeners = new Set<() => void>()
  return {
    get: () => value,
    set(next) {
      if (Object.is(next, value)) return
      value = next
      for (const listener of listeners) listener()
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

/** Subscribes the component to `store` and returns its current value, re-rendering when it changes. */
export function useStoreValue<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get)
}

/** What is under the pointer (or the keyboard cursor). `x`/`y` are viewport coordinates. */
export interface Hover {
  /** Index of the current item. */
  index: number
  /** A second index for 2-D marks (heatmap column, series within a band). */
  sub?: number
  /** Horizontal coordinate or accessor. */
  x: number
  /** Vertical coordinate or accessor. */
  y: number
  via: "pointer" | "keyboard"
}

export type HoverStore = Store<Hover | null>

/** Returns a hover store, created once per component and starting at `null` (nothing hovered). */
export function useHoverStore(): HoverStore {
  const [store] = useState(() => createStore<Hover | null>(null))
  return store
}
