import { resolveMessages } from "../../lib/i18n/i18n.js";
import { defineMessages } from "../../lib/i18n/catalog.js";

/** English wording for DataTable, including cell editors and export. */
const cellDefaults = {
  sparkSummary: ({ label, current, low, high }: { label: string; current: string; low: string; high: string }) =>
    `${label}: now ${current}, low ${low}, high ${high}`,
  noData: (label: string) => `${label}: no data`,
  never: "Never",
  justNow: "just now",
  yesterday: "yesterday",
  lessThanMinute: "in less than a minute",
  minutesAhead: (n: number) => `in ${n} min`,
  hoursAhead: (n: number) => `in ${n} h`,
  daysAhead: (n: number) => `in ${n} ${n === 1 ? "day" : "days"}`,
  minutesAgo: (n: number) => `${n} min ago`,
  hoursAgo: (n: number) => `${n} h ago`,
  daysAgo: (n: number) => `${n} days ago`,
};
export const dataTableCellMessages = /* @__PURE__ */ defineMessages(
  "dataTable",
  cellDefaults as DataTableCellMessages,
);
type CellMessageDefaults = typeof cellDefaults;
/** Wording used by standalone cell formatters, without pulling in table controls. */
export interface DataTableCellMessages extends CellMessageDefaults {}

const defaults = {
  ...dataTableCellMessages.defaults,
  draggable: "draggable",
  filtered: (label: string) => `${label}, filtered`,
  rowNotMoved: (label: string) => `${label} was not moved`,
  columnDragInstructions:
    "Press Space or Enter to lift. Arrow keys move, Space or Enter drops, Escape cancels.",
  columnMoveBlocked: (label: string) =>
    `${label} can only move within its pinned group`,
  onlyValue: "Only this value",
  excludeValue: "Exclude this value",
  multiSortHint: "Shift-click to add to the sort",
  rowOrder: "Row order",
  selectLoaded: "Select all loaded rows",
  selectPage: "Select all rows on this page",
  rowActions: "Row actions",
  sortAscending: "Sort ascending",
  sortDescending: "Sort descending",
  clearSort: "Clear sort",
  filter: "Filter\u2026",
  clearFilter: "Clear filter",
  unpinColumn: "Unpin column",
  pinColumn: "Pin column",
  fitContent: "Fit to content",
  resetWidth: "Reset width",
  hideColumn: "Hide column",
  columnsDensity: "Columns and density",
  columns: "Columns",
  inDetails: "In row details",
  density: "Density",
  comfortable: "Comfortable",
  compact: "Compact",
  resetColumns: "Reset columns",
  clearSearch: "Clear search",
  clearFilters: "Clear filters",
  orderNotSaved: "The new order was not saved.",
  retry: "Retry",
  selectedRows: "Selected rows",
  more: "More",
  clearSelection: "Clear selection",
  clear: "Clear",
  condition: "Condition",
  search: "Search",
  selectAll: "Select all",
  none: "None",
  noOptions: "Nothing to choose from",
  invalidId: "Not an id",
  unknown: "Unknown",
  apply: "Apply",
  pasteValues: "Paste or type values",
  filters: "Filters",
  activeFilters: "Active filters",
  noRows: "No rows",
  row: "row",
  rows: "rows",
  lockedRow: "This row is locked in place",
  empty: "empty",
  from: "From",
  to: "To",
  selectRow: (label: string) => `Select ${label}`,
  moreFields: ({ expanded, count, label }: { expanded: boolean; count: number; label: string }) =>
    `${expanded ? "Hide" : "Show"} ${count} more fields for ${label}`,
  columnOptions: (label: string) => `${label} column options`,
  resizeColumn: (label: string) => `Resize ${label} column`,
  moreColumns: (count: number) => `Show ${count} more columns in rows`,
  columnMenu: (label: string) => `${label} column`,
  actionsFor: (label: string) => `Actions for ${label}`,
  actionFor: (action: string, label: string) => `${action} for ${label}`,
  moreActions: (label: string) => `More actions for ${label}`,
  pages: (label: string) => `${label} pages`,
  values: (label: string) => `${label} values`,
  text: (label: string) => `${label} text`,
  identifier: (label: string) => `${label} id`,
  fromField: (label: string) => `${label} from`,
  toField: (label: string) => `${label} to`,
  value: (label: string) => `${label} value`,
  betweenField: (label: string) => `${label} between`,
  filterColumn: (label: string) => `Filter ${label}`,
  searchRows: (noun: string) => `Search ${noun}`,
  /** Announced a moment after a search or filter changes: "Results: 12 orders". */
  resultsFound: (count: string) => `Results: ${count}`,
  noMatches: (query: string) => `No matches for "${query}"`,
  filterBy: (label: string) => `Filter by ${label}`,
  editFilter: (summary: string) => `Edit filter: ${summary}`,
  removeFilter: (summary: string) => `Remove filter: ${summary}`,
  searchSummary: (query: string) => `Search: ${query}`,
  editSearch: (query: string) => `Edit search: ${query}`,
  showAllFilters: (count: number) =>
    `${count} ${count === 1 ? "filter" : "filters"}: show all`,
  filterCount: (count: number) =>
    `${count} ${count === 1 ? "filter" : "filters"}`,
  reorderRow: (label: string) => `Reorder ${label}`,
  showMoreIn: (count: string, group: string) =>
    `Show ${count} more in ${group}`,
  showMore: (count: string) => `Show ${count} more`,
  loadMoreFailed: (noun: string) => `Couldn't load more ${noun}`,
  loadedOf: (count: string, total: string) => `${count} of ${total}`,
  loaded: (count: string) => `${count} loaded`,
  newRows: (count: number) => `${count} new`,
  didNotLoad: (label: string) => `${label} did not load.`,
  selectedCount: (count: string) => `${count} selected`,
  groupSummary: ({ label, count }: { label: string; count: string }) => `${label}, ${count}`,
  dateCondition: (label: string, condition: string) =>
    `${label} ${condition.toLocaleLowerCase("en")}`,
  updated: (relative: string) => `Updated ${relative}`,
  today: "Today",
  lastDay: "Last 24 hours",
  future: "In the future",
  beforeYesterday: "Before yesterday",
  recentDays: (days: number) => `Last ${days} days`,
  olderDays: (days: number) => `More than ${days} days ago`,
  contains: "Contains",
  is: "Is",
  isNot: "Is not",
  startsWith: "Starts with",
  endsWith: "Ends with",
  isOneOf: "Is one of",
  isNoneOf: "Is none of",
  isEmpty: "Is empty",
  isNotEmpty: "Is not empty",
  greaterThan: "Greater than",
  atLeast: "At least",
  lessThan: "Less than",
  atMost: "At most",
  equals: "Equals",
  notEqual: "Does not equal",
  between: "Between",
  isAnyOf: "Is any of",
  before: "Before",
  onOrAfter: "On or after",
  emptyQuery: (noun: string, query: string) => `No ${noun} match "${query}"`,
  emptyFilters: (noun: string) => `No ${noun} match these filters`,
  emptyQueryFilters: ({ noun, query, count }: { noun: string; query: string; count: number }) =>
    `No ${noun} match "${query}" and ${count} ${count === 1 ? "filter" : "filters"}`,
  summaryContains: (label: string, value: string) =>
    `${label} contains "${value}"`,
  summaryStartsWith: (label: string, value: string) =>
    `${label} starts with "${value}"`,
  summaryEndsWith: (label: string, value: string) =>
    `${label} ends with "${value}"`,
  /** A date preset as a filter summary: "Created: last 24 hours". `preset` arrives as written ("Last 24 hours"). */
  summaryPreset: (label: string, preset: string) =>
    `${label}: ${preset.toLocaleLowerCase("en")}`,
  summaryIs: (label: string, value: string) => `${label} is ${value}`,
  summaryIsNot: (label: string, value: string) => `${label} is not ${value}`,
  summaryNotIn: (label: string, value: string) => `${label}: not ${value}`,
  summaryEmpty: (label: string) => `${label} is empty`,
  summaryNotEmpty: (label: string) => `${label} is not empty`,
  summaryBefore: (label: string, value: string) => `${label} before ${value}`,
  summaryAfter: (label: string, value: string) =>
    `${label} on or after ${value}`,
  reorderDisabled: "Reordering is unavailable",
  reorderSorted: "Clear sorting to reorder",
  reorderSearched: "Clear the search to reorder",
  reorderFiltered: "Clear filters to reorder",
  reorderGrouped: "Reordering is unavailable while rows are grouped",
  reorderPaged: "Show every row on one page to reorder",
  reorderHeld: "Show the new rows to reorder",
  reorderSaving: "Saving the previous move…",
  reorderPosition: ({ position, count, group }: { position: number; count: number; group?: string }) =>
    `${position} of ${count}${group ? ` in ${group}` : ""}`,
  reorderLifted: ({ label, position, pointer = false }: { label: string; position: string; pointer?: boolean }) =>
    pointer
      ? `Lifted ${label}, position ${position}.`
      : `Lifted ${label}, position ${position}. Use the arrow keys to move, Space to drop, Escape to cancel.`,
  reorderMoved: (label: string, position: string) =>
    `${label}, position ${position}.`,
  reorderDropped: (label: string, position: string) =>
    `Dropped ${label} at position ${position}.`,
  reorderCancelled: (label: string, position: string) =>
    `Reorder cancelled. ${label} returned to position ${position}.`,
  reorderFailed: ({ label, position, reason }: { label: string; position: string; reason?: string }) =>
    `${label} could not be moved${reason ? `: ${reason.replace(/[.\s]+$/, "")}` : ""}. Returned to position ${position}.`,
  reorderInstructions:
    "Press Space to lift, the arrow keys to move, Space to drop and Escape to cancel. Alt with an arrow key moves one place.",
  reorderHint: "Drag to reorder, or press Space and use the arrow keys",
  editCell: (column: string) => `Edit ${column}`,
  invalidDate: "Enter a date as YYYY-MM-DD",
  datePlaceholder: "YYYY-MM-DD",
  invalidNumber: "Enter a valid number",
  invalidValue: "Enter a valid value",
  saveFailed: "The value could not be saved",
  export: "Export",
  downloadCsv: "Download CSV",
  copyTable: "Copy as table",
  copiedRows: (count: number) =>
    `Copied ${count} ${count === 1 ? "row" : "rows"}`,
  copyFailed: "The table could not be copied",
  exportFailed: "The table could not be exported",
  moveLeft: "Move left",
  moveRight: "Move right",
  moveStart: "Move to start",
  moveEnd: "Move to end",
  columnMoved: ({ label, position, count }: { label: string; position: number; count: number }) =>
    `${label} column moved to position ${position} of ${count}`,
  reorderColumn: (label: string) => `Reorder ${label} column`,
};
export const dataTableMessages = /* @__PURE__ */ defineMessages(
  "dataTable",
  defaults as DataTableMessages,
);
type TableMessageDefaults = typeof defaults;
/** All table messages; partial overrides may be passed through DataTable.labels. */
export interface DataTableMessages extends TableMessageDefaults {}

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    dataTable: DataTableMessages;
  }
}

/** Resolve table wording for formatting helpers outside React. */
export function resolveDataTableMessages(
  locale: string,
  labels?: Partial<DataTableMessages>,
): DataTableMessages {
  return resolveMessages(
    dataTableMessages.namespace,
    dataTableMessages.defaults,
    locale,
    labels,
  );
}

export function resolveDataTableCellMessages(
  locale: string,
): DataTableCellMessages {
  return resolveMessages(
    dataTableCellMessages.namespace,
    dataTableCellMessages.defaults,
    locale,
  );
}
