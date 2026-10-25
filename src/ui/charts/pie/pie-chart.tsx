import { useMessages } from "../../../lib/i18n/index.js"
import { pieMessages, getPieMessages } from "./messages.js"
import { arc as d3arc, pie as d3pie, type PieArcDatum } from "d3-shape"
import { memo, useMemo, useRef, type CSSProperties } from "react"
import { ChartFrame, type ChartCommonProps, type PlotBox } from "../core/frame.js"
import { centreSize, formatShare, formatValue, type LocalizedFormat, type ValueFormat } from "../core/format.js"
import { useLocale } from "../../../lib/locale/use-locale.js"
import { cssPath } from "../core/geometry.js"
import { HitLayer } from "../core/hit.js"
import { useHoverStore, useStoreValue, type HoverStore } from "../core/hover.js"
import { ChartLegend, type LegendItem } from "../core/legend.js"
import { seriesAttrs, slotFor, SLOT_COUNT, type ChartTone } from "../core/series.js"
import { ProportionStrip } from "../core/strip.js"
import { shareFraction, type ChartTableModel } from "../core/table.js"
import { ChartTooltip, TooltipBody } from "../core/tooltip.js"
import { LiveRegion } from "../line/line-chart.js"

export interface PieSlice {
  key: string
  label: string
  value: number
  /** Named content slot. */
  slot?: number
  /** Status tone when the slice means a state (compliant, pending, failed). */
  tone?: ChartTone
}

export interface PieChartProps extends ChartCommonProps, ValueFormat {
  /** Typed records rendered by the component. */
  data: readonly PieSlice[]
  /** A ring with the total (or `centre`) inside. Pie is the solid disc. */
  donut?: boolean
  /** What the centre says when nothing is hovered. Defaults to the total. */
  centre?: { value: string; label: string }
  /** Label under the centre total ("Endpoints"). */
  totalLabel?: string
  /** Slices past this fold into "Other" (part-to-whole reads at six or fewer). */
  maxSlices?: number
  /** Header for the table's first column. */
  categoryLabel?: string
}

interface Slice extends PieSlice {
  slotKey: number | "other"
}

function fold(data: readonly PieSlice[], max: number, messages = getPieMessages()): Slice[] {
  const slices: Slice[] = data.map((item, index) => ({ ...item, slotKey: item.tone ? 0 : slotFor(index, item.slot) }))
  if (slices.length <= max) return slices
  const head = slices.slice(0, max - 1)
  const rest = slices.slice(max - 1)
  return [...head, { key: "other", label: messages.other(rest.length), value: rest.reduce((sum, item) => sum + item.value, 0), slotKey: "other" }]
}

/**
 * Pie and donut: a part-to-whole at a glance (six slices or fewer; the tail folds into
 * "Other"). The donut's centre is Metric's value: hovering a slice, or arrowing to it,
 * replaces the total with that slice's value and share.
 *
 *   micro    a proportion strip with the leading share as a trail
 *   compact  the ring with its centre value, a key beside it when there is room
 *   full     the ring, centre readout, a list legend with values and shares that
 *            highlights with the ring, and the glass tooltip with the slice at the cursor
 */
export function PieChart(props: PieChartProps) {
  const messages = useMessages(pieMessages, { locale: props.locale })

  const { label, title, state = "ready", data, donut = false, centre, totalLabel: totalLabelProp, maxSlices = 6, unit, format, categoryLabel: categoryLabelProp, ...rest } = props
  const categoryLabel = categoryLabelProp ?? messages.category

  const totalLabel = totalLabelProp ?? messages.total

  const store = useHoverStore()
  const locale = useLocale(props.locale)
  const fmt: LocalizedFormat = useMemo(() => ({ unit, format, locale }), [unit, format, locale])
  const slices = useMemo(() => fold(data, Math.min(maxSlices, SLOT_COUNT), messages), [data, maxSlices, messages])
  const total = useMemo(() => slices.reduce((sum, item) => sum + Math.max(0, item.value), 0), [slices])

  const table = useMemo<ChartTableModel>(
    () => ({
      columns: [
        { key: "label", label: categoryLabel },
        { key: "value", label: messages.value, numeric: true },
        { key: "share", label: messages.share, numeric: true },
      ],
      rows: data.map((item) => ({ label: item.label, value: formatValue(item.value, fmt), share: formatShare(item.value, total, fmt.locale) })),
      values: data.map((item) => ({ value: item.value, share: shareFraction(item.value, total) })),
    }),
    [data, fmt, total, categoryLabel]
  )

  const lead = slices[0]
  const trail = lead ? (
    <span className="fa-chart-figure">
      <span className="fa-chart-figure-label">{lead.label}</span>
      <span className="fa-chart-figure-value">{formatShare(lead.value, total, fmt.locale)}</span>
    </span>
  ) : null

  return (
    <ChartFrame {...rest} kind="pie" label={label} title={title} state={state} table={table} trail={trail}>
      {(box) => <PiePlot box={box} slices={slices} total={total} store={store} donut={donut} centre={centre} totalLabel={totalLabel} fmt={fmt} label={label} />}
    </ChartFrame>
  )
}

/** Display a part-to-whole dataset as a ring, with responsive legends, an accessible data table and optional centre content. */
export function DonutChart(props: Omit<PieChartProps, "donut">) {
  return <PieChart {...props} donut />
}

const sliceAttrs = (slice: Slice) => (slice.slotKey === "other" ? { "data-slot": "other" } : seriesAttrs(slice.slotKey || undefined, slice.tone))

interface PiePlotProps {
  box: PlotBox
  slices: Slice[]
  total: number
  /** External store observed by the component. */
  store: HoverStore
  donut: boolean
  centre?: { value: string; label: string }
  totalLabel: string
  fmt: LocalizedFormat
  label: string
}

const PiePlot = memo(function PiePlot({ box, slices, total, store, donut, centre, totalLabel, fmt, label }: PiePlotProps) {
  const messages = useMessages(pieMessages, { locale: fmt.locale })

  const plotRef = useRef<HTMLDivElement>(null)
  const { width, height, tier, rem } = box
  const full = tier === "full"

  // Ring beside its legend when the box is wide, above it when tall, alone when small.
  const layout = useMemo(() => {
    const legendW = full ? Math.min(18 * rem, width * 0.46) : Math.min(9 * rem, width * 0.44)
    const rows = slices.length * (full ? 1.5 : 1.25) * rem
    const sideD = Math.min(height, width - legendW - (full ? 1.5 : 0.75) * rem)
    const stackD = Math.min(width, height - rows - 0.75 * rem)
    if (sideD >= 6 * rem && sideD >= stackD) return { mode: "side" as const, d: sideD, legendW }
    if (stackD >= 6 * rem) return { mode: "stack" as const, d: stackD, legendW: width }
    return { mode: "alone" as const, d: Math.min(width, height), legendW: 0 }
  }, [full, rem, width, height, slices.length])

  const r = layout.d / 2
  const cx = layout.mode === "stack" ? width / 2 : layout.mode === "alone" ? width / 2 : r
  const cy = layout.mode === "stack" ? r : height / 2
  const inner = donut ? r * (full ? 0.77 : 0.7) : 0
  const pad = 2 / Math.max(1, r)

  const arcs = useMemo(() => {
    const layoutPie = d3pie<Slice>()
      .value((slice) => Math.max(0, slice.value))
      // oxlint-disable-next-line unicorn/no-array-sort -- d3 pie's sort(null): keep the given order
      .sort(null)
      .padAngle(slices.length > 1 ? pad : 0)
    const shape = d3arc<PieArcDatum<Slice>>()
      .innerRadius(inner)
      .outerRadius(r)
      .cornerRadius(donut ? Math.min(0.25 * rem, (r - inner) / 2) : 0.125 * rem)
    return layoutPie(slices).map((datum) => ({ datum, d: shape(datum) ?? "" }))
  }, [slices, inner, r, donut, rem, pad])

  if (tier === "micro") return <ProportionStrip items={slices.map((s) => ({ key: s.key, value: s.value, slot: s.slotKey === "other" ? "other" : s.slotKey || undefined, tone: s.tone }))} width={width} height={height} rem={rem} />

  const angleAt = (lx: number, ly: number) => {
    const dx = lx - cx
    const dy = ly - cy
    const dist = Math.hypot(dx, dy)
    if (dist > r + 4 || dist < inner - 4) return null
    let angle = Math.atan2(dx, -dy)
    if (angle < 0) angle += Math.PI * 2
    const found = arcs.findIndex(({ datum }) => angle >= datum.startAngle && angle <= datum.endAngle)
    return found < 0 ? null : found
  }
  const anchor = (index: number) => {
    const datum = arcs[index]?.datum
    if (!datum) return { x: cx, y: cy }
    const mid = (datum.startAngle + datum.endAngle) / 2
    return { x: cx + Math.sin(mid) * r, y: cy - Math.cos(mid) * r }
  }
  const valueText = (index: number) => {
    const slice = slices[index]
    return slice ? `${slice.label} · ${formatValue(slice.value, fmt)} · ${formatShare(slice.value, total, fmt.locale)}` : ""
  }
  const legendItems: LegendItem[] = slices.map((slice) => ({
    key: slice.key,
    label: slice.label,
    slot: slice.slotKey === "other" ? undefined : slice.slotKey || undefined,
    tone: slice.slotKey === "other" ? "neutral" : slice.tone,
    shape: "dot",
    value: full ? formatValue(slice.value, fmt) : undefined,
    detail: full ? formatShare(slice.value, total, fmt.locale) : undefined,
  }))

  return (
    <div ref={plotRef} className="fa-chart-layer fa-chart-pie" data-layout={layout.mode}>
      <svg className="fa-chart-svg" width={width} height={height} aria-hidden>
        <g transform={`translate(${cx},${cy})`}>
          {arcs.map(({ datum, d }, index) => (
            <path key={datum.data.key} className="fa-chart-arc" {...sliceAttrs(datum.data)} style={{ d: cssPath(d), "--_enter-delay": `calc(var(--duration-instant) * ${index * 0.5})` } as CSSProperties} />
          ))}
        </g>
        <PieHover store={store} arcs={arcs} cx={cx} cy={cy} inner={inner} r={r} rem={rem} donut={donut} />
      </svg>
      {donut ? <Centre store={store} slices={slices} total={total} fmt={fmt} centre={centre} totalLabel={totalLabel} cx={cx} cy={cy} inner={inner} interactive={full} rem={rem} /> : null}
      {layout.mode !== "alone" ? (
        <div
          className="fa-chart-pie-legend"
          style={
            layout.mode === "side"
              ? { insetInlineStart: layout.d + (full ? 1.5 : 0.75) * rem, insetBlock: 0, width: Math.min(layout.legendW, width - layout.d - (full ? 1.5 : 0.75) * rem) }
              : { insetInline: 0, insetBlockStart: layout.d + 0.75 * rem, insetBlockEnd: 0 }
          }
        >
          <LinkedLegend store={store} items={legendItems} interactive={full} />
        </div>
      ) : null}
      {full ? (
        <>
          <HitLayer
            store={store}
            count={slices.length}
            locate={angleAt}
            anchor={anchor}
            label={messages.inspectSlices(label)}
            valueText={valueText}
            initial={0}
            cursor="pointer"
            bounds={{ left: cx - r, top: cy - r, width: 2 * r, height: 2 * r }}
          />
          <ChartTooltip store={store} anchor={plotRef}>
            {(hover) => {
              const slice = slices[hover.index]
              if (!slice) return null
              return (
                <TooltipBody
                  rows={[
                    {
                      key: slice.key,
                      label: slice.label,
                      value: formatValue(slice.value, fmt),
                      detail: formatShare(slice.value, total, fmt.locale),
                      shape: "dot",
                      ...(slice.slotKey === "other" ? { tone: "neutral" } : { slot: slice.slotKey || undefined, tone: slice.tone }),
                    },
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

/** The hovered slice lifts: drawn again a little proud of the ring. */
function PieHover({ store, arcs, cx, cy, inner, r, rem, donut }: { store: HoverStore; arcs: Array<{ datum: PieArcDatum<Slice>; d: string }>; cx: number; cy: number; inner: number; r: number; rem: number; donut: boolean }) {
  const hover = useStoreValue(store)
  const datum = hover ? arcs[hover.index]?.datum : undefined
  const d = useMemo(() => {
    if (!datum) return ""
    return (
      d3arc<PieArcDatum<Slice>>()
        .innerRadius(Math.max(0, inner - (donut ? 0.125 * rem : 0)))
        .outerRadius(r + 0.25 * rem)
        .cornerRadius(donut ? Math.min(0.25 * rem, (r - inner) / 2) : 0.125 * rem)(datum) ?? ""
    )
  }, [datum, inner, r, rem, donut])
  if (!datum) return null
  return (
    <g transform={`translate(${cx},${cy})`} className="fa-chart-pie-lift">
      <path className="fa-chart-arc" data-lift="" {...sliceAttrs(datum.data)} d={d} />
    </g>
  )
}

/** The donut's centre: the total, or the hovered slice (Metric's readout replaces the value). */
function Centre({
  store,
  slices,
  total,
  fmt,
  centre,
  totalLabel,
  cx,
  cy,
  inner,
  interactive,
  rem,
}: {
  /** External store observed by the component. */
  store: HoverStore
  /** Current pixel size of one rem used for layout measurement. */
  rem: number
  slices: Slice[]
  total: number
  fmt: LocalizedFormat
  centre?: { value: string; label: string }
  totalLabel: string
  cx: number
  cy: number
  inner: number
  interactive: boolean
}) {
  const hover = useStoreValue(store)
  const slice = interactive && hover ? slices[hover.index] : undefined
  const value = slice ? formatValue(slice.value, fmt) : (centre?.value ?? formatValue(total, fmt))
  const caption = slice ? `${slice.label} · ${formatShare(slice.value, total, fmt.locale)}` : (centre?.label ?? totalLabel)
  const size = centreSize(inner, rem)
  return (
    <div className="fa-chart-centre" data-size={size} data-hovering={slice ? "" : undefined} style={{ left: cx - inner * 0.82, top: cy - inner * 0.82, width: inner * 1.64, height: inner * 1.64 }}>
      <data className="fa-chart-centre-value" value={slice?.value ?? total}>
        {value}
      </data>
      {size !== "xs" ? <span className="fa-chart-centre-label">{caption}</span> : null}
    </div>
  )
}

function LinkedLegend({ store, items, interactive }: { store: HoverStore; items: LegendItem[]; interactive: boolean }) {
  const hover = useStoreValue(store)
  const active = interactive && hover ? (items[hover.index]?.key ?? null) : null
  return (
    <ChartLegend
      items={items}
      layout="list"
      active={active}
      onActive={
        interactive
          ? (key) => {
              const index = items.findIndex((item) => item.key === key)
              store.set(key === null || index < 0 ? null : { index, x: 0, y: 0, via: "pointer" })
            }
          : undefined
      }
    />
  )
}
