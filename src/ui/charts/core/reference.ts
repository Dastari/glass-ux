/**
 * Reference lines, bands and event markers: the values and times a reader measures the data
 * against. Thresholds and bands sit on the value axis, markers on the x axis. This module is
 * the geometry and wording; reference.tsx draws them.
 *
 * Placement keeps every label inside the plot: a threshold's label sits at the line's end,
 * below the line or above it when below would collide with another label, the plot's bottom
 * or the series' latest point; a band's label sits at the band's start; a marker's label
 * beside its rule, dropped when it would overlap an earlier one. A dropped label is never
 * lost: every reference is in the chart's accessible description and its table note.
 */
import type { ChartTone } from "./series.js"
import type { XValue } from "./scales.js"

/** A reference's colour: `neutral` for a target, a limit or an average; a status tone only when crossing it means that state. */
export type ReferenceTone = "neutral" | "success" | "warning" | "danger" | "info"

/** A line across the plot at a value: a limit, a target, an SLA. */
export interface Threshold {
  /** Where the line sits on the value axis. */
  value: number
  /**
   * `neutral` (the default) for a target, a limit or an average. A status tone only when a
   * value past the line is in that state: with one series, the line takes the tone above it,
   * and without `bands` the range up to the next status threshold is shaded.
   */
  tone?: ReferenceTone
  /** "Warning", "Target", "SLA". Shown at the line's end with its value. */
  label?: string
  /** Draw the line dashed: a soft reference (an average, a forecast) rather than a limit. */
  dashed?: boolean
}

/** A shaded range on the value axis: a normal operating range, a comfort zone. */
export interface ReferenceBand {
  /** One end of the range on the value axis. */
  from: number
  /** The other end; `from` and `to` may come in either order. */
  to: number
  /** "Normal range". Shown at the band's start when the band is tall enough. */
  label?: string
  /** `neutral` (the default) or a status tone when values inside mean that state. */
  tone?: ReferenceTone
}

/** An event on the x axis: a deploy, an incident, a restart. */
export interface Marker {
  /** Horizontal coordinate or accessor. */
  x: XValue
  /** "Agent restarted", "Patch Tuesday". */
  label: string
  /** A status tone when the event is that state (an incident); otherwise the neutral rule. */
  tone?: ChartTone
  /** A short line shown with the label in the tooltip and the table: "Version 4.2.1". */
  detail?: string
}

/** The status thresholds, lowest first: the ones that recolour a single series. */
export function statusThresholds(thresholds: readonly Threshold[] | undefined): Threshold[] {
  return (thresholds ?? []).filter((item) => item.tone !== undefined && item.tone !== "neutral").toSorted((a, b) => a.value - b.value)
}

/**
 * The bands to draw: the caller's `bands`, or without them (undefined) the range from each
 * status threshold up to the next status threshold or the top of the domain.
 */
export function resolveBands(thresholds: readonly Threshold[] | undefined, bands: readonly ReferenceBand[] | undefined, top: number): ReferenceBand[] {
  if (bands) return bands.map((band) => ({ ...band, from: Math.min(band.from, band.to), to: Math.max(band.from, band.to) }))
  const status = statusThresholds(thresholds)
  return status.map((threshold, index) => ({ from: threshold.value, to: status[index + 1]?.value ?? Math.max(top, threshold.value), tone: threshold.tone }))
}

/** The tone a value is in: the highest status threshold at or below it. */
export function toneOf(status: readonly Threshold[], value: number | null | undefined): ReferenceTone | undefined {
  if (value === null || value === undefined) return undefined
  let tone: ReferenceTone | undefined
  for (const threshold of status) if (value >= threshold.value) tone = threshold.tone
  return tone
}

export interface LineLabelInput {
  key: string
  /** The line's y, px. */
  y: number
}

export interface LineLabelPlacement {
  key: string
  /** The label's top edge, px. */
  top: number
  /** Below the line or above it. */
  side: "below" | "above"
}

export interface LineLabelOptions {
  /** The highest a label may start (the plot's top, below any marker labels). */
  top: number
  /** The lowest a label may end (the plot's bottom, above the x labels). */
  bottom: number
  /** A label's height. */
  lineHeight: number
  /** Space between a line and its label. */
  gap: number
  /** y positions a label should keep clear of where it can (the latest point beside the labels). */
  avoid?: readonly number[]
  /** How far from an avoided point counts as a collision. */
  avoidRadius?: number
}

/**
 * Where each threshold label goes, top to bottom: below its line by default, above it when
 * below would leave the plot or overlap a label already placed, and on whichever side keeps
 * clear of the avoided points when both fit. A label that fits on neither side is left out.
 */
export function placeLineLabels(lines: readonly LineLabelInput[], options: LineLabelOptions): LineLabelPlacement[] {
  const { top, bottom, lineHeight, gap, avoid = [], avoidRadius = 0 } = options
  const placed: LineLabelPlacement[] = []
  const overlaps = (start: number) => placed.some((other) => start < other.top + lineHeight && start + lineHeight > other.top)
  const crowds = (start: number) => avoid.some((y) => y + avoidRadius > start && y - avoidRadius < start + lineHeight)
  for (const line of lines.toSorted((a, b) => a.y - b.y)) {
    const below = line.y + gap
    const above = line.y - gap - lineHeight
    const fits = (start: number) => start >= top - 0.5 && start + lineHeight <= bottom + 0.5 && !overlaps(start)
    const options = [
      { side: "below" as const, start: below },
      { side: "above" as const, start: above },
    ].filter((option) => fits(option.start))
    if (!options.length) continue
    const choice = options.find((option) => !crowds(option.start)) ?? options[0]!
    placed.push({ key: line.key, top: choice.start, side: choice.side })
  }
  return placed
}

export interface MarkerLabelInput {
  key: string
  /** The rule's x, px. */
  x: number
  /** The label's estimated width, px. */
  width: number
}

export interface MarkerLabelPlacement {
  key: string
  /** Where the label is anchored, px. */
  x: number
  anchor: "start" | "end"
  /** The room the label may take before it truncates, px. */
  width: number
}

/**
 * Marker labels left to right: after the rule, or before it when the label would run past
 * the plot's end. A label that would overlap the one before it is left out (the tooltip and
 * the table still carry it).
 */
export function placeMarkerLabels(markers: readonly MarkerLabelInput[], x0: number, x1: number, gap: number): MarkerLabelPlacement[] {
  const placed: MarkerLabelPlacement[] = []
  let lastEnd = -Infinity
  for (const marker of markers.toSorted((a, b) => a.x - b.x)) {
    if (marker.x < x0 - 0.5 || marker.x > x1 + 0.5) continue
    const after = { start: marker.x + gap, end: marker.x + gap + marker.width }
    const useAfter = after.end <= x1 || marker.x - gap - marker.width < x0
    const start = useAfter ? after.start : marker.x - gap - marker.width
    const end = useAfter ? Math.min(x1, after.end) : marker.x - gap
    if (start < lastEnd + gap) continue
    lastEnd = end
    placed.push({ key: marker.key, x: useAfter ? after.start : marker.x - gap, anchor: useAfter ? "start" : "end", width: Math.max(0, useAfter ? x1 - after.start : marker.x - gap - x0) })
  }
  return placed
}

/** Stable keys for references (two thresholds may share a value). */
export const thresholdKey = (threshold: Threshold, index: number) => `t${index}-${threshold.value}`
export const bandKey = (band: ReferenceBand, index: number) => `b${index}-${band.from}-${band.to}`
export const markerKey = (marker: Marker, index: number) => `m${index}-${typeof marker.x === "number" ? marker.x : marker.x.getTime()}`
