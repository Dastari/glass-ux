import { type DataTableMessages } from "../messages.js";
import type { ColumnFiltersState, Updater } from "@tanstack/react-table";
import { useCallback, useMemo, useRef, useState } from "react";
import type { DataColumnMeta } from "../features.js";
import { summarize } from "./summary.js";
import type { FilterSpec } from "./types.js";

/** A filterable column, as the table's filter UI sees it. */
export interface FilterColumnEntry {
  id: string;
  /** The column's CSS-safe key (data-col). */
  key: string;
  label: string;
  /** Typed rendering or field specification. */
  spec: FilterSpec;
}

export interface ActiveFilter {
  column: FilterColumnEntry;
  value: unknown;
  /** "OS: Windows 11 Pro, macOS 15". */
  summary: string;
}

/** Where the editor opens and where focus returns when it closes. */
export interface FilterTarget {
  columnId: string;
  /** Anchor used to position floating content. */
  anchor: Element | null;
  returnFocus: HTMLElement | null;
  /** Bumps on every open, so the editor starts from the applied value. */
  session: number;
}

export interface FilterController {
  /** Typed column definitions, including rendering, sorting, priorities and filters. */
  columns: readonly FilterColumnEntry[];
  filters: ColumnFiltersState;
  /** Marks the current destination or active choice. */
  active: readonly ActiveFilter[];
  target: FilterTarget | null;
  column: (columnId: string) => FilterColumnEntry | undefined;
  /** function valueOf() { [native code] } */
  valueOf: (columnId: string) => unknown;
  summaryOf: (columnId: string) => string | null;
  /** The summary without the column's name ("> 50%", "last 7 days") for menus that already show it. */
  hintOf: (columnId: string) => string | null;
  setFilter: (columnId: string, value: unknown) => void;
  clearAll: () => void;
  /**
   * Open a column's editor anchored to `anchor` (the header cell, a chip, the Filters
   * button). Opens on the next frame, after a menu that chose it has closed.
   */
  open: (
    columnId: string,
    anchor?: Element | null,
    returnFocus?: HTMLElement | null,
  ) => void;
  /** Closes the current overlay or view. */
  close: () => void;
  learnLabels: (
    columnId: string,
    labels: ReadonlyArray<readonly [string, string]>,
  ) => void;
  /** The toolbar's Filters button: the fallback anchor and focus target. */
  filtersButton: () => HTMLElement | null;
}

interface Definition {
  id: string;
  key: string;
  /** Supporting data displayed with the item. */
  meta: DataColumnMeta;
}

/** Strip the column's name from a summary for places that already name the column. */
export function hintFrom(summary: string, label: string) {
  if (!summary.startsWith(label)) return summary;
  return summary.slice(label.length).replace(/^:\s*/, "").trim() || summary;
}

export function useFilterController({
  definitions,
  filters,
  setFilters,
  filtersButton,
  locale,
  messages,
}: {
  definitions: readonly Definition[];
  filters: ColumnFiltersState;
  setFilters: (updater: Updater<ColumnFiltersState>) => void;
  /** Find the toolbar's Filters button (the fallback anchor). */
  filtersButton: () => HTMLElement | null;
  /** The table's resolved locale, for numbers and dates in summaries. */
  locale: string;
  messages?: DataTableMessages;
}): FilterController {
  const columns = useMemo<FilterColumnEntry[]>(
    () =>
      definitions.flatMap((entry) =>
        entry.meta.filter
          ? [
              {
                id: entry.id,
                key: entry.key,
                label: entry.meta.filter.label ?? entry.meta.label,
                spec: entry.meta.filter,
              },
            ]
          : [],
      ),
    [definitions],
  );
  const [target, setTarget] = useState<FilterTarget | null>(null);
  const session = useRef(0);
  const findButton = useRef(filtersButton);
  findButton.current = filtersButton;
  const labels = useRef(new Map<string, Map<string, string>>());
  const [labelsVersion, setLabelsVersion] = useState(0);

  const learnLabels = useCallback(
    (columnId: string, pairs: ReadonlyArray<readonly [string, string]>) => {
      const known = labels.current.get(columnId) ?? new Map<string, string>();
      let changed = false;
      for (const [value, label] of pairs) {
        if (known.get(value) === label) continue;
        known.set(value, label);
        changed = true;
      }
      labels.current.set(columnId, known);
      if (changed) setLabelsVersion((version) => version + 1);
    },
    [],
  );

  const latest = useRef(filters);
  latest.current = filters;
  const setFilter = useCallback(
    (columnId: string, value: unknown) => {
      // Re-applying the same value (Enter on an unchanged editor) is not a change: no new
      // history entry, no return to page 1.
      const before = latest.current.find(
        (filter) => filter.id === columnId,
      )?.value;
      if (JSON.stringify(before) === JSON.stringify(value)) return;
      setFilters((current) => {
        if (value === undefined)
          return current.filter((filter) => filter.id !== columnId);
        return current.some((filter) => filter.id === columnId)
          ? current.map((filter) =>
              filter.id === columnId ? { id: columnId, value } : filter,
            )
          : [...current, { id: columnId, value }];
      });
    },
    [setFilters],
  );
  const clearAll = useCallback(() => {
    if (latest.current.length) setFilters(() => []);
  }, [setFilters]);

  const open = useCallback(
    (
      columnId: string,
      anchor?: Element | null,
      returnFocus?: HTMLElement | null,
    ) => {
      const fallback = findButton.current();
      requestAnimationFrame(() => {
        session.current += 1;
        setTarget({
          columnId,
          anchor: anchor && anchor.isConnected ? anchor : fallback,
          returnFocus:
            returnFocus ?? (anchor instanceof HTMLElement ? anchor : fallback),
          session: session.current,
        });
      });
    },
    [],
  );
  const close = useCallback(() => setTarget(null), []);

  return useMemo(() => {
    const byId = new Map(columns.map((column) => [column.id, column]));
    const values = new Map(filters.map((filter) => [filter.id, filter.value]));
    const summaryFor = (column: FilterColumnEntry, value: unknown) => {
      try {
        return summarize(
          column.spec,
          column.label,
          value,
          labels.current.get(column.id),
          locale,
          messages,
        );
      } catch {
        return column.label;
      }
    };
    // Chips follow column order, so they never reshuffle as filters change.
    const active = columns.flatMap((column) =>
      values.has(column.id)
        ? [
            {
              column,
              value: values.get(column.id),
              summary: summaryFor(column, values.get(column.id)),
            },
          ]
        : [],
    );
    const summaries = new Map(
      active.map((entry) => [entry.column.id, entry.summary]),
    );
    return {
      columns,
      filters,
      active,
      target,
      column: (columnId: string) => byId.get(columnId),
      valueOf: (columnId: string) => values.get(columnId),
      summaryOf: (columnId: string) => summaries.get(columnId) ?? null,
      hintOf: (columnId: string) => {
        const summary = summaries.get(columnId);
        const column = byId.get(columnId);
        return summary && column ? hintFrom(summary, column.label) : null;
      },
      setFilter,
      clearAll,
      open,
      close,
      learnLabels,
      filtersButton: () => findButton.current(),
    };
    // labelsVersion: summaries re-read the labels learnt from server-loaded options.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [
    columns,
    filters,
    target,
    labelsVersion,
    setFilter,
    clearAll,
    open,
    close,
    learnLabels,
    locale,
    messages,
  ]);
}
