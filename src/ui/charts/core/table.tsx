import { useRef } from "react"
import { useScrollEdges } from "../../../lib/use-scroll-edges.js"

/**
 * A cell's machine-readable value, for export: a number as it is (no grouping, rounding or
 * unit), text, or an instant (written as ISO 8601, UTC). `null` is an empty cell; a
 * non-finite number or an invalid date is written empty too.
 */
export type ChartTableValue = number | string | Date | null | undefined

export interface ChartTableColumn {
  key: string
  label: string
  /** Right-aligned with tabular figures. */
  numeric?: boolean
  /**
   * The column's machine value when its header stands for one (a heatmap's time column),
   * written as the CSV header in place of `label`.
   */
  value?: ChartTableValue
}

/** The chart's data as a table: the accessible equivalent of every chart (WCAG 1.1.1). */
export interface ChartTableModel {
  /** Typed column definitions, including rendering, sorting, priorities and filters. */
  columns: ChartTableColumn[]
  /** Cell text, already formatted the way the chart shows it. */
  rows: Array<Record<string, string>>
  /**
   * The same cells as raw values, row for row and keyed like `rows`: numbers unformatted,
   * instants as Dates, shares as fractions (0–1), `null` for an empty cell. Used by
   * "Copy as CSV" (`chartTableToCsv`); a cell left `undefined` falls back to its text in `rows`.
   */
  values?: Array<Record<string, ChartTableValue>>
  /**
   * Sentences about the chart that are not rows: its reference lines, bands and events.
   * Shown under the visible table; "Copy as CSV" leaves them out, so the CSV stays one
   * record per row.
   */
  notes?: readonly string[]
}

export interface ChartTableCsvOptions {
  /** Record separator. Default `"\r\n"` (RFC 4180). */
  lineEnding?: "\r\n" | "\n"
}

function csvValue(value: ChartTableValue): string {
  if (value === null || value === undefined) return ""
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? "" : value.toISOString()
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : ""
  return value
}

/** Quote a field that holds a comma, a double quote, CR or LF, doubling embedded quotes. */
function csvField(text: string): string {
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

/**
 * A chart's table as CSV (RFC 4180): a header row of column labels, then one record per row.
 * Cells use the model's raw `values` where it has them — numbers without locale grouping or
 * units, instants in ISO 8601 (UTC) — so the result is machine-readable; otherwise the cell
 * text. Fields containing a comma, double quote, CR or LF are quoted and embedded quotes are
 * doubled. Records are separated by CRLF (or `lineEnding`), with no trailing separator.
 *
 *   chartTableToCsv({ columns: [{ key: "x", label: "Time" }, { key: "cpu", label: "CPU" }],
 *     rows: [{ x: "9:05 PM", cpu: "44.4%" }], values: [{ x: new Date(…), cpu: 44.4 }] })
 *   // "Time,CPU\r\n2026-03-10T10:05:00.000Z,44.4"
 */
export function chartTableToCsv(model: ChartTableModel, options: ChartTableCsvOptions = {}): string {
  const eol = options.lineEnding ?? "\r\n"
  const header = model.columns.map((column) => csvField(column.value !== undefined && column.value !== null ? csvValue(column.value) : column.label))
  const records = model.rows.map((row, index) => {
    const raw = model.values?.[index]
    return model.columns.map((column) => {
      const value = raw?.[column.key]
      return csvField(value !== undefined ? csvValue(value) : (row[column.key] ?? ""))
    })
  })
  return [header, ...records].map((record) => record.join(",")).join(eol)
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
      data-scrolled-bottom={edges.bottom ? "" : undefined}
      data-scrolled-left={edges.left ? "" : undefined}
      data-scrolled-right={edges.right ? "" : undefined}
      role="region"
      aria-label={`${caption} · table`}
      // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scroll region must be keyboard scrollable (R20.6)
      tabIndex={0}
    >
      <TableMarkup model={model} caption={caption} visible />
      {model.notes?.length ? (
        <div className="fa-chart-table-notes">
          {model.notes.map((note) => (
            <p key={note}>{note}</p>
          ))}
        </div>
      ) : null}
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

/** A part's share of a whole as a fraction (0–1), for a share column's raw value; null without a whole. */
export function shareFraction(part: number, whole: number): number | null {
  return whole > 0 ? part / whole : null
}
