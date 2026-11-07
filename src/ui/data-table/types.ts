import type { DataTableCellEdit } from "./edit-types.js";
import type { DataTableExportColumn } from "./export.js";
import type { DataTableMessages } from "./messages.js";
import type { RowData } from "@tanstack/react-table";
import type {
  ColumnFiltersState,
  PaginationState,
  RowSelectionState,
  SortingState,
} from "@tanstack/react-table";
import type { ReactElement, ReactNode } from "react";
import type {
  ActionSet,
  ActionSurface,
  ResolvedAction,
} from "../../lib/actions/actions.js";
import type { DataTableColumn } from "./columns.js";
import type { DataTableGroupState, DataTableGrouping } from "./grouping.js";
import type { DataTableSearch } from "./search/types.js";

/** The table state that belongs to the caller (and normally to the URL). */
export interface DataTableState {
  /** Server-side sort order. Shift-click a header to add a column. */
  sorting: SortingState;
  /**
   * Server-side column filters (R16.7): TanStack's column filter state, one entry per
   * filtered column, each value in the shape of the column's filter kind. Changing a
   * filter returns to the first page. Map it to your server's query in an adapter.
   */
  filters: ColumnFiltersState;
  /**
   * The toolbar search query (R16.8), trimmed; "" or absent when there is none. It narrows
   * with the filters (both must hold) and, like them, returns to the first page. Send it
   * with the filters through the same server adapter.
   */
  search?: string;
  /** Offset pagination: zero-based page index and page size. */
  pagination: PaginationState;
  /** Selected row ids. Survives paging and sorting. */
  selection: RowSelectionState;
  /**
   * Row grouping (with `grouping`): collapsed groups and each group's "Show more" count.
   * Sorting or filtering returns every group to its first page, as it returns a flat table
   * to page 1; collapsed groups stay collapsed. Absent: every group expanded, first page.
   */
  groups?: DataTableGroupState;
  /**
   * Open rows, by id (with `renderRowDetail` or `tree`). Ids survive paging, sorting and
   * filtering, as selection does; an id with no row on screen does nothing. A view choice:
   * it is not in the URL or the saved preferences, so a host that wants either keeps it there.
   */
  expanded?: readonly string[];
}

export type DataTableStateChange = keyof DataTableState;

/** The third argument of `onStateChange`, sent with a selection change in a tree table. */
export interface DataTableStateChangeDetails {
  /**
   * Rows in what was just selected whose children are not all loaded. Selection names rows,
   * never descendants, as in Tree: a selected parent stands for itself, and the host decides
   * whether it means everything under it, here and on the server.
   */
  unloaded: string[];
}

export type DataTableDensity = "comfortable" | "compact";

/** Cursor pagination: the server returns next/previous cursors instead of a total. */
export interface CursorPagination {
  hasNext: boolean;
  hasPrevious: boolean;
  /** Called with no arguments when the person presses Next page (only while `hasNext`). */
  onNext: () => void;
  /** Called with no arguments when the person presses Previous page (only while `hasPrevious`). */
  onPrevious: () => void;
  /** Return to the first page (shown when provided). */
  onFirst?: () => void;
}

/**
 * Infinite loading (server-side): one growing list instead of pages. The host's data layer
 * appends each batch to `rows` (Apollo's `fetchMore` with a merging field policy, TanStack
 * Query's `fetchNextPage`), requesting the next offset (`rows.length`) or the last cursor.
 * Sorting, filters and the search are still the server's: a change starts a new list from
 * the top, as it returns a paged table to page 1.
 */
export interface DataTableInfinite {
  /** The server has rows after the last one in `rows`. */
  hasMore: boolean;
  /**
   * Called with no arguments when the end of the loaded rows comes within a screen of view:
   * fetch the next batch and append it to `rows`. It is called once per batch, and not while
   * `refetching` (the rows shown belong to the previous query). A returned
   * promise holds further calls until it settles; if it rejects, the end of the list shows
   * "Couldn't load more {noun}" with Retry.
   */
  onLoadMore: () => void | Promise<unknown>;
  /** A batch is loading. While `hasMore`, a placeholder row stands at the end of the list either way. */
  loadingMore?: boolean;
  /**
   * The last batch failed (for a host that tracks it rather than rejecting). The end of the
   * list shows it with Retry, which calls `onLoadMore`, and the loaded rows stay.
   */
  error?: ReactNode;
}

/** What `DataTableTree.onLoadChildren` is asked for. */
export interface DataTableChildRequest {
  /** Children already loaded: the offset of the next batch. */
  loaded: number;
  /** Aborted when the result changes or the table unmounts. */
  signal: AbortSignal;
}

/**
 * Hierarchical rows. `rows` holds the top of the tree; children come from `getSubRows` and
 * indent under an expander, in a `treegrid`. Paging, `rowCount`, `infinite` and grouping count
 * top-level rows only, and row ids must be unique across the whole tree.
 *
 * Sorting and filtering stay the server's: return siblings in the current order, sorted within
 * their parent. A filter keeps the ancestors of a match, so a match never loses its path; mark
 * those rows with `isContext`, and branches in the result open while the filter holds without
 * changing `expanded`. `filterTreeRows` does this for local rows.
 *
 * Keep the functions stable. A new `getSubRows` means the children changed, so pass a new one
 * when they live outside `rows`.
 */
export interface DataTableTree<T> {
  /**
   * A row's loaded children, in order. `undefined` or `null` means none are loaded; an empty
   * array means it has none.
   */
  getSubRows: (row: T) => readonly T[] | null | undefined;
  /** The server has children for this row though none are loaded: it gets an expander. */
  hasChildren?: (row: T) => boolean;
  /**
   * Children on the server. It sets `aria-setsize`, reserves their place while they load (up to
   * five rows), and adds a "Show more" line while fewer are loaded.
   */
  getChildCount?: (row: T) => number | undefined;
  /** More children exist than are loaded, for a server that does not count them. */
  hasMoreChildren?: (row: T) => boolean;
  /**
   * Load a row's children, when an unloaded row is shown open or "Show more" is pressed. Update
   * `rows` (or return a new `getSubRows`) so `getSubRows` returns them, and return a promise: a
   * rejection shows the failure with Retry in the children's place, and a promise that
   * resolves with `getSubRows` still empty means the row has none. Called once per batch, and
   * never by an expand-all. Without it, watch `expanded` in `onStateChange` and fetch there.
   */
  onLoadChildren?: (row: T, request: DataTableChildRequest) => void | Promise<unknown>;
  /** The column that holds the expander and the indent. Default: the first visible column. */
  column?: string;
  /**
   * The row is here only as the path to a match. It is drawn quieter, and Select all passes
   * over it, so a bulk action reaches only rows that matched.
   */
  isContext?: (row: T) => boolean;
  /** Open every branch in a filtered or searched result (default true). */
  openMatches?: boolean;
}

/**
 * The names a table gives its rows, by plural category of the locale (`one`, `few`, `many`,
 * ...). Only `other` is required, and `{ one, other }` is enough for English. Counts pick the
 * form with the locale's plural rules; sentences such as "No rows match" use `other`.
 */
export interface DataTableNoun extends Partial<Record<Intl.LDMLPluralRule, string>> {
  /** The form for every count without a form of its own. */
  other: string;
}

/** The pointer gesture that opens a DataTable row: see `DataTableProps.rowOpen`. */
export type DataTableRowOpen = "double-click" | "click";

export interface DataTableProps<T extends RowData> {
  /** Stable id: persists column widths, hidden columns, pins and density per user. */
  id: string;
  /** Override built-in wording for this table and its editors. */
  labels?: Partial<DataTableMessages>;
  /** Persist validated edits. A rejection restores the previous value and announces its message. */
  onCellEdit?: (change: DataTableCellEdit<T>) => void | Promise<void>;
  /** Opt in to the export toolbar. Exports loaded rows or the current selection. */
  export?: boolean | DataTableExportSettings;
  /** Delegate CSV or clipboard export to the server, including the current view state. */
  onExport?: (request: DataTableExportRequest<T>) => void | Promise<void>;
  /** Controlled display order. Pinned columns remain in their own group. */
  columnOrder?: readonly string[];
  /** Initial order when no saved preference exists. */
  defaultColumnOrder?: readonly string[];
  /** Called after a drag or menu move; pair with columnOrder to control it. */
  onColumnOrderChange?: (order: string[]) => void;
  /** Accessible name of the grid, e.g. "Endpoints". */
  label: string;
  /** The current page of rows, already sorted and paged by the server. */
  rows: readonly T[];
  /** Typed column definitions, including rendering, sorting, priorities and filters. */
  columns: readonly DataTableColumn<T>[];
  /**
   * Column ids initially folded into row/card details. Saved user choices take
   * precedence, including an explicitly empty hidden list. Reset columns restores
   * these defaults. Columns with hideable=false remain visible.
   */
  defaultHiddenColumns?: readonly string[];
  /** Returns a stable row identifier for selection, live updates and preferences. */
  getRowId: (row: T) => string;
  /** Total rows on the server (offset pagination). */
  rowCount?: number;
  /** Controlled slices. A slice left out is owned by the table. */
  state?: Partial<DataTableState>;
  /** Initial uncontrolled view state. */
  defaultState?: Partial<DataTableState>;
  /**
   * Called with the next full state and the slice that changed. In a tree table a selection
   * change also carries `DataTableStateChangeDetails`.
   */
  onStateChange?: (
    state: DataTableState,
    change: DataTableStateChange,
    details?: DataTableStateChangeDetails,
  ) => void;
  /** Switch the pager to cursor mode. */
  cursor?: CursorPagination;
  /**
   * Load more rows as the reader scrolls instead of paging (see `DataTableInfinite`). The pager
   * gives way to a count, and the page is neither shown nor written to the URL. Ignored with
   * `grouping`, whose groups each load their own rows ("Show more").
   */
  infinite?: DataTableInfinite;
  /** Page-size choices offered by pagination. */
  pageSizes?: readonly number[];
  /**
   * Identity of the query behind `rows` (scope, view, anything outside the table's state).
   * When it changes the rows are a new result; when it does not, changed rows are live
   * updates and flash. Sorting, the search, filters and the page are part of it already.
   */
  queryKey?: unknown;

  /** First load: skeleton rows in the final shape. */
  loading?: boolean;
  /** A refetch is in flight: rows stay, a thin line runs under the header. */
  refetching?: boolean;
  /** Shown in the body box with Retry. A string should say what failed and what to do. */
  error?: ReactNode;
  /** Called with no arguments when the person presses Retry in the error state; the button shows only when this is set. */
  onRetry?: () => void;
  /**
   * One line for an empty result with nothing searched or filtered (R2.5), e.g. "No rows
   * yet". While searching or filtering the table says so itself, with the `noun` (`No rows
   * match "q3" and 2 filters`), and offers Clear search and Clear filters instead.
   */
  emptyMessage?: ReactNode;
  /** The primary action for the unfiltered empty state ("Add a row"). */
  emptyAction?: ReactNode;
  /**
   * An icon for the unfiltered empty state: the thing that is missing, before `emptyMessage`. The
   * table sizes it and hides it from assistive technology, so pass it without a size. Default:
   * none. While searching or filtering the table says so itself, with no icon.
   */
  emptyIcon?: ReactNode;

  /** Show checkboxes and allow selection (default true). */
  selectable?: boolean;
  /**
   * The entity's actions (R12). The row ⋯ menu, the right-click menu and the bulk bar are
   * the shared action renderers reading this one definition, so they match ActionMenu,
   * ActionContextMenu and every other surface.
   */
  actions?: ActionSet<T>;
  /**
   * Run actions yourself. By default every surface uses the shared runner: confirm in an
   * AlertDialog, run, then report with a toast (R12.4, R12.5). With `onAction`, the
   * confirmation and the feedback are the caller's.
   */
  onAction?: (
    action: ResolvedAction<T>,
    targets: readonly T[],
    surface: ActionSurface,
  ) => void;
  /**
   * Per-row ActionSets, for rows of different kinds (a device list: an endpoint's set is not a
   * printer's). It replaces `actions`. One row's ⋯ and right-click resolve its own set, so
   * they match its header exactly. A selection of several kinds (right-click inside it, the
   * bulk bar) offers the actions every kind's set resolves, bulk in each, and each kind runs
   * its own definition against its own rows (`resolveRowActions`). Keep the sets stable: the
   * same object for every row of a kind.
   */
  getRowActions?: (row: T) => ActionSet<T> | undefined;
  /** Replace the ⋯ menu for a row (render your own trigger, e.g. a shared ActionMenu). */
  renderRowActions?: (row: T) => ReactNode;
  /**
   * Replace the context menu's content for a row (or the selection it belongs to). It is
   * placed inside the shared ContextMenu popup, so build it from Menu parts.
   */
  renderRowContextMenu?: (row: T, targets: T[]) => ReactNode;
  /** Wrap each row element (e.g. in the shared ActionContextMenu). Must render `children`. */
  rowWrapper?: (row: T, children: ReactElement) => ReactElement;
  /** Replace the bulk bar's action buttons. */
  renderBulkActions?: (rows: T[], clear: () => void) => ReactNode;
  /**
   * Called with the row when the person opens it: Enter on the focused row, or the pointer
   * gesture `rowOpen` chooses (double-click by default).
   */
  onRowOpen?: (row: T) => void;
  /**
   * The pointer gesture that opens a row with `onRowOpen`. Enter always opens it.
   * - `"double-click"` (default): a double-click; a single click only focuses the row.
   * - `"click"`: a single primary click, and the rows (and cards) read as links, with a
   *   pointer cursor and the hover fill. A click is ignored when it lands on a control in the
   *   row (a button, link, input, checkbox or `data-dt-interactive` element), carries Shift,
   *   Ctrl, ⌘ or Alt (which keep their selection meanings), uses another button, is the
   *   second click of a double-click, or ends a drag that selected text in the row.
   */
  rowOpen?: DataTableRowOpen;
  /**
   * Group the rows (server-side, docs/data-filters.md §7): a header row per group with its
   * count from the server, which collapses (click, Enter or Space; ← and → on the header;
   * Alt-click toggles every group). Each expanded group shows its first `pageSize` rows and
   * a "Show more" line while the server has more; the pager gives way to a count. The
   * collapsed groups and "Show more" counts are the `groups` state slice (in the URL with
   * `useTableUrlState({ grouped: true })`). Pass `rows` in group order: each expanded
   * group's loaded rows, as `groupOf` assigns them.
   */
  grouping?: DataTableGrouping<T>;
  /**
   * Row reordering by drag and keyboard (opt-in): a grip column before the checkboxes, also in
   * cards. The host owns the order and receives each move; see `DataTableReorder`.
   */
  reorder?: DataTableReorder<T>;
  /**
   * A panel of host content under a row. An expander opens it, in the first visible column or
   * on the card; the open rows are the `expanded` state slice. `render` runs only for a panel
   * that is open and on screen, and its height is measured, so it can be anything. A panel
   * scrolled far away unmounts like its row, so keep state worth keeping in the host. Keep the
   * function stable: a new one redraws the panels on screen.
   */
  renderRowDetail?: (row: T) => ReactNode;
  /** Rows that have a panel (default: all). */
  canExpandRow?: (row: T) => boolean;
  /**
   * A panel's height before it is first measured, in rem (default 12). A close guess keeps the
   * scrollbar steady while panels above the viewport are measured.
   */
  rowDetailHeight?: number | ((row: T) => number);
  /**
   * Hierarchical rows: see `DataTableTree`. The grid becomes a `treegrid`. With `renderRowDetail`
   * a row's panel comes first, then its children, under one expander.
   */
  tree?: DataTableTree<T>;
  /**
   * Offer an expand-all in the expander column's header, and in the settings menu on cards
   * (default true). It opens the loaded rows of this view and fetches nothing: rows on other
   * pages, batches that arrive later and unloaded children stay closed.
   */
  expandAll?: boolean;
  /**
   * Accessible label for a row ("NST-C106"): selection, actions and the reorder grip and
   * announcements use it. Defaults to the first column's text.
   */
  getRowLabel?: (row: T) => string;

  /** Row density for this table. Uncontrolled tables persist the user's choice. */
  density?: DataTableDensity;
  /**
   * BCP 47 locale for this table's numbers, dates, counts and local sorting. Default: the
   * nearest `LocaleProvider`, then `configureLocale()`, then `<html lang>`, then en-US.
   */
  locale?: string;
  /** Called with the density the person picks. Pair with `density` to control it; without `density` the table also stores the choice in its preferences. */
  onDensityChange?: (density: DataTableDensity) => void;
  /** "fill" (default) fills a parent with a definite height and scrolls inside. */
  height?: "fill" | "auto";
  /** Live data: flash changed cells and hold new rows behind an "N new" pill. */
  live?: boolean;
  /** When the data was last refreshed (status bar: "Updated 2 min ago"). */
  updatedAt?: Date | number;
  /** Noun for counts in the status bar ("1,284 endpoints"), with a form per plural category of the locale (`{ one, other }` suffices for English). */
  noun?: DataTableNoun;
  /**
   * The toolbar search (R16.8): a field at the start of the toolbar, beside Filters, that
   * matches these identifying fields on the server. Its query is the `search` state slice
   * (`q` in the URL with useTableUrlState). Typing waits 220 ms, then returns to the first
   * page. `/` focuses it while the table has focus. On a narrow toolbar it is an icon
   * button that opens the field, and an active query shows as a "Search: …" chip.
   */
  search?: DataTableSearch<T>;
  /** The table's own controls (a view switch, Refresh), at the end of the toolbar. */
  toolbar?: ReactNode;
  /**
   * On/off filters that are not a column ("Show hidden"): rows in the Filters menu, and a
   * chip while on. Clear filters turns them off too.
   */
  filterToggles?: readonly DataTableFilterToggle[];
  /** Extra status bar content (connection state, last sync). */
  status?: ReactNode;
  /**
   * `"auto"` (the default) shows cards below `cardBreakpoint` and the table above it. `"table"`
   * and `"cards"` hold that view at any width. For a person's choice of view, put a `Segmented`
   * in `toolbar` and switch between `"auto"` and `"cards"`, so a phone still gets cards.
   */
  view?: DataTableView;
  /** With `view="auto"`: below this width (rem) rows become cards (default 36). */
  cardBreakpoint?: number;
  /**
   * Lay cards out in as many columns as fit, each at least this wide (rem). Default: one
   * column. Group headers, detail panels and status lines run across the grid. Arrow keys move
   * by what is drawn: Up and Down within a column, Left and Right in reading order. A
   * reorderable table keeps one column.
   */
  cardMinWidth?: number;
  /**
   * The widest a card grows (rem); needs `cardMinWidth`. Default: cards share the row's spare
   * width. The same value as `cardMinWidth` gives tiles of one fixed width, from the row's start.
   */
  cardMaxWidth?: number;
  /**
   * Offer a sort menu in the toolbar while cards show, which have no column headers. Default
   * true, when a column is sortable. It reads and sets the same `sorting` state as the headers.
   * Below 36rem, a phone or a narrow dialog, it joins the columns menu, so the toolbar has no extra
   * button. Pass false to place your own control in `toolbar`.
   */
  cardSort?: boolean;
  /**
   * Draw each card's content yourself. The table keeps the card's frame, focus, selection
   * highlight and click handling, and hands over the row's controls to place. A card is as tall
   * as its content, and a row of a grid as tall as its tallest card. The columns menu
   * leaves its column choices out, since they no longer decide what a card shows. Keep the
   * function stable: a new one draws every card again.
   */
  renderCard?: (row: T, card: DataTableCard) => ReactNode;
  /** A card's loading placeholder, the same size as `renderCard`'s content. */
  renderCardSkeleton?: () => ReactNode;
  className?: string;
}

/** Which view a DataTable shows: `"auto"` follows its width. */
export type DataTableView = "auto" | "table" | "cards";

/** What `renderCard` receives beside the row: its state, and its controls ready to place. */
export interface DataTableCard {
  /** The row's name (`getRowLabel`), for accessible names on your own controls. */
  label: string;
  selected: boolean;
  /** The row's detail panel or children are showing. */
  open: boolean;
  /** Give this to your own controls, so Tab reaches only those in the current card. */
  tabIndex: number;
  /** The selection checkbox; null when the table is not selectable. */
  select: ReactNode;
  /** The row's actions (⋯ or `renderRowActions`); null when it has none. */
  actions: ReactNode;
  /** The expander for a detail panel or children; null when the row does not open. */
  expander: ReactNode;
  /** A column's cell, as the table draws it, with inline editing if the column has it. */
  cell: (columnId: string) => ReactNode;
}

/**
 * One row move, reported once on release (R14: the drag itself renders nothing). The host owns
 * the order: apply it to its data (`move.rows`, or `moveRow(rows, move.from, move.to)`) and
 * pass the new `rows` back; persist it on the server as "put `rowId` after `previousId`".
 */
export interface DataTableRowMove<T> {
  /** The moved row. */
  row: T;
  /** Its id (`getRowId`). */
  rowId: string;
  /** Its index in `rows` before the move. */
  from: number;
  /** Its index in `rows` after the move. */
  to: number;
  /** The row now directly before it, or null when it moved to the start (of its group). */
  previousId: string | null;
  /** The row now directly after it, or null when it moved to the end (of its group). */
  nextId: string | null;
  /** `rows` with the move applied: pass it back as `rows` for local data. */
  rows: T[];
  /** With `reorder.withinGroups`: the group the row moved within. */
  group?: string;
  /** How the move was made. */
  source: "pointer" | "keyboard";
}

/**
 * Row reordering (opt-in): a grip in a leading column that drags (mouse, touch and pen) or
 * lifts with the keyboard (Space or Enter lifts and drops, ↑ ↓ Home End move, Escape cancels,
 * Alt+↑/↓ moves one place at once), with screen-reader announcements. The table shows the move
 * at once; when `onReorder` returns a promise the move stays on screen while it is pending and
 * is undone, with a toast, if it rejects.
 *
 * Reordering needs the visible order to be the manual order, so the grips are disabled, with
 * the reason as their tooltip (R11.3), while the table is sorted, searched or filtered, grouped
 * (unless `withinGroups`), shows one page of several (unless `withinPage`), holds live rows
 * behind "N new", or is saving the previous move. The order is the host's data: the table
 * persists none of it (column preferences are unaffected).
 */
export interface DataTableReorder<T> {
  /**
   * Called on drop with the move. Update `rows` in the same call for local data. Return a
   * promise to persist it: the move shows until the promise settles and is reverted when it
   * rejects (a rejection's `Error.message` is the toast's description).
   */
  onReorder: (move: DataTableRowMove<T>) => void | Promise<unknown>;
  /** Rows that may move (default: all). A locked row's grip is disabled; other rows can still pass it. */
  canReorder?: (row: T) => boolean;
  /** Why a row is locked: its grip's tooltip (default "This row is locked in place"). */
  lockedReason?: (row: T) => string;
  /** Turn reordering off without removing the grips: true, or the reason to show. */
  disabled?: boolean | string;
  /** Grouped tables: move rows within their own group instead of disabling reordering. */
  withinGroups?: boolean;
  /**
   * Paged tables: move rows within the current page instead of disabling reordering. The move's
   * neighbour ids place the row on the server; the indexes are this page's.
   */
  withinPage?: boolean;
  /**
   * Report a rejected move yourself. By default a danger toast names the row and the reason.
   * The move has already been reverted.
   */
  onError?: (error: unknown, move: DataTableRowMove<T>) => void;
}

/** An on/off filter that is not a column: "Show hidden" (). */
export interface DataTableFilterToggle {
  id: string;
  /** The menu row: "Show hidden". */
  label: string;
  /** Controlled checked state. The type specifies whether mixed state is supported. */
  checked: boolean;
  /** Called with the new state when the person toggles the menu row, and with `false` when they remove its chip or clear all filters. Pair with `checked`. */
  onCheckedChange: (checked: boolean) => void;
  /** The chip while on: "Including hidden". Without it, the toggle shows no chip. */
  summary?: string;
}

/** Options for the opt-in export toolbar and keyboard copy. */
export interface DataTableExportSettings {
  /** Download filename (default table id plus .csv). */
  filename?: string;
  /** Include column headers in clipboard tables (default true). */
  headers?: boolean;
  /** Include a UTF-8 BOM in CSV downloads (default false). */
  bom?: boolean;
}

/** Server export request; the server owns fetching and delivering the complete result. */
export interface DataTableExportRequest<T> {
  /** Requested output. */
  format: "csv" | "tsv";
  /** Visible columns in display order. */
  columns: readonly DataTableExportColumn<T>[];
  /** Current column filters. */
  filters: DataTableState["filters"];
  /** Current sort. */
  sort: DataTableState["sorting"];
  /** Selected record ids, including selections from other pages. */
  selection: DataTableState["selection"];
  /** Open rows, in a table with `renderRowDetail` or `tree`. */
  expanded?: readonly string[];
}
