import { memo, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { cartesianInset, ChartText, XLabels, YGrid, YLabels } from "../core/axes.js"
import { DECIMATE_ABOVE, lttbIndices } from "../core/decimate.js"
import { ChartFrame, type ChartCommonProps, type PlotBox } from "../core/frame.js"
import { formatClock, formatInstant, formatRelative, formatTick, formatTimeTicks, formatValue, type LocalizedFormat, type ValueFormat } from "../core/format.js"
import { useLocale } from "../../../lib/locale/use-locale.js"
import { areaPath, bandPath, cssPath, linePath, segments, type Point } from "../core/geometry.js"
import { HitLayer } from "../core/hit.js"
import { useNow } from "../core/clock.js"
import { useHoverStore, useStoreValue, type HoverStore } from "../core/hover.js"
import { ChartLegend, type LegendItem } from "../core/legend.js"
import { allIntegers, isTime, linear, linearTicks, nearestIndex, timeTicks, toNumber, valueDomain, type Domain, type XValue } from "../core/scales.js"
import { seriesAttrs, slotFor, type ChartTone } from "../core/series.js"
import type { ChartTableModel, ChartTableValue } from "../core/table.js"
import type { ChartTier } from "../core/tier.js"
import { ChartTooltip, TooltipBody, type TooltipRow } from "../core/tooltip.js"

export interface LineSeries {
  key: string
  label: string
  /** One value per x; null is a gap (the line breaks, it never bridges). */
  data: readonly (number | null)[]
  /** Categorical slot 1–8; defaults to the series' position. */
  slot?: number
  /** Status tone, only when the whole series means that state. */
  tone?: ChartTone
}

export interface Threshold {
  /** The value where the band starts; it runs up to the next threshold or the top. */
  value: number
  tone: "warning" | "danger" | "success" | "info"
  /** "Warning", "Critical". */
  label?: string
}

export interface Marker {
  /** Horizontal coordinate or accessor. */
  x: XValue
  /** "Agent restarted", "Patch Tuesday". */
  label: string
  tone?: ChartTone
}

export interface LineChartProps extends ChartCommonProps, ValueFormat {
  /** Shared x values, ascending: Dates for time series, numbers otherwise. */
  x: readonly XValue[]
  /** Chart series with stable identifiers, labels and typed values. */
  series: readonly LineSeries[]
  /** Fixed value range (percentages: [0, 100]). Defaults to the data, rounded to nice ticks. */
  domain?: Domain
  /** The Sparkline wash under each line. Defaults on for a single series. */
  area?: boolean
  /** Stack the series as bands (parts of a total). Implies area. */
  stacked?: boolean
  /** Status bands. With one series, the line itself takes the tone above each threshold. */
  thresholds?: readonly Threshold[]
  /** Events on the x axis. */
  markers?: readonly Marker[]
  /** Label for x in the table and readout ("Time", "Sample"). */
  xLabel?: string
  /** Format a numeric x. */
  formatX?: (x: number) => string
  /** "Now" for relative times in the readout. Defaults to the clock. */
  now?: Date
}

interface Prepared {
  xs: number[]
  time: boolean
  visible: LineSeries[]
  /** Overrides for named content slots. */
  slots: Map<string, number>
  /** Per visible series, the y used for drawing (the stacked top for stacks). */
  tops: Map<string, (number | null)[]>
  bottoms: Map<string, number[]> | null
  domain: Domain
  /** Every value is a whole number: y ticks stay whole. */
  integer: boolean
}

function prepare(
  x: readonly XValue[],
  series: readonly LineSeries[],
  domain: Domain | undefined,
  stacked: boolean | undefined,
  thresholds: readonly Threshold[] | undefined,
  hidden: ReadonlySet<string>
): Prepared {
  const xs = x.map(toNumber)
  const slots = new Map(series.map((item, index) => [item.key, slotFor(index, item.slot)]))
  const visible = series.filter((item) => !hidden.has(item.key))
  const tops = new Map<string, (number | null)[]>()
  let bottoms: Map<string, number[]> | null = null
  if (stacked) {
    bottoms = new Map()
    let running = xs.map(() => 0)
    for (const item of visible) {
      const base = running
      const top = base.map((value, index) => value + (item.data[index] ?? 0))
      bottoms.set(item.key, base)
      tops.set(item.key, top)
      running = top
    }
  } else for (const item of visible) tops.set(item.key, [...item.data])
  const all: Array<number | null> = []
  for (const values of tops.values()) all.push(...values)
  for (const threshold of thresholds ?? []) all.push(threshold.value)
  return {
    xs,
    time: isTime(x),
    visible,
    slots,
    tops,
    bottoms,
    domain: valueDomain(all, domain, { zero: Boolean(stacked) || series.length === 1 }),
    // Whole counts (alerts, devices) keep whole-number ticks.
    integer: allIntegers(series.flatMap((item) => item.data)),
  }
}

/**
 * Lines and areas over time — one visual language with Sparkline: the same monotone curve,
 * 2px stroke, gradient wash and ringed end dot, then axes, a legend and a crosshair as the
 * box grows.
 *
 *   micro    the lines only (a multi-series sparkline) with the latest values as a trail
 *   compact  title, passive legend or latest value; the plot with its top gridline and the
 *            first and last x labels
 *   full     y gridlines and labels, x labels, threshold bands and markers, an interactive
 *            legend, and the crosshair: one series' readout replaces its value in the head
 *            (Metric's model); several series show the glass tooltip
 */
export function LineChart(props: LineChartProps) {
  const { label, title, state = "ready", series, x, unit, format, xLabel = "Time", formatX, area, stacked, now, thresholds, markers, domain, ...rest } = props
  const [hidden, setHidden] = useState<ReadonlySet<string>>(() => new Set())
  const store = useHoverStore()
  const prepared = useMemo(() => prepare(x, series, domain, stacked, thresholds, hidden), [x, series, domain, stacked, thresholds, hidden])
  const locale = useLocale(props.locale)
  const fmt: LocalizedFormat = useMemo(() => ({ unit, format, locale }), [unit, format, locale])
  const single = series.length === 1
  const showArea = stacked || (area ?? single)
  const xText = (index: number) => {
    const value = x[index]
    if (value === undefined) return ""
    if (value instanceof Date) return formatInstant(value, spanOf(prepared.xs), locale)
    return formatX ? formatX(value) : formatTick(value, 1, { locale })
  }

  const legendItems: LegendItem[] = series.map((item) => ({
    key: item.key,
    label: item.label,
    slot: prepared.slots.get(item.key),
    tone: item.tone,
    shape: showArea && stacked ? "box" : "line",
  }))

  const table = useMemo(() => lineTable(x, series, fmt, xLabel, formatX), [x, series, fmt, xLabel, formatX])

  const toggle = (key: string) =>
    setHidden((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const head = (tier: ChartTier): ReactNode => {
    if (single) {
      const only = series[0]!
      return <Readout store={store} series={only} fmt={fmt} xText={xText} x={x} now={now} interactive={tier === "full"} named={Boolean(title)} />
    }
    return <ChartLegend items={legendItems} hidden={hidden} onToggle={tier === "full" ? toggle : undefined} />
  }

  const trail = (
    <>
      {prepared.visible.slice(0, single ? 1 : 3).map((item) => (
        <span key={item.key} className="fa-chart-figure">
          {single ? null : <span className="fa-chart-key" data-shape="line" {...seriesAttrs(prepared.slots.get(item.key), item.tone)} />}
          <span className="fa-chart-figure-value">{formatValue(lastValue(item.data), fmt)}</span>
        </span>
      ))}
    </>
  )

  return (
    <ChartFrame
      {...rest}
      kind="line"
      label={label}
      title={title}
      state={state}
      table={table}
      head={head}
      compactHead
      trail={trail}
      trailOptional={!single}
      trailSize={single ? "value" : "figure"}
    >
      {(box) => (
        <LinePlot
          box={box}
          prepared={prepared}
          store={store}
          stacked={Boolean(stacked)}
          area={Boolean(showArea)}
          thresholds={thresholds}
          markers={markers}
          fmt={fmt}
          label={label}
          xText={xText}
          now={now}
          formatX={formatX}
        />
      )}
    </ChartFrame>
  )
}

/** An area chart: the line chart with its wash (and `stacked` for parts of a total). */
export function AreaChart(props: LineChartProps) {
  return <LineChart area {...props} />
}

const spanOf = (xs: readonly number[]) => (xs.length > 1 ? xs[xs.length - 1]! - xs[0]! : 0)

function lastValue(data: readonly (number | null)[]) {
  for (let index = data.length - 1; index >= 0; index--) {
    const value = data[index]
    if (value !== null && value !== undefined) return value
  }
  return null
}

/** One row per sample (every k-th past 500, so the table stays usable). */
function lineTable(x: readonly XValue[], series: readonly LineSeries[], fmt: LocalizedFormat, xLabel: string, formatX?: (x: number) => string): ChartTableModel {
  const step = Math.max(1, Math.ceil(x.length / 500))
  const span = x.length > 1 ? toNumber(x[x.length - 1]!) - toNumber(x[0]!) : 0
  const rows: ChartTableModel["rows"] = []
  const values: NonNullable<ChartTableModel["values"]> = []
  for (let index = 0; index < x.length; index += step) {
    const value = x[index]!
    const row: Record<string, string> = {
      x: value instanceof Date ? formatInstant(value, span, fmt.locale) : formatX ? formatX(value) : String(value),
    }
    const raw: Record<string, ChartTableValue> = { x: value }
    for (const item of series) {
      row[item.key] = formatValue(item.data[index], fmt)
      raw[item.key] = item.data[index] ?? null
    }
    rows.push(row)
    values.push(raw)
  }
  return {
    columns: [{ key: "x", label: step > 1 ? `${xLabel} (1 in ${step} samples)` : xLabel }, ...series.map((item) => ({ key: item.key, label: item.label, numeric: true }))],
    rows,
    values,
  }
}

// ── Readout: Metric's model — the hovered value replaces the latest ─────────────────────

function Readout({
  store,
  series,
  fmt,
  xText,
  x,
  now,
  interactive,
  named,
}: {
  /** External store observed by the component. */
  store: HoverStore
  /** Chart series with stable identifiers, labels and typed values. */
  series: LineSeries
  fmt: LocalizedFormat
  xText: (index: number) => string
  /** Horizontal coordinate or accessor. */
  x: readonly XValue[]
  now?: Date
  interactive: boolean
  /** The title already names the series (R2.1): show no label beside the latest value. */
  named: boolean
}) {
  const hover = useStoreValue(store)
  const clock = useNow(now)
  const index = interactive && hover ? hover.index : null
  const value = index !== null ? series.data[index] : lastValue(series.data)
  const at = index !== null ? x[index] : undefined
  const meta = index !== null ? (at instanceof Date ? `${xText(index)} · ${formatRelative(at, clock)}` : xText(index)) : named ? null : series.label
  return (
    <span className="fa-chart-readout" data-hovering={index !== null ? "" : undefined}>
      {meta ? <span className="fa-chart-readout-meta">{meta}</span> : null}
      <data className="fa-chart-readout-value" value={value ?? undefined}>
        {formatValue(value, fmt)}
      </data>
    </span>
  )
}

// ── The plot ────────────────────────────────────────────────────────────────────────────

interface LinePlotProps {
  box: PlotBox
  prepared: Prepared
  /** External store observed by the component. */
  store: HoverStore
  stacked: boolean
  area: boolean
  thresholds?: readonly Threshold[]
  markers?: readonly Marker[]
  fmt: LocalizedFormat
  label: string
  xText: (index: number) => string
  now?: Date
  formatX?: (x: number) => string
}

interface DrawnSeries {
  /** The typed item displayed or acted upon. */
  item: LineSeries
  /** Named content slot. */
  slot: number
  /** Number of text or skeleton lines. */
  lines: string[]
  areas: string[]
  end: Point | null
  /** Pixel y per index (full data), for the hover dots. */
  ys: (number | null)[]
}

const LinePlot = memo(function LinePlot({ box, prepared, store, stacked, area, thresholds, markers, fmt, label, xText, now, formatX }: LinePlotProps) {
  const clock = useNow(now)
  const id = useId()
  const svgRef = useRef<SVGSVGElement>(null)
  const plotRef = useRef<HTMLDivElement>(null)
  const { width, height, tier, rem } = box
  const { xs, visible, slots, tops, bottoms, domain, time } = prepared
  const full = tier === "full"
  const compact = tier === "compact"

  const yTicks = useMemo(() => linearTicks(domain, height - 2 * rem, undefined, { integer: prepared.integer }), [domain, height, rem, prepared.integer])
  const yLabels = useMemo(() => yTicks.values.map((tick) => formatTick(tick, yTicks.step, fmt)), [yTicks, fmt])
  const inset = cartesianInset({ tier, rem, yLabels, xAxis: full || compact })
  const x0 = inset.left
  const x1 = width - inset.right
  const y0 = inset.top
  const y1 = height - inset.bottom
  const first = xs[0] ?? 0
  const last = xs[xs.length - 1] ?? 1
  const px = useMemo(() => linear([first, last === first ? first + 1 : last], [x0, x1]), [first, last, x0, x1])
  const py = useMemo(() => linear(domain, [y1, y0]), [domain, y0, y1])

  const drawn = useMemo<DrawnSeries[]>(() => {
    const budget = Math.max(64, Math.round((x1 - x0) * 1.5))
    return visible.map((item) => {
      const values = tops.get(item.key) ?? []
      const base = bottoms?.get(item.key)
      const points = values.map((value, index) => ({ x: px(xs[index]!), y: value === null ? null : py(value), index }))
      const runs = segments(points)
      const lines: string[] = []
      const areas: string[] = []
      for (const run of runs) {
        let kept = run
        if (xs.length > DECIMATE_ABOVE && run.length > budget) {
          const keep = lttbIndices(
            run.map((p) => p.x),
            run.map((p) => p.y),
            Math.max(3, Math.round((budget * run.length) / xs.length))
          )
          kept = keep.map((k) => run[k]!)
        }
        const pts = kept.map((p) => ({ x: p.x, y: p.y as number }))
        lines.push(linePath(pts))
        if (area) {
          if (base) {
            const lower = kept.map((p) => ({ x: p.x, y: py(base[p.index] ?? 0) }))
            areas.push(bandPath(pts, lower))
          } else areas.push(areaPath(pts, py(Math.max(domain[0], Math.min(domain[1], 0)))))
        }
      }
      const lastRun = runs[runs.length - 1]
      const end = lastRun?.length ? { x: lastRun[lastRun.length - 1]!.x, y: lastRun[lastRun.length - 1]!.y as number } : null
      return { item, slot: slots.get(item.key) ?? 1, lines, areas, end, ys: points.map((p) => p.y) }
    })
  }, [visible, tops, bottoms, xs, px, py, area, slots, x0, x1, domain])

  // x ticks: time scales get calendar-aware ticks; numbers get nice linear ticks.
  const xTicks = useMemo(() => {
    if (!(full || compact) || xs.length < 2) return []
    if (compact) {
      const ends = [0, xs.length - 1]
      return ends.map((index) => ({ x: px(xs[index]!), label: time ? formatClock(new Date(xs[index]!), fmt.locale) : formatX ? formatX(xs[index]!) : String(xs[index]) }))
    }
    if (time) {
      const ticks = timeTicks([new Date(first), new Date(last)], x1 - x0)
      const labels = formatTimeTicks(ticks, fmt.locale)
      return ticks.map((tick, index) => ({ x: px(tick.getTime()), label: labels[index]! }))
    }
    const { values, step } = linearTicks([first, last], x1 - x0, 88)
    return values.map((value) => ({ x: px(value), label: formatX ? formatX(value) : formatTick(value, step, { locale: fmt.locale }) }))
  }, [full, compact, xs, px, time, first, last, x0, x1, formatX, fmt.locale])

  // Thresholds: bands up to the next threshold (or the top), and a gradient that recolours a
  // single series where it crosses into a band.
  const sortedThresholds = useMemo(() => (thresholds ?? []).toSorted((a, b) => a.value - b.value), [thresholds])
  const toned = visible.length === 1 && !stacked && sortedThresholds.length > 0
  const gradientStops = useMemo(() => {
    if (!toned) return []
    const span = y1 - y0 || 1
    const stops: Array<{ offset: number; tone?: string }> = []
    // userSpaceOnUse from y0 (top, offset 0) to y1 (bottom, offset 1).
    const reversed = sortedThresholds.toReversed()
    let previousTone: string | undefined = reversed[0]?.tone
    stops.push({ offset: 0, tone: previousTone })
    for (let index = 0; index < reversed.length; index++) {
      const threshold = reversed[index]!
      const offset = Math.min(1, Math.max(0, (py(threshold.value) - y0) / span))
      const below = reversed[index + 1]?.tone
      stops.push({ offset, tone: previousTone }, { offset, tone: below })
      previousTone = below
    }
    stops.push({ offset: 1, tone: undefined })
    return stops
  }, [toned, sortedThresholds, py, y0, y1])

  // Hide the end dots while the crosshair is out (Sparkline does the same).
  useEffect(
    () =>
      store.subscribe(() => {
        svgRef.current?.toggleAttribute("data-hovering", store.get() !== null)
      }),
    [store]
  )

  const locate = (lx: number) => (xs.length ? nearestIndex(xs, first + ((lx - x0) / Math.max(1, x1 - x0)) * (last - first)) : null)
  const anchor = (index: number) => {
    const ys = drawn.map((d) => d.ys[index]).filter((v): v is number => v !== null && v !== undefined)
    return { x: px(xs[index] ?? first), y: ys.length ? Math.min(...ys) : (y0 + y1) / 2 }
  }
  const valueText = (index: number) =>
    `${xText(index)} · ${visible.map((item) => `${item.label} ${formatValue(item.data[index], fmt)}`).join(", ")}`

  const zeroY = domain[0] <= 0 && domain[1] >= 0 ? 0 : undefined

  return (
    <div ref={plotRef} className="fa-chart-layer">
      <svg ref={svgRef} className="fa-chart-svg" width={width} height={height} aria-hidden>
        <defs>
          {drawn.map(({ item, slot }) => (
            <linearGradient key={item.key} id={`${id}-wash-${item.key}`} x1="0" y1="0" x2="0" y2="1" {...seriesAttrs(slot, item.tone)}>
              <stop offset="0" className={stacked ? "fa-chart-band-top" : "fa-chart-wash-top"} />
              <stop offset="1" className={stacked ? "fa-chart-band-bottom" : "fa-chart-wash-bottom"} />
            </linearGradient>
          ))}
          {toned ? (
            <linearGradient id={`${id}-tone`} gradientUnits="userSpaceOnUse" x1="0" y1={y0} x2="0" y2={y1} {...seriesAttrs(drawn[0]?.slot, drawn[0]?.item.tone)}>
              {gradientStops.map((stop, index) => (
                <stop key={index} offset={stop.offset} className="fa-chart-tone-stop" data-tone={stop.tone} />
              ))}
            </linearGradient>
          ) : null}
        </defs>

        {full || compact ? (
          full ? (
            <YGrid ticks={yTicks.values} y={py} x0={x0} x1={x1} baseline={zeroY} />
          ) : (
            <g className="fa-chart-axis" aria-hidden>
              <line className="fa-chart-grid" x1={x0} x2={x1} y1={Math.round(y0) + 0.5} y2={Math.round(y0) + 0.5} />
              <line className="fa-chart-grid" data-baseline="" x1={x0} x2={x1} y1={Math.round(y1) - 0.5} y2={Math.round(y1) - 0.5} />
            </g>
          )
        ) : null}

        {full || compact
          ? sortedThresholds.map((threshold, index) => {
              const top = sortedThresholds[index + 1]?.value ?? domain[1]
              const ty = Math.round(py(threshold.value)) + 0.5
              return (
                <g key={`${threshold.value}-${threshold.tone}`} aria-hidden>
                  {full ? <rect className="fa-chart-band" data-tone={threshold.tone} x={x0} width={Math.max(0, x1 - x0)} y={py(top)} height={Math.max(0, py(threshold.value) - py(top))} /> : null}
                  <line className="fa-chart-threshold" data-tone={threshold.tone} x1={x0} x2={x1} y1={ty} y2={ty} />
                </g>
              )
            })
          : null}

        {full
          ? (markers ?? []).map((marker) => {
              const mx = Math.round(px(toNumber(marker.x))) + 0.5
              return (
                <g key={`${toNumber(marker.x)}-${marker.label}`} className="fa-chart-marker" {...(marker.tone ? seriesAttrs(undefined, marker.tone) : {})} aria-hidden>
                  <line className="fa-chart-marker-rule" x1={mx} x2={mx} y1={y0} y2={y1} />
                  <circle className="fa-chart-marker-dot" cx={mx} cy={y0} r={0.25 * rem} />
                </g>
              )
            })
          : null}

        {drawn.map(({ item, slot, lines, areas, end }, order) => (
          <g key={item.key} className="fa-chart-series" {...seriesAttrs(slot, item.tone)}>
            {areas.map((d, index) => (
              <path
                key={`a${index}`}
                className="fa-chart-area"
                data-stacked={stacked ? "" : undefined}
                fill={`url(#${id}-wash-${item.key})`}
                style={{ d: cssPath(d) } as CSSProperties}
              />
            ))}
            {lines.map((d, index) => (
              <path
                key={`l${index}`}
                className="fa-chart-line"
                data-enter=""
                pathLength={1}
                style={{ d: cssPath(d), ...(toned && order === 0 ? { stroke: `url(#${id}-tone)` } : {}) } as CSSProperties}
              />
            ))}
            {end && (tier !== "micro" || visible.length <= 3) ? (
              <circle className="fa-chart-dot fa-chart-end" data-enter="" cx={end.x} cy={end.y} r={0.3125 * rem} {...(toned ? toneAt(sortedThresholds, item.data) : {})} />
            ) : null}
          </g>
        ))}

      </svg>
      {full || compact ? (
        <div className="fa-chart-labels" aria-hidden>
          {full ? <YLabels ticks={yTicks.values} step={yTicks.step} y={py} x0={x0} format={fmt} gap={0.5 * rem} /> : null}
          {full
            ? sortedThresholds.map((threshold) =>
                threshold.label ? (
                  <ChartText key={threshold.value} className="fa-chart-threshold-label" data-tone={threshold.tone} x={x1 - 0.375 * rem} y={Math.round(py(threshold.value)) + 0.25 * rem} anchor="end" baseline="top">
                    {threshold.label} · {formatValue(threshold.value, fmt)}
                  </ChartText>
                ) : null
              )
            : null}
          {full
            ? (markers ?? []).map((marker) => {
                const mx = Math.round(px(toNumber(marker.x))) + 0.5
                const right = mx > x0 + (x1 - x0) * 0.7
                return (
                  <ChartText key={`${toNumber(marker.x)}-${marker.label}`} className="fa-chart-marker-label" x={right ? mx - 0.5 * rem : mx + 0.5 * rem} y={y0} anchor={right ? "end" : "start"} width={(right ? mx - x0 : x1 - mx) - 0.75 * rem}>
                    {marker.label}
                  </ChartText>
                )
              })
            : null}
          {xTicks.length ? <XLabels ticks={xTicks} y={y1 + 0.375 * rem} x0={x0} x1={x1} rem={rem} /> : null}
        </div>
      ) : null}

      {full ? (
        <>
          <HoverLayer store={store} drawn={drawn} px={px} xs={xs} y0={y0} y1={y1} width={width} height={height} rem={rem} toned={toned} thresholds={sortedThresholds} />
          <HitLayer store={store} count={xs.length} locate={(lx) => locate(lx)} anchor={anchor} snap label={`${label} — inspect values`} valueText={valueText} />
          {visible.length > 1 ? (
            <ChartTooltip store={store} anchor={plotRef}>
              {(hover) => {
                const at = prepared.xs[hover.index]
                const rows: TooltipRow[] = visible.map((item) => ({
                  key: item.key,
                  label: item.label,
                  value: formatValue(item.data[hover.index], fmt),
                  slot: slots.get(item.key),
                  tone: item.tone,
                  shape: stacked ? "box" : "line",
                }))
                const total = stacked ? visible.reduce((sum, item) => sum + (item.data[hover.index] ?? 0), 0) : null
                const marker = (markers ?? []).find((m) => nearestIndex(xs, toNumber(m.x)) === hover.index)
                return (
                  <TooltipBody
                    title={xText(hover.index)}
                    meta={time && at !== undefined ? formatRelative(new Date(at), clock) : undefined}
                    rows={stacked ? rows.toReversed() : rows}
                    footer={
                      total !== null || marker ? (
                        <>
                          {total !== null ? `Total ${formatValue(total, fmt)}` : null}
                          {total !== null && marker ? " · " : null}
                          {marker?.label}
                        </>
                      ) : undefined
                    }
                  />
                )
              }}
            </ChartTooltip>
          ) : null}
          <LiveRegion store={store} text={valueText} />
        </>
      ) : null}
    </div>
  )
})

/** The tone a single toned series' end dot wears: the band its latest value is in. */
function toneAt(thresholds: readonly Threshold[], data: readonly (number | null)[]) {
  const value = lastValue(data)
  if (value === null) return {}
  let tone: string | undefined
  for (const threshold of thresholds) if (value >= threshold.value) tone = threshold.tone
  return tone ? { "data-tone": tone, "data-slot": undefined } : {}
}

function HoverLayer({
  store,
  drawn,
  px,
  xs,
  y0,
  y1,
  width,
  height,
  rem,
  toned,
  thresholds,
}: {
  /** External store observed by the component. */
  store: HoverStore
  drawn: DrawnSeries[]
  px: (value: number) => number
  xs: number[]
  y0: number
  y1: number
  /** Available width or named width tier. */
  width: number
  /** Available height used for the component’s size tier. */
  height: number
  /** Current pixel size of one rem used for layout measurement. */
  rem: number
  toned: boolean
  thresholds: readonly Threshold[]
}) {
  const hover = useStoreValue(store)
  if (!hover) return null
  const x = Math.round(px(xs[hover.index] ?? 0)) + 0.5
  return (
    <svg className="fa-chart-overlay" width={width} height={height} aria-hidden>
      <line className="fa-chart-crosshair" x1={x} x2={x} y1={y0} y2={y1} />
      {drawn.map(({ item, slot, ys }) => {
        const y = ys[hover.index]
        if (y === null || y === undefined) return null
        const value = item.data[hover.index]
        let tone = item.tone as string | undefined
        if (toned && value !== null && value !== undefined) for (const t of thresholds) if (value >= t.value) tone = t.tone
        return <circle key={item.key} className="fa-chart-dot" cx={px(xs[hover.index] ?? 0)} cy={y} r={0.3125 * rem} {...seriesAttrs(slot, tone)} />
      })}
    </svg>
  )
}

/** Announces the keyboard cursor's position politely (pointer moves stay silent). */
export function LiveRegion({ store, text }: { store: HoverStore; text: (index: number) => string }) {
  const hover = useStoreValue(store)
  return (
    <span className="sr-only" aria-live="polite">
      {hover?.via === "keyboard" ? text(hover.index) : ""}
    </span>
  )
}
