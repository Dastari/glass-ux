/**
 * Chart tiers (R7.2). The box decides — width AND height — never the viewport or a prop.
 * The thresholds match Metric's container queries exactly, so a chart and a Metric in the
 * same box always agree:
 *
 *   micro    height < 5rem or width < 10rem   a row or header: marks only, no axes
 *   compact  otherwise                          a tile: marks, minimal axes, passive
 *   full     width ≥ 20rem and height ≥ 12rem   a pane: axes, gridlines, legend, crosshair,
 *                                               tooltip and the table view
 */
export type ChartTier = "micro" | "compact" | "full"

export interface TierRule {
  /** Below this height (rem) the chart is micro. */
  microHeight: number
  /** Below this width (rem) the chart is micro. */
  microWidth: number
  /** At or above this width AND fullHeight (rem) the chart is full. */
  fullWidth: number
  fullHeight: number
}

export const DEFAULT_TIERS: TierRule = { microHeight: 5, microWidth: 10, fullWidth: 20, fullHeight: 12 }

export function chartTier(width: number, height: number, rem = 16, rule: TierRule = DEFAULT_TIERS): ChartTier {
  const w = width / rem
  const h = height / rem
  if (h < rule.microHeight || w < rule.microWidth) return "micro"
  if (w >= rule.fullWidth && h >= rule.fullHeight) return "full"
  return "compact"
}

/** The root font size in px (the knobs scale rem; charts lay out in px). */
export function remPx(): number {
  if (typeof window === "undefined") return 16
  return Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
}
