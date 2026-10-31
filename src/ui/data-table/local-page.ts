import type { RowData } from "@tanstack/react-table";
import type { DataTableColumn } from "./columns.js";
import { filterColumns, filterRows } from "./filters/index.js";
import { searchRows, type DataTableSearch } from "./search/index.js";
import type { DataTableState } from "./types.js";
import { collator } from "../../lib/locale/intl.js";
import { getLocale } from "../../lib/locale/locale.js";

/**
 * Search, filter, stable-sort and page a fully loaded collection. Returns the filtered
 * count before pagination. Text sorts with `locale`'s collation (numeric-aware; default
 * `getLocale()`). Never use this to filter or count an incomplete server page; forward
 * table state to that server's accepted query contract instead.
 */
export function localPage<T extends RowData>(
  rows: readonly T[],
  columns: readonly DataTableColumn<T>[],
  state: Pick<DataTableState, "filters" | "sorting" | "pagination" | "search">,
  search?: DataTableSearch<T>,
  locale = getLocale(),
) {
  const filtered = searchRows(
    filterRows(rows, state.filters, filterColumns(columns)),
    state.search,
    search,
    columns,
    locale,
  );
  // Resolve columns and nested paths once, rather than for both values in every comparison.
  const sorters = state.sorting.map((sort) => {
    const { id } = sort;
    const column = columns.find(
      (column) =>
        column.id === id ||
        ("accessorKey" in column && column.accessorKey === id),
    );
    if (column && "accessorFn" in column && column.accessorFn) {
      const accessor = column.accessorFn;
      return { ...sort, read: (row: T) => accessor(row, 0) };
    }
    const key =
      column && "accessorKey" in column ? String(column.accessorKey) : id;
    const path = key.split(".");
    return {
      ...sort,
      read: (row: T) =>
        path.reduce<unknown>(
          (value, part) =>
            value !== null && typeof value === "object"
              ? (value as Record<string, unknown>)[part]
              : undefined,
          row,
        ),
    };
  });
  // localeCompare with options constructs locale machinery for every string pair.
  // Reuse the equivalent comparator; numeric-only sorts never need to construct it.
  let compare: Intl.Collator | undefined;
  const sorted = state.sorting.length
    ? filtered.toSorted((a, b) => {
        for (const sort of sorters) {
          const av = sort.read(a),
            bv = sort.read(b);
          const order =
            typeof av === "number" && typeof bv === "number"
              ? av - bv
              : (compare ??= collator(locale, { numeric: true })).compare(
                  String(av ?? ""),
                  String(bv ?? ""),
                );
          if (order) return sort.desc ? -order : order;
        }
        return 0;
      })
    : filtered;
  const { pageIndex, pageSize } = state.pagination;
  return {
    rows: sorted.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize),
    count: filtered.length,
  };
}
