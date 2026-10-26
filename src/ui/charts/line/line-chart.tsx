import { lineMessages, getLineMessages } from "./messages.js"
import { memo, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ComponentProps, type CSSProperties, type KeyboardEvent, type ReactNode } from "react"
import { IconZoomOut } from "../../../icons/generated/icons.js"
import { useMessages } from "../../../lib/i18n/use-messages.js"
import { Button } from "../../button/index.js"
import { BrushStrip } from "../core/brush.js"
import { cartesianInset, XLabels, YGrid, YLabels } from "../core/axes.js"
import { DECIMATE_ABOVE, lttbIndices } from "../core/decimate.js"
import { ChartFrame, type ChartCommonProps, type PlotBox } from "../core/frame.js"
import { formatClock, formatInstant, formatRelative, formatTick, formatTimeTicks, formatValue, type LocalizedFormat, type ValueFormat } from "../core/format.js"
import { useLocale } from "../../../lib/locale/use-locale.js"
import { areaPath, bandPath, cssPath, gapBridges, linePath, segments, type Point } from "../core/geometry.js"
import { HitLayer, linearNav } from "../core/hit.js"
import { useNow } from "../core/clock.js"
import { createStore, useHoverStore, useStoreValue, type HoverStore, type Store } from "../core/hover.js"
import { ChartLegend, type LegendItem } from "../core/legend.js"
import { statusThresholds, resolveBands, toneOf, type Marker, type ReferenceBand, type Threshold } from "../core/reference.js"
import { MarkerMarks, placeMarkers, ReferenceLabels, ReferenceMarks, useReferenceNotes } from "../core/reference-layer.js"
import { allIntegers, isTime, linear, linearTicks, nearestIndex, timeTicks, toNumber, valueDomain, type Domain, type XValue } from "../core/scales.js"
import { seriesAttrs, slotFor, type ChartTone } from "../core/series.js"
import type { ChartTableModel, ChartTableValue } from "../core/table.js"
import type { ChartTier } from "../core/tier.js"
import { ChartTooltip, TooltipBody, type TooltipRow } from "../core/tooltip.js"
import { chartViewMessages } from "../core/view-messages.js"
import { useZoomGestures, previewMatrix } from "../core/zoom-gestures.js"
import { insideIndices, panWindow, revealIndex, useXWindow, windowIndices, zoomWindow, type XDomain, type XWindow } from "../core/zoom.js"

export type { Marker, ReferenceBand, Threshold } from "../core/reference.js"

export interface LineSeries {
  key: string
  label: string
  /** One value per x; null is a gap: the line breaks there, or with `gaps="bridge"` a dashed line joins across it. */
  data: readonly (number | null)[]
  /** Categorical slot 1–8; defaults to the series' position. */
  slot?: number
  /** Status tone, only when the whole series means that state. */
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
  /**
   * Lines across the plot at values: limits, targets, averages. Each label sits at the line's
   * end. A status tone means a value past the line is in that state: with one series the line
   * takes the tone above it, and without `bands` the range up to the next status threshold is
   * shaded.
   */
  thresholds?: readonly Threshold[]
  /** Shaded ranges on the value axis (a normal operating range). Given, they replace the shading status thresholds imply. */
  bands?: readonly ReferenceBand[]
  /** Events on the x axis (deploys, incidents): a rule with its label, in the tooltip and the table. */
  markers?: readonly Marker[]
  /**
   * Zoom the x axis in the full tier: drag across the plot to zoom to a range, Ctrl or ⌘ with
   * the wheel (or a trackpad pinch) to zoom at the pointer, two fingers on touch, and + and −
   * (Shift with the arrows to pan) while the plot has focus. "Reset zoom" appears in the head
   * in a place kept for it. A plain wheel still scrolls the page.
   */
  zoom?: boolean
  /** An overview strip under the plot (full tier): the whole series with a window to drag and resize. Implies a zoomable x domain. */
  brush?: boolean
  /** Controlled visible x range: null shows everything. Use with `onXDomainChange`; omit for uncontrolled. */
  xDomain?: XDomain | null
  /** The uncontrolled starting x range. */
  defaultXDomain?: XDomain | null
  /** Called once per zoom, pan or reset with the new range (Dates for time), or null for the whole range. */
  onXDomainChange?: (domain: XDomain | null) => void
  /** Label for x in the table and readout ("Time", "Sample"). */
  xLabel?: string
  /** Format a numeric x. */
  formatX?: (x: number) => string
  /** "Now" for relative times in the readout. Defaults to the clock. */
  now?: Date
  /**
   * Click, Enter or Space on a point: its index and x (jump another view to that time). While
   * set, the plot shows a pointer cursor and its accessible name says Enter selects.
   */
  onActivate?: (index: number, x: XValue) => void
  /** The chosen x, drawn as a rule, or an [from, to] range, drawn as a band. */
  selected?: XValue | readonly [XValue, XValue]
  /**
   * How a line meets missing samples (null). `break` (the default) leaves a hole. `bridge`
   * joins the last reading before each gap to the first after it with a straight, muted dashed
   * line that says "no samples here": it is never a value, so the crosshair, tooltip, readout
   * and table still show none at a gap. Never before the first reading or after the last, and
   * not for stacked charts.
   */
  gaps?: "break" | "bridge"
  /** With `gaps="bridge"`, bridge only gaps whose ends are at most this far apart, in x units (milliseconds for time). Default: every gap. */
  maxBridge?: number
}

/** A bridge's tooltip (its native SVG title). */
function getGAP_BRIDGE_TITLE(messages: typeof lineMessages.defaults) { return messages.gapLabel }
/** English defaults; rendered controls resolve their locale's messages. */
export const GAP_BRIDGE_TITLE = getGAP_BRIDGE_TITLE(lineMessages.defaults)

/** The sentence a chart with bridges adds to its accessible description. */
function getGAP_BRIDGE_NOTE(messages: typeof lineMessages.defaults) { return messages.gapDescription }
/** English defaults; rendered controls resolve their locale's messages. */
export const GAP_BRIDGE_NOTE = getGAP_BRIDGE_NOTE(lineMessages.defaults)


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
  bands: readonly ReferenceBand[] | undefined,
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
  for (const band of bands ?? []) all.push(band.from, band.to)
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
 *            legend, the crosshair and the glass tooltip at the cursor (every visible series,
 *            one or more); with one series the hovered value also replaces the latest in the
 *            head (Metric's model)
 */
export function LineChart(props: LineChartProps) {
  const messages = useMessages(lineMessages, { locale: props.locale })
  const {
    label,
    title,
    state = "ready",
    series,
    x,
    unit,
    format,
    xLabel: xLabelProp,
    formatX,
    area,
    stacked,
    now,
    thresholds,
    bands,
    markers,
    domain,
    onActivate,
    selected,
    gaps = "break",
    maxBridge,
    zoom = false,
    brush = false,
    xDomain,
    defaultXDomain,
    onXDomainChange,
    ...rest
  } = props
  const xLabel = xLabelProp ?? messages.time
  const [hidden, setHidden] = useState<ReadonlySet<string>>(() => new Set())
  const store = useHoverStore()
  const prepared = useMemo(() => prepare(x, series, domain, stacked, thresholds, bands, hidden), [x, series, domain, stacked, thresholds, bands, hidden])
  const locale = useLocale(props.locale)
  const t = useMessages(chartViewMessages, { locale })
  const fmt: LocalizedFormat = useMemo(() => ({ unit, format, locale }), [unit, format, locale])
  const single = series.length === 1
  const showArea = stacked || (area ?? single)
  const windowed = zoom || brush || xDomain !== undefined || defaultXDomain !== undefined
  const view = useXWindow({ xs: prepared.xs, time: prepared.time, value: xDomain, defaultValue: defaultXDomain, onChange: onXDomainChange })
  // A gesture's window before it is committed: the plot and the brush style themselves from it.
  const [preview] = useState(() => createStore<XWindow | null>(null))
  // Stable while its inputs are, so the memoised plot does not redraw for a new function.
  const xText = useCallback(
    (index: number) => {
      const value = x[index]
      if (value === undefined) return ""
      if (value instanceof Date) return formatInstant(value, spanOf(prepared.xs), locale)
      return formatX ? formatX(value) : formatTick(value, 1, { locale })
    },
    [x, prepared.xs, locale, formatX]
  )
  const atText = useCallback(
    (at: XValue | number) => {
      const value = typeof at === "number" && prepared.time ? new Date(at) : at
      if (value instanceof Date) return formatInstant(value, spanOf(prepared.xs), locale)
      return formatX ? formatX(value) : formatTick(value, 1, { locale })
    },
    [prepared.time, prepared.xs, locale, formatX]
  )

  const legendItems: LegendItem[] = series.map((item) => ({
    key: item.key,
    label: item.label,
    slot: prepared.slots.get(item.key),
    tone: item.tone,
    shape: showArea && stacked ? "box" : "line",
  }))

  // Stable while its inputs are, so the memoised plot does not redraw for a new arrow.
  const activate = useMemo(() => (onActivate ? (index: number) => onActivate(index, x[index]!) : undefined), [onActivate, x])

  const notes = useReferenceNotes({ thresholds, bands, markers, fmt, xText: atText })
  const table = useMemo(() => lineTable(x, series, fmt, xLabel, formatX, markers, t.eventColumn, notes), [x, series, fmt, xLabel, formatX, markers, t.eventColumn, notes])
  const bridge = gaps === "bridge" && !stacked
  const bridged = useMemo(
    () => bridge && series.some((item) => gapBridges(item.data, prepared.xs, maxBridge).length > 0),
    [bridge, series, prepared.xs, maxBridge]
  )
  const note = [bridged ? getGAP_BRIDGE_NOTE(messages) : null, ...notes].filter(Boolean).join(" ") || undefined

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

  const commit = view.commit
  const tools =
    zoom || brush ? (
      <span className="fa-chart-reset-slot" data-hidden={view.zoomed ? undefined : ""}>
        <Button className="fa-chart-reset" size="xs" variant="ghost" icon={<IconZoomOut />} aria-label={t.resetZoom} disabled={!view.zoomed || state !== "ready"} onClick={() => commit(null)} />
      </span>
    ) : undefined
  const foot =
    brush && prepared.xs.length > 1 ? (
      <BrushStrip
        xs={prepared.xs}
        series={series.filter((item) => !hidden.has(item.key)).map((item) => ({ key: item.key, data: item.data, slot: prepared.slots.get(item.key), tone: item.tone }))}
        domain={domain}
        window={view.window}
        full={view.full}
        min={view.min}
        onCommit={commit}
        onPreview={preview.set}
        preview={preview}
        label={label}
        xText={atText}
        locale={locale}
      />
    ) : brush ? null : undefined

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
      note={note}
      tools={tools}
      foot={foot}
    >
      {(box) => (
        <LinePlot
          box={box}
          prepared={prepared}
          store={store}
          stacked={Boolean(stacked)}
          area={Boolean(showArea)}
          thresholds={thresholds}
          bands={bands}
          markers={markers}
          fmt={fmt}
          label={label}
          xText={xText}
          now={now}
          formatX={formatX}
          onActivate={activate}
          selected={selected}
          bridge={bridge}
          maxBridge={maxBridge}
          view={windowed ? view.window : null}
          full={view.full}
          min={view.min}
          zoom={zoom}
          onWindow={windowed ? commit : undefined}
          preview={preview}
          zoomMessages={t}
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

/** One row per sample (every k-th past 500, so the table stays usable); an Event column when there are markers. */
function lineTable(
  x: readonly XValue[],
  series: readonly LineSeries[],
  fmt: LocalizedFormat,
  xLabel: string,
  formatX: ((x: number) => string) | undefined,
  markers: readonly Marker[] | undefined,
  eventLabel: string,
  notes: readonly string[]
): ChartTableModel {
  const step = Math.max(1, Math.ceil(x.length / 500))
  const span = x.length > 1 ? toNumber(x[x.length - 1]!) - toNumber(x[0]!) : 0
  const rows: ChartTableModel["rows"] = []
  const values: NonNullable<ChartTableModel["values"]> = []
  // Each marker names the row nearest to it (of the rows the table keeps).
  const events = new Map<number, string[]>()
  if (markers?.length) {
    const kept = Array.from({ length: Math.ceil(x.length / step) }, (_, index) => toNumber(x[index * step]!))
    for (const marker of markers) {
      const row = nearestIndex(kept, toNumber(marker.x))
      if (row < 0) continue
      events.set(row, [...(events.get(row) ?? []), marker.detail ? `${marker.label} (${marker.detail})` : marker.label])
    }
  }
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
    if (markers?.length) {
      const text = events.get(rows.length)?.join("; ") ?? ""
      row.__event = text
      raw.__event = text || null
    }
    rows.push(row)
    values.push(raw)
  }
  return {
    columns: [
      { key: "x", label: step > 1 ? getLineMessages(fmt.locale).sampleInterval(xLabel, step) : xLabel },
      ...series.map((item) => ({ key: item.key, label: item.label, numeric: true })),
      ...(markers?.length ? [{ key: "__event", label: eventLabel }] : []),
    ],
    rows,
    values,
    notes: notes.length ? notes : undefined,
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

/** The tooltip's body; it reads the clock itself, so a tick re-renders the tooltip, not the plot. */
function LineTooltipBody({ at, now, ...props }: Omit<ComponentProps<typeof TooltipBody>, "meta"> & { at: number | undefined; now?: Date }) {
  const clock = useNow(now)
  return <TooltipBody {...props} meta={at !== undefined ? formatRelative(new Date(at), clock) : undefined} />
}

/** Whether `next` is `previous` moved on in time: samples dropped from the start, the rest unchanged. */
function slides(previous: Prepared, next: Prepared) {
  const a = previous.xs
  const b = next.xs
  const shift = b.length ? a.indexOf(b[0]!) : -1
  const overlap = a.length - shift
  if (shift <= 0 || overlap < 2 || b.length < overlap || previous.visible.length !== next.visible.length) return false
  for (let index = 0; index < overlap; index++) if (a[shift + index] !== b[index]) return false
  return next.visible.every((item) => {
    const before = previous.tops.get(item.key)
    const after = next.tops.get(item.key)
    if (!before || !after) return false
    for (let index = 0; index < overlap; index++) if (before[shift + index] !== after[index]) return false
    return true
  })
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
  bands?: readonly ReferenceBand[]
  markers?: readonly Marker[]
  fmt: LocalizedFormat
  label: string
  xText: (index: number) => string
  now?: Date
  formatX?: (x: number) => string
  onActivate?: (index: number) => void
  selected?: XValue | readonly [XValue, XValue]
  /** Join each interior gap with a dashed bridge. */
  bridge: boolean
  maxBridge?: number
  /** The visible x window; null draws the whole range as before. */
  view: XWindow | null
  full: XWindow
  min: number
  /** Pointer, wheel and key zoom in the full tier. */
  zoom: boolean
  /** Set the window (null resets it). */
  onWindow?: (next: XWindow | null) => void
  /** A gesture's uncommitted window. */
  preview: Store<XWindow | null>
  /** The zoom wording (the accessible name's keys, the window announcements). */
  zoomMessages: typeof chartViewMessages.defaults
}

interface DrawnSeries {
  /** The typed item displayed or acted upon. */
  item: LineSeries
  /** Named content slot. */
  slot: number
  /** Number of text or skeleton lines. */
  lines: string[]
  areas: string[]
  /** Dashed straight segments across interior gaps, keyed by the index before the gap. */
  bridges: Array<{ key: number; d: string }>
  end: Point | null
  /** Pixel y per index (full data; null outside the drawn window), for the hover dots. */
  ys: (number | null)[]
}

const ZOOM_SHORTCUTS = "+ - 0 Shift+ArrowLeft Shift+ArrowRight"

const LinePlot = memo(function LinePlot({
  box,
  prepared,
  store,
  stacked,
  area,
  thresholds,
  bands,
  markers,
  fmt,
  label,
  xText,
  now,
  formatX,
  onActivate,
  selected,
  bridge,
  maxBridge,
  view,
  full: fullRange,
  min,
  zoom,
  onWindow,
  preview,
  zoomMessages,
}: LinePlotProps) {
  const messages = useMessages(lineMessages)
  // A live window that moved on (samples dropped at the start, new ones at the end), or a
  // zoom or pan, redraws its paths at once; any other change to the data morphs them (marks.css).
  const [shown, setShown] = useState({ prepared, view, sliding: false })
  if (shown.prepared !== prepared || !sameWindow(shown.view, view))
    setShown({ prepared, view, sliding: shown.prepared !== prepared ? slides(shown.prepared, prepared) : !sameWindow(shown.view, view) || shown.sliding })
  const id = useId()
  const svgRef = useRef<SVGSVGElement>(null)
  const plotRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<SVGGElement>(null)
  const rectRef = useRef<HTMLDivElement>(null)
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
  const w0 = view ? view[0] : first
  const w1 = view ? view[1] : last === first ? first + 1 : last
  const zoomed = view !== null && (w0 > first || w1 < last)
  // Unclamped while zoomed, so the line runs on past the window's edges into the clip.
  const px = useMemo(() => (zoomed ? (value: number) => x0 + ((value - w0) / (w1 - w0 || 1)) * (x1 - x0) : linear([w0, w1 === w0 ? w0 + 1 : w1], [x0, x1])), [zoomed, w0, w1, x0, x1])
  const py = useMemo(() => linear(domain, [y1, y0]), [domain, y0, y1])
  const [i0, i1] = useMemo<[number, number]>(() => (zoomed ? windowIndices(xs, [w0, w1]) : [0, xs.length - 1]), [zoomed, xs, w0, w1])

  const drawn = useMemo<DrawnSeries[]>(() => {
    const budget = Math.max(64, Math.round((x1 - x0) * 1.5))
    const count = i1 - i0 + 1
    return visible.map((item) => {
      const values = tops.get(item.key) ?? []
      const base = bottoms?.get(item.key)
      const ys: (number | null)[] = Array.from({ length: xs.length }, () => null)
      const points: Array<{ x: number; y: number | null; index: number }> = []
      for (let index = i0; index <= i1; index++) {
        const value = values[index]
        const y = value === null || value === undefined ? null : py(value)
        ys[index] = y
        points.push({ x: px(xs[index]!), y, index })
      }
      const runs = segments(points)
      const lines: string[] = []
      const areas: string[] = []
      for (const run of runs) {
        let kept = run
        if (count > DECIMATE_ABOVE && run.length > budget) {
          const keep = lttbIndices(
            run.map((p) => p.x),
            run.map((p) => p.y),
            Math.max(3, Math.round((budget * run.length) / count))
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
      // Straight, between the real readings at each gap's ends: never smoothed into the runs.
      const round = (value: number) => Math.round(value * 100) / 100
      const bridges = bridge
        ? gapBridges(values, xs, maxBridge)
            .filter(([from, to]) => to >= i0 && from <= i1)
            .map(([from, to]) => {
              const a = { x: px(xs[from]!), y: py(values[from] as number) }
              const b = { x: px(xs[to]!), y: py(values[to] as number) }
              return { key: from, d: `M${round(a.x)},${round(a.y)}L${round(b.x)},${round(b.y)}` }
            })
        : []
      const lastRun = runs[runs.length - 1]
      const tail = lastRun?.[lastRun.length - 1]
      // The end dot marks the latest reading, so only while the window shows it.
      const end = tail && tail.x <= x1 + 0.5 ? { x: tail.x, y: tail.y as number } : null
      return { item, slot: slots.get(item.key) ?? 1, lines, areas, bridges, end, ys }
    })
  }, [visible, tops, bottoms, xs, px, py, area, slots, x0, x1, domain, bridge, maxBridge, i0, i1])

  // x ticks: time scales get calendar-aware ticks; numbers get nice linear ticks.
  const xTicks = useMemo(() => {
    if (!(full || compact) || xs.length < 2) return []
    if (compact) {
      const [a, b] = zoomed ? insideIndices(xs, [w0, w1]) : [0, xs.length - 1]
      return [a, b].map((index) => ({ x: px(xs[index]!), label: time ? formatClock(new Date(xs[index]!), fmt.locale) : formatX ? formatX(xs[index]!) : String(xs[index]) }))
    }
    if (time) {
      const ticks = timeTicks([new Date(w0), new Date(w1)], x1 - x0)
      const labels = formatTimeTicks(ticks, fmt.locale)
      return ticks.map((tick, index) => ({ x: px(tick.getTime()), label: labels[index]! }))
    }
    const { values, step } = linearTicks([w0, w1], x1 - x0, 88)
    return values.map((value) => ({ x: px(value), label: formatX ? formatX(value) : formatTick(value, step, { locale: fmt.locale }) }))
  }, [full, compact, xs, px, time, w0, w1, x0, x1, formatX, fmt.locale, zoomed])

  // Status thresholds recolour a single series where it crosses into their range.
  const status = useMemo(() => statusThresholds(thresholds), [thresholds])
  const shaded = useMemo(() => resolveBands(thresholds, bands, domain[1]), [thresholds, bands, domain])
  const toned = visible.length === 1 && !stacked && status.length > 0
  const gradientStops = useMemo(() => {
    if (!toned) return []
    const span = y1 - y0 || 1
    const stops: Array<{ offset: number; tone?: string }> = []
    // userSpaceOnUse from y0 (top, offset 0) to y1 (bottom, offset 1).
    const reversed = status.toReversed()
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
  }, [toned, status, py, y0, y1])

  const placedMarkers = useMemo(() => placeMarkers(markers, px, x0, x1), [markers, px, x0, x1])
  const geometry = useMemo(() => ({ py, x0, x1, y0, y1, rem }), [py, x0, x1, y0, y1, rem])
  // Threshold labels keep clear of the latest points at the plot's end.
  const avoid = useMemo(() => drawn.flatMap((d) => (d.end && d.end.x > x1 - 8 * rem ? [d.end.y] : [])), [drawn, x1, rem])

  // Hide the end dots while the crosshair is out (Sparkline does the same).
  useEffect(
    () =>
      store.subscribe(() => {
        svgRef.current?.toggleAttribute("data-hovering", store.get() !== null)
      }),
    [store]
  )

  // ── Zoom ──────────────────────────────────────────────────────────────────────────────
  const zoomable = full && zoom && Boolean(onWindow) && xs.length > 2
  const current: XWindow = [w0, w1]
  const geometryRef = useRef({ view: current, full: fullRange, min, x0, x1 })
  useLayoutEffect(() => {
    geometryRef.current = { view: [w0, w1], full: fullRange, min, x0, x1 }
  })
  // A previewed window is drawn as a transform of the committed one; nothing re-renders.
  useEffect(
    () =>
      preview.subscribe(() => {
        const next = preview.get()
        const content = contentRef.current
        if (!content) return
        const g = geometryRef.current
        plotRef.current?.toggleAttribute("data-previewing", next !== null)
        svgRef.current?.toggleAttribute("data-previewing", next !== null)
        if (!next) return content.removeAttribute("transform")
        const { scale, shift } = previewMatrix(g.view, next, g.x0, g.x1)
        content.setAttribute("transform", `matrix(${scale} 0 0 1 ${shift} 0)`)
      }),
    [preview]
  )
  useZoomGestures(plotRef, {
    enabled: zoomable,
    geometry: () => geometryRef.current,
    preview: (next) => preview.set(next),
    commit: (next) => onWindow?.(next),
    rect: rectRef,
    onStart: () => store.set(null),
  })
  // After a zoom the keyboard cursor stays on its sample, moved to the sample's new place.
  useLayoutEffect(() => {
    const hover = store.get()
    const plot = plotRef.current
    if (!hover || hover.via !== "keyboard" || !plot) return
    const box = plot.getBoundingClientRect()
    const at = anchor(hover.index)
    store.set({ ...hover, x: box.left + at.x, y: box.top + at.y })
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- only when the window moves
  }, [w0, w1])

  const onKey = (event: KeyboardEvent<HTMLDivElement>, index: number) => {
    if (!onWindow) return false
    const at = xs[index] ?? (w0 + w1) / 2
    if (event.key === "+" || event.key === "=") onWindow(zoomWindow(current, 0.5, at, fullRange, min))
    else if (event.key === "-" || event.key === "_") onWindow(zoomWindow(current, 2, at, fullRange, min))
    else if (event.key === "0") onWindow(null)
    else if (event.shiftKey && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      onWindow(panWindow(current, (event.key === "ArrowLeft" ? -0.25 : 0.25) * (w1 - w0), fullRange, min))
    } else return false
    return true
  }
  // The cursor's steps reveal the sample they land on, panning a zoomed window.
  const nav = (index: number, key: string) => {
    const next = linearNav(index, key, xs.length)
    if (zoomed && onWindow) {
      const moved = revealIndex(current, xs, next, fullRange, min)
      if (moved !== current) onWindow(moved)
    }
    return next
  }

  const locate = (lx: number) => (xs.length ? nearestIndex(xs, w0 + ((lx - x0) / Math.max(1, x1 - x0)) * (w1 - w0)) : null)
  const anchor = (index: number) => {
    const ys = drawn.map((d) => d.ys[index]).filter((v): v is number => v !== null && v !== undefined)
    return { x: px(xs[index] ?? first), y: ys.length ? Math.min(...ys) : (y0 + y1) / 2 }
  }
  // The selection in plot px: one rule, or a band from the earlier x to the later.
  const selection = useMemo(() => {
    if (selected === undefined || !xs.length) return null
    const clamp = (value: number) => Math.min(x1, Math.max(x0, px(value)))
    const [low, high] = Array.isArray(selected)
      ? ((selected as readonly [XValue, XValue]).map(toNumber).toSorted((a, b) => a - b) as [number, number])
      : [toNumber(selected as XValue), toNumber(selected as XValue)]
    if (px(high) < x0 - 0.5 || px(low) > x1 + 0.5) return null
    return { from: clamp(low), to: clamp(high), low, high }
  }, [selected, xs.length, px, x0, x1])
  const isSelected = (index: number) => {
    if (!selection) return false
    const at = xs[index]!
    // A single selected x matches its nearest sample; a range holds the samples inside it.
    return selection.low === selection.high ? nearestIndex(xs, selection.low) === index : at >= selection.low && at <= selection.high
  }
  const valueText = (index: number) =>
    (isSelected(index) ? messages.selectionLabel : (label: string) => label)(`${xText(index)} · ${new Intl.ListFormat(fmt.locale, { type: "unit" }).format(visible.map((item) => `${item.label} ${formatValue(item.data[index], fmt)}`))}`)

  // A committed zoom, pan or reset is announced politely (the region stays mounted, R20.9).
  const [announcement, setAnnouncement] = useState("")
  const announced = useRef<string | null>(null)
  useEffect(() => {
    const key = `${w0}:${w1}`
    if (announced.current === null) {
      announced.current = key
      return
    }
    if (announced.current === key) return
    announced.current = key
    const [a, b] = insideIndices(xs, [w0, w1])
    setAnnouncement(zoomed ? zoomMessages.showing(xText(a), xText(b)) : zoomMessages.showingAll)
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- announce window changes only
  }, [w0, w1])

  const zeroY = domain[0] <= 0 && domain[1] >= 0 ? 0 : undefined
  const clip = zoomed || zoomable
  const [, lastInside] = zoomed ? insideIndices(xs, [w0, w1]) : [0, xs.length - 1]

  return (
    <div ref={plotRef} className="fa-chart-layer" data-zoom={zoomable ? "" : undefined}>
      <svg ref={svgRef} className="fa-chart-svg" width={width} height={height} data-slide={shown.sliding ? "" : undefined} aria-hidden>
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
          {clip ? (
            <clipPath id={`${id}-clip`}>
              {/* The latest point's dot may stand past the plot's end, as it does unzoomed. */}
              <rect x={x0} y={0} width={Math.max(0, x1 - x0 + (lastInside === xs.length - 1 ? inset.right : 0))} height={height} />
            </clipPath>
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

        {full || compact ? <ReferenceMarks geometry={geometry} thresholds={thresholds ?? []} bands={shaded} shade={full} /> : null}

        <g clipPath={clip ? `url(#${id}-clip)` : undefined}>
          <g ref={contentRef} className="fa-chart-zoom-content">
            {full ? <MarkerMarks markers={placedMarkers} y0={y0} y1={y1} rem={rem} /> : null}

            {(full || compact) && selection ? (
              <g className="fa-chart-selection" aria-hidden>
                {selection.to - selection.from >= 1 ? (
                  <rect className="fa-chart-selection-band" x={selection.from} width={selection.to - selection.from} y={y0} height={Math.max(0, y1 - y0)} />
                ) : (
                  <line className="fa-chart-selection-rule" x1={Math.round(selection.from) + 0.5} x2={Math.round(selection.from) + 0.5} y1={y0} y2={y1} />
                )}
              </g>
            ) : null}

            {drawn.map(({ item, slot, lines, areas, bridges, end }, order) => (
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
                {bridges.map(({ key, d }) => (
                  <path key={`b${key}`} className="fa-chart-bridge" data-enter="" style={{ d: cssPath(d) } as CSSProperties}>
                    <title>{getGAP_BRIDGE_TITLE(messages)}</title>
                  </path>
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
                  <circle className="fa-chart-dot fa-chart-end" data-enter="" cx={end.x} cy={end.y} r={0.3125 * rem} {...(toned ? toneAttrs(toneOf(status, lastValue(item.data))) : {})} />
                ) : null}
              </g>
            ))}
          </g>
        </g>
      </svg>
      {full || compact ? (
        <div className="fa-chart-labels" aria-hidden>
          {full ? <YLabels ticks={yTicks.values} step={yTicks.step} y={py} x0={x0} format={fmt} gap={0.5 * rem} /> : null}
          {full ? <ReferenceLabels geometry={geometry} thresholds={thresholds ?? []} bands={bands ?? []} markers={placedMarkers} fmt={fmt} avoid={avoid} /> : null}
          {xTicks.length ? <XLabels ticks={xTicks} y={y1 + 0.375 * rem} x0={x0} x1={x1} rem={rem} /> : null}
        </div>
      ) : null}

      {full ? (
        <>
          {zoomable ? <div ref={rectRef} className="fa-chart-zoom-rect" style={{ top: y0, height: Math.max(0, y1 - y0) }} aria-hidden /> : null}
          <HoverLayer store={store} drawn={drawn} px={px} xs={xs} y0={y0} y1={y1} width={width} height={height} rem={rem} toned={toned} thresholds={status} />
          <HitLayer
            store={store}
            count={xs.length}
            locate={(lx) => locate(lx)}
            anchor={anchor}
            snap
            initial={lastInside}
            nav={zoomable ? nav : undefined}
            onKey={zoomable ? onKey : undefined}
            keyShortcuts={zoomable ? ZOOM_SHORTCUTS : undefined}
            label={`${onActivate ? messages.inspectValuesEnterSelects(label) : messages.inspectValues(label)}${zoomable ? `, ${zoomMessages.zoomKeys}` : ""}`}
            valueText={valueText}
            cursor={onActivate ? "pointer" : "crosshair"}
            onActivate={onActivate}
          />
          {visible.length > 0 ? (
            <ChartTooltip store={store} anchor={plotRef}>
              {(hover) => {
                const at = prepared.xs[hover.index]
                const rows: TooltipRow[] = visible.map((item) => {
                  const value = item.data[hover.index]
                  // A toned single series keys its row with the band the value is in, as its dot does.
                  const tone = (toned ? toneOf(status, value) : undefined) ?? item.tone
                  return {
                    key: item.key,
                    label: item.label,
                    value: formatValue(value, fmt),
                    slot: slots.get(item.key),
                    tone,
                    shape: stacked ? "box" : "line",
                  }
                })
                // One visible band's total is its own value: no footer for it.
                const total = stacked && visible.length > 1 ? visible.reduce((sum, item) => sum + (item.data[hover.index] ?? 0), 0) : null
                const events = (markers ?? []).filter((m) => nearestIndex(xs, toNumber(m.x)) === hover.index).map((m) => (m.detail ? `${m.label} · ${m.detail}` : m.label))
                return (
                  <LineTooltipBody
                    title={xText(hover.index)}
                    at={time ? at : undefined}
                    now={now}
                    rows={stacked ? rows.toReversed() : rows}
                    footer={
                      total !== null || events.length ? (
                        <>
                          {total !== null ? messages.total(formatValue(total, fmt)) : null}
                          {total !== null && events.length ? " · " : null}
                          {events.join(" · ")}
                        </>
                      ) : undefined
                    }
                  />
                )
              }}
            </ChartTooltip>
          ) : null}
          <LiveRegion store={store} text={valueText} />
          {zoomable || zoomed ? (
            <span className="sr-only" aria-live="polite">
              {announcement}
            </span>
          ) : null}
        </>
      ) : null}
    </div>
  )
})

const sameWindow = (a: XWindow | null, b: XWindow | null) => a === b || (a !== null && b !== null && a[0] === b[0] && a[1] === b[1])

/** CSS hooks for a status tone on a mark that otherwise wears its slot. */
function toneAttrs(tone: string | undefined) {
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
        const tone = (toned ? toneOf(thresholds, value) : undefined) ?? item.tone
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
