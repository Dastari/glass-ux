import { useMessages } from "../../../lib/i18n/index.js"
import { barMessages } from "./messages.js"
import { memo, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { cartesianInset, textWidth, YGrid, YLabels } from "../core/axes.js"
import { ChartFrame, type ChartCommonProps, type PlotBox } from "../core/frame.js"
import { formatShare, formatTick, formatValue, type ChartUnit, type LocalizedFormat, type ValueFormat } from "../core/format.js"
import { useLocale } from "../../../lib/locale/use-locale.js"
import { barPath, cssPath } from "../core/geometry.js"
import { HitLayer } from "../core/hit.js"
import { useHoverStore, useStoreValue, type HoverStore } from "../core/hover.js"
import { ChartLegend, type LegendItem } from "../core/legend.js"
import { alignAxes, allIntegers, linear, linearTicks, valueDomain, type Domain, type ValueAxis } from "../core/scales.js"
import { seriesAttrs, slotFor, type ChartTone } from "../core/series.js"
import type { ChartTableModel, ChartTableValue } from "../core/table.js"
import type { ChartTier } from "../core/tier.js"
import { ChartTooltip, TooltipBody, type TooltipRow } from "../core/tooltip.js"
import { LiveRegion } from "../line/line-chart.js"
import { resolveBands, type ReferenceBand, type Threshold } from "../core/reference.js"
import { ReferenceLabels, ReferenceMarks, useReferenceNotes } from "../core/reference-layer.js"
import { listFormat } from "../../../lib/locale/intl.js"
import { AxisName, ComboHover, comboLine, ComboLines, type AxisKey, type ComboLine } from "./combo-marks.js"

export interface BarSeries {
  key: string
  label: string
  /** One value per category. */
  data: readonly (number | null)[]
  /** Named content slot. */
  slot?: number
  /** Status tone, only when the series means that state (offline, failed). */
  tone?: ChartTone
  /** `bar` (the default) or `line`, drawn over the same categories. Vertical columns only: horizontal bars draw every series as a bar. */
  mark?: "bar" | "line"
  /** The value axis the series reads. `secondary` takes effect with `secondaryAxis`, on vertical columns; otherwise the series reads the primary axis. */
  axis?: "primary" | "secondary"
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
  /**
   * Lines across the columns at values (a quota, a target), labelled at the line's end.
   * Vertical columns only. A status tone without `bands` shades the range up to the next
   * status threshold.
   */
  thresholds?: readonly Threshold[]
  /** Shaded ranges on the value axis behind the columns. Vertical columns only. Thresholds and bands read the primary axis. */
  bands?: readonly ReferenceBand[]
  /**
   * Names the primary value axis ("Orders"), above its labels in the full tier. Vertical
   * columns only. `unit`, `format` and `domain` describe the same axis.
   */
  valueLabel?: string
  /**
   * A second value axis at the plot's right edge, for series with `axis: "secondary"`. It has
   * its own name, unit and format; its gridline positions follow the primary axis's. Vertical
   * columns only. See `ComboChart` for when two axes mislead.
   */
  secondaryAxis?: ValueAxis
  /**
   * Click, Enter or Space on a category: its index and label. While set, the plot shows a
   * pointer cursor and its accessible name says Enter selects.
   */
  onActivate?: (index: number, category: string) => void
}

/** What one value axis carries, and its range. */
interface AxisData {
  /** Bars that read this axis, in series order. */
  bars: BarSeries[]
  /** Lines that read this axis, in series order. */
  lines: BarSeries[]
  /** Per category, the sum of this axis's bars: a stack's height. */
  totals: number[]
  domain: Domain
  /** Every value is a whole number: value ticks stay whole. */
  integer: boolean
}

interface Prepared {
  visible: BarSeries[]
  /** Overrides for named content slots. */
  slots: Map<string, number>
  primary: AxisData
  /** Present while the chart has a second value axis in use. */
  secondary: AxisData | null
  /** The primary axis's range, as computed from the data. */
  domain: Domain
  totals: number[]
  /** Every series, hidden or not. */
  all: readonly BarSeries[]
  /** The caller fixed the primary range. */
  fixed: boolean
}

/** The unit as a table header can name it: the plural of a counted noun. */
const unitName = (unit: ChartUnit | undefined) => (typeof unit === "object" ? unit.other : unit)

const hasLines = (series: readonly BarSeries[]) => series.some((item) => item.mark === "line")

function axisData(all: readonly BarSeries[], hidden: ReadonlySet<string>, categories: readonly string[], stacked: boolean, fixed: Domain | undefined, references: readonly number[]): AxisData {
  const visible = all.filter((item) => !hidden.has(item.key))
  // An axis whose series are all hidden keeps its scale, so its labels do not change meaning.
  const shown = visible.length ? visible : all
  const bars = shown.filter((item) => item.mark !== "line")
  const lines = shown.filter((item) => item.mark === "line")
  const totals = categories.map((_, index) => bars.reduce((sum, item) => sum + Math.max(0, item.data[index] ?? 0), 0))
  const values = [...(stacked ? totals : bars.flatMap((item) => item.data)), ...lines.flatMap((item) => item.data)]
  return {
    bars: visible.filter((item) => item.mark !== "line"),
    lines: visible.filter((item) => item.mark === "line"),
    totals,
    domain: valueDomain([...values, ...references], fixed, { zero: true }),
    integer: allIntegers(values),
  }
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
  const messages = useMessages(barMessages, { locale: props.locale })

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
    categoryLabel: categoryLabelProp,
    edges,
    formatEdge,
    thresholds: thresholdProp,
    bands: bandProp,
    valueLabel,
    secondaryAxis,
    onActivate,
    ...rest
  } = props
  const categoryLabel = categoryLabelProp ?? messages.category

  const [hidden, setHidden] = useState<ReadonlySet<string>>(() => new Set())
  const store = useHoverStore()
  const locale = useLocale(props.locale)
  const fmt: LocalizedFormat = useMemo(() => ({ unit, format, locale }), [unit, format, locale])
  const secondaryUnit = secondaryAxis?.unit
  const secondaryFormat = secondaryAxis?.format
  const secondaryFmt: LocalizedFormat = useMemo(() => ({ unit: secondaryUnit, format: secondaryFormat, locale }), [secondaryUnit, secondaryFormat, locale])
  const stacked = layout === "stacked"
  const horizontal = orientation === "horizontal"
  // Lines and a second axis sit on vertical columns: horizontal bars draw every series as a bar.
  const drawn = useMemo(() => (horizontal ? series.map((item) => (item.mark === "line" ? { ...item, mark: "bar" as const } : item)) : series), [series, horizontal])
  const dual = !horizontal && secondaryAxis !== undefined && drawn.some((item) => item.axis === "secondary")
  const combo = !horizontal && (dual || hasLines(drawn))
  const onSecondary = (item: BarSeries) => dual && item.axis === "secondary"
  const fmtOf = (item: BarSeries) => (onSecondary(item) ? secondaryFmt : fmt)
  // References sit on a vertical value axis: columns only.
  const thresholds = horizontal ? undefined : thresholdProp
  const bands = horizontal ? undefined : bandProp

  const prepared = useMemo<Prepared>(() => {
    const slots = new Map(drawn.map((item, index) => [item.key, slotFor(index, item.slot)]))
    const visible = drawn.filter((item) => !hidden.has(item.key))
    const references = [...(thresholds ?? []).map((item) => item.value), ...(bands ?? []).flatMap((item) => [item.from, item.to])]
    const primary = axisData(dual ? drawn.filter((item) => item.axis !== "secondary") : drawn, hidden, categories, stacked, domain, references)
    const secondary = dual ? axisData(drawn.filter((item) => item.axis === "secondary"), hidden, categories, stacked, secondaryAxis?.domain, []) : null
    return { visible, slots, primary, secondary, domain: primary.domain, totals: primary.totals, all: drawn, fixed: domain !== undefined }
  }, [drawn, dual, secondaryAxis?.domain, hidden, categories, stacked, domain, thresholds, bands])
  const notes = useReferenceNotes({ thresholds, bands, fmt })

  // With two axes, an unnamed primary axis takes its series' names: no axis goes unlabelled.
  const seriesNames = (items: readonly BarSeries[]) => listFormat(locale, { type: "conjunction" }).format(items.map((item) => item.label))
  const primaryName = valueLabel ?? (dual ? seriesNames(drawn.filter((item) => item.axis !== "secondary")) : undefined)
  const axisNotes = dual
    ? [
        messages.leftAxisNote({ axis: primaryName ?? "", series: seriesNames(drawn.filter((item) => item.axis !== "secondary")) }),
        messages.rightAxisNote({ axis: secondaryAxis?.label ?? "", series: seriesNames(drawn.filter((item) => item.axis === "secondary")) }),
      ]
    : []
  const axisNoteKey = axisNotes.join(" ")

  const table = useMemo<ChartTableModel>(() => {
    // With two axes the numbers differ in kind: each column names its axis and unit, which also
    // labels the CSV, whose cells carry none.
    const header = (name: string, onAxis: { label?: string; unit?: ChartUnit }) => {
      if (!dual) return name
      const axisName = onAxis.label && onAxis.label !== name ? onAxis.label : undefined
      const unitText = unitName(onAxis.unit)
      if (axisName && unitText) return messages.seriesWithAxisAndUnit({ series: name, axis: axisName, unit: unitText })
      return axisName || unitText ? messages.seriesWithAxis(name, axisName ?? unitText ?? "") : name
    }
    const primaryAxis = { label: primaryName, unit }
    const secondAxis = { label: secondaryAxis?.label, unit: secondaryAxis?.unit }
    const stacks = [
      { key: "total", label: messages.total, axis: primaryAxis, format: fmt, bars: drawn.filter((item) => item.mark !== "line" && !onSecondary(item)) },
      { key: "total2", label: messages.total, axis: secondAxis, format: secondaryFmt, bars: drawn.filter((item) => item.mark !== "line" && onSecondary(item)) },
    ].filter((stack) => stacked && stack.bars.length > 1)
    const sum = (bars: readonly BarSeries[], index: number) => bars.reduce((total, item) => total + (item.data[index] ?? 0), 0)
    const rows = categories.map((category, index) => {
      const row: Record<string, string> = { category: edges ? edgeLabel(edges, index, formatEdge) : category }
      for (const item of drawn) row[item.key] = formatValue(item.data[index], fmtOf(item))
      for (const stack of stacks) row[stack.key] = formatValue(sum(stack.bars, index), stack.format)
      return row
    })
    const values = categories.map((_, index) => {
      const raw: Record<string, ChartTableValue> = {}
      for (const item of drawn) raw[item.key] = item.data[index] ?? null
      for (const stack of stacks) raw[stack.key] = sum(stack.bars, index)
      return raw
    })
    const allNotes = [...(axisNoteKey ? axisNotes : []), ...notes]
    return {
      columns: [
        { key: "category", label: categoryLabel },
        ...drawn.map((item) => ({ key: item.key, label: header(item.label, onSecondary(item) ? secondAxis : primaryAxis), numeric: true })),
        ...stacks.map((stack) => ({ key: stack.key, label: header(stack.label, stack.axis), numeric: true })),
      ],
      rows,
      values,
      notes: allNotes.length ? allNotes : undefined,
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- fmtOf and onSecondary follow dual, fmt and secondaryFmt
  }, [categories, drawn, fmt, secondaryFmt, dual, stacked, categoryLabel, edges, formatEdge, notes, axisNoteKey, primaryName, unit, secondaryAxis?.label, secondaryAxis?.unit, messages])

  const legendItems: LegendItem[] = drawn.map((item) => ({
    key: item.key,
    label: item.label,
    slot: prepared.slots.get(item.key),
    tone: item.tone,
    shape: item.mark === "line" ? "line" : "box",
    detail: dual ? (onSecondary(item) ? messages.rightAxis : messages.leftAxis) : undefined,
  }))
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
  // A sum across a combo's series would add unlike things: it leads with its first series.
  const leadSeries = combo || series.length === 1 ? drawn[0] : undefined
  const lead = leadSeries ? leadSeries.data[leadIndex] : prepared.totals[leadIndex]
  const trail =
    categories.length > 0 ? (
      <span className="fa-chart-figure">
        <span className="fa-chart-figure-label">{edges ? edgeLabel(edges, leadIndex, formatEdge) : categories[leadIndex]}</span>
        <span className="fa-chart-figure-value">{formatValue(lead, leadSeries ? fmtOf(leadSeries) : fmt)}</span>
      </span>
    ) : null

  return (
    <ChartFrame
      {...rest}
      kind={horizontal ? "bar" : combo ? "combo" : "column"}
      label={label}
      title={title}
      state={state}
      table={table}
      head={head}
      compactHead={series.length > 1}
      trail={trail}
      trailOptional
      note={axisNotes.length + notes.length ? [...axisNotes, ...notes].join(" ") : undefined}
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
          thresholds={thresholds}
          bands={bands}
          valueLabel={horizontal ? undefined : primaryName}
          secondaryAxis={dual ? secondaryAxis : undefined}
          secondaryFmt={secondaryFmt}
          onActivate={onActivate}
        />
      )}
    </ChartFrame>
  )
}

/** Vertical columns. */
export function ColumnChart(props: Omit<BarChartProps, "orientation">) {
  return <BarChart {...props} orientation="vertical" />
}

export interface ComboChartProps extends Omit<BarChartProps, "orientation" | "edges" | "formatEdge" | "labels"> {
  /** Names the primary value axis. Required: on a chart that mixes measures, no axis goes unnamed. */
  valueLabel: string
}

/**
 * Columns and lines over the same categories, on one value axis or two: orders per month as
 * columns with the refund rate as a line. It is `BarChart` with vertical columns, so grouped
 * and stacked columns, thresholds and tiers work as they do there. Give each series a `mark`
 * and, for a second axis, `axis: "secondary"` and `secondaryAxis`.
 *
 * Two axes need care: their scales are independent, so where a line crosses a column, and how
 * steep it looks beside it, says nothing about the data. Use them for two measures of one
 * process that differ in unit and a reader compares by shape over the categories. Do not use
 * them to compare two amounts of the same unit (use one axis), to suggest one measure drives
 * another (use `ScatterChart`), or with more than one or two series a side: small multiples,
 * two charts stacked over the same categories, read better. Each axis wears a key for the
 * series it carries, the second axis's labels sit on the first's gridlines unless both ranges
 * are fixed, and both ranges start at zero unless you fix them.
 *
 * Each axis needs its name (`valueLabel`, `secondaryAxis.label`). The table's columns name
 * each series' axis and unit, and thresholds and bands read the primary axis. The x axis and
 * the value axes do not mirror in right-to-left text: the primary axis stays on the left.
 *
 *   micro    columns and lines without axes; the first series' latest value as a trail
 *   compact  baseline and category labels, passive legend
 *   full     both value axes with their names, the interactive legend naming each series'
 *            axis, a band highlight and the tooltip (every series in its own unit)
 */
export function ComboChart(props: ComboChartProps) {
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
  fmt: LocalizedFormat
  label: string
  edges?: readonly number[]
  formatEdge?: (value: number) => string
  thresholds?: readonly Threshold[]
  bands?: readonly ReferenceBand[]
  valueLabel?: string
  secondaryAxis?: ValueAxis
  secondaryFmt: LocalizedFormat
  onActivate?: (index: number, category: string) => void
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

const BarPlot = /* @__PURE__ */ memo(function BarPlot({ box, prepared, store, categories, stacked, horizontal, labels, fmt, label, edges, formatEdge, thresholds, bands, valueLabel, secondaryAxis, secondaryFmt, onActivate }: BarPlotProps) {
  const messages = useMessages(barMessages)

  const id = useId()
  const plotRef = useRef<HTMLDivElement>(null)
  const { width, height, tier, rem } = box
  const { visible, slots, totals, domain, primary, secondary, all, fixed } = prepared
  const full = tier === "full"
  const micro = tier === "micro"
  const n = categories.length
  const k = Math.max(1, visible.length)
  const bars = useMemo(() => [...primary.bars, ...(secondary?.bars ?? [])], [primary.bars, secondary?.bars])
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
    // Two axes share one set of gridlines: each line of the grid reads a value on both.
    const paired = full && secondary ? alignAxes({ domain, fixed, integer: primary.integer }, { domain: secondary.domain, fixed: Boolean(secondaryAxis?.domain), integer: secondary.integer }, height - 2 * rem) : null
    const yDomain = paired?.first.domain ?? domain
    const yTicks = paired?.first.ticks ?? linearTicks(domain, height - 2 * rem, undefined, { integer: primary.integer })
    const yLabels = yTicks.values.map((tick) => formatTick(tick, yTicks.step, fmt))
    const rightLabels = paired?.second.ticks.values.map((tick) => formatTick(tick, paired.second.ticks.step, secondaryFmt)) ?? []
    // Past the label's estimate, as the left gutter's label may overrun its own into the empty edge.
    const right = rightLabels.length ? Math.max(...rightLabels.map((text) => textWidth(text, rem))) + 0.875 * rem : 0
    const inset = cartesianInset({ tier, rem, yLabels, xAxis: !micro && !horizontal, right })
    if (!micro) inset.bottom = 1.25 * rem + 0.375 * rem
    // A row over the plot for the axes' names.
    if (full && (valueLabel || secondary)) inset.top = 1.5 * rem
    return { kind: "columns" as const, inset, yTicks, yDomain, right: paired?.second ?? null, secondaryDomain: paired?.second.domain ?? secondary?.domain ?? domain }
  }, [horizontal, micro, width, height, rem, full, n, categories, fmt, labels, stacked, k, visible, totals, domain, tier, barMax, primary.integer, secondary, secondaryAxis?.domain, secondaryFmt, valueLabel, fixed])

  const valueScale = geo.kind === "columns" ? geo.yDomain : domain
  const scaleFor = (item: BarSeries) => (geo.kind === "columns" && secondary && item.axis === "secondary" ? geo.secondaryDomain : valueScale)
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
    // One slot in a category per bar, or per axis when stacked: stacks of unlike measures stand side by side.
    const groups = stacked ? [primary.bars, secondary?.bars ?? []].filter((group) => group.length > 0) : bars.map((item) => [item])
    const slotsPerBand = Math.max(1, groups.length)
    // Dense bins share the gap with their columns, so a column never loses its width to it.
    const groupW = histogram ? band - Math.min(GAP, band / 2) : Math.min(band * (micro ? 0.7 : slotsPerBand === 1 ? 0.62 : 0.8), slotsPerBand * barMax + (slotsPerBand - 1) * GAP)
    const barW = histogram ? groupW : (groupW - (slotsPerBand - 1) * GAP) / slotsPerBand
    for (let index = 0; index < n; index++) {
      const left = x0 + index * band + (band - groupW) / 2
      groups.forEach((group, g) => {
        let base = 0
        group.forEach((item, s) => {
          const py = linear(scaleFor(item), [y1, y0])
          const value = Math.max(0, item.data[index] ?? 0)
          const top = py(base + value)
          const bottom = py(base) - (stacked && s > 0 ? GAP : 0)
          const x = histogram ? left : left + g * (barW + GAP)
          const last = !stacked || s === group.length - 1
          out.push({ key: `${item.key}-${index}`, series: item.key, index, tip: top, slot: slots.get(item.key) ?? 1, tone: item.tone, d: barPath(x, top, barW, Math.max(0, bottom - top), last ? (histogram ? radius * 0.5 : radius) : 0, "top"), end: "top" })
          if (stacked) base += value
        })
      })
    }
    return out
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- scaleFor follows geo and secondary
  }, [geo, domain, visible, slots, stacked, k, rem, radius, width, height, n, histogram, micro, barMax, primary.bars, secondary, bars])

  const lines = useMemo<ComboLine[]>(() => {
    if (geo.kind !== "columns") return []
    const { inset } = geo
    const x0 = inset.left
    const band = (width - inset.right - x0) / Math.max(1, n)
    const at = (index: number) => x0 + band * (index + 0.5)
    return [...primary.lines, ...(secondary?.lines ?? [])].map((item) => comboLine(item.key, slots.get(item.key) ?? 1, item.tone, item.data, n, at, linear(scaleFor(item), [height - inset.bottom, inset.top])))
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- scaleFor follows geo and secondary
  }, [geo, primary.lines, secondary, slots, n, width, height])
  // Where the tooltip anchors in each category: the highest mark in it.
  const tips = useMemo(() => {
    const out: Array<number | undefined> = Array.from({ length: n })
    const raise = (index: number, y: number) => {
      out[index] = Math.min(out[index] ?? y, y)
    }
    for (const mark of marks) raise(mark.index, mark.tip)
    for (const line of lines) line.points.forEach((point, index) => point && raise(index, point.y))
    return out
  }, [marks, lines, n])

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
    return { x: x0 + band * (index + 0.5), y: tips[index] ?? height - geo.inset.bottom }
  }
  const categoryText = (index: number) => (edges ? edgeLabel(edges, index, formatEdge) : (categories[index] ?? ""))
  const fmtFor = (item: BarSeries) => (secondary && item.axis === "secondary" ? secondaryFmt : fmt)
  const valueText = (index: number) => `${categoryText(index)} · ${listFormat(fmt.locale, { type: "unit" }).format(visible.map((item) => `${item.label} ${formatValue(item.data[index], fmtFor(item))}`))}`
  const sum = useMemo(() => totals.reduce((a, b) => a + b, 0), [totals])
  const reference = useMemo(() => {
    if (geo.kind !== "columns" || micro || (!thresholds?.length && !bands?.length)) return null
    const { inset } = geo
    const y0 = inset.top
    const y1 = height - inset.bottom
    return { py: linear(geo.yDomain, [y1, y0]), x0: inset.left, x1: width - inset.right, y0, y1, rem, shaded: resolveBands(thresholds, bands, geo.yDomain[1]) }
  }, [geo, micro, thresholds, bands, height, width, rem])
  const axisKeys = (onAxis: AxisData): AxisKey[] =>
    all.filter((item) => (onAxis === secondary) === (item.axis === "secondary")).map((item) => ({ key: item.key, slot: slots.get(item.key) ?? 1, tone: item.tone, shape: item.mark === "line" ? "line" : "box", off: !visible.includes(item) }))

  return (
    <div ref={plotRef} className="fa-chart-layer">
      {full ? <BandHighlight store={store} geo={geo} width={width} height={height} n={n} rem={rem} /> : null}
      <svg className="fa-chart-svg" width={width} height={height} aria-hidden>
        <defs>
          {bars.map((item) => (
            <linearGradient key={item.key} id={`${id}-sheen-${item.key}`} x1="0" y1="0" x2="0" y2="1" {...seriesAttrs(slots.get(item.key), item.tone)}>
              <stop offset="0" className="fa-chart-sheen-top" />
              <stop offset="0.45" className="fa-chart-sheen-bottom" />
            </linearGradient>
          ))}
        </defs>
        {geo.kind === "columns" && !micro ? (
          full ? (
            <YGrid ticks={geo.yTicks.values} y={linear(geo.yDomain, [height - geo.inset.bottom, geo.inset.top])} x0={geo.inset.left} x1={width - geo.inset.right} baseline={0} />
          ) : (
            <line className="fa-chart-grid" data-baseline="" x1={geo.inset.left} x2={width - geo.inset.right} y1={Math.round(height - geo.inset.bottom) - 0.5} y2={Math.round(height - geo.inset.bottom) - 0.5} />
          )
        ) : null}
        {geo.kind === "columns" && full && secondary ? (
          <>
            <AxisRule keys={axisKeys(primary)} x={geo.inset.left} y0={geo.inset.top} y1={height - geo.inset.bottom} />
            <AxisRule keys={axisKeys(secondary)} x={width - geo.inset.right} y0={geo.inset.top} y1={height - geo.inset.bottom} />
          </>
        ) : null}
        {reference ? <ReferenceMarks geometry={reference} thresholds={thresholds ?? []} bands={reference.shaded} shade={full} /> : null}
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
        <ComboLines lines={lines} rem={rem} />
      </svg>

      {/* Category and value labels are HTML so they truncate with a real ellipsis (R8). */}
      {!micro ? (
        <div className="fa-chart-labels" aria-hidden>
          {geo.kind === "columns" && full ? <YLabels ticks={geo.yTicks.values} step={geo.yTicks.step} y={linear(geo.yDomain, [height - geo.inset.bottom, geo.inset.top])} x0={geo.inset.left} format={fmt} gap={0.5 * rem} /> : null}
          {geo.kind === "columns" && full && geo.right ? <YLabels ticks={geo.right.ticks.values} step={geo.right.ticks.step} y={linear(geo.right.domain, [height - geo.inset.bottom, geo.inset.top])} x0={width - geo.inset.right} format={secondaryFmt} gap={0.5 * rem} side="right" /> : null}
          {geo.kind === "columns" && full && valueLabel ? <AxisName label={valueLabel} side="left" keys={secondary ? axisKeys(primary) : []} x={0} width={secondary ? width * 0.48 : width} /> : null}
          {geo.kind === "columns" && full && secondary && secondaryAxis ? <AxisName label={secondaryAxis.label} side="right" keys={axisKeys(secondary)} x={0} width={width * 0.48} /> : null}
          {reference && full ? <ReferenceLabels geometry={reference} thresholds={thresholds ?? []} bands={bands ?? []} fmt={fmt} /> : null}
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
                    <span key={index} className="fa-chart-cat" data-align="middle" title={category} style={{ top, left: x0 + band * index + 1, width: Math.min(band * step - 2, width - (x0 + band * index + 1)) }}>
                      {category}
                    </span>
                  ) : null
                )
              })()}
        </div>
      ) : null}
      {geo.kind === "rows" && geo.shown < n ? (
        <span className="fa-chart-more" style={{ top: geo.shown * geo.pitch, height: geo.pitch }}>
          {messages.more(n - geo.shown)} </span>
      ) : null}

      {full ? (
        <>
          <ComboHover store={store} lines={lines} width={width} height={height} rem={rem} />
          <HitLayer
            store={store}
            count={count}
            locate={locate}
            anchor={anchor}
            label={onActivate ? messages.inspectValuesEnterSelects(label) : messages.inspectValues(label)}
            valueText={valueText}
            initial={0}
            cursor={onActivate ? "pointer" : "crosshair"}
            onActivate={onActivate ? (index) => onActivate(index, categoryText(index)) : undefined}
          />
          <ChartTooltip store={store} anchor={plotRef}>
            {(hover) => {
              const row = (item: BarSeries): TooltipRow => ({
                key: item.key,
                label: item.label,
                value: formatValue(item.data[hover.index], fmtFor(item)),
                slot: slots.get(item.key),
                tone: item.tone,
                shape: item.mark === "line" ? "line" : "box",
                detail: secondary ? (item.axis === "secondary" ? messages.rightAxis : messages.leftAxis) : visible.length === 1 && item.mark !== "line" && sum > 0 ? formatShare(item.data[hover.index] ?? 0, sum, fmt.locale) : undefined,
              })
              const barRows = bars.map(row)
              const lineRows = lines.flatMap((line) => visible.filter((item) => item.key === line.key).map(row))
              // Each axis's stack has its own total: totals across unlike units would mean nothing.
              const footer = stacked
                ? [
                    primary.bars.length > 1 ? messages.totalValue(formatValue(primary.totals[hover.index], fmt)) : null,
                    secondary && secondary.bars.length > 1 ? messages.totalValue(formatValue(secondary.totals[hover.index], secondaryFmt)) : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : ""
              return <TooltipBody title={categoryText(hover.index)} rows={[...(stacked ? barRows.toReversed() : barRows), ...lineRows]} footer={footer || undefined} />
            }}
          </ChartTooltip>
          <LiveRegion store={store} text={valueText} />
        </>
      ) : null}
    </div>
  )
})

/** The axis's edge in its series' colour, while it carries just one. */
function AxisRule({ keys, x, y0, y1 }: { keys: readonly AxisKey[]; x: number; y0: number; y1: number }) {
  const shown = keys.filter((item) => !item.off)
  if (shown.length !== 1) return null
  return <line className="fa-chart-axis-rule" {...seriesAttrs(shown[0]!.slot, shown[0]!.tone)} x1={x} x2={x} y1={y0} y2={y1} />
}

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
