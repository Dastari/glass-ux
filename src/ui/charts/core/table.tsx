import { useRef } from "react"
import { useScrollEdges } from "../../../lib/use-scroll-edges.js"

export interface ChartTableColumn {
  key: string
  label: string
  /** Right-aligned with tabular figures. */
  numeric?: boolean
}

/** The chart's data as a table: the accessible equivalent of every chart (WCAG 1.1.1). */
export interface ChartTableModel {
  /** Typed column definitions, including rendering, sorting, priorities and filters. */
  columns: ChartTableColumn[]
  /** Cell text, already formatted the way the chart shows it. */
  rows: Array<Record<string, string>>
}

export interface ChartTableProps {
  /** Selected assistant model or typed view model. */
  model: ChartTableModel
  /** Accessible caption or figure description. */
  caption: string
  /** Visible "View as table" mode, or the always-present visually hidden fallback. */
  visible?: boolean
}

/**
 * Every chart carries its data as a table. Hidden, it gives screen readers the values the
 * picture shows; visible ("View as table"), it replaces the plot in the same box and scrolls
 * inside it.
 */
export function ChartTable({ model, caption, visible = false }: ChartTableProps) {
  // A table ignores sr-only's 1px width and lays out at its content width, which would widen
  // a narrow page; a block wrapper clips it.
  if (!visible)
    return (
      <div className="sr-only">
        <TableMarkup model={model} caption={caption} visible={false} />
      </div>
    )
  return <VisibleTable model={model} caption={caption} />
}

function VisibleTable({ model, caption }: { model: ChartTableModel; caption: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const edges = useScrollEdges(ref)
  return (
    <div
      ref={ref}
      className="fa-chart-table-scroll"
      data-scroll-container=""
      data-scrolled-top={edges.top ? "" : undefined}
      role="region"
      aria-label={`${caption} · table`}
      // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scroll region must be keyboard scrollable (R20.6)
      tabIndex={0}
    >
      <TableMarkup model={model} caption={caption} visible />
    </div>
  )
}

function TableMarkup({ model, caption, visible }: { model: ChartTableModel; caption: string; visible: boolean }) {
  return (
    <table className={visible ? "fa-chart-table" : undefined} data-chart-table={visible ? "visible" : "fallback"}>
      <caption className={visible ? "sr-only" : undefined}>{caption}</caption>
      <thead>
        <tr>
          {model.columns.map((column) => (
            <th key={column.key} scope="col" data-numeric={column.numeric ? "" : undefined}>
              {column.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {model.rows.map((row, index) => (
          <tr key={index}>
            {model.columns.map((column, columnIndex) =>
              columnIndex === 0 ? (
                <th key={column.key} scope="row">
                  {row[column.key] ?? ""}
                </th>
              ) : (
                <td key={column.key} data-numeric={column.numeric ? "" : undefined}>
                  {row[column.key] ?? ""}
                </td>
              )
            )}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
