import { bin as d3bin, extent } from "d3-array"
import { memo, useMemo, useRef, useState, type ReactNode } from "react"
import { BarChart } from "../bar/bar-chart.js"
import { cartesianInset, ChartText, XLabels, YGrid, YLabels } from "../core/axes.js"
import { ChartFrame, type ChartCommonProps, type PlotBox } from "../core/frame.js"
import { formatTick, formatValue, type LocalizedFormat, type ValueFormat } from "../core/format.js"
import { useLocale } from "../../../lib/locale/use-locale.js"
import { HitLayer } from "../core/hit.js"
import { useHoverStore, useStoreValue, type HoverStore } from "../core/hover.js"
import { ChartLegend, type LegendItem } from "../core/legend.js"
import { linear, linearTicks, valueDomain, type Domain } from "../core/scales.js"
import { seriesAttrs, slotFor, type ChartTone } from "../core/series.js"
import type { ChartTableModel } from "../core/table.js"
import type { ChartTier } from "../core/tier.js"
import { ChartTooltip, TooltipBody } from "../core/tooltip.js"
import { LiveRegion } from "../line/line-chart.js"

// ── Scatter ───────────────────────────────────────────────────────────────────────────────

export interface ScatterPoint {
  /** Horizontal coordinate or accessor. */
  x: number
  /** Vertical coordinate or accessor. */
  y: number
  /** What the point is: "NST-C106". */
  label?: string
}

export interface ScatterSeries {
  key: string
  label: string
  /** Geographical or chart points. */
  points: readonly ScatterPoint[]
  /** Named content slot. */
  slot?: number
  tone?: ChartTone
}

export interface ScatterAxis extends ValueFormat {
  /** "CPU", "Memory". */
  label: string
  domain?: Domain
}

type LocalizedAxis = ScatterAxis & LocalizedFormat

export interface ScatterChartProps extends ChartCommonProps {
  /** Three series at most: any two dots can sit side by side, so every pair must differ. */
  series: readonly ScatterSeries[]
  /** Horizontal coordinate or accessor. */
  x: ScatterAxis
  /** Vertical coordinate or accessor. */
  y: ScatterAxis
}

interface Dot {
  /** Chart series with stable identifiers, labels and typed values. */
  series: ScatterSeries
  /** Named content slot. */
  slot: number
  point: ScatterPoint
  px: number
  py: number
}

/**
 * Two measures per item — CPU against memory for every endpoint. 8px dots ringed in the
 * surface colour so overlaps stay legible; the pointer only has to be nearest, not on the dot.
 *
 *   micro    the dots alone
 *   compact  the dots over a baseline, passive legend
 *   full     both axes with their names, the interactive legend, nearest-dot tooltip, and the
 *            arrow keys stepping through dots left to right
 */
export function ScatterChart(props: ScatterChartProps) {
  const { label, title, state = "ready", series, x: xAxis, y: yAxis, ...rest } = props
  const locale = useLocale(props.locale)
  // Each axis formats its numbers in the chart's locale.
  const x: LocalizedAxis = useMemo(() => ({ ...xAxis, locale }), [xAxis, locale])
  const y: LocalizedAxis = useMemo(() => ({ ...yAxis, locale }), [yAxis, locale])
  const [hidden, setHidden] = useState<ReadonlySet<string>>(() => new Set())
  const store = useHoverStore()
  const slots = useMemo(() => new Map(series.map((item, index) => [item.key, slotFor(index, item.slot)])), [series])
  const visible = useMemo(() => series.filter((item) => !hidden.has(item.key)), [series, hidden])
  const table = useMemo<ChartTableModel>(
    () => ({
      columns: [
        { key: "label", label: "Item" },
        { key: "series", label: "Series" },
        { key: "x", label: x.label, numeric: true },
        { key: "y", label: y.label, numeric: true },
      ],
      rows: series.flatMap((item) => item.points.map((point) => ({ label: point.label ?? "", series: item.label, x: formatValue(point.x, x), y: formatValue(point.y, y) }))),
    }),
    [series, x, y]
  )
  const legend: LegendItem[] = series.map((item) => ({ key: item.key, label: item.label, slot: slots.get(item.key), tone: item.tone, shape: "dot" }))
  const toggle = (key: string) =>
    setHidden((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  const head = (tier: ChartTier): ReactNode => (series.length > 1 ? <ChartLegend items={legend} hidden={hidden} onToggle={tier === "full" ? toggle : undefined} /> : null)
  const count = visible.reduce((sum, item) => sum + item.points.length, 0)
  const trail = (
    <span className="fa-chart-figure">
      <span className="fa-chart-figure-value">{formatValue(count, { locale })}</span>
      <span className="fa-chart-figure-label">items</span>
    </span>
  )
  return (
    <ChartFrame {...rest} kind="scatter" label={label} title={title} state={state} table={table} head={head} compactHead={series.length > 1} trail={trail} trailOptional>
      {(box) => <ScatterPlot box={box} visible={visible} slots={slots} x={x} y={y} store={store} label={label} />}
    </ChartFrame>
  )
}

const ScatterPlot = memo(function ScatterPlot({ box, visible, slots, x, y, store, label }: { box: PlotBox; visible: ScatterSeries[]; slots: Map<string, number>; x: LocalizedAxis; y: LocalizedAxis; store: HoverStore; label: string }) {
  const plotRef = useRef<HTMLDivElement>(null)
  const { width, height, tier, rem } = box
  const full = tier === "full"
  const xDomain = useMemo(() => valueDomain(visible.flatMap((s) => s.points.map((p) => p.x)), x.domain, { zero: false }), [visible, x.domain])
  const yDomain = useMemo(() => valueDomain(visible.flatMap((s) => s.points.map((p) => p.y)), y.domain, { zero: false }), [visible, y.domain])
  const yTicks = useMemo(() => linearTicks(yDomain, height - 3 * rem), [yDomain, height, rem])
  const yLabels = yTicks.values.map((tick) => formatTick(tick, yTicks.step, y))
  const inset = cartesianInset({ tier, rem, yLabels, xAxis: full })
  if (full) inset.top = 1.25 * rem
  const x0 = inset.left
  const x1 = width - inset.right
  const y0 = inset.top
  const y1 = height - inset.bottom
  const px = useMemo(() => linear(xDomain, [x0, x1]), [xDomain, x0, x1])
  const py = useMemo(() => linear(yDomain, [y1, y0]), [yDomain, y0, y1])
  const dots = useMemo<Dot[]>(
    () =>
      visible
        .flatMap((series) => series.points.map((point) => ({ series, slot: slots.get(series.key) ?? 1, point, px: px(point.x), py: py(point.y) })))
        .toSorted((a, b) => a.px - b.px),
    [visible, slots, px, py]
  )
  const xTicks = useMemo(() => {
    if (!full) return []
    const { values, step } = linearTicks(xDomain, x1 - x0, 88)
    return values.map((value) => ({ x: px(value), label: formatTick(value, step, x) }))
  }, [full, xDomain, x1, x0, px, x])
  const r = tier === "micro" ? Math.max(2, Math.min(0.25 * rem, height / 10)) : 0.25 * rem
  const reach = 1.5 * rem

  const locate = (lx: number, ly: number) => {
    let best = -1
    let bestDistance = reach
    dots.forEach((dot, index) => {
      const distance = Math.hypot(dot.px - lx, dot.py - ly)
      if (distance < bestDistance) {
        bestDistance = distance
        best = index
      }
    })
    return best < 0 ? null : best
  }
  const anchor = (index: number) => ({ x: dots[index]?.px ?? 0, y: dots[index]?.py ?? 0 })
  const valueText = (index: number) => {
    const dot = dots[index]
    return dot ? `${dot.point.label ?? dot.series.label} · ${x.label} ${formatValue(dot.point.x, x)} · ${y.label} ${formatValue(dot.point.y, y)}` : ""
  }

  return (
    <div ref={plotRef} className="fa-chart-layer">
      <svg className="fa-chart-svg" width={width} height={height} aria-hidden>
        {full ? <YGrid ticks={yTicks.values} y={py} x0={x0} x1={x1} /> : tier === "compact" ? <line className="fa-chart-grid" data-baseline="" x1={x0} x2={x1} y1={Math.round(y1) - 0.5} y2={Math.round(y1) - 0.5} /> : null}
        {dots.map((dot, index) => (
          <circle key={`${dot.series.key}-${index}`} className="fa-chart-dot fa-chart-scatter-dot" cx={dot.px} cy={dot.py} r={r} {...seriesAttrs(dot.slot, dot.series.tone)} />
        ))}
      </svg>
      {full ? (
        <div className="fa-chart-labels" aria-hidden>
          <YLabels ticks={yTicks.values} step={yTicks.step} y={py} x0={x0} format={y} gap={0.5 * rem} />
          <ChartText className="fa-chart-tick" data-axis-name="" x={0} y={0} baseline="top">
            {y.label}
          </ChartText>
          <ChartText className="fa-chart-tick" data-axis-name="" x={x1} y={y1 - 0.375 * rem} anchor="end" baseline="bottom">
            {x.label}
          </ChartText>
          <XLabels ticks={xTicks} y={y1 + 0.375 * rem} x0={x0} x1={x1} rem={rem} />
        </div>
      ) : null}
      {full ? (
        <>
          <DotHighlight store={store} dots={dots} width={width} height={height} rem={rem} />
          <HitLayer store={store} count={dots.length} locate={locate} anchor={anchor} initial={0} label={`${label} — inspect points`} valueText={valueText} cursor="pointer" />
          <ChartTooltip store={store} anchor={plotRef}>
            {(hover) => {
              const dot = dots[hover.index]
              if (!dot) return null
              return (
                <TooltipBody
                  title={dot.point.label ?? dot.series.label}
                  meta={dot.point.label ? dot.series.label : undefined}
                  rows={[
                    { key: "x", label: x.label, value: formatValue(dot.point.x, x), slot: dot.slot, tone: dot.series.tone, shape: "dot" },
                    { key: "y", label: y.label, value: formatValue(dot.point.y, y), slot: dot.slot, tone: dot.series.tone, shape: "dot" },
                  ]}
                />
              )
            }}
          </ChartTooltip>
          <LiveRegion store={store} text={valueText} />
        </>
      ) : null}
    </div>
  )
})

function DotHighlight({ store, dots, width, height, rem }: { store: HoverStore; dots: Dot[]; width: number; height: number; rem: number }) {
  const hover = useStoreValue(store)
  const dot = hover ? dots[hover.index] : undefined
  if (!dot) return null
  return (
    <svg className="fa-chart-overlay" width={width} height={height} aria-hidden>
      <circle className="fa-chart-dot" cx={dot.px} cy={dot.py} r={0.375 * rem} {...seriesAttrs(dot.slot, dot.series.tone)} />
    </svg>
  )
}

// ── Histogram ─────────────────────────────────────────────────────────────────────────────

export interface HistogramProps extends ChartCommonProps, ValueFormat {
  /** The raw values; they are binned here. */
  values: readonly number[]
  /** About how many bins (d3 picks nice edges near this). */
  bins?: number
  /** The x range to bin over; defaults to the data's extent. */
  domain?: Domain
  /** What is counted: "Endpoints", "Check-ins". */
  countLabel?: string
}

/**
 * How values spread — check-in latency across the fleet. Columns touch (the 2px surface gap
 * between them), the axis labels the bin edges, and the tooltip names the bin's range and
 * count. Tiers are the column chart's.
 */
export function Histogram(props: HistogramProps) {
  const { values, bins = 12, domain, countLabel = "Count", unit, format, ...rest } = props
  const locale = useLocale(props.locale)
  const binned = useMemo(() => {
    const [lo, hi] = domain ?? (extent(values) as [number | undefined, number | undefined])
    const generator = d3bin<number, number>()
      .domain([lo ?? 0, hi ?? 1])
      .thresholds(bins)
    const result = generator([...values])
    const edges = result.length ? [result[0]!.x0 ?? 0, ...result.map((b) => b.x1 ?? 0)] : []
    return { edges, counts: result.map((b) => b.length) }
  }, [values, bins, domain])
  const formatEdge = (value: number) => formatValue(value, { unit, format, locale })
  return (
    <BarChart
      {...rest}
      categories={binned.counts.map((_, index) => `${formatEdge(binned.edges[index] ?? 0)}–${formatEdge(binned.edges[index + 1] ?? 0)}`)}
      series={[{ key: "count", label: countLabel, data: binned.counts }]}
      edges={binned.edges}
      formatEdge={formatEdge}
      categoryLabel="Range"
      labels={false}
    />
  )
}
