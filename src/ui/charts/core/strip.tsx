import { useMemo } from "react"
import { barPath } from "./geometry.js"
import { seriesAttrs } from "./series.js"

export interface StripItem {
  key: string
  value: number
  /** Named content slot. */
  slot?: number | "other"
  tone?: string
}

/**
 * A part-to-whole in one line: the micro tier of pie, donut, treemap and sunburst. Segments in
 * order, separated by the 2px surface gap, the whole bar's ends rounded.
 */
export function ProportionStrip({ items, width, height, rem }: { items: readonly StripItem[]; width: number; height: number; rem: number }) {
  const thick = Math.min(0.5 * rem, height)
  const y = (height - thick) / 2
  const segments = useMemo(() => {
    const total = items.reduce((sum, item) => sum + Math.max(0, item.value), 0)
    if (total <= 0) return []
    const gap = 2
    const usable = Math.max(0, width - gap * (items.length - 1))
    let x = 0
    return items.map((item, index) => {
      const w = (Math.max(0, item.value) / total) * usable
      const first = index === 0
      const last = index === items.length - 1
      const r = thick / 2
      // Round only the outer ends of the whole strip.
      const d = first && last ? barPath(x, y, w, thick, r, "right") : first ? barPath(x, y, w, thick, r, "left") : last ? barPath(x, y, w, thick, r, "right") : barPath(x, y, w, thick, 0, "right")
      const segment = { item, d: first && last ? roundBoth(x, y, w, thick) : d }
      x += w + gap
      return segment
    })
  }, [items, width, y, thick])
  return (
    <svg className="fa-chart-svg" width={width} height={height} aria-hidden>
      {segments.map(({ item, d }) => (
        <path key={item.key} className="fa-chart-bar fa-chart-strip" data-end="right" d={d} {...stripAttrs(item)} />
      ))}
    </svg>
  )
}

function stripAttrs(item: StripItem) {
  if (item.slot === "other") return { "data-slot": "other" }
  return seriesAttrs(item.slot, item.tone)
}

function roundBoth(x: number, y: number, w: number, h: number) {
  const r = Math.min(h / 2, w / 2)
  return `M${x + r},${y}H${x + w - r}A${r},${r} 0 0 1 ${x + w - r},${y + h}H${x + r}A${r},${r} 0 0 1 ${x + r},${y}Z`
}
