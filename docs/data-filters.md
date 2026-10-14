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

## Keep URL state explicit

`parseTableSearch` and `serializeTableSearch` encode table state. `useTableUrlState`
integrates with a TanStack Router host. Assign a distinct prefix to each table in a route,
validate incoming search parameters, and reset the page when filters or sorting change.
Column widths, hidden columns, pins and density are browser preferences rather than query
state. Configure their namespace before mounting tables:

```ts
import { configureDataTables } from "glass-ux/data-table"
configureDataTables({ storageKeyPrefix: "my-app.table" })
```

## Adapt the server shape

The optional pure helpers in `glass-ux/lib/graphql-orm/where` map the declared filter state
to a GraphQL `Where` shape: `toWhere`, `toFilterInput`, `toOrderBy` and `searchWhere`.
They do not connect to a server, generate a schema or require a particular backend. Use
them only when your server accepts those shapes. Otherwise write an adapter for your API.

Declare mappings explicitly. A missing server capability should produce a deliberate UI
choice rather than a filter that silently does nothing. Always apply tenant and access
constraints on the server; browser filters are presentation state.

## Verify the adapter

Test representative text, option, null, unit and date-boundary cases with known rows.
Then exercise search, sorting, pagination, grouping and persisted preferences in the actual
host. The filter gallery uses wholly fictional projects and people; replace it with your
own data contract in production.
