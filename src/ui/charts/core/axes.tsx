/**
 * Cartesian chrome: the plot inset, hairline gridlines and caption-sized tick labels.
 * Gridlines are horizontal only and recessive (--chart-grid); labels use the caption role in
 * fg-subtle with tabular figures. There are no tick marks and no axis boxes.
 */
import type { ReactNode } from "react"
import { cx } from "../../../lib/cx.js"
import { formatTick, type ValueFormat } from "./format.js"
import type { ChartTier } from "./tier.js"

/** Caption glyph advance for tabular figures, in em — for estimating label widths. */
const CHAR_EM = 0.62
/** The caption role in rem (tokens.css --type-caption-size / -line). */
const CAPTION_REM = 0.75
const CAPTION_LINE_REM = 1

export const captionPx = (rem: number) => CAPTION_REM * rem
export const captionLinePx = (rem: number) => CAPTION_LINE_REM * rem
export const textWidth = (text: string, rem: number) => text.length * CHAR_EM * captionPx(rem)

export interface Inset {
  top: number
  right: number
  bottom: number
  left: number
}

export interface CartesianOptions {
  /** Named size tier or automatic container-based tier selection. */
  tier: ChartTier
  /** Current pixel size of one rem used for layout measurement. */
  rem: number
  /** The widest y label, when the tier shows a y axis. */
  yLabels?: readonly string[]
  /** Reserve a row for x labels. */
  xAxis?: boolean
  /** Extra room on the right for end labels (threshold names, direct labels). */
  right?: number
}

/** Half the end dot plus its ring: nothing at the plot edge is ever cut off. */
export const dotInset = (rem: number) => 0.3125 * rem

export function cartesianInset({ tier, rem, yLabels, xAxis = false, right = 0 }: CartesianOptions): Inset {
  const pad = dotInset(rem)
  if (tier === "micro") return { top: pad, right: pad, bottom: pad, left: pad }
  const yWidth = tier === "full" && yLabels?.length ? Math.max(...yLabels.map((label) => textWidth(label, rem))) + 0.5 * rem : 0
  return {
    top: tier === "full" ? 0.5 * rem : pad,
    right: Math.max(pad, right),
    bottom: xAxis ? captionLinePx(rem) + 0.375 * rem : pad,
    left: Math.max(pad, yWidth),
  }
}

export interface YAxisProps {
  ticks: readonly number[]
  /** Increment used by keyboard and stepper interaction. */
  step: number
  /** Vertical coordinate or accessor. */
  y: (value: number) => number
  x0: number
  x1: number
  /** Draw labels in the left gutter (full tier). */
  labels?: boolean
  /** Value formatter or formatting options. */
  format?: ValueFormat
  /** The value of the baseline (drawn stronger), usually 0. */
  baseline?: number
  /** px between a label and the plot. */
  gap?: number
}

const crisp = (value: number) => Math.round(value) + 0.5

/** Horizontal gridlines (SVG). Pair with YLabels for the gutter text. */
export function YGrid({ ticks, y, x0, x1, baseline }: Pick<YAxisProps, "ticks" | "y" | "x0" | "x1" | "baseline">) {
  return (
    <g className="fa-chart-axis" data-axis="y" aria-hidden>
      {ticks.map((tick) => {
        const py = crisp(y(tick))
        return <line key={tick} className="fa-chart-grid" data-baseline={tick === baseline ? "" : undefined} x1={x0} x2={x1} y1={py} y2={py} />
      })}
    </g>
  )
}

/** The y labels, right-aligned in the gutter beside each gridline (HTML, inside .fa-chart-labels). */
export function YLabels({ ticks, step, y, x0, format, gap = 8 }: Pick<YAxisProps, "ticks" | "step" | "y" | "x0" | "format" | "gap">) {
  return (
    <>
      {ticks.map((tick) => (
        <ChartText key={tick} className="fa-chart-tick" data-axis="y" x={x0 - gap} y={crisp(y(tick))} anchor="end">
          {formatTick(tick, step, format)}
        </ChartText>
      ))}
    </>
  )
}

export type TextAnchor = "start" | "middle" | "end"
export type TextBaseline = "top" | "middle" | "bottom"

/**
 * A label placed at a point of the plot. HTML rather than SVG text, so it takes the type
 * roles, truncates with a real ellipsis when given a width (R8), and carries a halo over marks.
 */
export function ChartText({
  x,
  y,
  anchor = "start",
  baseline = "middle",
  width,
  className,
  children,
  ...rest
}: {
  /** Horizontal coordinate or accessor. */
  x: number
  /** Vertical coordinate or accessor. */
  y: number
  /** Anchor used to position floating content. */
  anchor?: TextAnchor
  baseline?: TextBaseline
  /** Truncate to this width (px). */
  width?: number
  className?: string
  children: ReactNode
} & Record<`data-${string}`, string | undefined>) {
  return (
    <span {...rest} className={cx("fa-chart-text", className)} data-anchor={anchor} data-baseline={baseline} style={{ left: x, top: y, maxWidth: width }}>
      {children}
    </span>
  )
}

export interface XTick {
  /** Horizontal coordinate or accessor. */
  x: number
  label: string
}

/**
 * Labels along the bottom (HTML, inside .fa-chart-labels). Labels that would collide are
 * dropped, and the first and last are pinned inside the plot so nothing overhangs the box.
 */
export function XLabels({ ticks, y, x0, x1, rem }: { ticks: readonly XTick[]; y: number; x0: number; x1: number; rem: number }) {
  const gap = 0.75 * rem
  const placed: Array<XTick & { anchor: TextAnchor }> = []
  let lastEnd = -Infinity
  for (const tick of ticks) {
    const width = textWidth(tick.label, rem)
    let anchor: TextAnchor = "middle"
    let start = tick.x - width / 2
    if (start < x0) {
      anchor = "start"
      start = Math.max(x0, tick.x)
    }
    if (start + width > x1) {
      anchor = "end"
      start = Math.min(tick.x, x1) - width
    }
    if (start < lastEnd + gap || start < x0 - 0.5) continue
    lastEnd = start + width
    placed.push({ ...tick, x: anchor === "start" ? Math.max(x0, tick.x) : anchor === "end" ? Math.min(x1, tick.x) : tick.x, anchor })
  }
  return (
    <>
      {placed.map((tick) => (
        <ChartText key={`${tick.x}-${tick.label}`} className="fa-chart-tick" data-axis="x" x={tick.x} y={y} anchor={tick.anchor} baseline="top">
          {tick.label}
        </ChartText>
      ))}
    </>
  )
}
