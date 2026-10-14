/**
 * Mark geometry in pixel space. Lines use Sparkline's monotone cubic (Fritsch–Carlson), so a
 * peak in a chart is a peak in the data and the curve is identical to the sparkline's.
 */
import { monotonePath, type Point } from "../../sparkline/index.js"

export type { Point }

const r = (value: number) => Math.round(value * 100) / 100

/** Runs of consecutive non-null points: a missing sample breaks the line, never bridges it. */
export function segments<T extends { y: number | null }>(points: readonly T[]): T[][] {
  const out: T[][] = []
  let run: T[] = []
  for (const point of points) {
    if (point.y === null || Number.isNaN(point.y)) {
      if (run.length) out.push(run)
      run = []
    } else run.push(point)
  }
  if (run.length) out.push(run)
  return out
}

/** A smooth line through pixel points. */
export function linePath(points: readonly Point[]): string {
  return monotonePath(points)
}

/**
 * The region between an upper line and a lower one (a baseline, or the series beneath in a
 * stack). Both edges are monotone, so stacked layers meet exactly.
 */
export function bandPath(upper: readonly Point[], lower: readonly Point[]): string {
  if (upper.length < 2) return ""
  const top = monotonePath(upper)
  const bottom = monotonePath(lower.toReversed())
  const first = lower[lower.length - 1]!
  return `${top}L${r(first.x)},${r(first.y)}${bottom.replace(/^M[^C L]+/, "")}Z`
}

/** Area under a line down to a flat baseline. */
export function areaPath(points: readonly Point[], baseline: number): string {
  if (points.length < 2) return ""
  const first = points[0]!
  const last = points[points.length - 1]!
  return `${monotonePath(points)}L${r(last.x)},${r(baseline)}L${r(first.x)},${r(baseline)}Z`
}

export type BarEnd = "top" | "bottom" | "right" | "left"

/**
 * A bar with its data end rounded and its baseline square (the dataviz mark spec). `end` is
 * the side away from the baseline. The radius never exceeds half the bar's thickness or its
 * length, so tiny bars stay bars.
 */
export function barPath(x: number, y: number, width: number, height: number, radius: number, end: BarEnd = "top"): string {
  const w = Math.max(0, width)
  const h = Math.max(0, height)
  const vertical = end === "top" || end === "bottom"
  const k = Math.max(0, Math.min(radius, (vertical ? w : h) / 2, vertical ? h : w))
  const x0 = r(x)
  const y0 = r(y)
  const x1 = r(x + w)
  const y1 = r(y + h)
  switch (end) {
    case "top":
      return `M${x0},${y1}V${r(y + k)}Q${x0},${y0} ${r(x + k)},${y0}H${r(x + w - k)}Q${x1},${y0} ${x1},${r(y + k)}V${y1}Z`
    case "bottom":
      return `M${x0},${y0}V${r(y + h - k)}Q${x0},${y1} ${r(x + k)},${y1}H${r(x + w - k)}Q${x1},${y1} ${x1},${r(y + h - k)}V${y0}Z`
    case "right":
      return `M${x0},${y0}H${r(x + w - k)}Q${x1},${y0} ${x1},${r(y + k)}V${r(y + h - k)}Q${x1},${y1} ${r(x + w - k)},${y1}H${x0}Z`
    case "left":
      return `M${x1},${y0}H${r(x + k)}Q${x0},${y0} ${x0},${r(y + k)}V${r(y + h - k)}Q${x0},${y1} ${r(x + k)},${y1}H${x1}Z`
    default:
      return ""
  }
}

/** A rectangle with every corner rounded (treemap tiles, heat cells). */
export function roundRectPath(x: number, y: number, width: number, height: number, radius: number): string {
  const w = Math.max(0, width)
  const h = Math.max(0, height)
  const k = Math.max(0, Math.min(radius, w / 2, h / 2))
  const x0 = r(x)
  const y0 = r(y)
  const x1 = r(x + w)
  const y1 = r(y + h)
  if (k === 0) return `M${x0},${y0}H${x1}V${y1}H${x0}Z`
  return (
    `M${r(x + k)},${y0}H${r(x + w - k)}Q${x1},${y0} ${x1},${r(y + k)}V${r(y + h - k)}` +
    `Q${x1},${y1} ${r(x + w - k)},${y1}H${r(x + k)}Q${x0},${y1} ${x0},${r(y + h - k)}V${r(y + k)}Q${x0},${y0} ${r(x + k)},${y0}Z`
  )
}

/** CSS `d` value for a path, so geometry changes can transition (values morph, R9.4). */
export const cssPath = (d: string) => (d ? `path("${d}")` : "none")
