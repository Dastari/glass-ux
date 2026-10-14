import { useNavigate, useSearch } from "@tanstack/react-router"
import { useCallback, useMemo, useRef, useState } from "react"
import { normalizeSearch } from "./search/types.js"
import type { DataTableState, DataTableStateChange } from "./types.js"
import { parseTableSearch, searchKeys, serializeTableSearch, type TableSearch, type TableUrlConfig, type TableUrlState } from "./url-state.js"

/**
 * Bind a DataTable's sorting, search, filters and pagination to the current route's search
 * params.
 *
 *   const url = useTableUrlState({ sortable: ["name", "lastSeen"], pageSizes: [25, 50, 100], defaultPageSize: 25, columns })
 *   <DataTable columns={columns} state={url.state} onStateChange={url.onStateChange} … />
 *
 * Each change pushes a history entry, so Back steps through pages, sorts and filters. A
 * search is one entry: starting or clearing it pushes, refining it replaces. A filter or
 * search change returns to page 1 (the table resets the page with it). The route can
 * validate the same keys with `parseTableSearch` in `validateSearch`. With `grouped: true`
 * the collapsed groups and "Show more" counts are in the URL too.
 */
export function useTableUrlState(config: TableUrlConfig) {
  const search = useSearch({ strict: false }) as TableSearch
  const searchRef = useRef(search)
  searchRef.current = search
  const navigate = useNavigate()
  const { prefix, sortable, pageSizes, defaultPageSize, defaultSorting, columns, defaultFilters, grouped } = config
  const configKey = JSON.stringify([prefix, sortable, pageSizes, defaultPageSize, defaultSorting, defaultFilters, grouped])

  // oxlint-disable-next-line react-hooks/exhaustive-deps -- configKey captures the config by value; columns are module-level
  const stableConfig = useMemo(() => config, [configKey, columns])
  const parsed = useMemo(() => parseTableSearch(search, stableConfig), [search, stableConfig])
  // Each slice keeps its identity while its value is the same, so a change to one key (the
  // search, another table's params) does not hand the table a new sort, filters or page and
  // re-render every row before the new result arrives.
  const sorting = useStableValue(parsed.sorting)
  const filters = useStableValue(parsed.filters)
  const pagination = useStableValue(parsed.pagination)
  const groups = useStableValue(parsed.groups)
  const state = useMemo<TableUrlState>(
    () => ({ sorting, filters, pagination, search: parsed.search, ...(groups ? { groups } : {}) }),
    [sorting, filters, pagination, parsed.search, groups]
  )

  const onStateChange = useCallback(
    (next: DataTableState, change: DataTableStateChange) => {
      if (change !== "sorting" && change !== "pagination" && change !== "filters" && change !== "search" && !(change === "groups" && stableConfig.grouped)) return
      const patch = serializeTableSearch(
        { sorting: next.sorting, pagination: next.pagination, filters: next.filters, search: next.search, groups: next.groups },
        stableConfig
      )
      const keys = searchKeys(stableConfig.prefix)
      const filterPrefix = keys.filterPrefix
      // Refining a search ("orb" → "orb-7") replaces its entry; starting or clearing one adds one.
      const refining = change === "search" && Boolean(normalizeSearch(searchRef.current[keys.search])) && Boolean(patch[keys.search])
      void navigate({
        to: ".",
        search: ((previous: TableSearch) => {
          const merged: TableSearch = { ...previous, ...patch }
          for (const key of Object.keys(merged)) {
            // Filters for columns the table no longer has go too.
            if (merged[key] === undefined || (stableConfig.columns && key.startsWith(filterPrefix) && !(key in patch))) delete merged[key]
          }
          return merged
        }) as never,
        resetScroll: false,
        viewTransition: false,
        // Collapsing a group or showing more of one is not a place to come back to.
        replace: change === "groups" || refining,
      })
    },
    [navigate, stableConfig]
  )

  return { state, onStateChange }
}

/** The previous value while the new one is equal by value (plain JSON state). */
function useStableValue<T>(value: T): T {
  const [kept, setKept] = useState(value)
  if (kept === value || JSON.stringify(kept) === JSON.stringify(value)) return kept
  setKept(value)
  return value
}
