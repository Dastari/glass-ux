import type { RowData } from "@tanstack/react-table";
import type { DataTableColumn } from "./columns.js";
import { filterColumns, filterRows } from "./filters/index.js";
import { searchRows, type DataTableSearch } from "./search/index.js";
import type { DataTableState } from "./types.js";

/**
 * Search, filter, stable-sort and page a fully loaded collection. Returns the filtered
 * count before pagination. Never use this to filter or count an incomplete server page;
 * forward table state to that server's accepted query contract instead.
 */
export function localPage<T extends RowData>(
  rows: readonly T[],
  columns: readonly DataTableColumn<T>[],
  state: Pick<DataTableState, "filters" | "sorting" | "pagination" | "search">,
  search?: DataTableSearch<T>,
) {
  const filtered = searchRows(
    filterRows(rows, state.filters, filterColumns(columns)),
    state.search,
    search,
    columns,
  );
  const read = (row: T, id: string) => {
    const column = columns.find(
      (column) =>
        column.id === id ||
        ("accessorKey" in column && column.accessorKey === id),
    );
    if (column && "accessorFn" in column && column.accessorFn)
      return column.accessorFn(row, 0);
    const key =
      column && "accessorKey" in column ? String(column.accessorKey) : id;
    return key
      .split(".")
      .reduce<unknown>(
        (value, part) =>
          value !== null && typeof value === "object"
            ? (value as Record<string, unknown>)[part]
            : undefined,
        row,
      );
  };
  const sorted = state.sorting.length
    ? filtered.toSorted((a, b) => {
        for (const sort of state.sorting) {
          const av = read(a, sort.id),
            bv = read(b, sort.id);
          const order =
            typeof av === "number" && typeof bv === "number"
              ? av - bv
              : String(av ?? "").localeCompare(String(bv ?? ""), "en-AU", {
                  numeric: true,
                });
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
