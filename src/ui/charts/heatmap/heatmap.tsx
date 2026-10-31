import { useMessages } from "../../../lib/i18n/index.js"
import { heatmapMessages } from "./messages.js"
import { memo, useMemo, useRef, type CSSProperties } from "react"
import { ChartFrame, type ChartCommonProps, type PlotBox } from "../core/frame.js"
import { formatClock, formatValue, type LocalizedFormat, type ValueFormat } from "../core/format.js"
import { useLocale } from "../../../lib/locale/use-locale.js"
import { cssPath, roundRectPath } from "../core/geometry.js"
import { HitLayer } from "../core/hit.js"
import { useHoverStore, useStoreValue, type HoverStore } from "../core/hover.js"
import type { XValue } from "../core/scales.js"
import type { ChartTableModel } from "../core/table.js"
import type { ChartTier } from "../core/tier.js"
import { ChartTooltip, TooltipBody } from "../core/tooltip.js"
import { LiveRegion } from "../line/line-chart.js"

export interface HeatmapProps extends ChartCommonProps, ValueFormat {
  /** One label per row: alert categories, services, endpoints. */
  rows: readonly string[]
  /** One per column: hours (Dates) or labels. */
  columns: readonly XValue[]
  /** values[row][column]; null is "no data" (drawn as an empty cell). */
  values: readonly (readonly (number | null)[])[]
  /** Value range for the colour scale; defaults to [0, max]. */
  domain?: readonly [number, number]
  /** Colour steps, 3–7 (past seven, neighbouring steps blur). */
  steps?: number
  /** Format a column for labels and the readout. */
  formatColumn?: (column: XValue) => string
  /** Accessible name or label definition for a row. */
  rowLabel?: string
  /** Accessible name or label definition for a column. */
  columnLabel?: string
}

/**
 * Magnitude over two categories — alerts per hour by kind, CPU per hour by endpoint. One hue
 * (the data colour, --chart-1), light to strong in a few discrete steps; zero is the empty track colour so
 * quiet hours read as quiet. A step legend sits in the head.
 *
 *   micro    one strip: each column's total across the rows
 *   compact  the grid, row labels where they fit, passive
 *   full     row and column labels, the step legend, the cell tooltip and 2-D arrow keys
 */
export function Heatmap(props: HeatmapProps) {
  const messages = useMessages(heatmapMessages, { locale: props.locale })

  const { label, title, state = "ready", rows, columns, values, domain, steps = 5, formatColumn, rowLabel: rowLabelProp, columnLabel: columnLabelProp, unit, format, ...rest } = props
  const columnLabel = columnLabelProp ?? messages.time

  const rowLabel = rowLabelProp ?? messages.category

  const store = useHoverStore()
  const locale = useLocale(props.locale)
  const fmt: LocalizedFormat = useMemo(() => ({ unit, format, locale }), [unit, format, locale])
  const columnText = useMemo(() => formatColumn ?? ((column: XValue) => (column instanceof Date ? formatClock(column, locale) : String(column))), [formatColumn, locale])
  const range = useMemo<readonly [number, number]>(() => {
    if (domain) return domain
    let max = 0
    for (const row of values) for (const value of row) if (value !== null && value > max) max = value
    return [0, max || 1]
  }, [domain, values])
  const stepCount = Math.min(7, Math.max(3, steps))
  const table = useMemo<ChartTableModel>(
    () => ({
      columns: [{ key: "row", label: `${rowLabel} / ${columnLabel}` }, ...columns.map((column, index) => ({ key: `c${index}`, label: columnText(column), numeric: true, value: column }))],
      rows: rows.map((row, r) => ({ row, ...Object.fromEntries(columns.map((_, c) => [`c${c}`, formatValue(values[r]?.[c] ?? null, fmt)])) })),
      values: rows.map((_, r) => Object.fromEntries(columns.map((_, c) => [`c${c}`, values[r]?.[c] ?? null]))),
    }),
    [rows, columns, values, fmt, rowLabel, columnLabel, columnText]
  )
  const totals = useMemo(() => columns.map((_, c) => rows.reduce((sum, _row, r) => sum + (values[r]?.[c] ?? 0), 0)), [columns, rows, values])
  const peak = totals.reduce((best, value, index) => (value > (totals[best] ?? 0) ? index : best), 0)
  const trail =
    columns.length > 0 ? (
      <span className="fa-chart-figure">
        <span className="fa-chart-figure-label">{messages.peak(columnText(columns[peak]!))}</span>
        <span className="fa-chart-figure-value">{formatValue(totals[peak], fmt)}</span>
      </span>
    ) : null
  const head = (tier: ChartTier) =>
    tier === "full" ? (
      <span className="fa-chart-scale" aria-hidden>
        <span className="fa-chart-scale-end">{formatValue(range[0], fmt)}</span>
        {Array.from({ length: stepCount }, (_, step) => (
          <span key={step} className="fa-chart-cell-key" data-step={stepFor(step + 1, stepCount)} />
        ))}
        <span className="fa-chart-scale-end">{formatValue(range[1], fmt)}</span>
      </span>
    ) : null

  return (
    <ChartFrame {...rest} kind="heatmap" label={label} title={title} state={state} table={table} head={head} trail={trail} trailOptional>
      {(box) => <HeatmapPlot box={box} rows={rows} columns={columns} values={values} totals={totals} range={range} steps={stepCount} store={store} fmt={fmt} columnText={columnText} label={label} />}
    </ChartFrame>
  )
}

/** Map a step (1…count) onto the CSS ramp's seven positions so any step count spans it. */
function stepFor(step: number, count: number) {
  return Math.max(1, Math.min(7, Math.round(1 + ((step - 1) * 6) / Math.max(1, count - 1))))
}

function stepOf(value: number | null, range: readonly [number, number], count: number) {
  if (value === null) return "none"
  if (value <= range[0]) return "0"
  const t = (value - range[0]) / (range[1] - range[0] || 1)
  return String(stepFor(Math.min(count, Math.max(1, Math.ceil(t * count))), count))
}

interface HeatmapPlotProps {
  box: PlotBox
  /** Records or matrix rows in display order. */
  rows: readonly string[]
  /** Typed column definitions, including rendering, sorting, priorities and filters. */
  columns: readonly XValue[]
  /** Values rendered by the chart or multi-value control. */
  values: readonly (readonly (number | null)[])[]
  totals: number[]
  /** Visible range or selected value interval. */
  range: readonly [number, number]
  /** Ordered steps representing the progress or reasoning sequence. */
  steps: number
  /** External store observed by the component. */
  store: HoverStore
  fmt: LocalizedFormat
  columnText: (column: XValue) => string
  label: string
}

const HeatmapPlot = /* @__PURE__ */ memo(function HeatmapPlot({ box, rows, columns, values, totals, range, steps, store, fmt, columnText, label }: HeatmapPlotProps) {
  const messages = useMessages(heatmapMessages)

  const plotRef = useRef<HTMLDivElement>(null)
  const { width, height, tier, rem } = box
  const full = tier === "full"
  const micro = tier === "micro"
  const gap = 2
  const nCols = columns.length
  const nRows = micro ? 1 : rows.length

  const layout = useMemo(() => {
    const labelW = micro ? 0 : Math.min(width * 0.3, Math.max(...rows.map((row) => row.length * 0.56 * 0.75 * rem)) + 0.75 * rem)
    const showRowLabels = !micro && labelW >= 3 * rem && (height - (full ? 1.5 * rem : 0)) / nRows >= 0.875 * rem
    const left = showRowLabels ? labelW : 0
    const bottom = full ? 1.5 * rem : 0
    const cellW = (width - left + gap) / Math.max(1, nCols)
    const cellH = micro ? Math.min(height, 1 * rem) : (height - bottom + gap) / Math.max(1, nRows)
    const top = micro ? (height - cellH) / 2 : 0
    return { left, top, bottom, cellW, cellH, showRowLabels }
  }, [micro, width, height, rows, rem, full, nRows, nCols])

  const cells = useMemo(() => {
    const out: Array<{ key: string; d: string; step: string }> = []
    const r = Math.min(0.1875 * rem, (layout.cellW - gap) / 3, (layout.cellH - gap) / 3)
    const maxTotal = Math.max(1, ...totals)
    for (let row = 0; row < nRows; row++) {
      for (let col = 0; col < nCols; col++) {
        const value = micro ? totals[col] ?? 0 : (values[row]?.[col] ?? null)
        const x = layout.left + col * layout.cellW
        const y = layout.top + row * layout.cellH
        out.push({
          key: `${row}-${col}`,
          d: roundRectPath(x, y, Math.max(0.5, layout.cellW - gap), Math.max(0.5, layout.cellH - gap), r),
          step: micro ? stepOf(value, [0, maxTotal], steps) : stepOf(value, range, steps),
        })
      }
    }
    return out
  }, [nRows, nCols, micro, totals, values, layout, range, steps, rem])

  const count = nRows * nCols
  const locate = (lx: number, ly: number) => {
    const col = Math.floor((lx - layout.left) / layout.cellW)
    const row = Math.floor((ly - layout.top) / layout.cellH)
    if (col < 0 || col >= nCols || row < 0 || row >= nRows) return null
    return row * nCols + col
  }
  const anchor = (index: number) => {
    const row = Math.floor(index / nCols)
    const col = index % nCols
    return { x: layout.left + (col + 0.5) * layout.cellW, y: layout.top + row * layout.cellH }
  }
  const nav = (index: number, key: string) => {
    const row = Math.floor(index / nCols)
    const col = index % nCols
    switch (key) {
      case "ArrowRight":
        return row * nCols + Math.min(nCols - 1, col + 1)
      case "ArrowLeft":
        return row * nCols + Math.max(0, col - 1)
      case "ArrowDown":
        return Math.min(nRows - 1, row + 1) * nCols + col
      case "ArrowUp":
        return Math.max(0, row - 1) * nCols + col
      case "Home":
        return row * nCols
      case "End":
        return row * nCols + nCols - 1
      default:
        return null
    }
  }
  const valueText = (index: number) => {
    const row = Math.floor(index / nCols)
    const col = index % nCols
    return `${rows[row] ?? ""} · ${columnText(columns[col]!)} · ${formatValue(values[row]?.[col] ?? null, fmt)}`
  }
  const labelEvery = Math.max(1, Math.ceil((3.25 * rem) / layout.cellW))

  return (
    <div ref={plotRef} className="fa-chart-layer">
      <svg className="fa-chart-svg" width={width} height={height} aria-hidden>
        {cells.map((cell) => (
          <path key={cell.key} className="fa-chart-cell" data-step={cell.step} style={{ d: cssPath(cell.d) } as CSSProperties} />
        ))}
      </svg>
      {!micro ? (
        <div className="fa-chart-labels" aria-hidden>
          {layout.showRowLabels
            ? rows.map((row, index) => (
                <span key={row} className="fa-chart-cat" title={row} style={{ left: 0, top: index * layout.cellH, width: layout.left - 0.5 * rem, height: layout.cellH - gap }}>
                  {row}
                </span>
              ))
            : null}
          {full
            ? columns.map((column, index) =>
                index % labelEvery === 0 ? (
                  <span key={index} className="fa-chart-cat" data-align="middle" style={{ left: layout.left + index * layout.cellW, top: height - layout.bottom + 0.375 * rem, width: Math.min(layout.cellW * labelEvery, width - (layout.left + index * layout.cellW)) }}>
                    {columnText(column)}
                  </span>
                ) : null
              )
            : null}
        </div>
      ) : null}
      {full ? (
        <>
          <CellHighlight store={store} layout={layout} nCols={nCols} width={width} height={height} rem={rem} />
          <HitLayer store={store} count={count} locate={locate} anchor={anchor} nav={nav} initial={0} label={messages.inspectCells(label)} valueText={valueText} cursor="pointer" />
          <ChartTooltip store={store} anchor={plotRef}>
            {(hover) => {
              const row = Math.floor(hover.index / nCols)
              const col = hover.index % nCols
              return (
                <TooltipBody
                  title={rows[row]}
                  meta={columnText(columns[col]!)}
                  rows={[{ key: "v", label: rows[row] ?? "", value: formatValue(values[row]?.[col] ?? null, fmt), shape: "box", slot: 1 }]}
                  footer={messages.acrossAllRows(formatValue(totals[col], fmt))}
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

function CellHighlight({ store, layout, nCols, width, height, rem }: { store: HoverStore; layout: { left: number; top: number; cellW: number; cellH: number }; nCols: number; width: number; height: number; rem: number }) {
  const hover = useStoreValue(store)
  if (!hover) return null
  const row = Math.floor(hover.index / nCols)
  const col = hover.index % nCols
  const x = layout.left + col * layout.cellW
  const y = layout.top + row * layout.cellH
  return (
    <svg className="fa-chart-overlay" width={width} height={height} aria-hidden>
      <path className="fa-chart-hover-ring" d={roundRectPath(x - 1, y - 1, layout.cellW, layout.cellH, Math.min(0.25 * rem, layout.cellW / 3))} />
    </svg>
  )
}
