import { useLayoutEffect, useState, type RefObject } from "react"
import { useElementSize } from "../../lib/use-element-size.js"

const useIsomorphicLayoutEffect = typeof window === "undefined" ? () => {} : useLayoutEffect

export interface FitOptions {
  /** Natural width of each item, in order. */
  widths: number[]
  /** Width of the box the items share. */
  available: number
  /** Gap between adjacent items (and before the overflow trigger). */
  gap: number
  /** Width of the "More" trigger that appears once anything overflows. */
  moreWidth: number
  /** Index that must stay visible (the active tab, the current crumb). -1 for none. */
  keep: number
}

/**
 * Decide which items stay inline when they do not all fit. Items keep their order: the
 * longest prefix that fits beside the overflow trigger stays, and `keep` is swapped in at
 * the end when it falls outside that prefix. Returns the visible indices, ascending.
 */
export function fitItems({ widths, available, gap, moreWidth, keep }: FitOptions): number[] {
  const all = widths.map((_, index) => index)
  if (widths.length === 0) return all
  const total = widths.reduce((sum, width) => sum + width, 0) + gap * (widths.length - 1)
  if (total <= available + 0.5) return all

  const visible: number[] = []
  let used = 0
  if (keep >= 0 && keep < widths.length) used = (widths[keep] ?? 0) + gap
  for (let index = 0; index < widths.length; index++) {
    if (index === keep) continue
    const next = used + (widths[index] ?? 0) + gap
    if (next + moreWidth > available + 0.5) break
    used = next
    visible.push(index)
  }
  if (keep >= 0 && keep < widths.length) visible.push(keep)
  return visible.toSorted((a, b) => a - b)
}

export interface ChildWidths {
  /** Natural width of each child, in order. */
  widths: number[]
  /** The row's resolved column gap (the same gap the live row uses). */
  gap: number
}

const EMPTY: ChildWidths = { widths: [], gap: 0 }

/**
 * Measure the natural width of every child of a hidden measuring row, and the row's gap.
 * The row is `width: max-content`, so any change to a child (fonts loading, density, a
 * label) changes the row's own size and triggers a re-measure before paint.
 */
export function useChildWidths(ref: RefObject<HTMLElement | null>, signature: string): ChildWidths {
  const size = useElementSize(ref)
  const [measured, setMeasured] = useState<ChildWidths>(EMPTY)

  useIsomorphicLayoutEffect(() => {
    const row = ref.current
    if (!row) return
    const widths = Array.from(row.children, (child) => child.getBoundingClientRect().width)
    const gapValue = Number.parseFloat(getComputedStyle(row).columnGap)
    const gap = Number.isFinite(gapValue) ? gapValue : 0
    setMeasured((current) =>
      current.gap === gap &&
      current.widths.length === widths.length &&
      current.widths.every((width, index) => Math.abs(width - (widths[index] ?? 0)) < 0.5)
        ? current
        : { widths, gap }
    )
  }, [ref, size.width, size.height, signature])

  return measured
}
