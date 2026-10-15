# DataTable

Server-side sorting and pages, columns that fold by priority into “+N” and then cards, resizable and pinned columns, bulk actions and live rows.

`import { DataTable } from "glass-ux/data-table"`

[Live examples](https://dastari.github.io/glass-ux/components/data-table)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| actions | `ActionSet<T> \| undefined` | See type | no | — | The entity's actions (R12). The row ⋯ menu, the right-click menu and the bulk bar are the shared action renderers reading this one definition, so they match ActionMenu, ActionContextMenu and every other surface. |
| cardBreakpoint | `number \| undefined` | See type | no | 36 | Below this width (rem) rows become cards (default 36). |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| columns | `readonly DataTableColumn<T>[]` | See type | yes | — | Typed column definitions, including rendering, sorting, priorities and filters. |
| cursor | `CursorPagination \| undefined` | See type | no | — | Switch the pager to cursor mode. |
| defaultState | `Partial<DataTableState> \| undefined` | See type | no | — | Initial uncontrolled view state. |
| density | `DataTableDensity \| undefined` | "compact", "comfortable" | no | — | Row density for this table. Uncontrolled tables persist the user's choice. |
| emptyAction | `ReactNode` | See type | no | — | The primary action for the unfiltered empty state ("Enrol a device"). |
| emptyMessage | `ReactNode` | See type | no | "No rows" | One line for an empty result with nothing searched or filtered (R2.5): "No endpoints enrolled". While searching or filtering the table says so itself (`No devices match "orb-7" and 2 filters`) and offers Clear search and Clear filters instead. |
| error | `ReactNode` | See type | no | — | Shown in the body box with Retry. A string should say what failed and what to do. |
| filterToggles | `readonly DataTableFilterToggle[] \| undefined` | See type | no | — | On/off filters that are not a column ("Show hidden"): rows in the Filters menu, and a chip while on. Clear filters turns them off too. |
| getRowActions | `((row: T) => ActionSet<T> \| undefined) \| undefined` | See type | no | — | Per-row ActionSets, for rows of different kinds (a device list: an endpoint's set is not a printer's). It replaces `actions`. One row's ⋯ and right-click resolve its own set, so they match its header exactly. A selection of several kinds (right-click inside it, the bulk bar) offers the actions every kind's set resolves, bulk in each, and each kind runs its own definition against its own rows (`resolveRowActions`). Keep the sets stable: the same object for every row of a kind. |
| getRowId | `(row: T) => string` | See type | yes | — | Returns a stable row identifier for selection, live updates and preferences. |
| getRowLabel | `((row: T) => string) \| undefined` | See type | no | — | Accessible label for a row ("NST-C106"). Defaults to the first column's text. |
| grouping | `DataTableGrouping<T> \| undefined` | See type | no | — | Group the rows (server-side, docs/data-filters.md §7): a header row per group with its count from the server, which collapses (click, Enter or Space; ← and → on the header; Alt-click toggles every group). Each expanded group shows its first `pageSize` rows and a "Show more" line while the server has more; the pager gives way to a count. The collapsed groups and "Show more" counts are the `groups` state slice (in the URL with `useTableUrlState({ grouped: true })`). Pass `rows` in group order: each expanded group's loaded rows, as `groupOf` assigns them. |
| height | `"auto" \| "fill" \| undefined` | "auto", "fill" | no | "fill" | "fill" (default) fills a parent with a definite height and scrolls inside. |
| id | `string` | See type | yes | — | Stable id: persists column widths, hidden columns, pins and density per user. |
| label | `string` | See type | yes | — | Accessible name of the grid, e.g. "Endpoints". |
| live | `boolean \| undefined` | false, true | no | false | Live data: flash changed cells and hold new rows behind an "N new" pill. |
| loading | `boolean \| undefined` | false, true | no | false | First load: skeleton rows in the final shape. |
| noun | `DataTableNoun \| undefined` | See type | no | — | Noun for counts in the status bar ("1,284 endpoints"). |
| onAction | `((action: ResolvedAction<T>, targets: readonly T[], surface: ActionSurface) => void) \| undefined` | See type | no | — | Run actions yourself. By default every surface uses the shared runner: confirm in an AlertDialog, run, then report with a toast (R12.4, R12.5). With `onAction`, the confirmation and the feedback are the caller's. |
| onDensityChange | `((density: DataTableDensity) => void) \| undefined` | See type | no | — | Called when density change occurs. The callback type specifies its arguments. |
| onRetry | `(() => void) \| undefined` | See type | no | — | Called when retry occurs. The callback type specifies its arguments. |
| onRowOpen | `((row: T) => void) \| undefined` | See type | no | — | Enter or double-click on a row. |
| onStateChange | `((state: DataTableState, change: DataTableStateChange) => void) \| undefined` | See type | no | — | Called with the next full state and the slice that changed. |
| pageSizes | `readonly number[] \| undefined` | See type | no | DEFAULT_PAGE_SIZES | Page-size choices offered by pagination. |
| queryKey | `unknown` | See type | no | — | Identity of the query behind `rows` (scope, view, anything outside the table's state). When it changes the rows are a new result; when it does not, changed rows are live updates and flash. Sorting, the search, filters and the page are part of it already. |
| refetching | `boolean \| undefined` | false, true | no | false | A refetch is in flight: rows stay, a thin line runs under the header. |
| renderBulkActions | `((rows: T[], clear: () => void) => ReactNode) \| undefined` | See type | no | — | Replace the bulk bar's action buttons. |
| renderRowActions | `((row: T) => ReactNode) \| undefined` | See type | no | — | Replace the ⋯ menu for a row (render your own trigger, e.g. a shared ActionMenu). |
| renderRowContextMenu | `((row: T, targets: T[]) => ReactNode) \| undefined` | See type | no | — | Replace the context menu's content for a row (or the selection it belongs to). It is placed inside the shared ContextMenu popup, so build it from Menu parts. |
| rowCount | `number \| undefined` | See type | no | — | Total rows on the server (offset pagination). |
| rows | `readonly T[]` | See type | yes | — | The current page of rows, already sorted and paged by the server. |
| rowWrapper | `((row: T, children: ReactElement) => ReactElement) \| undefined` | See type | no | — | Wrap each row element (e.g. in the shared ActionContextMenu). Must render `children`. |
| search | `DataTableSearch<T> \| undefined` | See type | no | — | The toolbar search (R16.8): a field at the start of the toolbar, beside Filters, that matches these identifying fields on the server. Its query is the `search` state slice (`q` in the URL with useTableUrlState). Typing waits 220 ms, then returns to the first page. `/` focuses it while the table has focus. On a narrow toolbar it is an icon button that opens the field, and an active query shows as a "Search: …" chip. |
| selectable | `boolean \| undefined` | false, true | no | true | Show checkboxes and allow selection (default true). |
| state | `Partial<DataTableState> \| undefined` | See type | no | — | Controlled slices. A slice left out is owned by the table. |
| status | `ReactNode` | See type | no | — | Extra status bar content (connection state, last sync). |
| toolbar | `ReactNode` | See type | no | — | The table's own controls (a view switch, Refresh), at the end of the toolbar. |
| updatedAt | `number \| Date \| undefined` | See type | no | — | When the data was last refreshed (status bar: "Updated 2 min ago"). |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
