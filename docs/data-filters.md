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

With graphql-orm, the offset list (`Page: { Limit, Offset }`) and the keyset list
(`<Plural>Keyset(page: { after })`) both take the table's `OrderBy`, so either can back a table
with sortable columns. Ask for the next batch with `nextOffsetPage` or `nextKeysetPage`.
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

## Choose a card view

Rows become cards below `cardBreakpoint` (36rem), measured on the table rather than the screen.
`view="cards"` or `view="table"` holds one view at any width; a table held narrower than its pinned
columns scrolls sideways. For a person's choice, put a
`Segmented` in `toolbar` and switch between `"auto"` and `"cards"`, so a phone still gets cards:

```tsx
<DataTable
  view={choice === "cards" ? "cards" : "auto"}
  cardMinWidth={16}
  renderCard={renderPackageCard}
  renderCardSkeleton={renderPackageSkeleton}
  toolbar={<Segmented options={VIEWS} value={choice} onValueChange={setChoice} iconOnly aria-label="View" />}
/>
```

The switch has nothing to choose below the breakpoint. `.fa-dt` is a named container, so hide it
there with `@container fa-dt (width < 36rem)`.

`cardMinWidth` lays cards in as many columns as fit. Group headers, detail panels and status lines
run across the grid. Up and Down move within a column, Left and Right in reading order, and an
expander or "+N" is reached with Tab. A reorderable table keeps one column.

`renderCard` draws a card's content; the table keeps its frame, focus, selection highlight and
clicks. Place what it hands you, or that part of the row is out of reach:

```tsx
const renderPackageCard = (row: Package, card: DataTableCard) => (
  <div className="package-card">
    {card.select}
    {row.name}
    {card.actions}
    {card.expander}
    {card.cell("version")}
  </div>
);
```

- `card.cell(columnId)` draws a column's cell as the table does, with inline editing if it has it.
- Give your own controls `card.tabIndex`, so Tab reaches only those in the current card.
- Keep the function stable: a new one draws every card again.
- Pass `renderCardSkeleton` at the card's size, or loading shows the default card's shape.
- The columns menu leaves out its column choices, since they no longer decide what a card shows.

A card is as tall as its content, and a grid's row as tall as its tallest card, so `renderCard` sets
the height. `cardMaxWidth` caps the width: give it the same value as `cardMinWidth` for tiles of one
fixed width. Every card in a table follows those two; one card wider than the rest is not offered.

Cards have no column headers, so the toolbar gains a sort menu while they show, over the sortable
columns and the same `sorting` state. Below 36rem, a phone or a narrow dialog, it joins the columns menu,
so the toolbar gains no button there. Pass `cardSort={false}` to place your own control in `toolbar`.
Controls that show only with cards come first in the toolbar, so `toolbar` and Export stay where they
are when the view changes.

## Another entity in a cell

A row belongs to one entity, and its right-click menu offers that entity's actions. When a cell shows
another (a device's Organisation or Site), give its column `entity`, and right-click in that cell offers
that entity's actions instead:

```ts
col.accessor("site", {
  header: "Site",
  entity: (device) => device.site && { name: device.site.name, actions: siteActions, target: device.site },
})
```

Draw the cell's identity passive, as a row's own identity is: the row owns clicks and menus. The menu
runs through the shared runner, not the table's `onAction`, and is reached with the pointer; keyboard
users reach the entity where it has its own page or menu.

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

## Open a row: detail panels and tree rows

Both are opt-in; a table with neither stays a plain `grid` and reports the same state as
before. The open rows are the `expanded` state slice: ids, controlled through `state` or
started with `defaultState`, reported as `"expanded"` to `onStateChange`. Like selection they
survive paging, sorting and filtering. They are a view choice, so neither the URL nor the saved
preferences hold them; a host that wants a link to an open row keeps the ids itself.

`renderRowDetail={(row) => …}` adds an expander in the first visible column (on cards, beside
the actions) and shows host content under the row. `canExpandRow` limits which rows have a
panel. A panel renders only while it is open and on screen, and its height is measured, so it
needs no fixed size; `rowDetailHeight` (rem) is the guess before that, and a close one keeps
the scrollbar steady. A panel scrolled far away unmounts like a row, except the one holding
focus, so keep state worth keeping in the host. Its controls are in the page's tab order, so a
table with panels open is more than one tab stop. It stays a `grid`: rows are not nested, so
the expander holds `aria-expanded` and `aria-controls` and the row holds neither.

`tree={{ getSubRows }}` makes `rows` the top of a hierarchy. The grid becomes a `treegrid`,
because `aria-level`, `aria-posinset`, `aria-setsize` and a row's `aria-expanded` are allowed
only there, and each row carries all four. Row ids must be unique across the tree. Paging,
`rowCount`, `infinite` and grouping count top-level rows; under `grouping` a group header is
level 1. `aria-rowcount` is -1 for both features, because an open row adds lines the server's
count knows nothing about.

From the keyboard, → opens a closed row and then moves into what it opened; ← closes an open
row and moves from a closed one to its parent. Enter and, without selection, Space toggle a row
unless `onRowOpen` takes Enter. ↑ and ↓ stop on a panel, where ← returns to its row; Shift with
an arrow steps over panels, so a range keeps growing. `expandAll={false}` removes the
expand-all, which otherwise stands over the expanders (in the settings menu on cards).

### Load children on demand

Mark rows that have children with `hasChildren`, give the count with `getChildCount` when the
server knows it, and load in `onLoadChildren`. As with `infinite`, the host puts what arrives
into `rows` (or returns a new `getSubRows`, for children kept elsewhere):

```tsx
const tree = useMemo<DataTableTree<Folder>>(() => ({
  getSubRows: (folder) => folder.children,
  hasChildren: (folder) => folder.childCount > 0,
  getChildCount: (folder) => folder.childCount,
  onLoadChildren: async (folder, { loaded, signal }) => {
    const page = await fetchChildren(folder.id, { offset: loaded, signal });
    setFolders((current) => withChildren(current, folder.id, page));
  },
}), []);

<DataTable rows={folders} tree={tree} … />
```

A row shown open with no children loaded asks for them once. Placeholder rows hold the place
of up to five children from `getChildCount`, so they replace the placeholders without moving
what follows, and a failure sits over the same space with Retry; closing and reopening the row
tries again. While fewer children are loaded than exist (`getChildCount`, or `hasMoreChildren`
for a server that does not count), a "Show more" line ends them and asks with `loaded` as the
offset. `signal` aborts when the result changes. Without `onLoadChildren`, watch `expanded` in
`onStateChange` and fetch there.

Expand-all covers the rows of the current view that are already loaded, and adds to ids from
other pages. It never fetches: unloaded branches, other pages and later batches stay closed.

### What each table feature does with open rows

- **Sorting and filtering** stay the server's. Return siblings in the current order, sorted
  within their parent. A filter keeps the ancestors of a match, because a match without its path
  cannot be read: mark them with `tree.isContext`, and they are drawn quieter. A matching
  parent keeps only the children that match too. Branches in a filtered result open without
  writing `expanded` (`tree.openMatches: false` leaves them closed), and what a person closes
  stays closed until the query changes. `filterTreeRows` applies all this to loaded rows and
  returns `context`; a match in a branch that has not loaded is the server's to find.
- **Selection** names rows, never descendants, as in Tree. Selecting a parent selects that row,
  and `onStateChange` reports `{ unloaded }`: rows just selected whose children are not all
  loaded, for the host to decide what they mean on the server. Select all and Shift ranges take
  the rows on screen and pass over context rows, so a bulk action reaches only rows that matched.
  A selected row stays selected when its parent closes.
- **Reorder** needs the visible order to be `rows`: closed rows can be moved, and while any row
  is open the grips are disabled with the reason. Top-level rows only; moving a row to another
  parent is not supported, so a tree's hierarchy is the host's to change.
- **Export** writes every loaded row in tree order, open or not, with a Level column first, since
  a flat file has no indent. A selection exports those rows. Unloaded children are not fetched,
  and panels are not exported: they are host content. `onExport` also receives `expanded`.
- **Grouping** works with both. Groups hold top-level rows, whose children and panels follow them.
  `infinite` still gives way to `grouping`.
- **Inline editing** works in child rows and cards. Editors live in cells, so a panel's own
  form is the host's. Tab moves through the rows on screen, not into closed branches.
- **Live rows**: only top-level rows wait behind the "N new" pill. A child that arrives appears at
  once, and the first line in view stays put if it arrives above it.
- **Virtualisation**: when lines come and go above the viewport, or a panel measures itself, the
  first line in view stays where it is. An expand-all from far down the list does not move it.

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
