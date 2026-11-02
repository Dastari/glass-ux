import type { CSSProperties } from "react"
import { cssPath, linePath, segments, type Point } from "../core/geometry.js"
import { useStoreValue, type HoverStore } from "../core/hover.js"
import { Swatch, type SwatchShape } from "../core/legend.js"
import { seriesAttrs } from "../core/series.js"

/** One line series over the categories, in plot px. */
export interface ComboLine {
  key: string
  /** Named content slot. */
  slot: number
  tone?: string
  /** One smooth path per run of readings: a missing value breaks the line. */
  paths: string[]
  /** A reading alone between gaps, which no path can draw. */
  lone: Point[]
  /** The latest reading's position, for the end dot. */
  end: Point | null
  /** One position per category; null where there is no reading. */
  points: (Point | null)[]
}

/** Lay out one line series at band centres. */
export function comboLine(key: string, slot: number, tone: string | undefined, data: readonly (number | null)[], count: number, x: (index: number) => number, y: (value: number) => number): ComboLine {
  const points = Array.from({ length: count }, (_, index) => {
    const value = data[index]
    return value === null || value === undefined || Number.isNaN(value) ? null : { x: x(index), y: y(value) }
  })
  const runs = segments(points.map((point) => ({ x: point?.x ?? 0, y: point ? point.y : null })))
  const whole = runs.filter((run) => run.length > 1).map((run) => run.map((p) => ({ x: p.x, y: p.y as number })))
  const lone = runs.filter((run) => run.length === 1).map((run) => ({ x: run[0]!.x, y: run[0]!.y as number }))
  return { key, slot, tone, paths: whole.map(linePath), lone, end: points.findLast(Boolean) ?? null, points }
}

/** Lines drawn over the columns, each edged in the surface colour where it crosses them. */
export function ComboLines({ lines, rem }: { lines: readonly ComboLine[]; rem: number }) {
  return (
    <>
      {lines.map(({ key, slot, tone, paths, lone, end }) => (
        <g key={key} className="fa-chart-series" {...seriesAttrs(slot, tone)}>
          {paths.map((d, index) => (
            <path key={`h${index}`} className="fa-chart-line-halo" d={d} style={{ d: cssPath(d) } as CSSProperties} />
          ))}
          {paths.map((d, index) => (
            <path key={`l${index}`} className="fa-chart-line" data-enter="" pathLength={1} d={d} style={{ d: cssPath(d) } as CSSProperties} />
          ))}
          {lone.map((point) => (
            <circle key={point.x} className="fa-chart-dot" data-enter="" cx={point.x} cy={point.y} r={0.25 * rem} />
          ))}
          {end ? <circle className="fa-chart-dot fa-chart-end" data-enter="" cx={end.x} cy={end.y} r={0.3125 * rem} /> : null}
        </g>
      ))}
    </>
  )
}

/** The dots at the cursor's category. */
export function ComboHover({ store, lines, width, height, rem }: {
  /** External store observed by the component. */
  store: HoverStore
  lines: readonly ComboLine[]
  /** Available width or named width tier. */
  width: number
  /** Available height used for the component’s size tier. */
  height: number
  /** Current pixel size of one rem used for layout measurement. */
  rem: number
}) {
  const hover = useStoreValue(store)
  if (!hover || !lines.length) return null
  return (
    <svg className="fa-chart-overlay" width={width} height={height} aria-hidden>
      {lines.map(({ key, slot, tone, points }) => {
        const point = points[hover.index]
        return point ? <circle key={key} className="fa-chart-dot" cx={point.x} cy={point.y} r={0.3125 * rem} {...seriesAttrs(slot, tone)} /> : null
      })}
    </svg>
  )
}

export interface AxisKey {
  key: string
  /** Named content slot. */
  slot: number
  tone?: string
  /** Named shape of the control or marker. */
  shape: SwatchShape
  /** The series is hidden: its key turns hollow, as the legend's does. */
  off: boolean
}

/**
 * An axis's name above its gutter, led by a key for each series it carries, so a reader can
 * tell which axis a mark reads against without going through the legend.
 */
export function AxisName({ label, side, keys, x, width }: {
  label: string
  /** Which gutter it stands over. */
  side: "left" | "right"
  /** The series the axis carries. */
  keys: readonly AxisKey[]
  /** The gutter's outer edge, in plot px. */
  x: number
  /** The room it may take, in px. */
  width: number
}) {
  return (
    <span className="fa-chart-axis-name" data-side={side} style={side === "left" ? { left: x, top: 0, maxWidth: width } : { right: x, top: 0, maxWidth: width }}>
      {keys.map((item) => (
        <Swatch key={item.key} slot={item.slot} tone={item.tone} shape={item.shape} hidden={item.off} />
      ))}
      <span className="fa-chart-axis-name-text">{label}</span>
    </span>
  )
}
