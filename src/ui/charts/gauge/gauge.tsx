import { useMessages } from "../../../lib/i18n/index.js"
import { gaugeMessages } from "./messages.js"
import { arc as d3arc } from "d3-shape"
import { memo, useMemo, type CSSProperties } from "react"
import { meterLevel } from "../../meter/index.js"
import { ChartFrame, type ChartCommonProps, type PlotBox } from "../core/frame.js"
import { centreSize, formatShare, formatValue, type LocalizedFormat, type ValueFormat } from "../core/format.js"
import { useLocale } from "../../../lib/locale/use-locale.js"
import { ChartText } from "../core/axes.js"
import { barPath, cssPath } from "../core/geometry.js"
import { ChartLegend, type LegendItem } from "../core/legend.js"
import { seriesAttrs, slotFor, type ChartTone } from "../core/series.js"
import { shareFraction, type ChartTableModel } from "../core/table.js"

/** The gauge's sweep: 270°, open at the bottom. */
const SWEEP = (Math.PI * 3) / 2
const START = -SWEEP / 2

export interface GaugeProps extends ChartCommonProps, ValueFormat {
  value: number | null
  /** Lower allowed value. */
  min?: number
  /** Upper value or visible-item limit, as specified by the type. */
  max?: number
  /** Fractions of the range where the gauge turns warning and danger (Meter's defaults).
   *  Pass null when the value is not a state: it then wears the data colour (--chart-1). */
  warningAt?: number | null
  /** Threshold at which the value enters the danger state. */
  dangerAt?: number | null
  /** The reading in words under the value: "212 GB of 256 GB". */
  caption?: string
}

/**
 * A level in a known range — disk 82%, memory, licence seats — as a 270° arc. It shares
 * Meter's thresholds and semantics: neutral while healthy (so a calm page stays calm, and a
 * red accent never reads as danger), warning then danger as the value crosses each threshold,
 * which is ticked beside the track so the reader sees how close it is. A gauge whose value is
 * not a state (warningAt={null}) wears the data colour, --chart-1.
 *
 *   micro    an inline meter bar with the value as a trail
 *   compact  the arc with the value inside
 *   full     the arc, value, caption and the range's ends
 */
export function Gauge(props: GaugeProps) {
  const messages = useMessages(gaugeMessages, { locale: props.locale })

  const { label, title, state = "ready", value, min = 0, max = 100, warningAt = 0.75, dangerAt = 0.9, caption, unit, format, ...rest } = props
  const locale = useLocale(props.locale)
  const fmt: LocalizedFormat = useMemo(() => ({ unit, format, locale }), [unit, format, locale])
  const ratio = value === null ? 0 : Math.min(1, Math.max(0, (value - min) / (max - min || 1)))
  const level = warningAt === null || dangerAt === null ? "normal" : meterLevel(ratio, warningAt ?? 0.75, dangerAt ?? 0.9)
  const status = warningAt !== null && dangerAt !== null
  const tone = level === "normal" ? (status ? "neutral" : undefined) : level
  const table = useMemo<ChartTableModel>(
    () => ({
      columns: [
        { key: "label", label: messages.measure },
        { key: "value", label: messages.value, numeric: true },
        { key: "range", label: messages.range, numeric: true },
      ],
      rows: [{ label: title ?? label, value: formatValue(value, fmt), range: `${formatValue(min, fmt)}–${formatValue(max, fmt)}` }],
      values: [{ value, range: `${min}–${max}` }],
    }),
    [title, label, value, fmt, min, max]
  )
  const trail = (
    <span className="fa-chart-figure" data-tone={tone}>
      <span className="fa-chart-figure-value">{formatValue(value, fmt)}</span>
    </span>
  )
  return (
    <ChartFrame {...rest} kind="gauge" label={label} title={title} state={state} table={table} trail={trail} trailSize="value">
      {(box) => <GaugePlot box={box} ratio={ratio} tone={tone} value={formatValue(value, fmt)} caption={caption} min={formatValue(min, fmt)} max={formatValue(max, fmt)} thresholds={warningAt === null || dangerAt === null ? [] : [warningAt ?? 0.75, dangerAt ?? 0.9]} />}
    </ChartFrame>
  )
}

interface GaugePlotProps {
  box: PlotBox
  ratio: number
  tone?: string
  value: string
  /** Accessible caption or figure description. */
  caption?: string
  /** Lower allowed value. */
  min: string
  /** Upper value or visible-item limit, as specified by the type. */
  max: string
  thresholds: number[]
}

const GaugePlot = /* @__PURE__ */ memo(function GaugePlot({ box, ratio, tone, value, caption, min, max, thresholds }: GaugePlotProps) {
  const { width, height, tier, rem } = box
  if (tier === "micro") {
    const thick = Math.min(0.375 * rem, height)
    const y = (height - thick) / 2
    return (
      <svg className="fa-chart-svg" width={width} height={height} aria-hidden>
        <rect className="fa-chart-track" x={0} y={y} width={width} height={thick} rx={thick / 2} />
        <path className="fa-chart-bar" data-end="right" {...seriesAttrs(1, tone)} style={{ d: cssPath(barPath(0, y, Math.max(thick, width * ratio), thick, thick / 2, "right")) } as CSSProperties} />
        {thresholds.slice(0, 1).map((t) => (
          <line key={t} className="fa-chart-threshold" x1={Math.round(width * t) + 0.5} x2={Math.round(width * t) + 0.5} y1={y - 2} y2={y + thick + 2} />
        ))}
      </svg>
    )
  }
  const full = tier === "full"
  // A 270° arc's box is 2r wide and r·(1 + sin 45°) tall.
  const ends = full ? 1.25 * rem : 0
  const tickRoom = thresholds.length ? 0.5 * rem : 0
  const r = Math.max(8, Math.min(width / 2 - tickRoom, (height - ends - tickRoom) / (1 + Math.SQRT1_2)))
  const thick = Math.max(0.375 * rem, r * (full ? 0.13 : 0.15))
  const cx = width / 2
  const cy = (height - ends - r * (1 + Math.SQRT1_2)) / 2 + r + tickRoom / 2
  const shape = d3arc<{ startAngle: number; endAngle: number }>()
    .innerRadius(r - thick)
    .outerRadius(r)
    .cornerRadius(thick / 2)
  const track = shape({ startAngle: START, endAngle: START + SWEEP }) ?? ""
  const fill = shape({ startAngle: START, endAngle: START + SWEEP * Math.max(0.0001, ratio) }) ?? ""
  const size = centreSize(r - thick, rem)
  const endY = cy + r * Math.SQRT1_2 + 0.5 * rem
  return (
    <div className="fa-chart-layer">
      <svg className="fa-chart-svg" width={width} height={height} aria-hidden>
        <g transform={`translate(${cx},${cy})`}>
          <path className="fa-chart-track" d={track} />
          <path className="fa-chart-arc" data-gauge="" {...seriesAttrs(1, tone)} style={{ d: cssPath(fill) } as CSSProperties} />
          {thresholds.map((t) => {
            const angle = START + SWEEP * t
            const sin = Math.sin(angle)
            const cos = -Math.cos(angle)
            return <line key={t} className="fa-chart-gauge-tick" x1={sin * (r + 0.1875 * rem)} y1={cos * (r + 0.1875 * rem)} x2={sin * (r + 0.4375 * rem)} y2={cos * (r + 0.4375 * rem)} />
          })}
        </g>
      </svg>
      <div className="fa-chart-centre" data-size={size} data-gauge="" style={{ left: cx - (r - thick) * 0.86, top: cy - (r - thick) * 0.8, width: (r - thick) * 1.72, height: (r - thick) * 1.4 }}>
        <span className="fa-chart-centre-value" data-tone={tone}>
          {value}
        </span>
        {(size === "md" || size === "lg") && caption ? <span className="fa-chart-centre-label">{caption}</span> : null}
      </div>
      {full ? (
        <>
          <span className="fa-chart-gauge-end" data-side="start" style={{ left: cx - r * Math.SQRT1_2 - 2 * rem, top: endY, width: 4 * rem }}>
            {min}
          </span>
          <span className="fa-chart-gauge-end" data-side="end" style={{ left: cx + r * Math.SQRT1_2 - 2 * rem, top: endY, width: 4 * rem }}>
            {max}
          </span>
        </>
      ) : null}
    </div>
  )
})

// ── Radial bars ──────────────────────────────────────────────────────────────────────────

export interface RadialBarItem {
  key: string
  label: string
  value: number
  /** Upper value or visible-item limit, as specified by the type. */
  max?: number
  /** Named content slot. */
  slot?: number
  tone?: ChartTone
}

export interface RadialBarProps extends ChartCommonProps, ValueFormat {
  /** Typed records rendered by the component. */
  data: readonly RadialBarItem[]
  /** Turn a ring warning/danger past these fractions of its max (status data only). */
  warningAt?: number
  /** Threshold at which the value enters the danger state. */
  dangerAt?: number
}

/**
 * Several levels as concentric 270° rings, outermost first — CPU, memory and disk on one
 * endpoint. Each ring is its own series (a categorical slot); with thresholds, a ring past one
 * takes the status tone instead.
 *
 *   micro    one thin meter per item, stacked, with the highest share as a trail
 *   compact  the rings with their labels in the open quadrant
 *   full     the rings, labels with values, and a list legend
 */
export function RadialBar(props: RadialBarProps) {
  const messages = useMessages(gaugeMessages, { locale: props.locale })

  const { label, title, state = "ready", data, warningAt, dangerAt, unit, format, ...rest } = props
  const locale = useLocale(props.locale)
  const fmt: LocalizedFormat = useMemo(() => ({ unit, format, locale }), [unit, format, locale])
  const items = useMemo(
    () =>
      data.map((item, index) => {
        const ratio = Math.min(1, Math.max(0, item.value / (item.max ?? 100)))
        const level = warningAt !== undefined && dangerAt !== undefined ? meterLevel(ratio, warningAt, dangerAt) : "normal"
        return { ...item, ratio, slot: slotFor(index, item.slot), tone: level === "normal" ? item.tone : level }
      }),
    [data, warningAt, dangerAt]
  )
  const table = useMemo<ChartTableModel>(
    () => ({
      columns: [
        { key: "label", label: messages.measure },
        { key: "value", label: messages.value, numeric: true },
        { key: "share", label: messages.ofMax, numeric: true },
      ],
      rows: items.map((item) => ({ label: item.label, value: formatValue(item.value, fmt), share: formatShare(item.value, item.max ?? 100, fmt.locale) })),
      values: items.map((item) => ({ value: item.value, share: shareFraction(item.value, item.max ?? 100) })),
    }),
    [items, fmt]
  )
  const top = items.reduce<(typeof items)[number] | undefined>((best, item) => (!best || item.ratio > best.ratio ? item : best), undefined)
  const trail = top ? (
    <span className="fa-chart-figure">
      <span className="fa-chart-figure-label">{top.label}</span>
      <span className="fa-chart-figure-value">{formatValue(top.value, fmt)}</span>
    </span>
  ) : null
  return (
    <ChartFrame {...rest} kind="gauge" label={label} title={title} state={state} table={table} trail={trail} trailOptional>
      {(box) => <RadialPlot box={box} items={items} fmt={fmt} />}
    </ChartFrame>
  )
}

const RadialPlot = /* @__PURE__ */ memo(function RadialPlot({ box, items, fmt }: { box: PlotBox; items: Array<RadialBarItem & { ratio: number; slot: number }>; fmt: LocalizedFormat }) {
  const { width, height, tier, rem } = box
  if (tier === "micro") {
    const thick = Math.max(2, Math.min(0.25 * rem, (height - (items.length - 1) * 3) / items.length))
    const total = items.length * thick + (items.length - 1) * 3
    const y0 = (height - total) / 2
    return (
      <svg className="fa-chart-svg" width={width} height={height} aria-hidden>
        {items.map((item, index) => {
          const y = y0 + index * (thick + 3)
          return (
            <g key={item.key}>
              <rect className="fa-chart-track" x={0} y={y} width={width} height={thick} rx={thick / 2} />
              <path className="fa-chart-bar" data-end="right" {...seriesAttrs(item.slot, item.tone)} style={{ d: cssPath(barPath(0, y, Math.max(thick, width * item.ratio), thick, thick / 2, "right")) } as CSSProperties} />
            </g>
          )
        })}
      </svg>
    )
  }
  const full = tier === "full"
  // Full: labels with values in the open quadrant. Compact: a key beside the rings.
  const legendW = !full && width >= height + 6 * rem ? Math.min(9 * rem, width - height - 0.75 * rem) : 0
  const avail = width - legendW - (legendW ? 0.75 * rem : 0)
  const r = Math.max(8, Math.min(avail / 2, height / 2))
  const cx = legendW ? r : width / 2
  const cy = height / 2
  const ringGap = Math.max(2, 0.1875 * rem)
  const thick = Math.max(0.375 * rem, Math.min(1.25 * rem, (r * 0.62) / items.length - ringGap))
  // Rings start at 12 o'clock and sweep 270° clockwise; labels sit in the open quadrant.
  const rings = items.map((item, index) => {
    const outer = r - index * (thick + ringGap)
    const shape = d3arc<{ startAngle: number; endAngle: number }>()
      .innerRadius(outer - thick)
      .outerRadius(outer)
      .cornerRadius(thick / 2)
    return {
      item,
      outer,
      track: shape({ startAngle: 0, endAngle: SWEEP }) ?? "",
      fill: shape({ startAngle: 0, endAngle: SWEEP * Math.max(0.0001, item.ratio) }) ?? "",
    }
  })
  const legend: LegendItem[] = items.map((item) => ({ key: item.key, label: item.label, slot: item.slot, tone: item.tone, shape: "dot", value: formatValue(item.value, fmt) }))
  const showLabels = Boolean(full && !legendW && thick >= 0.625 * rem)
  return (
    <div className="fa-chart-layer">
      <svg className="fa-chart-svg" width={width} height={height} aria-hidden>
        <g transform={`translate(${cx},${cy})`}>
          {rings.map(({ item, track, fill }, index) => (
            <g key={item.key} {...seriesAttrs(item.slot, item.tone)}>
              <path className="fa-chart-track" d={track} />
              <path className="fa-chart-arc" data-gauge="" style={{ d: cssPath(fill), "--_enter-delay": `calc(var(--duration-instant) * ${index})` } as CSSProperties} />
            </g>
          ))}
        </g>
      </svg>
      {showLabels ? (
        <div className="fa-chart-labels" aria-hidden>
          {rings.map(({ item, outer }) => (
            <ChartText key={item.key} className="fa-chart-ring-label" x={cx - 0.375 * rem} y={cy - (outer - thick / 2)} anchor="end" width={cx - 0.5 * rem}>
              <span>{item.label}</span> <span className="fa-chart-ring-value">{formatValue(item.value, fmt)}</span>
            </ChartText>
          ))}
        </div>
      ) : null}
      {legendW ? (
        <div className="fa-chart-pie-legend" style={{ insetInlineStart: 2 * r + 0.75 * rem, insetBlock: 0, width: legendW }}>
          <ChartLegend items={legend} layout="list" />
        </div>
      ) : null}
    </div>
  )
})
