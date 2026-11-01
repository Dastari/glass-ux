/**
 * Scales and ticks. d3-scale does the maths; this module decides how many ticks a box can
 * hold and resolves domains the same way Sparkline does (fixed, or the data's own range).
 */
import { scaleLinear, scaleTime } from "d3-scale"
import type { ValueFormat } from "./format.js"

export type Domain = readonly [min: number, max: number]
export type XValue = number | Date

/** A named value axis: what it measures, how its numbers read and, optionally, a fixed range. */
export interface ValueAxis extends ValueFormat {
  /** What the axis measures: "CPU", "Orders", "Conversion". */
  label: string
  /** Fixed value range; defaults to the data, rounded to nice ticks. */
  domain?: Domain
}

/** Pixels between y gridlines and between x labels. */
export const Y_TICK_SPACING = 44
export const X_TICK_SPACING = 88

export const toNumber = (x: XValue) => (typeof x === "number" ? x : x.getTime())
export const isTime = (xs: readonly XValue[]) => xs.length > 0 && xs[0] instanceof Date

/**
 * The y range to plot. A fixed domain wins (percentages: [0, 100]). Otherwise the data's
 * range, anchored at zero when every value is positive (so bars and areas never lie), and
 * rounded out to nice tick values.
 */
export function valueDomain(values: Iterable<number | null | undefined>, fixed?: Domain, { zero = true, ticks = 4 } = {}): Domain {
  if (fixed) return fixed
  let min = Infinity
  let max = -Infinity
  for (const value of values) {
    if (value === null || value === undefined || Number.isNaN(value)) continue
    if (value < min) min = value
    if (value > max) max = value
  }
  if (!Number.isFinite(min)) return [0, 1]
  if (zero && min > 0) min = 0
  if (zero && max < 0) max = 0
  if (min === max) max = min + 1
  const nice = scaleLinear().domain([min, max]).nice(ticks).domain() as [number, number]
  return nice
}

export interface LinearTicks {
  /** Values rendered by the chart or multi-value control. */
  values: number[]
  /** Increment used by keyboard and stepper interaction. */
  step: number
}

/**
 * About one tick per `spacing` px along `length`, at least two. With `integer` (the values
 * are whole counts) ticks never fall between whole numbers: a domain of 0–1 alerts reads
 * 0 and 1, not 0, 0.5 and 1.
 */
export function linearTicks(domain: Domain, length: number, spacing = Y_TICK_SPACING, { integer = false }: { integer?: boolean } = {}): LinearTicks {
  const count = Math.max(2, Math.floor(length / spacing))
  const scale = scaleLinear().domain(domain)
  let values = scale.ticks(count).filter((value) => value >= domain[0] - 1e-9 && value <= domain[1] + 1e-9)
  let step = values.length > 1 ? values[1]! - values[0]! : Math.abs(domain[1] - domain[0])
  if (integer && step < 1) {
    const first = Math.ceil(domain[0] - 1e-9)
    const last = Math.floor(domain[1] + 1e-9)
    values = Array.from({ length: Math.max(0, last - first + 1) }, (_, i) => first + i)
    step = 1
  }
  return { values, step }
}

const clean = (value: number) => Number(value.toPrecision(12))
const NICE_STEPS = [1, 2, 2.5, 5, 10]

/**
 * A nice range over `domain` split into exactly `intervals` equal steps, so a second axis's
 * labels can sit on the first axis's gridlines. The range only grows: nothing is cut off.
 */
export function alignedRange([lo, hi]: Domain, intervals: number, { integer = false }: { integer?: boolean } = {}): LinearTicks & { domain: Domain } {
  const n = Math.max(1, Math.round(intervals))
  const span = hi - lo || 1
  for (let exponent = Math.floor(Math.log10(span / n)); ; exponent++) {
    for (const mantissa of NICE_STEPS) {
      const step = clean(mantissa * 10 ** exponent)
      if (integer && !Number.isInteger(step)) continue
      const start = clean(Math.floor(lo / step + 1e-9) * step)
      if (start + n * step < hi - 1e-9) continue
      const values = Array.from({ length: n + 1 }, (_, index) => clean(start + index * step))
      return { values, step, domain: [values[0]!, values[n]!] }
    }
  }
}

export interface AxisInput {
  /** The axis's resolved range. */
  domain: Domain
  /** The range was fixed by the caller: it is kept as given. */
  fixed?: boolean
  /** Whole counts: ticks stay whole. */
  integer?: boolean
}

export interface AlignedAxis {
  domain: Domain
  ticks: LinearTicks
}

/**
 * Two value axes that share one set of gridlines, so each line reads a value on both. Free
 * ranges are rounded out to the number of intervals that wastes the least of the plot,
 * as many as fit. A fixed range is kept: fixed on one side, the free axis takes its intervals;
 * fixed on both, each keeps its own ticks and the second axis's labels stand between the lines.
 */
export function alignAxes(first: AxisInput, second: AxisInput, length: number, spacing = Y_TICK_SPACING): { first: AlignedAxis; second: AlignedAxis; aligned: boolean } {
  const own = (axis: AxisInput): AlignedAxis => ({ domain: axis.domain, ticks: linearTicks(axis.domain, length, spacing, { integer: axis.integer }) })
  const rounded = (axis: AxisInput, intervals: number): AlignedAxis => {
    const { domain, ...ticks } = alignedRange(axis.domain, intervals, { integer: axis.integer })
    return { domain, ticks }
  }
  const spans = ({ domain, ticks }: AlignedAxis) => ticks.values.length > 1 && Math.abs(ticks.values[0]! - domain[0]) < 1e-9 && Math.abs(ticks.values[ticks.values.length - 1]! - domain[1]) < 1e-9
  const unaligned = { first: own(first), second: own(second), aligned: false }
  if (first.fixed && second.fixed) return unaligned
  if (first.fixed || second.fixed) {
    const lead = first.fixed ? unaligned.first : unaligned.second
    if (!spans(lead)) return unaligned
    const follower = rounded(first.fixed ? second : first, lead.ticks.values.length - 1)
    return { first: first.fixed ? lead : follower, second: first.fixed ? follower : lead, aligned: true }
  }
  const waste = ({ domain }: AlignedAxis, axis: AxisInput) => (domain[1] - domain[0]) / (axis.domain[1] - axis.domain[0] || 1)
  const most = Math.max(2, Math.floor(length / spacing))
  let best: { first: AlignedAxis; second: AlignedAxis; aligned: boolean } | null = null
  let lowest = Infinity
  // From the most intervals down, so a tie keeps the denser grid.
  for (let intervals = most; intervals >= Math.min(3, most); intervals--) {
    const a = rounded(first, intervals)
    const b = rounded(second, intervals)
    const cost = waste(a, first) * waste(b, second)
    if (cost < lowest - 1e-9) {
      lowest = cost
      best = { first: a, second: b, aligned: true }
    }
  }
  return best ?? unaligned
}

/** Whether every value is a whole number (a count): ticks then stay whole too. */
export function allIntegers(values: Iterable<number | null | undefined>): boolean {
  let any = false
  for (const value of values) {
    if (value === null || value === undefined || Number.isNaN(value)) continue
    if (!Number.isInteger(value)) return false
    any = true
  }
  return any
}

/** Calendar-aligned tick dates across `domain` for an axis `length` px long, aiming for one tick per `spacing` px (default 88; at least two). */
export function timeTicks(domain: readonly [Date, Date], length: number, spacing = X_TICK_SPACING): Date[] {
  const count = Math.max(2, Math.floor(length / spacing))
  return scaleTime().domain(domain).ticks(count)
}

/** A linear map from `domain` to `range` that clamps (values outside sit on the edge). */
export function linear(domain: Domain, range: readonly [number, number]) {
  const [d0, d1] = domain
  const [r0, r1] = range
  const span = d1 - d0 || 1
  return (value: number) => {
    const t = Math.min(1, Math.max(0, (value - d0) / span))
    return r0 + t * (r1 - r0)
  }
}

/** Index of the x value nearest to `target` in an ascending array. */
export function nearestIndex(xs: readonly number[], target: number): number {
  const n = xs.length
  if (n === 0) return -1
  let lo = 0
  let hi = n - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (xs[mid]! < target) lo = mid
    else hi = mid
  }
  return Math.abs(xs[lo]! - target) <= Math.abs(xs[hi]! - target) ? lo : hi
}
