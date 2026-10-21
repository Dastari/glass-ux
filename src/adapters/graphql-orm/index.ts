/**
 * Optional server adapter: DataTable filter, search and sort state → graphql-orm `Where`
 * inputs, connections → table rows (with an Apollo field policy for infinite lists), plus an
 * in-memory `Where` evaluator for mock servers and tests. It depends on
 * `glass-ux/data-table`; the table never depends on it. Import it only when your server
 * accepts these shapes; otherwise write an adapter for your API from the same column specs.
 *
 *   import { toWhere } from "glass-ux/adapters/graphql-orm"
 *
 * Previously `glass-ux/lib/graphql-orm/where` and `glass-ux/lib/graphql-orm/evaluate`.
 */
export {
  columnEntries,
  columnWhere,
  decimalText,
  rfc3339,
  searchWhere,
  toFilterInput,
  toWhere,
  type WhereInput,
  type WhereOptions,
} from "./where.js"
export { evaluateWhere, type EvaluateOptions } from "./evaluate.js"
export {
  connectionPagination,
  connectionRows,
  nextKeysetPage,
  nextOffsetPage,
  type Connection,
  type ConnectionEdge,
  type ConnectionPageInfo,
  type ConnectionPaginationOptions,
  type ConnectionRows,
} from "./connection.js"
