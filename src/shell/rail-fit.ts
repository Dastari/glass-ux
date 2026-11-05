/**
 * Which rail items move into its More menu. Pure, so it can be tested without layout: the
 * rail measures its children and hands the numbers here.
 */

/** A rail item that can move into More. */
export interface RailFitEntry {
  id: string
  /** Its height. */
  size: number
  /** It sits after the rail's first Spacer (settings, help): these stay longest. */
  foot: boolean
  /** It must stay visible while anything can: the current section, focus, the last one chosen. */
  pinned: boolean
}

export interface RailFitInput {
  /** The list's content height. */
  room: number
  /** The gap between its children. */
  gap: number
  /** The heights of children that never move: spacers (0) and anything that is not a Rail.Item. */
  fixed: readonly number[]
  /** The items, in document order. */
  entries: readonly RailFitEntry[]
}

/** The ids that do not fit, in document order; empty when everything does. Each item's height counts whether it is shown or not, so the answer never depends on the last one. */
export function railOverflow({ room, gap, fixed, entries }: RailFitInput): string[] {
  const fixedSize = fixed.reduce((sum, size) => sum + size, 0)
  const used = (sizes: number, count: number) => sizes + Math.max(0, count - 1) * gap
  const all = entries.reduce((sum, entry) => sum + entry.size, fixedSize)
  // Half a pixel for sub-pixel rounding at UI scales.
  if (used(all, fixed.length + entries.length) <= room + 0.5) return []
  // The More button is the height of the items it stands in for.
  let sizes = fixedSize + Math.max(0, ...entries.map((entry) => entry.size))
  let count = fixed.length + 1
  const rank = (entry: RailFitEntry) => (entry.pinned ? 0 : entry.foot ? 1 : 2)
  // Array sort is stable: within a rank, items keep their order, so the rail fills from the top.
  const priority = [...entries].sort((a, b) => rank(a) - rank(b))
  const shown = new Set<string>()
  for (const entry of priority) {
    if (used(sizes + entry.size, count + 1) > room + 0.5) break
    sizes += entry.size
    count += 1
    shown.add(entry.id)
  }
  return entries.filter((entry) => !shown.has(entry.id)).map((entry) => entry.id)
}
