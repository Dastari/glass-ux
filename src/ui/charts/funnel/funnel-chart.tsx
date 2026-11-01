import { useMessages } from "../../../lib/i18n/index.js"
import { funnelMessages } from "./messages.js"
import { memo, useId, useMemo, useRef, useState, type CSSProperties } from "react"
import { readingKey } from "../../../lib/direction.js"
import { textWidth } from "../core/axes.js"
import { ChartFrame, type ChartCommonProps, type PlotBox } from "../core/frame.js"
import { formatShare, formatValue, type LocalizedFormat, type ValueFormat } from "../core/format.js"
import { useLocale } from "../../../lib/locale/use-locale.js"
import { HitLayer } from "../core/hit.js"
import { useHoverStore, useStoreValue, type HoverStore } from "../core/hover.js"
import { ChartLegend, type LegendItem } from "../core/legend.js"
import { seriesAttrs, type ChartTone } from "../core/series.js"
import type { ChartTableModel } from "../core/table.js"
import { ChartTooltip, TooltipBody } from "../core/tooltip.js"
import { useRtl } from "../core/use-rtl.js"
import { LiveRegion } from "../line/line-chart.js"
import { funnelBars, funnelConnector, funnelRates, type FunnelBar, type FunnelRates } from "./layout.js"

export interface FunnelStage {
  key: string
  label: string
  /** How many reached the stage. Negative values count as zero. */
  value: number
  /** Categorical slot 1–8; every stage defaults to slot 1, since the stages are one flow. */
  slot?: number
  /** Status tone, only when the stage means that state. */
  tone?: ChartTone
}

export interface FunnelChartProps extends ChartCommonProps, ValueFormat {
  /** The stages in order, widest first. A later stage larger than an earlier one is drawn as it is, with a rate past 100%. */
  stages: readonly FunnelStage[]
  /** `centre` (the default) draws the funnel's silhouette; `start` lines the bars up at one edge, for reading amounts exactly. */
  align?: "centre" | "start"
  /** Header for the table's first column. */
  stageLabel?: string
  /**
   * Click, Enter or Space on a stage: its index and key. While set, the plot shows a pointer
   * cursor and its accessible name says Enter selects.
   */
  onActivate?: (index: number, key: string) => void
}

/**
 * Stages that narrow, each drawn to scale with the largest: sign-ups through to activation.
 * Rows read in order, top to bottom. Each names its stage and its value and share of the
 * first; the band between two bars carries the step's rate where there is room. Hiding a
 * stage in the legend drops it from the rates, so a reader can compare the stages either side
 * of it; the table keeps every stage.
 *
 * Label and value columns and `align="start"` follow the reading direction.
 *
 *   micro    falling columns; the last stage's share of the first as a trail
 *   compact  labelled rows, passive; the label stands over its bar when the box is narrow
 *   full     rows with shares and step rates, the interactive legend, the tooltip and arrow
 *            keys: up and down move by stage, and left and right follow reading order
 */
export function FunnelChart(props: FunnelChartProps) {
  const messages = useMessages(funnelMessages, { locale: props.locale })
  const { label, title, state: stateProp = "ready", stages, align = "centre", stageLabel: stageLabelProp, unit, format, onActivate, ...rest } = props
  const stageLabel = stageLabelProp ?? messages.stage
  const state = stateProp === "ready" && stages.length === 0 ? "empty" : stateProp
  const [hidden, setHidden] = useState<ReadonlySet<string>>(() => new Set())
  const store = useHoverStore()
  const locale = useLocale(props.locale)
  const fmt: LocalizedFormat = useMemo(() => ({ unit, format, locale }), [unit, format, locale])
  const visible = useMemo(() => stages.filter((stage) => !hidden.has(stage.key)), [stages, hidden])

  const table = useMemo<ChartTableModel>(() => {
    const rates = funnelRates(stages.map((stage) => stage.value))
    const share = (rate: number | null) => (rate === null ? "—" : formatShare(rate, 1, locale))
    return {
      columns: [
        { key: "stage", label: stageLabel },
        { key: "value", label: messages.value, numeric: true },
        { key: "ofFirst", label: messages.ofFirst, numeric: true },
        { key: "ofPrevious", label: messages.ofPrevious, numeric: true },
        { key: "drop", label: messages.dropOff, numeric: true },
      ],
      rows: stages.map((stage, index) => {
        const rate = rates[index]!
        return { stage: stage.label, value: formatValue(stage.value, fmt), ofFirst: share(rate.ofFirst), ofPrevious: share(rate.ofPrevious), drop: formatValue(rate.drop, fmt) }
      }),
      values: stages.map((stage, index) => {
        const rate = rates[index]!
        return { value: stage.value, ofFirst: rate.ofFirst, ofPrevious: rate.ofPrevious, drop: rate.drop }
      }),
    }
  }, [stages, fmt, locale, stageLabel, messages])

  const legend: LegendItem[] = stages.map((stage) => ({ key: stage.key, label: stage.label, slot: stage.slot ?? 1, tone: stage.tone, shape: "box" }))
  const toggle = (key: string) =>
    setHidden((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  // Rows name themselves, so the legend is only the show-and-hide control. Stage names are long
  // and there are several: it takes the foot and leaves the title the head.
  const foot = stages.length > 1 ? <ChartLegend items={legend} hidden={hidden} onToggle={toggle} /> : undefined

  const first = visible[0]
  const last = visible[visible.length - 1]
  const trail =
    first && last && visible.length > 1 ? (
      <span className="fa-chart-figure">
        <span className="fa-chart-figure-label">{messages.overall}</span>
        <span className="fa-chart-figure-value">{formatShare(last.value, first.value, locale)}</span>
      </span>
    ) : undefined

  return (
    <ChartFrame {...rest} kind="funnel" label={label} title={title} state={state} table={table} foot={foot} footLegend trail={trail} trailSize="figure">
      {(box) => <FunnelPlot box={box} stages={visible} store={store} align={align} fmt={fmt} label={label} onActivate={onActivate} />}
    </ChartFrame>
  )
}

interface FunnelPlotProps {
  box: PlotBox
  stages: readonly FunnelStage[]
  /** External store observed by the component. */
  store: HoverStore
  align: "centre" | "start"
  fmt: LocalizedFormat
  label: string
  onActivate?: (index: number, key: string) => void
}

/** A row's space: side by side with the bar, over it, or none where the box has no room for words. */
type Labels = "side" | "over" | "none"

const FunnelPlot = /* @__PURE__ */ memo(function FunnelPlot({ box, stages, store, align, fmt, label, onActivate }: FunnelPlotProps) {
  const messages = useMessages(funnelMessages, { locale: fmt.locale })
  const id = useId()
  const plotRef = useRef<HTMLDivElement>(null)
  const rtl = useRtl(plotRef)
  const { width, height, tier, rem } = box
  const full = tier === "full"
  const micro = tier === "micro"
  const n = stages.length
  const values = useMemo(() => stages.map((stage) => stage.value), [stages])
  const rates = useMemo<FunnelRates[]>(() => funnelRates(values), [values])
  const barMax = 1.5 * rem

  const layout = useMemo(() => {
    const pitch = height / Math.max(1, n)
    const labels: Labels = micro ? "none" : width >= 22 * rem ? (pitch >= rem ? "side" : "none") : pitch >= 1.875 * rem ? "over" : pitch >= rem && width >= 14 * rem ? "side" : "none"
    const texts = values.map((value, index) => ({ value: formatValue(value, fmt), share: full ? formatShare(value, values[0] ?? 0, fmt.locale) : "", name: stages[index]?.label ?? "" }))
    const valueW = labels === "side" ? Math.max(...texts.map((text) => textWidth(text.value, rem) + (text.share ? textWidth(text.share, rem) + 0.5 * rem : 0))) + 0.5 * rem : 0
    const labelW = labels === "side" ? Math.min(width * 0.32, Math.max(...texts.map((text) => textWidth(text.name, rem))) + 0.75 * rem) : 0
    const lead = labels === "over" ? 1.125 * rem : 0
    const thick = Math.min(barMax, Math.max(0.25 * rem, labels === "over" ? pitch - lead - 0.375 * rem : pitch * 0.62))
    const offset = labels === "over" ? lead : (pitch - thick) / 2
    // In right-to-left text the label column stands on the right, so the bars' track swaps sides.
    const x0 = rtl ? valueW : labelW
    const x1 = width - (rtl ? labelW : valueW)
    const bars = funnelBars(values, { x0, x1, top: 0, pitch, thick, offset, align })
    return { pitch, labels, texts, valueW, labelW, bars: rtl && align === "start" ? bars.map((bar) => ({ ...bar, x: x0 + x1 - bar.x - bar.width })) : bars, x0, x1, thick, connectors: labels !== "over" }
  }, [n, height, width, micro, full, rem, barMax, values, stages, fmt, align, rtl])

  const columns = useMemo(() => {
    if (!micro) return []
    const max = Math.max(1, ...values)
    const gap = 2
    const w = (width - gap * (n - 1)) / Math.max(1, n)
    return values.map((value, index) => {
      const h = Math.max(1, (Math.max(0, value) / max) * height)
      return { x: rtl ? width - (index + 1) * w - index * gap : index * (w + gap), y: height - h, width: Math.max(1, w), height: h }
    })
  }, [micro, values, width, height, n, rtl])

  const locate = (_x: number, y: number) => {
    const index = Math.floor(y / layout.pitch)
    return index >= 0 && index < n ? index : null
  }
  const anchor = (index: number) => {
    const bar = layout.bars[index]
    return bar ? { x: bar.x + bar.width / 2, y: bar.y + bar.height / 2 } : { x: width / 2, y: height / 2 }
  }
  const nav = (index: number, key: string) => {
    const reading = plotRef.current ? readingKey(key, plotRef.current) : key
    switch (reading) {
      case "ArrowDown":
      case "ArrowRight":
        return Math.min(n - 1, index + 1)
      case "ArrowUp":
      case "ArrowLeft":
        return Math.max(0, index - 1)
      case "Home":
        return 0
      case "End":
        return n - 1
      default:
        return null
    }
  }
  const share = (rate: number | null) => (rate === null ? "—" : formatShare(rate, 1, fmt.locale))
  const valueText = (index: number) => {
    const stage = stages[index]
    if (!stage) return ""
    const rate = rates[index]
    return [stage.label, formatValue(stage.value, fmt), messages.ofFirstValue(share(rate?.ofFirst ?? null)), index > 0 ? messages.ofPreviousValue(share(rate?.ofPrevious ?? null)) : null].filter(Boolean).join(" · ")
  }

  return (
    <div ref={plotRef} className="fa-chart-layer fa-chart-funnel">
      {full ? <RowHighlight store={store} pitch={layout.pitch} width={width} height={height} rem={rem} /> : null}
      <svg className="fa-chart-svg" width={width} height={height} aria-hidden>
        <defs>
          {stages.map((stage, index) => (
            <linearGradient key={stage.key} id={`${id}-sheen-${index}`} x1="0" y1="0" x2="0" y2="1" {...seriesAttrs(stage.slot ?? 1, stage.tone)}>
              <stop offset="0" className="fa-chart-sheen-top" />
              <stop offset="0.45" className="fa-chart-sheen-bottom" />
            </linearGradient>
          ))}
        </defs>
        {micro ? (
          columns.map((column, index) => <rect key={stages[index]?.key} className="fa-chart-bar fa-chart-funnel-micro" x={column.x} y={column.y} width={column.width} height={column.height} {...seriesAttrs(stages[index]?.slot ?? 1, stages[index]?.tone)} />)
        ) : (
          <>
            {layout.connectors
              ? stages.slice(0, -1).map((stage, index) => <path key={stage.key} className="fa-chart-funnel-link" {...seriesAttrs(stage.slot ?? 1, stage.tone)} style={{ d: `path("${funnelConnector(layout.bars[index]!, layout.bars[index + 1]!)}")` } as CSSProperties} />)
              : null}
            {stages.map((stage, index) => (
              <FunnelBarMark key={stage.key} id={id} stage={stage} bar={layout.bars[index]!} index={index} />
            ))}
          </>
        )}
      </svg>
      {!micro && layout.labels !== "none" ? (
        <div className="fa-chart-labels" aria-hidden>
          {stages.map((stage, index) => {
            const text = layout.texts[index]!
            const top = index * layout.pitch
            return layout.labels === "side" ? (
              <span key={stage.key}>
                <span className="fa-chart-funnel-label" style={{ insetInlineStart: 0, top, height: layout.pitch, width: layout.labelW - 0.5 * rem }}>
                  <span className="fa-chart-funnel-name" title={stage.label}>
                    {stage.label}
                  </span>
                </span>
                <span className="fa-chart-funnel-label" style={{ insetInlineEnd: 0, top, height: layout.pitch, width: layout.valueW - 0.5 * rem, justifyContent: "flex-end" }}>
                  <span className="fa-chart-funnel-value">{text.value}</span>
                  {text.share ? <span className="fa-chart-funnel-share">{text.share}</span> : null}
                </span>
              </span>
            ) : (
              <span key={stage.key} className="fa-chart-funnel-label" style={{ insetInline: 0, top, height: 1.125 * rem, justifyContent: "space-between" }}>
                <span className="fa-chart-funnel-name" title={stage.label}>
                  {stage.label}
                </span>
                <span className="fa-chart-funnel-value">{text.value}</span>
              </span>
            )
          })}
          {full && layout.connectors && layout.pitch - layout.thick >= 1.125 * rem
            ? stages.slice(1).map((stage, index) => (
                <span key={stage.key} className="fa-chart-funnel-rate" style={{ left: (layout.x0 + layout.x1) / 2, top: (index + 1) * layout.pitch }}>
                  {share(rates[index + 1]?.ofPrevious ?? null)}
                </span>
              ))
            : null}
        </div>
      ) : null}
      {full ? (
        <>
          <HitLayer
            store={store}
            count={n}
            locate={locate}
            anchor={anchor}
            nav={nav}
            initial={0}
            cursor="pointer"
            label={onActivate ? messages.inspectStagesEnterSelects(label) : messages.inspectStages(label)}
            valueText={valueText}
            onActivate={onActivate ? (index) => onActivate(index, stages[index]?.key ?? "") : undefined}
          />
          <ChartTooltip store={store} anchor={plotRef}>
            {(hover) => {
              const stage = stages[hover.index]
              const rate = rates[hover.index]
              if (!stage || !rate) return null
              return (
                <TooltipBody
                  title={stage.label}
                  rows={[{ key: stage.key, label: messages.ofFirstValue(share(rate.ofFirst)), value: formatValue(stage.value, fmt), slot: stage.slot ?? 1, tone: stage.tone, shape: "box" }]}
                  footer={hover.index > 0 ? [messages.ofPreviousValue(share(rate.ofPrevious)), messages.dropOffValue(formatValue(rate.drop, fmt))].join(" · ") : undefined}
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

function FunnelBarMark({ id, stage, bar, index }: { id: string; stage: FunnelStage; bar: FunnelBar; index: number }) {
  return (
    <rect
      className="fa-chart-bar fa-chart-funnel-bar"
      data-end="centre"
      x={bar.x}
      y={bar.y}
      width={bar.width}
      height={bar.height}
      {...seriesAttrs(stage.slot ?? 1, stage.tone)}
      style={{ fill: `url(#${id}-sheen-${index})`, "--_enter-delay": `calc(var(--duration-instant) * ${Math.min(index, 12) * 0.25})` } as CSSProperties}
    />
  )
}

function RowHighlight({ store, pitch, width, height, rem }: { store: HoverStore; pitch: number; width: number; height: number; rem: number }) {
  const hover = useStoreValue(store)
  if (!hover) return null
  return (
    <svg className="fa-chart-overlay fa-chart-underlay" width={width} height={height} aria-hidden>
      <rect className="fa-chart-hover-band" x={0} y={hover.index * pitch} width={width} height={pitch} rx={0.375 * rem} />
    </svg>
  )
}
