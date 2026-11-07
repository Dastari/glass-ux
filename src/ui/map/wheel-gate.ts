/**
 * Whether a wheel event over a small map zooms it, or carries on scrolling the page.
 *
 * A form scrolls past a map, and the map can slide under a cursor that has not moved. A scroll that
 * began elsewhere therefore keeps scrolling across the map until the wheel has been still for
 * `settleMs`; after that the person has stopped on the map, and the wheel zooms it.
 */
export interface WheelGate {
  /** A wheel event somewhere else on the page, at `now` ms. */
  elsewhere(now: number): void
  /** A wheel event over the map, at `now` ms. True when it zooms the map. */
  over(now: number): boolean
}

/** Long enough to outlast the gaps between a trackpad's momentum events. */
export const WHEEL_SETTLE_MS = 400

export function createWheelGate(settleMs = WHEEL_SETTLE_MS): WheelGate {
  let scrolling = Number.NEGATIVE_INFINITY
  return {
    elsewhere(now) {
      scrolling = now
    },
    over(now) {
      if (now - scrolling >= settleMs) return true
      // Still the same scroll, so it keeps its hold while it crosses the map.
      scrolling = now
      return false
    },
  }
}
