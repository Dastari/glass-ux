import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react"
import { createPortal } from "react-dom"
import { useDirection } from "../../../lib/locale/direction.js"
import { popupContainer } from "../../../lib/popup-container.js"
import { seriesAttrs } from "./series.js"
import { useStoreValue, type Hover, type HoverStore } from "./hover.js"
import type { SwatchShape } from "./legend.js"

export interface TooltipRow {
  key: string
  label: string
  value: string
  /** Named content slot. */
  slot?: number
  tone?: string
  /** Named shape of the control or marker. */
  shape?: SwatchShape
  /** A quieter trailing figure: a share, a delta. */
  detail?: string
  /** The row under the pointer, when the chart knows it. */
  active?: boolean
}

export interface ChartTooltipProps {
  /** External store observed by the component. */
  store: HoverStore
  /** The plot, for its mode/palette island. */
  anchor: RefObject<HTMLElement | null>
  /** Build the content for a hover; return null for none. */
  children: (hover: Hover) => ReactNode
}

const GAP = 14
const EDGE = 8

/**
 * The floating readout at a chart's cursor, for one series or several and for per-mark
 * charts: a glass overlay that follows the pointer (or the keyboard cursor) and lists every
 * visible series at that position — values lead, labels follow, each keyed by a short line
 * of the series colour. It is portalled to the body (an overlay is never a blurred layer
 * inside the panel's blurred layer, R4.2), carries the plot's mode and palette islands, and
 * never takes the pointer.
 */
export function ChartTooltip({ store, anchor, children }: ChartTooltipProps) {
  const direction = useDirection()
  const hover = useStoreValue(store)
  const tipRef = useRef<HTMLDivElement>(null)
  const [place, setPlace] = useState<{ left: number; top: number } | null>(null)
  const content = hover ? children(hover) : null

  useLayoutEffect(() => {
    const tip = tipRef.current
    if (!hover || !tip) {
      setPlace(null)
      return
    }
    const box = tip.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    let left = hover.x + GAP
    if (left + box.width > vw - EDGE) left = hover.x - GAP - box.width
    left = Math.max(EDGE, left)
    const top = Math.min(vh - EDGE - box.height, Math.max(EDGE, hover.y - box.height / 2))
    setPlace((current) => (current && current.left === left && current.top === top ? current : { left, top }))
  }, [hover])

  if (!hover || !content || typeof document === "undefined") return null
  const island = anchor.current?.parentElement?.closest<HTMLElement>("[data-mode]:not(html)")
  const paletteIsland = anchor.current?.parentElement?.closest<HTMLElement>("[data-palette]:not(html)")
  return createPortal(
    <div
      ref={tipRef}
      dir={direction}
      className="fa-chart-tip glass-overlay"
      data-mode={island?.dataset.mode}
      data-palette={paletteIsland?.dataset.palette}
      data-placed={place ? "" : undefined}
      style={place ? { left: place.left, top: place.top } : undefined}
      aria-hidden
    >
      {content}
    </div>,
    popupContainer() ?? document.body
  )
}

/** The standard tooltip body: a heading (the x or category), then one row per series. */
export function TooltipBody({ title, meta, rows, footer }: {
  title?: ReactNode
  /** Secondary text beside the title in the heading (a time range, a unit). */
  meta?: ReactNode
  /** One row per series: swatch, value, label and optional detail, in order. */
  rows: readonly TooltipRow[]
  /** Content below the rows (a total, a hint); omitted when empty. */
  footer?: ReactNode
}) {
  return (
    <>
      {title || meta ? (
        <div className="fa-chart-tip-head">
          {title ? <span className="fa-chart-tip-title">{title}</span> : null}
          {meta ? <span className="fa-chart-tip-meta">{meta}</span> : null}
        </div>
      ) : null}
      <ul className="fa-chart-tip-rows">
        {rows.map((row) => (
          <li key={row.key} className="fa-chart-tip-row" data-active={row.active ? "" : undefined}>
            <span className="fa-chart-key" data-shape={row.shape ?? "line"} {...seriesAttrs(row.slot, row.tone)} />
            <span className="fa-chart-tip-value">{row.value}</span>
            <span className="fa-chart-tip-label">{row.label}</span>
            {row.detail ? <span className="fa-chart-tip-detail">{row.detail}</span> : null}
          </li>
        ))}
      </ul>
      {footer ? <div className="fa-chart-tip-foot">{footer}</div> : null}
    </>
  )
}
