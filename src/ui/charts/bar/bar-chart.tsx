import { memo, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { cartesianInset, textWidth, YGrid, YLabels } from "../core/axes.js"
import { ChartFrame, type ChartCommonProps, type PlotBox } from "../core/frame.js"
import { formatShare, formatTick, formatValue, type ValueFormat } from "../core/format.js"
import { barPath, cssPath } from "../core/geometry.js"
import { HitLayer } from "../core/hit.js"
import { useHoverStore, useStoreValue, type HoverStore } from "../core/hover.js"
import { ChartLegend, type LegendItem } from "../core/legend.js"
import { allIntegers, linear, linearTicks, valueDomain, type Domain } from "../core/scales.js"
import { seriesAttrs, slotFor, type ChartTone } from "../core/series.js"
import type { ChartTableModel } from "../core/table.js"
import type { ChartTier } from "../core/tier.js"
import { ChartTooltip, TooltipBody, type TooltipRow } from "../core/tooltip.js"
import { LiveRegion } from "../line/line-chart.js"

export interface BarSeries {
  key: string
  label: string
  /** One value per category. */
  data: readonly (number | null)[]
  /** Named content slot. */
  slot?: number
  /** Status tone, only when the series means that state (offline, failed). */
  tone?: ChartTone
}

export interface BarChartProps extends ChartCommonProps, ValueFormat {
  /** One label per band: days, processes, organisations. */
  categories: readonly string[]
  /** Chart series with stable identifiers, labels and typed values. */
  series: readonly BarSeries[]
  /** `vertical` columns (time and ordered categories) or `horizontal` bars (ranked lists). */
  orientation?: "vertical" | "horizontal"
  /** Several series side by side, or stacked as parts of a total. */
  layout?: "grouped" | "stacked"
  /** Fixed value range; defaults to zero → the data, rounded to nice ticks. */
  domain?: Domain
  /** Values at the bar tips. Defaults on for horizontal bars (ranked lists), off for columns. */
  labels?: boolean
  /** Header for the category column of the table ("Process", "Day"). */
  categoryLabel?: string
  /** Bin edges for a histogram: n + 1 numbers; bars touch and the axis labels the edges. */
  edges?: readonly number[]
  /** Format a bin edge. */
  formatEdge?: (value: number) => string
}

interface Prepared {
  visible: BarSeries[]
  /** Overrides for named content slots. */
  slots: Map<string, number>
  totals: number[]
  domain: Domain
  /** Every value is a whole number: value ticks stay whole. */
  integer: boolean
}

/**
 * Columns and bars: grouped, stacked, and horizontal ranked lists ("top processes by memory").
 * Marks follow the family's spec — at most 24px thick, the data end rounded and the baseline
 * square, a 2px surface gap between touching marks, the light-from-above sheen of solid fills.
 *
 *   micro    mini columns without axes; ranked lists add the leader as a trail
 *   compact  baseline and category labels (or, for ranked lists, label · bar · value rows);
 *            passive legend
 *   full     value gridlines, the interactive legend, a band highlight and the glass tooltip
 *            (every series in the band, a total when stacked)
 *
 * Rows that do not fit in a ranked list fold into a "+N more" line — nothing is cut off.
 */
export function BarChart(props: BarChartProps) {
  const {
    label,
    title,
    state = "ready",
    categories,
    series,
    orientation = "vertical",
    layout = "grouped",
    domain,
    labels,
    unit,
    format,
    categoryLabel = "Category",
    edges,
    formatEdge,
    ...rest
  } = props
  const [hidden, setHidden] = useState<ReadonlySet<string>>(() => new Set())
  const store = useHoverStore()
  const fmt: ValueFormat = useMemo(() => ({ unit, format }), [unit, format])
  const stacked = layout === "stacked"
  const horizontal = orientation === "horizontal"

  const prepared = useMemo<Prepared>(() => {
    const slots = new Map(series.map((item, index) => [item.key, slotFor(index, item.slot)]))
    const visible = series.filter((item) => !hidden.has(item.key))
    const totals = categories.map((_, index) => visible.reduce((sum, item) => sum + Math.max(0, item.data[index] ?? 0), 0))
    const values = stacked ? totals : visible.flatMap((item) => item.data)
    return { visible, slots, totals, domain: valueDomain(values, domain, { zero: true }), integer: allIntegers(values) }
  }, [series, hidden, categories, stacked, domain])

  const table = useMemo<ChartTableModel>(() => {
    const rows = categories.map((category, index) => {
      const row: Record<string, string> = { category: edges ? edgeLabel(edges, index, formatEdge) : category }
      for (const item of series) row[item.key] = formatValue(item.data[index], fmt)
      if (stacked && series.length > 1) row.total = formatValue(series.reduce((sum, item) => sum + (item.data[index] ?? 0), 0), fmt)
      return row
    })
    return {
      columns: [
        { key: "category", label: categoryLabel },
        ...series.map((item) => ({ key: item.key, label: item.label, numeric: true })),
        ...(stacked && series.length > 1 ? [{ key: "total", label: "Total", numeric: true }] : []),
      ],
      rows,
    }
  }, [categories, series, fmt, stacked, categoryLabel, edges, formatEdge])

  const legendItems: LegendItem[] = series.map((item) => ({ key: item.key, label: item.label, slot: prepared.slots.get(item.key), tone: item.tone, shape: "box" }))
  const toggle = (key: string) =>
    setHidden((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  const head = (tier: ChartTier): ReactNode =>
    series.length > 1 ? <ChartLegend items={legendItems} hidden={hidden} onToggle={tier === "full" ? toggle : undefined} /> : null

  // The micro trail: the leader of a ranked list, or the latest column.
  const leadIndex = horizontal ? 0 : categories.length - 1
  const lead = series.length === 1 ? series[0]!.data[leadIndex] : prepared.totals[leadIndex]
  const trail =
    categories.length > 0 ? (
      <span className="fa-chart-figure">
        <span className="fa-chart-figure-label">{edges ? edgeLabel(edges, leadIndex, formatEdge) : categories[leadIndex]}</span>
        <span className="fa-chart-figure-value">{formatValue(lead, fmt)}</span>
      </span>
    ) : null

  return (
    <ChartFrame
      {...rest}
      kind={horizontal ? "bar" : "column"}
      label={label}
      title={title}
      state={state}
      table={table}
      head={head}
      compactHead={series.length > 1}
      trail={trail}
      trailOptional
    >
      {(box) => (
        <BarPlot
          box={box}
          prepared={prepared}
          store={store}
          categories={categories}
          stacked={stacked}
          horizontal={horizontal}
          labels={labels ?? horizontal}
          fmt={fmt}
          label={label}
          edges={edges}
          formatEdge={formatEdge}
        />
      )}
    </ChartFrame>
  )
}

/** Vertical columns. */
export function ColumnChart(props: Omit<BarChartProps, "orientation">) {
  return <BarChart {...props} orientation="vertical" />
}

function edgeLabel(edges: readonly number[], index: number, formatEdge?: (value: number) => string) {
  const f = formatEdge ?? ((value: number) => String(value))
  return `${f(edges[index] ?? 0)}–${f(edges[index + 1] ?? 0)}`
}

interface BarPlotProps {
  box: PlotBox
  prepared: Prepared
  /** External store observed by the component. */
  store: HoverStore
  categories: readonly string[]
  stacked: boolean
  horizontal: boolean
  /** Display and accessibility labels supplied by the application. */
  labels: boolean
  fmt: ValueFormat
  label: string
  edges?: readonly number[]
  formatEdge?: (value: number) => string
}

interface Mark {
  key: string
  /** Chart series with stable identifiers, labels and typed values. */
  series: string
  /** Index of the current item. */
  index: number
  /** The data end along the value axis (px): where a direct label starts. */
  tip: number
  /** Named content slot. */
  slot: number
  tone?: string
  d: string
  end: "top" | "right"
}

const GAP = 2

const BarPlot = memo(function BarPlot({ box, prepared, store, categories, stacked, horizontal, labels, fmt, label, edges, formatEdge }: BarPlotProps) {
  const id = useId()
  const plotRef = useRef<HTMLDivElement>(null)
  const { width, height, tier, rem } = box
  const { visible, slots, totals, domain } = prepared
  const full = tier === "full"
  const micro = tier === "micro"
  const n = categories.length
  const k = Math.max(1, visible.length)
  const barMax = 1.5 * rem
  const radius = 0.25 * rem
  const histogram = Boolean(edges)

  // ── Geometry ──────────────────────────────────────────────────────────────────────────
  const geo = useMemo(() => {
    if (horizontal && !micro) {
      // Ranked rows: label · bar · value side by side, or the label above its bar when narrow.
      const side = width >= 22 * rem
      // A short list spreads into the box (up to 3rem a row) rather than huddling at the top.
      const base = side ? (full ? 2 : 1.625) * rem : 1.875 * rem
      const pitch = full && side ? Math.min(3 * rem, Math.max(base, height / Math.max(1, n))) : base
      const fit = Math.max(1, Math.floor(height / pitch))
      const shown = n > fit ? Math.max(1, fit - 1) : n
      const labelW = side ? Math.min(width * 0.38, Math.max(...categories.slice(0, shown).map((c) => c.length * 0.56 * 0.75 * rem)) + 0.75 * rem) : 0
      const valueTexts = categories.slice(0, shown).map((_, index) => formatValue(stacked || k === 1 ? (k === 1 ? visible[0]?.data[index] : totals[index]) : maxAt(visible, index), fmt))
      const valueW = labels ? Math.max(...valueTexts.map((t) => textWidth(t, rem))) + 0.5 * rem : 0
      const bx0 = labelW
      const bx1 = Math.max(bx0 + 1, width - valueW)
      const thick = Math.min(barMax, side ? pitch * 0.42 : 0.5 * rem)
      return { kind: "rows" as const, side, pitch, shown, labelW, bx0, bx1, thick, valueTexts }
    }
    const yTicks = linearTicks(domain, height - 2 * rem, undefined, { integer: prepared.integer })
    const yLabels = yTicks.values.map((tick) => formatTick(tick, yTicks.step, fmt))
    const inset = cartesianInset({ tier, rem, yLabels, xAxis: !micro && !horizontal })
    if (!micro) inset.bottom = 1.25 * rem + 0.375 * rem
    return { kind: "columns" as const, inset, yTicks }
  }, [horizontal, micro, width, height, rem, full, n, categories, fmt, labels, stacked, k, visible, totals, domain, tier, barMax, prepared.integer])

  const marks = useMemo<Mark[]>(() => {
    const out: Mark[] = []
    if (geo.kind === "rows") {
      const scale = linear(domain, [geo.bx0, geo.bx1])
      for (let index = 0; index < geo.shown; index++) {
        const top = geo.side ? index * geo.pitch + (geo.pitch - geo.thick * (stacked ? 1 : k) - (stacked ? 0 : (k - 1) * GAP)) / 2 : index * geo.pitch + 1.125 * rem + 0.125 * rem
        let base = 0
        visible.forEach((item, s) => {
          const value = Math.max(0, item.data[index] ?? 0)
          const x0 = scale(base)
          const x1 = scale(base + value)
          const y = stacked ? top : top + s * (geo.thick + GAP)
          const last = !stacked || s === visible.length - 1
          const gap = stacked && s > 0 ? GAP : 0
          out.push({ key: `${item.key}-${index}`, series: item.key, index, tip: x1, slot: slots.get(item.key) ?? 1, tone: item.tone, d: barPath(x0 + gap, y, Math.max(0, x1 - x0 - gap), geo.thick, last ? radius : 0, "right"), end: "right" })
          if (stacked) base += value
        })
      }
      return out
    }
    const { inset } = geo
    const x0 = inset.left
    const x1 = width - inset.right
    const y0 = inset.top
    const y1 = height - inset.bottom
    const band = (x1 - x0) / Math.max(1, n)
    const py = linear(domain, [y1, y0])
    const groupW = histogram ? band - GAP : Math.min(band * (micro ? 0.7 : stacked || k === 1 ? 0.62 : 0.8), stacked ? barMax : k * barMax + (k - 1) * GAP)
    const barW = histogram || stacked ? groupW : (groupW - (k - 1) * GAP) / k
    for (let index = 0; index < n; index++) {
      const left = x0 + index * band + (band - groupW) / 2
      let base = 0
      visible.forEach((item, s) => {
        const value = Math.max(0, item.data[index] ?? 0)
        const top = py(base + value)
        const bottom = py(base) - (stacked && s > 0 ? GAP : 0)
        const x = stacked || histogram ? left : left + s * (barW + GAP)
        const last = !stacked || s === visible.length - 1
        out.push({ key: `${item.key}-${index}`, series: item.key, index, tip: top, slot: slots.get(item.key) ?? 1, tone: item.tone, d: barPath(x, top, barW, Math.max(0, bottom - top), last ? (histogram ? radius * 0.5 : radius) : 0, "top"), end: "top" })
        if (stacked) base += value
      })
    }
    return out
  }, [geo, domain, visible, slots, stacked, k, rem, radius, width, height, n, histogram, micro, barMax])

  // ── Hover geometry ────────────────────────────────────────────────────────────────────
  const count = geo.kind === "rows" ? geo.shown : n
  const locate = (lx: number, ly: number) => {
    if (geo.kind === "rows") {
      const index = Math.floor(ly / geo.pitch)
      return index >= 0 && index < geo.shown ? index : null
    }
    const x0 = geo.inset.left
    const band = (width - geo.inset.right - x0) / Math.max(1, n)
    const index = Math.floor((lx - x0) / band)
    return index >= 0 && index < n ? index : null
  }
  const anchor = (index: number) => {
    if (geo.kind === "rows") return { x: geo.bx1 * 0.5 + geo.bx0 * 0.5, y: index * geo.pitch + geo.pitch / 2 }
    const x0 = geo.inset.left
    const band = (width - geo.inset.right - x0) / Math.max(1, n)
    const py = linear(domain, [height - geo.inset.bottom, geo.inset.top])
    const top = stacked ? totals[index] ?? 0 : maxAt(visible, index)
    return { x: x0 + band * (index + 0.5), y: py(top) }
  }
  const categoryText = (index: number) => (edges ? edgeLabel(edges, index, formatEdge) : (categories[index] ?? ""))
  const valueText = (index: number) => `${categoryText(index)} · ${visible.map((item) => `${item.label} ${formatValue(item.data[index], fmt)}`).join(", ")}`
  const sum = useMemo(() => totals.reduce((a, b) => a + b, 0), [totals])

  return (
    <div ref={plotRef} className="fa-chart-layer">
      {full ? <BandHighlight store={store} geo={geo} width={width} height={height} n={n} rem={rem} /> : null}
      <svg className="fa-chart-svg" width={width} height={height} aria-hidden>
        <defs>
          {visible.map((item) => (
            <linearGradient key={item.key} id={`${id}-sheen-${item.key}`} x1="0" y1="0" x2="0" y2="1" {...seriesAttrs(slots.get(item.key), item.tone)}>
              <stop offset="0" className="fa-chart-sheen-top" />
              <stop offset="0.45" className="fa-chart-sheen-bottom" />
            </linearGradient>
          ))}
        </defs>
        {geo.kind === "columns" && !micro ? (
          full ? (
            <YGrid ticks={geo.yTicks.values} y={linear(domain, [height - geo.inset.bottom, geo.inset.top])} x0={geo.inset.left} x1={width - geo.inset.right} baseline={0} />
          ) : (
            <line className="fa-chart-grid" data-baseline="" x1={geo.inset.left} x2={width - geo.inset.right} y1={Math.round(height - geo.inset.bottom) - 0.5} y2={Math.round(height - geo.inset.bottom) - 0.5} />
          )
        ) : null}
        {marks.map((mark) => (
          <path
            key={mark.key}
            className="fa-chart-bar"
            data-end={mark.end}
            {...seriesAttrs(mark.slot, mark.tone)}
            style={
              {
                d: cssPath(mark.d),
                fill: `url(#${id}-sheen-${mark.series})`,
                "--_enter-delay": `calc(var(--duration-instant) * ${Math.min(mark.index, 12) * 0.25})`,
              } as CSSProperties
            }
          />
        ))}
      </svg>

      {/* Category and value labels are HTML so they truncate with a real ellipsis (R8). */}
      {!micro ? (
        <div className="fa-chart-labels" aria-hidden>
          {geo.kind === "columns" && full ? <YLabels ticks={geo.yTicks.values} step={geo.yTicks.step} y={linear(domain, [height - geo.inset.bottom, geo.inset.top])} x0={geo.inset.left} format={fmt} gap={0.5 * rem} /> : null}
          {geo.kind === "rows"
            ? categories.slice(0, geo.shown).map((category, index) => (
                <span key={index}>
                  <span
                    className="fa-chart-cat"
                    data-align="start"
                    title={category}
                    style={geo.side ? { top: index * geo.pitch, height: geo.pitch, width: geo.labelW - 0.5 * rem, left: 0 } : { top: index * geo.pitch, height: 1.125 * rem, width: width - (labels ? textWidth(geo.valueTexts[index] ?? "", rem) + 0.5 * rem : 0), left: 0 }}
                  >
                    {category}
                  </span>
                  {labels ? (
                    <span
                      className="fa-chart-val"
                      style={
                        geo.side
                          ? { top: index * geo.pitch, height: geo.pitch, left: Math.max(geo.bx0, ...marks.filter((mark) => mark.index === index).map((mark) => mark.tip)) + 0.375 * rem }
                          : { top: index * geo.pitch, height: 1.125 * rem, right: 0 }
                      }
                    >
                      {geo.valueTexts[index]}
                    </span>
                  ) : null}
                </span>
              ))
            : (() => {
                const x0 = geo.inset.left
                const band = (width - geo.inset.right - x0) / Math.max(1, n)
                const step = histogram ? Math.max(1, Math.ceil((n * 4.5 * rem) / (width - x0))) : Math.max(1, Math.ceil((3 * rem) / band))
                const top = height - geo.inset.bottom + 0.375 * rem
                if (histogram && edges) {
                  const lastIndex = edges.length - 1
                  return edges.map((edge, index) =>
                    (index % step === 0 && lastIndex - index >= step) || index === lastIndex ? (
                      <span key={index} className="fa-chart-cat" data-align="middle" style={{ top, left: x0 + band * index - 2 * rem, width: 4 * rem }}>
                        {(formatEdge ?? String)(edge)}
                      </span>
                    ) : null
                  )
                }
                return categories.map((category, index) =>
                  index % step === 0 ? (
                    <span key={index} className="fa-chart-cat" data-align="middle" title={category} style={{ top, left: x0 + band * index + 1, width: band * step - 2 }}>
                      {category}
                    </span>
                  ) : null
                )
              })()}
        </div>
      ) : null}
      {geo.kind === "rows" && geo.shown < n ? (
        <span className="fa-chart-more" style={{ top: geo.shown * geo.pitch, height: geo.pitch }}>
          +{n - geo.shown} more
        </span>
      ) : null}

      {full ? (
        <>
          <HitLayer store={store} count={count} locate={locate} anchor={anchor} label={`${label} — inspect values`} valueText={valueText} initial={0} />
          <ChartTooltip store={store} anchor={plotRef}>
            {(hover) => {
              const rows: TooltipRow[] = visible.map((item) => ({
                key: item.key,
                label: item.label,
                value: formatValue(item.data[hover.index], fmt),
                slot: slots.get(item.key),
                tone: item.tone,
                shape: "box",
                detail: visible.length === 1 && sum > 0 ? formatShare(item.data[hover.index] ?? 0, sum) : undefined,
              }))
              return (
                <TooltipBody
                  title={categoryText(hover.index)}
                  rows={stacked ? rows.toReversed() : rows}
                  footer={stacked && visible.length > 1 ? `Total ${formatValue(totals[hover.index], fmt)}` : undefined}
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

function maxAt(series: readonly BarSeries[], index: number) {
  let max = 0
  for (const item of series) max = Math.max(max, item.data[index] ?? 0)
  return max
}

function BandHighlight({
  store,
  geo,
  width,
  height,
  n,
  rem,
}: {
  /** External store observed by the component. */
  store: HoverStore
  geo: { kind: "rows"; pitch: number } | { kind: "columns"; inset: { left: number; right: number; top: number; bottom: number } }
  /** Available width or named width tier. */
  width: number
  /** Available height used for the component’s size tier. */
  height: number
  n: number
  /** Current pixel size of one rem used for layout measurement. */
  rem: number
}) {
  const hover = useStoreValue(store)
  if (!hover) return null
  if (geo.kind === "rows") {
    return (
      <svg className="fa-chart-overlay fa-chart-underlay" width={width} height={height} aria-hidden>
        <rect className="fa-chart-hover-band" x={0} y={hover.index * geo.pitch} width={width} height={geo.pitch} rx={0.375 * rem} />
      </svg>
    )
  }
  const x0 = geo.inset.left
  const band = (width - geo.inset.right - x0) / Math.max(1, n)
  return (
    <svg className="fa-chart-overlay fa-chart-underlay" width={width} height={height} aria-hidden>
      <rect className="fa-chart-hover-band" x={x0 + band * hover.index} y={geo.inset.top} width={band} height={height - geo.inset.top - geo.inset.bottom} rx={0.375 * rem} />
    </svg>
  )
}
