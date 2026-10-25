/** A column of plain export data. Rendered JSX is never serialised. */
export interface DataTableExportColumn<Row> {
  /** Stable column identifier. */
  id: string;
  /** Header text. */
  header: string;
  /** Raw accessor or explicit column exportValue. */
  value: (row: Row) => unknown;
}

/** Options for CSV/TSV encoding. Only supplied rows and columns are exported. */
export interface DataTableExportOptions<Row> {
  /** Loaded/filtered records, or the selected records. */
  rows: readonly Row[];
  /** Visible columns in display order. */
  columns: readonly DataTableExportColumn<Row>[];
  /** Include column headers (default true). */
  headers?: boolean;
  /** Prefix CSV with a UTF-8 BOM for Excel (default false). */
  bom?: boolean;
}

/** Convert raw values to text; React elements and arbitrary objects are omitted. */
export function exportText(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date)
    return Number.isNaN(value.getTime()) ? "" : value.toISOString();
  if (["string", "number", "boolean", "bigint"].includes(typeof value))
    return String(value);
  return "";
}

const quote = (text: string, delimiter: string) =>
  text.includes(delimiter) || /["\r\n]/.test(text)
    ? `"${text.replaceAll('"', '""')}"`
    : text;

function encode<Row>(options: DataTableExportOptions<Row>, delimiter: string) {
  const records = options.rows.map((row) =>
    options.columns.map((column) => exportText(column.value(row))),
  );
  if (options.headers !== false)
    records.unshift(options.columns.map((column) => column.header));
  return (
    records
      .map((record) =>
        record.map((value) => quote(value, delimiter)).join(delimiter),
      )
      .join("\r\n") + (records.length ? "\r\n" : "")
  );
}

/** Encode RFC 4180 CSV with CRLF record endings and optional BOM. Does not start a download. */
export function exportCsv<Row>(options: DataTableExportOptions<Row>): string {
  return (options.bom ? "\uFEFF" : "") + encode(options, ",");
}

/** Encode a tab-separated table for the clipboard, quoting embedded tabs and line breaks. */
export function exportTsv<Row>(options: DataTableExportOptions<Row>): string {
  return encode(options, "\t");
}
