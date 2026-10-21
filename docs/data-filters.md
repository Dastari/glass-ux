# Data tables, filters and server adapters

`glass-ux/data-table` provides typed columns, controlled state, filter editors, search,
selection, grouping and pagination. It renders the rows you supply; your application owns
fetching, authorization and the query that produces them.

## Choose the state boundary

For a server-backed table, pass the current page in `rows`, the total in `rowCount`, and
controlled `state`. Fetch again when `onStateChange` reports sorting, filters, search or
pagination. Keep selected IDs independently of the current page. `queryKey` identifies
changes of scope or view so live row updates are distinguished from a different result.

For local collections, apply `filterRows` and your sorting/paging adapter before supplying
rows. `filterRows` and `matchesFilter` use the same value semantics as the filter editors.
The complete [DataTable example](https://dastari.github.io/glass-ux/components/data-table/)
shows both the UI contract and fixture adapter.

## Declare meaning in the column

Use `createDataTableColumns<T>()`, `filters.text`, `filters.options`, `filters.number`,
`filters.date`, `filters.boolean` or `filters.uuid`. Define units, accepted operations,
option labels, null handling and the server field alongside the column. Filter values are
discriminated unions: the `op` determines whether they carry `value`, `values` or bounds.
Read their exact signatures in the TypeDoc reference and exported declarations.

Number inputs can convert a display unit to storage units. Date presets evaluate against
the user's local calendar day; timestamp bounds are emitted as UTC instants. Recompute
rolling presets when fetching. A calendar date and a timestamp have different semantics;
choose the matching date spec instead of stripping time zones in application code.

## Load more as the reader scrolls

`infinite` replaces the pager with one growing list. Pass the loaded rows, `rowCount` when the
server counts, and `infinite={{ hasMore, onLoadMore, loadingMore }}`. The table calls
`onLoadMore` once per batch as the end of the list comes within a screen of view; append the
next batch to `rows`. A placeholder row stands at the end while `hasMore`. A rejected promise
from `onLoadMore` (or `infinite.error`) shows the failure there with Retry and keeps the loaded
rows. Sorting, filters and the search remain server state: a change returns the table to the
top, and the host starts a new list. Grouped tables ignore `infinite`.

With graphql-orm, the offset list (`Page: { Limit, Offset }`) takes the table's `OrderBy`; ask
for the next offset with `nextOffsetPage`. A keyset list (`<Plural>Keyset(page: { after })`)
has a fixed order, so use it only for a table without sortable columns, with `nextKeysetPage`.
`connectionRows` reads a connection into `rows`, `rowCount` and `hasMore`, returning the same
array for the same result. With Apollo Client, `connectionPagination()` is the list field's
type policy: it joins each `fetchMore` batch to the cached list, keyed by every argument but
the page, and a refetch or poll replaces only the head.

```tsx
import { connectionPagination, connectionRows, nextOffsetPage, toWhere } from "glass-ux/adapters/graphql-orm";

const cache = new InMemoryCache({ typePolicies: { Query: { fields: { Devices: connectionPagination() } } } });

const { data, loading, networkStatus, fetchMore } = useQuery(DEVICES, {
  variables: { Where: toWhere(state.filters, columns, { search }), OrderBy: orderBy(state.sorting), Page: { Limit: 50, Offset: 0 } },
  notifyOnNetworkStatusChange: true,
});
const devices = connectionRows(data?.Devices);

<DataTable
  rows={devices.rows}
  rowCount={devices.rowCount}
  loading={loading && !data}
  refetching={networkStatus === NetworkStatus.setVariables}
  state={state}
  onStateChange={setState}
  infinite={{
    hasMore: devices.hasMore,
    loadingMore: networkStatus === NetworkStatus.fetchMore,
    onLoadMore: () => fetchMore({ variables: { Page: nextOffsetPage(data?.Devices, 50) } }),
  }}
  …
/>;
```

Offset batches can shift when rows are inserted or deleted ahead of the loaded ones; the field
policy shows a row that moved into the next batch once. For a live feed, pair `live` with the
subscription: rows appended by a batch are added at once, and rows that arrive above the
loaded ones wait behind the "N new" pill as usual.

## Keep URL state explicit

`parseTableSearch` and `serializeTableSearch` encode table state. `useTableUrlState`
integrates with a TanStack Router host. Assign a distinct prefix to each table in a route,
validate incoming search parameters, and reset the page when filters or sorting change.
Column widths, hidden columns, pins and density are browser preferences rather than query
state. Configure their namespace before mounting tables:

```ts
import { configureDataTables } from "glass-ux/data-table";
configureDataTables({ storageKeyPrefix: "my-app.table" });
```

## Keep a manual order in host data

`reorder={{ onReorder }}` adds a grip column (and a grip on cards) for pointer, touch and
keyboard reordering. Each grip's tooltip says how to use it. A drag lifts a copy of the row
into the top layer, styled like DragDropProvider's preview, while the other rows part around
a dashed slot. From the keyboard, focus a grip and press Space to lift the row, the arrow keys
to move it, Space to drop it and Escape to cancel; Alt with an arrow key moves a row one place
without lifting it. The table reports one `DataTableRowMove` per drop: `from`/`to` indexes
in `rows`, the new `rows`, and `previousId`/`nextId` so a server can store "after X". Update
local data with `move.rows` or `moveRow(rows, move.from, move.to)`. Return a promise to save
it: the move shows while pending and reverts, with a toast or your `onError`, on rejection.
Lock rows with `canReorder` and explain them with `lockedReason`. The grips are disabled,
with the reason as their tooltip, while sorted, searched, filtered, grouped (unless
`withinGroups`), paged (unless `withinPage`) or saving. The order is not a table preference
and is not written to the URL.

## Adapt the server shape

The table's filter and search state is backend-neutral: each column's `FilterSpec` names the
server field and, if needed, its own `toCondition`, which returns a `FilterCondition` (a
plain JSON object in your server's shape) or null to send nothing. A `DataTableSearch` takes
the same `toCondition` for its query. Server adapters are separate, optional entries that
depend on `glass-ux/data-table`, never the reverse.

`glass-ux/adapters/graphql-orm` maps the declared filter state to a GraphQL `Where` shape
(`toWhere`, `toFilterInput`, `columnWhere` and `searchWhere`) and evaluates a `Where` in
memory for mock servers (`evaluateWhere`). It does not connect to a server, generate a schema
or require a particular backend. Use it only when your server accepts those shapes. Otherwise
write an adapter for your API. Set your server's longest relative-day window with
`configureDataTables({ maxRelativeDays })`.

Migration: replace `glass-ux/lib/graphql-orm/where` and `glass-ux/lib/graphql-orm/evaluate`
with `glass-ux/adapters/graphql-orm`; the adapter's exported names are unchanged. In core
specs, `toWhere` is now `toCondition` and the `WhereInput` type is now `FilterCondition`; 0.8
removed the old names.

Declare mappings explicitly. A missing server capability should produce a deliberate UI
choice rather than a filter that silently does nothing. Always apply tenant and access
constraints on the server; browser filters are presentation state.

## Verify the adapter

Test representative text, option, null, unit and date-boundary cases with known rows.
Then exercise search, sorting, pagination, grouping and persisted preferences in the actual
host. The filter gallery uses wholly fictional projects and people; replace it with your
own data contract in production.
