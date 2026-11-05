/**
 * Which tabs move into the TabBar's More sheet. Pure, so it can be tested without layout: the
 * bar measures its width and hands the numbers here.
 */

/** A tab that can move into More. */
export interface TabBarFitEntry {
  id: string
  /** It must stay in the bar: the current destination, or the last one chosen from More. */
  pinned: boolean
}

export interface TabBarFitInput {
  /** The list's width. */
  room: number
  /** The gap between tabs. */
  gap: number
  /** The narrowest a tab can be and keep its icon's capsule and label readable. */
  tabMin: number
  /** The most tabs the bar shows, More included. */
  maxItems: number
  /** Tabs that never move: anything that is not a TabBar.Item, and a More written by the host. */
  fixed: number
  /** A More written by the host is among `fixed`, so a new one is not needed. */
  hasMore: boolean
  /** The tabs, in document order. */
  entries: readonly TabBarFitEntry[]
}

/** The ids that do not fit, in document order; empty when every tab does. At least one tab stays beside More. */
export function tabBarOverflow({ room, gap, tabMin, maxItems, fixed, hasMore, entries }: TabBarFitInput): string[] {
  // Half a pixel for sub-pixel rounding at UI scales.
  const capacity = Math.min(maxItems, Math.floor((room + gap + 0.5) / (tabMin + gap)))
  if (entries.length + fixed <= capacity) return []
  const count = Math.max(1, capacity - fixed - (hasMore ? 0 : 1))
  const pinned = entries.filter((entry) => entry.pinned)
  const rest = entries.filter((entry) => !entry.pinned)
  const shown = new Set([...pinned, ...rest].slice(0, count).map((entry) => entry.id))
  return entries.filter((entry) => !shown.has(entry.id)).map((entry) => entry.id)
}
