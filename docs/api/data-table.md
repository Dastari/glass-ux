# DataTable

The one data table (R16). Server-side sorting and pagination, container-aware columns
(priority hiding → "+N" detail → card list), resizable and pinnable columns persisted
per user, selection with a bulk bar over the status bar, row ⋯ and right-click menus
from the entity's ActionSet, live updates that flash in place, and loading, empty and
error states that keep the table's box, and opt-in row reordering by drag or keyboard
(`reorder`) that leaves the order to the host.

`import { DataTable } from "glass-ux/data-table"`

[Live examples](https://dastari.github.io/glass-ux/components/data-table)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| actions | `ActionSet<T> \| undefined` | See type | no | — | The entity's actions (R12). The row ⋯ menu, the right-click menu and the bulk bar are the shared action renderers reading this one definition, so they match ActionMenu, ActionContextMenu and every other surface. |
| cardBreakpoint | `number \| undefined` | See type | no | 36 | Below this width (rem) rows become cards (default 36). |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| columnOrder | `readonly string[] \| undefined` | See type | no | — | Controlled display order. Pinned columns remain in their own group. |
| columns | `readonly DataTableColumn<T>[]` | See type | yes | — | Typed column definitions, including rendering, sorting, priorities and filters. |
| cursor | `CursorPagination \| undefined` | See type | no | — | Switch the pager to cursor mode. |
| defaultColumnOrder | `readonly string[] \| undefined` | See type | no | — | Initial order when no saved preference exists. |
| defaultHiddenColumns | `readonly string[] \| undefined` | See type | no | — | Column ids initially folded into row/card details. Saved user choices take precedence, including an explicitly empty hidden list. Reset columns restores these defaults. Columns with hideable=false remain visible. |
| defaultState | `Partial<DataTableState> \| undefined` | See type | no | — | Initial uncontrolled view state. |
| density | `DataTableDensity \| undefined` | "compact", "comfortable" | no | — | Row density for this table. Uncontrolled tables persist the user's choice. |
| emptyAction | `ReactNode` | See type | no | — | The primary action for the unfiltered empty state ("Add a row"). |
| emptyMessage | `ReactNode` | See type | no | — | One line for an empty result with nothing searched or filtered (R2.5), e.g. "No rows yet". While searching or filtering the table says so itself, with the `noun` (`No rows match "q3" and 2 filters`), and offers Clear search and Clear filters instead. |
| error | `ReactNode` | See type | no | — | Shown in the body box with Retry. A string should say what failed and what to do. |
| export | `boolean \| DataTableExportSettings \| undefined` | See type | no | — | Opt in to the export toolbar. Exports loaded rows or the current selection. |
| filterToggles | `readonly DataTableFilterToggle[] \| undefined` | See type | no | — | On/off filters that are not a column ("Show hidden"): rows in the Filters menu, and a chip while on. Clear filters turns them off too. |
| getRowActions | `((row: T) => ActionSet<T> \| undefined) \| undefined` | See type | no | — | Per-row ActionSets, for rows of different kinds (a device list: an endpoint's set is not a printer's). It replaces `actions`. One row's ⋯ and right-click resolve its own set, so they match its header exactly. A selection of several kinds (right-click inside it, the bulk bar) offers the actions every kind's set resolves, bulk in each, and each kind runs its own definition against its own rows (`resolveRowActions`). Keep the sets stable: the same object for every row of a kind. |
| getRowId | `(row: T) => string` | See type | yes | — | Returns a stable row identifier for selection, live updates and preferences. |
| getRowLabel | `((row: T) => string) \| undefined` | See type | no | — | Accessible label for a row ("NST-C106"): selection, actions and the reorder grip and announcements use it. Defaults to the first column's text. |
| grouping | `DataTableGrouping<T> \| undefined` | See type | no | — | Group the rows (server-side, docs/data-filters.md §7): a header row per group with its count from the server, which collapses (click, Enter or Space; ← and → on the header; Alt-click toggles every group). Each expanded group shows its first `pageSize` rows and a "Show more" line while the server has more; the pager gives way to a count. The collapsed groups and "Show more" counts are the `groups` state slice (in the URL with `useTableUrlState({ grouped: true })`). Pass `rows` in group order: each expanded group's loaded rows, as `groupOf` assigns them. |
| height | `"fill" \| "auto" \| undefined` | "fill", "auto" | no | "fill" | "fill" (default) fills a parent with a definite height and scrolls inside. |
| id | `string` | See type | yes | — | Stable id: persists column widths, hidden columns, pins and density per user. |
| infinite | `DataTableInfinite \| undefined` | See type | no | — | Load more rows as the reader scrolls instead of paging (see `DataTableInfinite`). The pager gives way to a count, and the page is neither shown nor written to the URL. Ignored with `grouping`, whose groups each load their own rows ("Show more"). |
| label | `string` | See type | yes | — | Accessible name of the grid, e.g. "Endpoints". |
| labels | `Partial<DataTableMessages> \| undefined` | See type | no | — | Override built-in wording for this table and its editors. |
| live | `boolean \| undefined` | false, true | no | false | Live data: flash changed cells and hold new rows behind an "N new" pill. |
| loading | `boolean \| undefined` | false, true | no | false | First load: skeleton rows in the final shape. |
| locale | `string \| undefined` | See type | no | — | BCP 47 locale for this table's numbers, dates, counts and local sorting. Default: the nearest `LocaleProvider`, then `configureLocale()`, then `<html lang>`, then en-US. |
| noun | `DataTableNoun \| undefined` | See type | no | — | Noun for counts in the status bar ("1,284 endpoints"), with a form per plural category of the locale (`{ one, other }` suffices for English). |
| onAction | `((action: ResolvedAction<T>, targets: readonly T[], surface: ActionSurface) => void) \| undefined` | See type | no | — | Run actions yourself. By default every surface uses the shared runner: confirm in an AlertDialog, run, then report with a toast (R12.4, R12.5). With `onAction`, the confirmation and the feedback are the caller's. |
| onCellEdit | `((change: DataTableCellEdit<T, unknown>) => void \| Promise<void>) \| undefined` | See type | no | — | Persist validated edits. A rejection restores the previous value and announces its message. |
| onColumnOrderChange | `((order: string[]) => void) \| undefined` | See type | no | — | Called after a drag or menu move; pair with columnOrder to control it. |
| onDensityChange | `((density: DataTableDensity) => void) \| undefined` | See type | no | — | Called with the density the person picks. Pair with `density` to control it; without `density` the table also stores the choice in its preferences. |
| onExport | `((request: DataTableExportRequest<T>) => void \| Promise<void>) \| undefined` | See type | no | — | Delegate CSV or clipboard export to the server, including the current view state. |
| onRetry | `(() => void) \| undefined` | See type | no | — | Called with no arguments when the person presses Retry in the error state; the button shows only when this is set. |
| onRowOpen | `((row: T) => void) \| undefined` | See type | no | — | Called with the row when the person opens it: Enter on the focused row, or the pointer gesture `rowOpen` chooses (double-click by default). |
| onStateChange | `((state: DataTableState, change: DataTableStateChange) => void) \| undefined` | See type | no | — | Called with the next full state and the slice that changed. |
| pageSizes | `readonly number[] \| undefined` | See type | no | DEFAULT_PAGE_SIZES | Page-size choices offered by pagination. |
| queryKey | `unknown` | See type | no | — | Identity of the query behind `rows` (scope, view, anything outside the table's state). When it changes the rows are a new result; when it does not, changed rows are live updates and flash. Sorting, the search, filters and the page are part of it already. |
| refetching | `boolean \| undefined` | false, true | no | false | A refetch is in flight: rows stay, a thin line runs under the header. |
| renderBulkActions | `((rows: T[], clear: () => void) => ReactNode) \| undefined` | See type | no | — | Replace the bulk bar's action buttons. |
| renderRowActions | `((row: T) => ReactNode) \| undefined` | See type | no | — | Replace the ⋯ menu for a row (render your own trigger, e.g. a shared ActionMenu). |
| renderRowContextMenu | `((row: T, targets: T[]) => ReactNode) \| undefined` | See type | no | — | Replace the context menu's content for a row (or the selection it belongs to). It is placed inside the shared ContextMenu popup, so build it from Menu parts. |
| reorder | `DataTableReorder<T> \| undefined` | See type | no | — | Row reordering by drag and keyboard (opt-in): a grip column before the checkboxes, also in cards. The host owns the order and receives each move; see `DataTableReorder`. |
| rowCount | `number \| undefined` | See type | no | — | Total rows on the server (offset pagination). |
| rowOpen | `DataTableRowOpen \| undefined` | "double-click", "click" | no | — | The pointer gesture that opens a row with `onRowOpen`. Enter always opens it. - `"double-click"` (default): a double-click; a single click only focuses the row. - `"click"`: a single primary click, and the rows (and cards) read as links, with a   pointer cursor and the hover fill. A click is ignored when it lands on a control in the   row (a button, link, input, checkbox or `data-dt-interactive` element), carries Shift,   Ctrl, ⌘ or Alt (which keep their selection meanings), uses another button, is the   second click of a double-click, or ends a drag that selected text in the row. |
| rows | `readonly T[]` | See type | yes | — | The current page of rows, already sorted and paged by the server. |
| rowWrapper | `((row: T, children: ReactElement) => ReactElement) \| undefined` | See type | no | — | Wrap each row element (e.g. in the shared ActionContextMenu). Must render `children`. |
| search | `DataTableSearch<T> \| undefined` | See type | no | — | The toolbar search (R16.8): a field at the start of the toolbar, beside Filters, that matches these identifying fields on the server. Its query is the `search` state slice (`q` in the URL with useTableUrlState). Typing waits 220 ms, then returns to the first page. `/` focuses it while the table has focus. On a narrow toolbar it is an icon button that opens the field, and an active query shows as a "Search: …" chip. |
| selectable | `boolean \| undefined` | false, true | no | true | Show checkboxes and allow selection (default true). |
| state | `Partial<DataTableState> \| undefined` | See type | no | — | Controlled slices. A slice left out is owned by the table. |
| status | `ReactNode` | See type | no | — | Extra status bar content (connection state, last sync). |
| toolbar | `ReactNode` | See type | no | — | The table's own controls (a view switch, Refresh), at the end of the toolbar. |
| updatedAt | `number \| Date \| undefined` | See type | no | — | When the data was last refreshed (status bar: "Updated 2 min ago"). |
