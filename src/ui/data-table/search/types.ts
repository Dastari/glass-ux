/**
 * The toolbar search (R16.8, docs/data-filters.md §8): one query, matched on the server
 * against the table's identifying fields and combined with the column filters.
 */
import type { RowData } from "@tanstack/react-table"
import type { FilterCondition } from "../filters/types.js"

/** A searched field that is not one of the table's columns ("Code" on an organisation). */
export interface SearchFieldRef<T> {
  /** The server field name (PascalCase), matched with `Contains`. */
  field: string
  /** Read the value from a row, for fully loaded lists (`matchesSearch`, `searchRows`). */
  value?: (row: T) => unknown
}

// oxlint-disable-next-line typescript/no-explicit-any -- any row type by default: tables pass their own
export interface DataTableSearch<T extends RowData = any> {
  /**
   * The identifying fields the query matches, each with a case-insensitive `Contains`, any
   * one of them enough. A string is a column id: its filter's `field` is the server field and
   * its accessor the local value. Columns the current column set does not have (a view
   * without that column) are skipped. `{ field, value }` adds a field that is not a column.
   */
  fields: ReadonlyArray<string | SearchFieldRef<T>>
  /** The empty field's hint: "Search name, serial, IP or user". Default "Search <noun.other>". */
  placeholder?: string
  /**
   * Replace the default `Or` of `Contains` with your own entry: a hand-written input
   * (`{ HostnameContains: query }`), or null when the query goes to an entity's search
   * resolver instead of the filter condition. Give `matches` too if a fully loaded list uses it.
   */
  toCondition?: (query: string) => FilterCondition | null
  /** Local matching for a custom `toCondition`: the rows the server would return. */
  matches?: (row: T, query: string) => boolean
}

/** Longest query kept (the URL and the server both see it). */
export const MAX_SEARCH_LENGTH = 200

/** The query as the server sees it: trimmed, capped, "" when there is none. */
export function normalizeSearch(value: unknown): string {
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  if (typeof value !== "string") return ""
  return value.trim().slice(0, MAX_SEARCH_LENGTH).trim()
}

/** How long typing must pause before the query runs (R16.8: 200–250 ms). */
export const SEARCH_DEBOUNCE_MS = 220
