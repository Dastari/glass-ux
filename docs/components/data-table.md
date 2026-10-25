# Data table

`glass-ux/data-table` · [Catalogue](https://dastari.github.io/glass-ux/components/data-table)

The table owns column geometry, preferences, selection and keyboard interaction. The application
supplies records, identifiers, sorting/filtering/pagination state and persistence callbacks.
See [Data tables and filters](../data-filters.md) for server queries and filter definitions.

## Inline editing

Declare `edit` on an accessor column and provide `onCellEdit` on the table. The column helper
infers the editor's value type from the accessor. `editable: false` or a row predicate makes
individual cells read only. The same editor works in cards and expanded field details.

```tsx
const col = createDataTableColumns<Stock>()
const columns = col.columns([
  col.accessor("name", { header: "Item", edit: { kind: "text" } }),
  col.accessor("quantity", {
    header: "Quantity",
    edit: { kind: "number", validate: value => value >= 0 ? null : "Quantity must be zero or more" },
  }),
  col.accessor("status", {
    header: "Status",
    edit: { kind: "select", options: [{ value: "ready", label: "Ready" }, { value: "ordered", label: "Ordered" }] },
  }),
])

<DataTable id="stock" label="Stock" rows={rows} columns={columns} getRowId={row => row.id}
  onCellEdit={async ({ rowId, columnId, value }) => {
    await saveCell(rowId, columnId, value)
    setRows(current => current.map(row => row.id === rowId ? { ...row, [columnId]: value } : row))
  }} />
```

`kind` accepts `text`, `number`, `select`, `date`, `switch`, or a custom function receiving
`CellEditorProps<Row, Value>`. Text/date editors produce strings (dates use YYYY-MM-DD); numbers produce finite numbers;
switches produce booleans. Use `parse(text, row)` and `format(value, row)` for other value types.
Select options retain their original typed values. A custom editor controls its draft through
`onValueChange`, and calls `commit` or `cancel`. Forward the supplied accessible name to its control.

Enter, F2 and double-click begin editing; a printable character replaces the value. Enter
saves, Escape discards, and Tab/Shift+Tab save and move through editable fields in row order, scrolling virtual rows into view. Blur also saves. Arrow keys stay within the editor. Validation errors retain focus
and appear in an anchored tooltip without changing the row box. Saves show the optimistic
value and a spinner. Successful saves flash the cell; rejected promises restore the previous
value, expose `Error.message` in a tooltip and announce it politely. Keep stable record ids
and immutable records, and update `rows` after successful persistence.

## CSV and clipboard

Set `export` to show the Export menu. It exports visible columns in display order, using
loaded records or the current selection when there is one. Raw accessors provide values;
`exportValue(row)` on a column can replace them. JSX and arbitrary objects are omitted.

```tsx
<DataTable {...tableProps} export={{ filename: "stock.csv", bom: true, headers: true }} />

const csv = exportCsv({ rows, columns: [{ id: "name", header: "Item", value: row => row.name }], bom: true })
const tsv = exportTsv({ rows, columns: exportColumns, headers: false })
```

CSV uses RFC 4180 escaping and CRLF line endings. `bom` adds the UTF-8 BOM used by Excel.
`headers` controls clipboard headers; CSV downloads always include headers. Ctrl/Cmd+C copies
selected records as TSV, or the focused cell's text when nothing is selected. Editing inputs
keep the browser's normal text-copy behaviour. Clipboard menu actions require the browser's
clipboard capability and permission.

For a complete server result, supply `onExport({ format, columns, filters, sort, selection })`.
The callback owns fetching and delivering that export. Local export does not fetch unloaded
rows. Selections retained from earlier pages use their cached records.

## Column ordering and wording

Header grips use the shared drag engine, preview and automatic scrolling. Column menus offer
Move left/right and Move to start/end. A pinned column stays in its pinned group. Grips also
support Space to lift, arrows to move, Space to drop and Escape to cancel.

Order is saved alongside widths, pins, visibility and density under the table's `id`.
`defaultColumnOrder` applies when no order is saved. Set `columnOrder` and handle
`onColumnOrderChange` for controlled ordering. Unknown ids are ignored, duplicates are removed,
and new columns are appended. Reset columns restores the application defaults. Existing v1
preferences remain valid.

All table wording belongs to the `data-table` i18n namespace. Use a registered message pack,
`MessagesProvider`, or `labels` on a specific table. `locale` controls number/date formatting
and language-pack resolution. `dir="rtl"` on the surrounding region sets logical cell insets,
pinned start edges and visual left/right movement.
