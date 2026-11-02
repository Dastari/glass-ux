import { useMessages } from "../../../lib/i18n/index.js"
import { radarMessages } from "./messages.js"
import { memo, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { captionLinePx, ChartText, textWidth } from "../core/axes.js"
import { ChartFrame, type ChartCommonProps, type PlotBox } from "../core/frame.js"
import { formatTick, formatValue, type LocalizedFormat, type ValueFormat } from "../core/format.js"
import { cssPath, type Point } from "../core/geometry.js"
import { useLocale } from "../../../lib/locale/use-locale.js"
import { listFormat } from "../../../lib/locale/intl.js"
import { HitLayer, pointRect, spatialNav } from "../core/hit.js"
import { createStore, useHoverStore, useStoreValue, type HoverStore, type Store } from "../core/hover.js"
import { ChartLegend, type LegendItem } from "../core/legend.js"
import { allIntegers, linearTicks, valueDomain, type Domain } from "../core/scales.js"
import { seriesAttrs, slotFor, type ChartTone } from "../core/series.js"
import type { ChartTableModel, ChartTableValue } from "../core/table.js"
import type { ChartTier } from "../core/tier.js"
import { ChartTooltip, TooltipBody, type TooltipRow } from "../core/tooltip.js"
import { LiveRegion } from "../line/line-chart.js"
import { closedPath, nearestSpoke, radarFit, radarOutline, spokeLabel, spokePoint } from "./layout.js"

export interface RadarSeries {
  key: string
  label: string
  /** One value per measure, in the order of `measures`; null is no reading, which breaks the outline there. */
  data: readonly (number | null)[]
  /** Categorical slot 1–8; defaults to the series' position. */
  slot?: number
  /** Status tone, only when the whole series means that state. */
  tone?: ChartTone
}

export interface RadarChartProps extends ChartCommonProps, ValueFormat {
  /** One label per spoke: three to ten read well. All share one scale, so compare like with like. */
  measures: readonly string[]
  /** The series to overlay: two or three stay legible, since each outline hides what is behind it. */
  series: readonly RadarSeries[]
  /** Fixed value range; the low end sits at the centre. Defaults to zero → the data, rounded to nice ticks. */
  domain?: Domain
  /** Header for the table's first column. */
  measureLabel?: string
  /**
   * Click, Enter or Space on a spoke: its index and measure. While set, the plot shows a
   * pointer cursor and its accessible name says Enter selects.
   */
  onActivate?: (index: number, measure: string) => void
}

/**
 * Several measures on one scale, as a profile: the first spoke points up and the rest follow
 * clockwise, as a pie's slices do. Rings mark the scale, each series is an outline with a
 * wash, and pointing at a series in the legend brings it forward. Use it to compare the shape
 * of a few profiles; for exact amounts, or spokes whose order means nothing to the reader,
 * `BarChart` reads better.
 *
 * The ring does not mirror in right-to-left text: its order runs clockwise from the top, and
 * position around a circle has no reading direction.
 *
 *   micro    the outlines alone in a small ring; the first series' largest measure as a trail
 *   compact  rim, spokes and measure labels where they fit, passive legend
 *   full     rings with their values, measure labels, the interactive legend, the tooltip
 *            (every series at the spoke) and arrow keys that move to the spoke in that direction
 */
export function RadarChart(props: RadarChartProps) {
  const messages = useMessages(radarMessages, { locale: props.locale })
  const { label, title, state: stateProp = "ready", measures, series, domain, measureLabel: measureLabelProp, unit, format, onActivate, ...rest } = props
  const measureLabel = measureLabelProp ?? messages.measure
  const state = stateProp === "ready" && (measures.length === 0 || series.length === 0) ? "empty" : stateProp
  const [hidden, setHidden] = useState<ReadonlySet<string>>(() => new Set())
  // The series the legend points at; the plot reads it without redrawing.
  const [focus] = useState(() => createStore<string | null>(null))
  const store = useHoverStore()
  const locale = useLocale(props.locale)
  const fmt: LocalizedFormat = useMemo(() => ({ unit, format, locale }), [unit, format, locale])
  const slots = useMemo(() => new Map(series.map((item, index) => [item.key, slotFor(index, item.slot)])), [series])
  const visible = useMemo(() => series.filter((item) => !hidden.has(item.key)), [series, hidden])
  const range = useMemo(() => valueDomain(visible.flatMap((item) => item.data), domain, { zero: true }), [visible, domain])
  const integer = useMemo(() => allIntegers(visible.flatMap((item) => item.data)), [visible])

  const table = useMemo<ChartTableModel>(
    () => ({
      columns: [{ key: "measure", label: measureLabel }, ...series.map((item) => ({ key: item.key, label: item.label, numeric: true }))],
      rows: measures.map((measure, index) => {
        const row: Record<string, string> = { measure }
        for (const item of series) row[item.key] = formatValue(item.data[index], fmt)
        return row
      }),
      values: measures.map((_, index) => {
        const raw: Record<string, ChartTableValue> = {}
        for (const item of series) raw[item.key] = item.data[index] ?? null
        return raw
      }),
    }),
    [measures, series, fmt, measureLabel]
  )

  const legend: LegendItem[] = series.map((item) => ({ key: item.key, label: item.label, slot: slots.get(item.key), tone: item.tone, shape: "line" }))
  const toggle = (key: string) =>
    setHidden((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  const head = (tier: ChartTier): ReactNode => (series.length > 1 ? <ChartLegend items={legend} hidden={hidden} onToggle={tier === "full" ? toggle : undefined} onActive={tier === "full" ? focus.set : undefined} /> : null)

  const lead = series[0]
  const peak = lead ? lead.data.reduce<number>((best, value, index) => ((value ?? -Infinity) > (lead.data[best] ?? -Infinity) ? index : best), 0) : 0
  const trail =
    lead && measures.length > 0 ? (
      <span className="fa-chart-figure">
        <span className="fa-chart-figure-label">{measures[peak]}</span>
        <span className="fa-chart-figure-value">{formatValue(lead.data[peak], fmt)}</span>
      </span>
    ) : undefined

  return (
    <ChartFrame {...rest} kind="radar" label={label} title={title} state={state} table={table} head={head} compactHead={series.length > 1} trail={trail} trailOptional>
      {(box) => <RadarPlot box={box} measures={measures} visible={visible} slots={slots} domain={range} integer={integer} store={store} focus={focus} fmt={fmt} label={label} onActivate={onActivate} />}
    </ChartFrame>
  )
}

interface RadarPlotProps {
  box: PlotBox
  measures: readonly string[]
  visible: readonly RadarSeries[]
  /** Overrides for named content slots. */
  slots: Map<string, number>
  domain: Domain
  integer: boolean
  /** External store observed by the component. */
  store: HoverStore
  focus: Store<string | null>
  fmt: LocalizedFormat
  label: string
  onActivate?: (index: number, measure: string) => void
}

interface DrawnSeries {
  /** The typed item displayed or acted upon. */
  item: RadarSeries
  /** Named content slot. */
  slot: number
  /** One position per measure; null where there is no reading. */
  points: (Point | null)[]
  closed: string | null
  runs: string[]
  lone: Point[]
}

const RadarPlot = /* @__PURE__ */ memo(function RadarPlot({ box, measures, visible, slots, domain, integer, store, focus, fmt, label, onActivate }: RadarPlotProps) {
  const messages = useMessages(radarMessages, { locale: fmt.locale })
  const plotRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const { width, height, tier, rem } = box
  const full = tier === "full"
  const micro = tier === "micro"
  const count = measures.length

  const fit = useMemo(() => {
    const labelled = !micro
    const widest = labelled ? Math.min(9 * rem, Math.max(...measures.map((measure) => textWidth(measure, rem)))) : 0
    const placed = radarFit({ width, height, count, labelWidth: widest, labelHeight: labelled ? captionLinePx(rem) : 0, gap: 0.375 * rem, minRadius: 3 * rem, pad: 0.3125 * rem })
    // Too tight for words: the ring keeps the box and the tooltip and table name the spokes.
    if (!labelled || placed.labelWidth >= Math.min(widest, 2.5 * rem)) return placed
    return radarFit({ width, height, count, labelWidth: 0, labelHeight: 0, gap: 0, minRadius: 3 * rem, pad: 0.3125 * rem })
  }, [micro, measures, rem, width, height, count])
  const { cx, cy, radius } = fit

  const span = domain[1] - domain[0] || 1
  const fraction = (value: number) => Math.min(1, Math.max(0, (value - domain[0]) / span))
  const ticks = useMemo(() => linearTicks(domain, radius, 2.5 * rem, { integer }), [domain, radius, rem, integer])
  const rings = useMemo(() => {
    const inner = ticks.values.filter((value) => value > domain[0] && value < domain[1])
    return full ? [...inner, domain[1]] : [domain[1]]
  }, [ticks, domain, full])

  const drawn = useMemo<DrawnSeries[]>(
    () =>
      visible.map((item) => {
        const points = measures.map((_, index) => {
          const value = item.data[index]
          return value === null || value === undefined || Number.isNaN(value) ? null : spokePoint(cx, cy, radius, index, count, fraction(value))
        })
        return { item, slot: slots.get(item.key) ?? 1, points, ...radarOutline(points) }
      }),
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- fraction follows domain
    [visible, measures, slots, cx, cy, radius, count, domain]
  )
  const rim = useMemo(() => measures.map((_, index) => spokePoint(cx, cy, radius, index, count, 1)), [measures, cx, cy, radius, count])

  // Pointing at a series in the legend brings it forward; nothing here re-renders.
  useEffect(
    () =>
      focus.subscribe(() => {
        const svg = svgRef.current
        if (!svg) return
        const key = focus.get()
        svg.toggleAttribute("data-focus", key !== null)
        for (const group of svg.querySelectorAll<SVGGElement>(".fa-chart-series")) group.toggleAttribute("data-focused", group.dataset.series === key)
      }),
    [focus]
  )

  const locate = (x: number, y: number) => {
    const dx = x - cx
    const dy = y - cy
    if (count === 0 || Math.hypot(dx, dy) > radius + 1.5 * rem) return null
    return nearestSpoke(dx, dy, count)
  }
  const anchor = (index: number) => {
    let best = rim[index] ?? { x: cx, y: cy }
    let reach = -1
    for (const { points } of drawn) {
      const point = points[index]
      if (!point) continue
      const distance = Math.hypot(point.x - cx, point.y - cy)
      if (distance > reach) {
        reach = distance
        best = point
      }
    }
    return best
  }
  const nav = (index: number, key: string) => spatialNav(rim.map(pointRect), index, key)
  const valueText = (index: number) => `${measures[index] ?? ""} · ${listFormat(fmt.locale, { type: "unit" }).format(visible.map((item) => `${item.label} ${formatValue(item.data[index], fmt)}`))}`
  const labelled = !micro && fit.labelWidth > 0
  const off = 0.375 * rem

  return (
    <div ref={plotRef} className="fa-chart-layer fa-chart-radar">
      <svg ref={svgRef} className="fa-chart-svg" width={width} height={height} aria-hidden>
        {!micro ? (
          <g aria-hidden>
            {rings.map((value) => (
              <path key={value} className="fa-chart-radar-grid" data-rim={value === domain[1] ? "" : undefined} d={closedPath(measures.map((_, index) => spokePoint(cx, cy, radius, index, count, fraction(value))))} />
            ))}
            {rim.map((point, index) => (
              <line key={index} className="fa-chart-radar-grid" x1={cx} y1={cy} x2={point.x} y2={point.y} />
            ))}
          </g>
        ) : (
          <path className="fa-chart-radar-grid" data-rim="" d={closedPath(rim)} />
        )}
        {drawn.map(({ item, slot, points, closed, runs, lone }) => (
          <g key={item.key} className="fa-chart-series" data-series={item.key} {...seriesAttrs(slot, item.tone)}>
            {closed ? <path className="fa-chart-radar-area" d={closed} style={{ d: cssPath(closed) } as CSSProperties} /> : null}
            {closed ? <path className="fa-chart-line" data-enter="" pathLength={1} d={closed} style={{ d: cssPath(closed) } as CSSProperties} /> : null}
            {runs.map((d, index) => (
              <path key={index} className="fa-chart-line" data-enter="" pathLength={1} d={d} style={{ d: cssPath(d) } as CSSProperties} />
            ))}
            {micro
              ? lone.map((point) => <circle key={`${point.x}-${point.y}`} className="fa-chart-dot" cx={point.x} cy={point.y} r={0.1875 * rem} />)
              : points.map((point, index) => (point ? <circle key={index} className="fa-chart-dot" data-enter="" cx={point.x} cy={point.y} r={(full ? 0.25 : 0.1875) * rem} /> : null))}
          </g>
        ))}
      </svg>
      {!micro ? (
        <div className="fa-chart-labels" aria-hidden>
          {labelled && measures.map((measure, index) => {
            const { anchor: side, baseline } = spokeLabel(index, count)
            const point = rim[index]!
            const x = point.x + (side === "start" ? off : side === "end" ? -off : 0)
            const y = point.y + (baseline === "bottom" ? -off : baseline === "top" ? off : 0)
            return (
              <ChartText key={index} className="fa-chart-radar-label" x={x} y={y} anchor={side} baseline={baseline} width={side === "middle" ? Math.min(width * 0.9, 2 * fit.labelWidth) : fit.labelWidth}>
                {measure}
              </ChartText>
            )
          })}
          {full
            ? rings.map((value) => (
                <ChartText key={value} className="fa-chart-tick fa-chart-ring-label" x={cx + 0.5 * rem} y={cy - radius * fraction(value)} baseline="middle">
                  {formatTick(value, ticks.step, fmt)}
                </ChartText>
              ))
            : null}
        </div>
      ) : null}
      {full ? (
        <>
          <SpokeHover store={store} drawn={drawn} rim={rim} cx={cx} cy={cy} width={width} height={height} rem={rem} />
          <HitLayer
            store={store}
            count={count}
            locate={locate}
            anchor={anchor}
            nav={nav}
            initial={0}
            cursor="pointer"
            label={onActivate ? messages.inspectMeasuresEnterSelects(label) : messages.inspectMeasures(label)}
            valueText={valueText}
            onActivate={onActivate ? (index) => onActivate(index, measures[index] ?? "") : undefined}
          />
          <ChartTooltip store={store} anchor={plotRef}>
            {(hover) => {
              const rows: TooltipRow[] = visible.map((item) => ({ key: item.key, label: item.label, value: formatValue(item.data[hover.index], fmt), slot: slots.get(item.key), tone: item.tone, shape: "line" }))
              return <TooltipBody title={measures[hover.index]} rows={rows} />
            }}
          </ChartTooltip>
          <LiveRegion store={store} text={valueText} />
        </>
      ) : null}
    </div>
  )
})

/** The spoke under the cursor, with a larger dot on each reading. */
function SpokeHover({ store, drawn, rim, cx, cy, width, height, rem }: { store: HoverStore; drawn: readonly DrawnSeries[]; rim: readonly Point[]; cx: number; cy: number; width: number; height: number; rem: number }) {
  const hover = useStoreValue(store)
  const end = hover ? rim[hover.index] : undefined
  if (!hover || !end) return null
  return (
    <svg className="fa-chart-overlay" width={width} height={height} aria-hidden>
      <line className="fa-chart-radar-hover" x1={cx} y1={cy} x2={end.x} y2={end.y} />
      {drawn.map(({ item, slot, points }) => {
        const point = points[hover.index]
        return point ? <circle key={item.key} className="fa-chart-dot" cx={point.x} cy={point.y} r={0.3125 * rem} {...seriesAttrs(slot, item.tone)} /> : null
      })}
    </svg>
  )
}
