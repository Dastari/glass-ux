import {
  functionalUpdate,
  useTable,
  type ColumnFiltersState,
  type ColumnPinningState,
  type ColumnSizingState,
  type ColumnVisibilityState,
  type Row,
  type RowSelectionState,
  type Updater,
  type RowData,
} from "@tanstack/react-table";
import type { Virtualizer } from "@tanstack/react-virtual";
import {
  useCallback,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
} from "react";
import {
  IconArrowUp,
  IconMoreHorizontal,
} from "../../icons/generated/icons.js";
import {
  resolveActions,
  type ActionSurface,
  type ResolvedAction,
} from "../../lib/actions/actions.js";
import { cx } from "../../lib/cx.js";
import { useElementSize } from "../../lib/use-element-size.js";
import { useScrollEdges } from "../../lib/use-scroll-edges.js";
import { Button } from "../button/index.js";
import { Menu, MenuPrimitive } from "../menu/index.js";
import {
  RowActionsMenu,
  RowContextMenu,
  type MenuContent,
} from "./actions-menu.js";
import { BodyMessage, RetryButton, SkeletonRows, VirtualRows } from "./body.js";
import { CardList, cardLayout, SkeletonCards } from "./cards.js";
import {
  columnIdOf,
  resolveColumnMeta,
  type DataTableColumn,
} from "./columns.js";
import {
  dataTableFeatures,
  type DataColumnMeta,
  type DataTableFeatures,
} from "./features.js";
import { FilterBar } from "./filters/bar.js";
import { emptyText } from "./search/empty-text.js";
import type {
  SearchHandle,
  ToolbarSearchBinding,
} from "./search/toolbar-search.js";
import { cellFilter, CellFilterItems } from "./filters/cell-menu.js";
import { useFilterController } from "./filters/controller.js";
import { FilterPopover } from "./filters/popover.js";
import { DataTableFooter } from "./footer.js";
import { formatCount } from "./format.js";
import {
  DEFAULT_GROUP_PAGE_SIZE,
  EMPTY_GROUP_STATE,
  groupItems,
  setCollapsed,
  showMore,
  toggleCollapsed,
  type DataTableGroupState,
  type GroupedItem,
} from "./grouping.js";
import {
  ColumnMenu,
  DataTableHeader,
  SettingsMenu,
  type HeaderController,
} from "./header.js";
import {
  columnKey,
  columnVars,
  computeColumnLayout,
  cssVar,
  detailHeight,
  orderColumns,
  type LayoutColumn,
} from "./layout.js";
import { useLiveRows } from "./live.js";
import { useTablePreferences } from "./persist.js";
import {
  keyboardResize,
  measureContentWidth,
  startPointerResize,
} from "./resize.js";
import { columnInfos, type RowController } from "./row.js";
import { resolveRowActions } from "./row-actions.js";
import {
  pageSelection,
  selectedCount,
  selectRange,
  toggleOne,
  togglePage,
} from "./selection.js";
import type {
  DataTableDensity,
  DataTableFilterToggle,
  DataTableProps,
  DataTableState,
  DataTableStateChange,
} from "./types.js";

/* ── Geometry mirrored from data-table.css (rem at --ui-scale 1, scaled by the root size) ── */
/** --fa-dt-select-w: the checkbox column. */
const SELECT_WIDTH = 2.625;
/** --space-1 and --space-2: gaps and padding in the trailing cell. */
const TRAIL_GAP = 0.25;
const TRAIL_PAD = 1;
/** The "+N" detail line: --fa-dt-detail-field, gaps, line height and bottom padding. */
const DETAIL = {
  field: 11,
  gap: 1.5,
  gapY: 0.5,
  line: 2.5,
  padTop: 0,
  padBottom: 0.75,
  inset: 0,
};
const DETAIL_INLINE_PAD = 1.5;
/** Below this height (rem) the footer collapses to a one-line pager. */
const COMPACT_HEIGHT = 14;
/**
 * Below this height (rem) only the status bar shows. Measured here rather than with a
 * block-size container query: a size query that the frame depends on makes every row mount
 * and footer update re-run style and layout for the whole table (docs/performance.md).
 */
const STATUS_ONLY_HEIGHT = 7;
const DEFAULT_PAGE_SIZES = [25, 50, 100] as const;
const DEFAULT_NOUN = { one: "row", other: "rows" };

function stableKey(value: unknown) {
  try {
    return JSON.stringify(value) ?? "";
  } catch {
    return String(value);
  }
}

type Line = GroupedItem<Row<DataTableFeatures, RowData>>;

/** A new sort or filter starts every group on its first page, as it starts a flat table on page 1. */
function firstGroupPages(current: DataTableState): Partial<DataTableState> {
  return current.groups && Object.keys(current.groups.shown).length
    ? { groups: { ...current.groups, shown: {} } }
    : {};
}

function isInteractive(target: EventTarget | null, row: Element) {
  if (!(target instanceof Element)) return false;
  const control = target.closest(
    "button, a, input, textarea, select, [role='checkbox'], [data-dt-interactive]",
  );
  return Boolean(control && row.contains(control) && control !== row);
}

function globalDensity(): DataTableDensity {
  if (typeof document === "undefined") return "comfortable";
  return document.documentElement.getAttribute("data-density") === "compact"
    ? "compact"
    : "comfortable";
}

interface Metrics {
  /** Current pixel size of one rem used for layout measurement. */
  rem: number;
  gutter: number;
  rowHeight: number;
  button: number;
  bodyHeight: number;
}

/**
 * The one data table (R16). Server-side sorting and pagination, container-aware columns
 * (priority hiding → "+N" detail → card list), resizable and pinnable columns persisted
 * per user, selection with a bulk bar over the status bar, row ⋯ and right-click menus
 * from the entity's ActionSet, live updates that flash in place, and loading, empty and
 * error states that keep the table's box.
 */
const NO_TOGGLES: readonly DataTableFilterToggle[] = [];

export function DataTable<T extends RowData>(props: DataTableProps<T>) {
  const {
    id,
    label,
    rows,
    columns,
    getRowId,
    rowCount,
    cursor,
    pageSizes = DEFAULT_PAGE_SIZES,
    loading = false,
    refetching = false,
    error,
    onRetry,
    emptyMessage = "No rows",
    emptyAction,
    selectable = true,
    actions,
    getRowActions,
    grouping,
    renderRowActions,
    renderRowContextMenu,
    renderBulkActions,
    height = "fill",
    live = false,
    updatedAt,
    toolbar,
    search,
    filterToggles,
    status,
    cardBreakpoint = 36,
    className,
  } = props;
  const domId = useId();

  /* ── State: each slice controlled by the caller or owned here ─────────────────── */
  const [inner, setInner] = useState<DataTableState>(() => ({
    sorting: props.defaultState?.sorting ?? [],
    filters: props.defaultState?.filters ?? [],
    search: props.defaultState?.search ?? "",
    pagination: props.defaultState?.pagination ?? {
      pageIndex: 0,
      pageSize: pageSizes[0] ?? 25,
    },
    selection: props.defaultState?.selection ?? {},
    groups: props.defaultState?.groups ?? EMPTY_GROUP_STATE,
  }));
  const sorting = props.state?.sorting ?? inner.sorting;
  const filters = props.state?.filters ?? inner.filters;
  const pagination = props.state?.pagination ?? inner.pagination;
  const selection = props.state?.selection ?? inner.selection;
  const groupState = props.state?.groups ?? inner.groups ?? EMPTY_GROUP_STATE;

  const searchQuery = props.state?.search ?? inner.search ?? "";

  const latestState = useRef<DataTableState>({
    sorting,
    filters,
    search: searchQuery,
    pagination,
    selection,
    groups: groupState,
  });
  latestState.current = {
    sorting,
    filters,
    search: searchQuery,
    pagination,
    selection,
    groups: groupState,
  };
  const onStateChangeRef = useRef(props.onStateChange);
  onStateChangeRef.current = props.onStateChange;

  const emit = useCallback(
    (change: DataTableStateChange, patch: Partial<DataTableState>) => {
      const next = { ...latestState.current, ...patch };
      latestState.current = next;
      setInner((current) => ({ ...current, ...patch }));
      onStateChangeRef.current?.(next, change);
    },
    [],
  );

  const setSorting = useCallback(
    (updater: Updater<DataTableState["sorting"]>) => {
      const current = latestState.current;
      // A new sort order starts from the first page.
      emit("sorting", {
        sorting: functionalUpdate(updater, current.sorting),
        pagination: { ...current.pagination, pageIndex: 0 },
        ...firstGroupPages(current),
      });
    },
    [emit],
  );
  const setFilters = useCallback(
    (updater: Updater<ColumnFiltersState>) => {
      const current = latestState.current;
      // R16.7: a new filter starts from the first page.
      emit("filters", {
        filters: functionalUpdate(updater, current.filters),
        pagination: { ...current.pagination, pageIndex: 0 },
        ...firstGroupPages(current),
      });
    },
    [emit],
  );
  const setSearch = useCallback(
    (query: string) => {
      const current = latestState.current;
      if ((current.search ?? "") === query) return;
      // R16.8: a new search starts from the first page, like a filter.
      emit("search", {
        search: query,
        pagination: { ...current.pagination, pageIndex: 0 },
        ...firstGroupPages(current),
      });
    },
    [emit],
  );
  const setGroups = useCallback(
    (updater: Updater<DataTableGroupState>) =>
      emit("groups", {
        groups: functionalUpdate(
          updater,
          latestState.current.groups ?? EMPTY_GROUP_STATE,
        ),
      }),
    [emit],
  );
  const setPagination = useCallback(
    (updater: Updater<DataTableState["pagination"]>) =>
      emit("pagination", {
        pagination: functionalUpdate(updater, latestState.current.pagination),
      }),
    [emit],
  );
  const setSelection = useCallback(
    (updater: Updater<RowSelectionState>) =>
      emit("selection", {
        selection: functionalUpdate(updater, latestState.current.selection),
      }),
    [emit],
  );

  /* ── Preferences: widths, hidden, pins, density (per table id) ────────────────── */
  const [preferences, updatePreferences] = useTablePreferences(id);
  const density = props.density ?? preferences.density ?? undefined;

  /* ── Column metadata (ids resolved the way TanStack does) ─────────────────────── */
  const definitions = useMemo(
    () =>
      columns.map((def) => {
        const columnId = columnIdOf(
          def as { id?: string; accessorKey?: unknown; header?: unknown },
        );
        const meta: DataColumnMeta =
          (def.meta as DataColumnMeta | undefined) ??
          resolveColumnMeta({
            header: typeof def.header === "string" ? def.header : columnId,
          });
        return { id: columnId, key: columnKey(columnId), meta, def };
      }),
    [columns],
  );
  const metaById = useMemo(
    () => new Map(definitions.map((entry) => [entry.id, entry])),
    [definitions],
  );
  const idByKey = useMemo(
    () => new Map(definitions.map((entry) => [entry.key, entry.id])),
    [definitions],
  );

  /* ── Filters (R16.7): server-side, in the URL with the sort and page ──────────── */
  const filterController = useFilterController({
    definitions,
    filters,
    setFilters,
    filtersButton: () =>
      rootRef.current?.querySelector<HTMLElement>(".fa-dt-filters-button") ??
      null,
  });
  const filtered = useMemo(
    () => new Set(filters.map((filter) => filter.id)),
    [filters],
  );
  const toggles = filterToggles ?? NO_TOGGLES;
  const hasFilterBar =
    filterController.columns.length > 0 || toggles.length > 0;
  const cellFilterable = filterController.columns.some(
    (column) =>
      column.spec.kind !== "number" &&
      column.spec.kind !== "date" &&
      column.spec.kind !== "custom",
  );

  const pinnedIds = useMemo(
    () =>
      (
        preferences.pinned ??
        definitions.filter((entry) => entry.meta.pin).map((entry) => entry.id)
      ).filter((columnId) => metaById.has(columnId)),
    [preferences.pinned, definitions, metaById],
  );
  const pinnedSet = useMemo(() => new Set(pinnedIds), [pinnedIds]);
  const userHidden = useMemo(
    () =>
      new Set(
        preferences.hidden.filter(
          (columnId) => metaById.get(columnId)?.meta.hideable !== false,
        ),
      ),
    [preferences.hidden, metaById],
  );
  const sized = useMemo(
    () =>
      new Set(
        Object.keys(preferences.widths).filter((columnId) =>
          metaById.has(columnId),
        ),
      ),
    [preferences.widths, metaById],
  );

  /* ── Measurement (before paint, R7) ───────────────────────────────────────────── */
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLSpanElement>(null);
  const size = useElementSize(rootRef);
  const [metrics, setMetrics] = useState<Metrics>({
    rem: 16,
    gutter: 0,
    rowHeight: 48,
    button: 32,
    bodyHeight: 0,
  });

  useLayoutEffect(() => {
    const scroller = scrollRef.current;
    const probe = probeRef.current;
    const rem =
      Number.parseFloat(getComputedStyle(document.documentElement).fontSize) ||
      16;
    const next: Metrics = {
      rem,
      gutter: scroller ? scroller.offsetWidth - scroller.clientWidth : 0,
      rowHeight: probe?.offsetHeight || rem * 3,
      button: probe?.offsetWidth || rem * 2,
      bodyHeight: scroller?.clientHeight ?? 0,
    };
    setMetrics((current) =>
      current.rem === next.rem &&
      current.gutter === next.gutter &&
      current.rowHeight === next.rowHeight &&
      current.button === next.button &&
      current.bodyHeight === next.bodyHeight
        ? current
        : next,
    );
  }, [size.width, size.height, density, toolbar]);

  const measured = size.width > 0;
  const widthRem = size.width / metrics.rem;
  const heightRem = size.height / metrics.rem;
  const mode = measured && widthRem < cardBreakpoint ? "cards" : "table";
  const compactFooter =
    height === "fill" && measured && heightRem < COMPACT_HEIGHT;
  const statusOnly =
    height === "fill" && measured && heightRem < STATUS_ONLY_HEIGHT;

  /* ── Container-aware column layout (R16.2) ────────────────────────────────────── */
  const layoutColumns = useMemo<LayoutColumn[]>(
    () =>
      orderColumns(definitions, pinnedIds).map((entry) => ({
        id: entry.id,
        priority: entry.meta.priority,
        width: preferences.widths[entry.id] ?? entry.meta.width,
        minWidth: entry.meta.minWidth,
        maxWidth: entry.meta.maxWidth,
        pinned: pinnedSet.has(entry.id),
        fixed: preferences.widths[entry.id] !== undefined,
        userHidden: userHidden.has(entry.id),
        grow: entry.meta.grow,
      })),
    [definitions, pinnedIds, pinnedSet, preferences.widths, userHidden],
  );

  // Freeze the column set while a resize drag is in progress; recompute on release.
  const buttonRem = metrics.button / metrics.rem;
  const trailWidth = (buttons: number) =>
    buttons * buttonRem + (buttons - 1) * TRAIL_GAP + TRAIL_PAD;
  const contentWidth = measured
    ? (size.width - metrics.gutter) / metrics.rem
    : 0;
  const chrome = selectable ? SELECT_WIDTH : 0;
  const layout = useMemo(() => {
    const first = computeColumnLayout(
      layoutColumns,
      contentWidth - chrome - trailWidth(1),
    );
    if (!first.autoHidden.length) return { ...first, trailButtons: 1 };
    return {
      ...computeColumnLayout(
        layoutColumns,
        contentWidth - chrome - trailWidth(2),
      ),
      trailButtons: 2,
    };
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- trailWidth is derived from buttonRem
  }, [layoutColumns, contentWidth, chrome, buttonRem]);

  const visibleColumns = useMemo(
    () => columnInfos(layout.visible, metaById, pinnedSet),
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- keyed by the id lists
    [layout.visible.join("\u0000"), metaById, pinnedSet],
  );
  const hiddenColumns = useMemo(
    () => columnInfos(layout.autoHidden, metaById, new Set()),
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- keyed by the id lists
    [layout.autoHidden.join("\u0000"), metaById],
  );
  const cardColumns = useMemo(
    () =>
      columnInfos(
        orderColumns(definitions, pinnedIds)
          .map((entry) => entry.id)
          .filter((columnId) => !userHidden.has(columnId)),
        metaById,
        new Set(),
      ),
    [definitions, pinnedIds, userHidden, metaById],
  );
  const cards = useMemo(() => cardLayout(cardColumns), [cardColumns]);

  const detailRem = detailHeight(
    hiddenColumns.length,
    contentWidth - chrome - trailWidth(layout.trailButtons) - DETAIL_INLINE_PAD,
    DETAIL,
  );

  const rootVars = useMemo(() => {
    const vars: Record<string, string> = columnVars(
      layoutColumns,
      layout.visible,
      { selectWidth: selectable ? "var(--fa-dt-select-w)" : null },
    );
    const mins = layout.visible.map(
      (columnId) => `var(${cssVar.min(columnKey(columnId))})`,
    );
    vars["--fa-dt-min-w"] =
      `calc(${[...(selectable ? ["var(--fa-dt-select-w)"] : []), ...mins, "var(--fa-dt-trail-w)"].join(" + ")})`;
    vars["--fa-dt-detail-h"] = `${detailRem}rem`;
    return vars as CSSProperties;
  }, [layoutColumns, layout.visible, selectable, detailRem]);

  /* ── Live rows (R9.4) ─────────────────────────────────────────────────────────── */
  // A new sort, filter or page is a new result that starts at the top. Collapsing a group or
  // "Show more" is a new result too (its rows are not live arrivals), but keeps the scroll.
  const queryKey = stableKey([
    sorting,
    filters,
    searchQuery,
    pagination,
    props.queryKey ?? null,
  ]);
  const resultKey = grouping ? stableKey([queryKey, groupState]) : queryKey;
  const isScrolledAway = useCallback(
    () => (scrollRef.current?.scrollTop ?? 0) > metrics.rowHeight / 2,
    [metrics.rowHeight],
  );
  const liveRows = useLiveRows({
    rows,
    getRowId,
    queryKey: resultKey,
    live,
    isScrolledAway,
  });
  const data = liveRows.rows as T[];

  /* ── TanStack Table v9 ────────────────────────────────────────────────────────── */
  const getRowIdRef = useRef(getRowId);
  getRowIdRef.current = getRowId;
  const stableGetRowId = useCallback((row: T) => getRowIdRef.current(row), []);

  const columnVisibility = useMemo<ColumnVisibilityState>(
    () =>
      Object.fromEntries(
        [...layout.autoHidden, ...userHidden].map((columnId) => [
          columnId,
          false,
        ]),
      ),
    [layout.autoHidden, userHidden],
  );
  const columnPinning = useMemo<ColumnPinningState>(
    () => ({ start: pinnedIds, end: [] }),
    [pinnedIds],
  );
  const columnSizing = preferences.widths as ColumnSizingState;

  const table = useTable({
    features: dataTableFeatures,
    columns: columns as DataTableColumn<T>[],
    data,
    getRowId: stableGetRowId,
    rowCount: rowCount ?? data.length,
    manualSorting: true,
    manualFiltering: true,
    manualPagination: true,
    enableMultiSort: true,
    enableRowSelection: selectable,
    state: {
      sorting,
      columnFilters: filters,
      pagination,
      rowSelection: selection,
      columnVisibility,
      columnPinning,
      columnSizing,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setFilters,
    onPaginationChange: setPagination,
    onRowSelectionChange: setSelection,
    onColumnVisibilityChange: (updater) => {
      const next = functionalUpdate(updater, columnVisibility);
      updatePreferences((current) => ({
        ...current,
        hidden: Object.keys(next).filter(
          (columnId) =>
            next[columnId] === false && !layout.autoHidden.includes(columnId),
        ),
      }));
    },
    onColumnPinningChange: (updater) => {
      const next = functionalUpdate(updater, columnPinning);
      updatePreferences((current) => ({ ...current, pinned: next.start }));
    },
    onColumnSizingChange: (updater) => {
      const next = functionalUpdate(updater, columnSizing);
      updatePreferences((current) => ({ ...current, widths: { ...next } }));
    },
  });

  const pageRows = table.getRowModel().rows;

  /* ── Grouping: headers, rows and "Show more" lines in display order ───────────── */
  const groupPageSize = grouping?.pageSize ?? DEFAULT_GROUP_PAGE_SIZE;
  const groupOfRef = useRef(grouping?.groupOf);
  groupOfRef.current = grouping?.groupOf;
  const lines = useMemo<readonly Line[] | null>(
    () =>
      grouping
        ? (groupItems(
            pageRows,
            (row) => groupOfRef.current?.(row.original as T) ?? "",
            grouping.groups,
            groupState,
            groupPageSize,
          ) as unknown as Line[])
        : null,
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- groupOf is read through a ref; the groups and state are the identity
    [pageRows, grouping?.groups, groupState, groupPageSize, Boolean(grouping)],
  );
  const order = useMemo(
    () =>
      lines
        ? lines.flatMap((line) => (line.kind === "row" ? [line.row.id] : []))
        : pageRows.map((row) => row.id),
    [lines, pageRows],
  );
  const lineCount = lines ? lines.length : pageRows.length;
  const groupTotal = useMemo(
    () =>
      grouping
        ? grouping.groups.reduce(
            (sum, group) => sum + Math.max(0, group.count),
            0,
          )
        : 0,
    [grouping],
  );
  const rowsById = useMemo(
    () => new Map(pageRows.map((row) => [row.id, row.original])),
    [pageRows],
  );

  /* ── Selection: ids across pages; targets cached so bulk actions see every row ─── */
  const selectionCache = useRef(new Map<string, T>());
  const selectedTargets = useMemo(() => {
    const cache = selectionCache.current;
    for (const [rowId, row] of rowsById)
      if (selection[rowId]) cache.set(rowId, row);
    for (const rowId of cache.keys())
      if (!selection[rowId]) cache.delete(rowId);
    return Object.keys(selection)
      .filter((rowId) => selection[rowId])
      .flatMap((rowId) => {
        const row = cache.get(rowId);
        return row ? [row] : [];
      });
  }, [selection, rowsById]);
  const selected = selectedCount(selection);
  const anchor = useRef<string | null>(null);

  /* ── Expansion, active row, menus ─────────────────────────────────────────────── */
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [expandAll, setExpandAll] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const active = Math.min(activeIndex, Math.max(0, lineCount - 1));
  const focusRequest = useRef<number | null>(null);
  const virtualizerRef = useRef<Virtualizer<HTMLDivElement, Element> | null>(
    null,
  );
  const [rowMenu] = useState(() => MenuPrimitive.createHandle<string>());
  const [columnMenu] = useState(() => MenuPrimitive.createHandle<string>());
  const [contextContent, setContextContent] = useState<MenuContent<T> | null>(
    null,
  );
  const noun = props.noun ?? DEFAULT_NOUN;

  /* ── Search (R16.8): the toolbar field, `/` to focus it ───────────────────────── */
  const searchHandle = useRef<SearchHandle | null>(null);
  const searchBinding = useMemo<ToolbarSearchBinding | undefined>(
    () =>
      search
        ? {
            value: searchQuery,
            onChange: setSearch,
            label: `Search ${noun.other}`,
            placeholder: search.placeholder ?? `Search ${noun.other}`,
            handle: searchHandle,
          }
        : undefined,
    [search, searchQuery, setSearch, noun.other],
  );
  const searching = Boolean(search) && searchQuery !== "";
  const onRootKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (
      event.key !== "/" ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      !searchBinding ||
      event.defaultPrevented
    )
      return;
    // Only from inside the table (not a portalled menu or popover), and never while typing.
    const target = event.target;
    if (
      !(target instanceof HTMLElement) ||
      !event.currentTarget.contains(target) ||
      target.closest("input, textarea, select, [contenteditable='true']")
    )
      return;
    event.preventDefault();
    searchHandle.current?.focus();
  };

  const getLabel = useMemo(() => {
    if (props.getRowLabel) return props.getRowLabel;
    const first = definitions[0]?.def as
      | {
          accessorFn?: (row: T, index: number) => unknown;
          accessorKey?: string;
        }
      | undefined;
    return (row: T) => {
      const value = first?.accessorFn
        ? first.accessorFn(row, 0)
        : first?.accessorKey
          ? (row as Record<string, unknown>)[first.accessorKey]
          : undefined;
      return value === undefined || value === null
        ? getRowIdRef.current(row)
        : String(value);
    };
  }, [props.getRowLabel, definitions]);

  /* ── Everything the stable controllers read ───────────────────────────────────── */
  const latest = useRef({
    props,
    order,
    lines,
    lineCount,
    rowsById,
    selection,
    selectedTargets,
    layout,
    table,
    metaById,
    getLabel,
    filterController,
  });
  latest.current = {
    props,
    order,
    lines,
    lineCount,
    rowsById,
    selection,
    selectedTargets,
    layout,
    table,
    metaById,
    getLabel,
    filterController,
  };

  /** The row's actions: its own set (`getRowActions`), else the table's. */
  const actionsOf = useCallback((row: T) => {
    const current = latest.current.props;
    return current.getRowActions ? current.getRowActions(row) : current.actions;
  }, []);
  const hasActions = Boolean(actions || getRowActions);

  // Menus and the bulk bar run actions with the shared runner (confirm → run → toast);
  // `onAction` replaces it. Stable, so an inline `onAction` never re-renders a menu.
  const callOnAction = useCallback(
    (
      action: ResolvedAction<T>,
      targets: readonly T[],
      surface: ActionSurface,
    ) => latest.current.props.onAction?.(action, targets, surface),
    [],
  );
  const onRun = props.onAction ? callOnAction : undefined;

  const focusRow = useCallback((index: number) => {
    const count = latest.current.lineCount;
    if (!count) return;
    const next = Math.min(Math.max(index, 0), count - 1);
    setActiveIndex(next);
    focusRequest.current = next;
    virtualizerRef.current?.scrollToIndex(next, { align: "auto" });
  }, []);

  useLayoutEffect(() => {
    if (focusRequest.current === null) return;
    const target = scrollRef.current?.querySelector<HTMLElement>(
      `[data-index="${focusRequest.current}"]`,
    );
    focusRequest.current = null;
    target?.focus({ preventScroll: true });
    target?.scrollIntoView({ block: "nearest" });
  });

  // "Show more" from a focused line: once the group's next rows arrive, focus moves to the
  // first of them (it takes the line's place), so the keyboard carries on where it was.
  const focusAfterMore = useRef<{ index: number; group: string } | null>(null);
  useLayoutEffect(() => {
    const pending = focusAfterMore.current;
    if (!pending || !lines) return;
    const line = lines[pending.index];
    if (line?.kind === "more" && line.group.id === pending.group) return;
    focusAfterMore.current = null;
    if (
      line?.kind === "row" &&
      scrollRef.current?.contains(document.activeElement ?? null) === false &&
      document.activeElement !== document.body
    )
      return;
    if (line?.kind !== "row") return;
    // The line is the active one already (showMore made it so), so it is drawn: focus it now.
    const target = scrollRef.current?.querySelector<HTMLElement>(
      `[data-index="${pending.index}"]`,
    );
    target?.focus({ preventScroll: true });
    target?.scrollIntoView({ block: "nearest" });
  }, [lines]);

  const toggleRow = useCallback(
    (rowId: string, value: boolean, shift: boolean) => {
      const current = latest.current;
      if (shift && anchor.current)
        setSelection(
          selectRange(
            current.selection,
            current.order,
            anchor.current,
            rowId,
            value,
          ),
        );
      else setSelection(toggleOne(current.selection, rowId, value));
      anchor.current = rowId;
    },
    [setSelection],
  );

  const rowController = useMemo<RowController>(
    () => ({
      toggleRow,
      toggleExpanded: (rowId) =>
        setExpanded((current) => {
          const next = new Set(current);
          if (next.has(rowId)) next.delete(rowId);
          else next.add(rowId);
          return next;
        }),
      renderActions: (rowId, rowLabel, tabIndex) => {
        const current = latest.current;
        const row = current.rowsById.get(rowId);
        if (current.props.renderRowActions)
          return row === undefined ? null : current.props.renderRowActions(row);
        // As ActionMenu: no ⋯ when nothing applies to the row (R12.3).
        const set = row === undefined ? undefined : actionsOf(row);
        if (
          !set ||
          row === undefined ||
          !resolveActions(set, [row], "menu").length
        )
          return null;
        return (
          <Menu.Trigger
            handle={rowMenu}
            payload={rowId}
            render={
              <Button
                variant="ghost"
                size="sm"
                className="fa-dt-row-button fa-dt-actions"
                icon={<IconMoreHorizontal />}
                aria-label={`Actions for ${rowLabel}`}
                tabIndex={tabIndex}
                data-dt-interactive=""
              />
            }
          />
        );
      },
      wrap: (rowId, element) => {
        const current = latest.current;
        const row = current.rowsById.get(rowId);
        return current.props.rowWrapper && row !== undefined
          ? current.props.rowWrapper(row, element)
          : element;
      },
      toggleGroup: (groupId, all) =>
        setGroups((current) =>
          toggleCollapsed(
            current,
            groupId,
            latest.current.props.grouping?.groups ?? [],
            all,
          ),
        ),
      showMore: (groupId) => {
        const current = latest.current;
        const index =
          current.lines?.findIndex(
            (line) => line.kind === "more" && line.group.id === groupId,
          ) ?? -1;
        if (index >= 0) {
          focusAfterMore.current = { index, group: groupId };
          setActiveIndex(index);
        }
        setGroups((state) =>
          showMore(
            state,
            groupId,
            current.props.grouping?.pageSize ?? DEFAULT_GROUP_PAGE_SIZE,
          ),
        );
      },
    }),
    [toggleRow, rowMenu, actionsOf, setGroups],
  );

  const commitWidth = useCallback(
    (columnId: string, width: number) => {
      updatePreferences((current) => ({
        ...current,
        widths: { ...current.widths, [columnId]: width },
      }));
    },
    [updatePreferences],
  );

  const headerController = useMemo<HeaderController>(
    () => ({
      getColumn: (columnId) =>
        latest.current.table.getColumn(columnId) as never,
      toggleSort: (columnId, event) =>
        latest.current.table.getColumn(columnId)?.getToggleSortingHandler()?.(
          event,
        ),
      sortBy: (columnId, desc) =>
        setSorting(desc === null ? [] : [{ id: columnId, desc }]),
      togglePage: (value) =>
        setSelection(
          togglePage(latest.current.selection, latest.current.order, value),
        ),
      togglePin: (columnId) =>
        updatePreferences((current) => {
          const pins =
            current.pinned ??
            definitions
              .filter((entry) => entry.meta.pin)
              .map((entry) => entry.id);
          return {
            ...current,
            pinned: pins.includes(columnId)
              ? pins.filter((pin) => pin !== columnId)
              : [...pins, columnId],
          };
        }),
      hide: (columnId) =>
        updatePreferences((current) => ({
          ...current,
          hidden: [...new Set([...current.hidden, columnId])],
        })),
      setUserHidden: (columnId, hide) =>
        updatePreferences((current) => ({
          ...current,
          hidden: hide
            ? [...new Set([...current.hidden, columnId])]
            : current.hidden.filter((hiddenId) => hiddenId !== columnId),
        })),
      autosize: (columnId) => {
        const root = rootRef.current;
        const entry = latest.current.metaById.get(columnId);
        if (!root || !entry) return;
        const width = measureContentWidth(root, {
          id: columnId,
          minWidth: entry.meta.minWidth,
          maxWidth: entry.meta.maxWidth,
        });
        if (width !== null) commitWidth(columnId, width);
      },
      resetWidth: (columnId) =>
        updatePreferences((current) => {
          const widths = { ...current.widths };
          delete widths[columnId];
          return { ...current, widths };
        }),
      resetColumns: () =>
        updatePreferences((current) => ({
          ...current,
          widths: {},
          hidden: [],
          pinned: null,
        })),
      openFilter: (columnId) => {
        const entry = latest.current.metaById.get(columnId);
        const cell = entry
          ? rootRef.current?.querySelector<HTMLElement>(
              `.fa-dt-th[data-col="${entry.key}"]`,
            )
          : null;
        latest.current.filterController.open(
          columnId,
          cell,
          cell?.querySelector<HTMLElement>(".fa-dt-th-menu") ?? null,
        );
      },
      setDensity: (next) => {
        latest.current.props.onDensityChange?.(next);
        if (latest.current.props.density === undefined)
          updatePreferences((current) => ({ ...current, density: next }));
      },
      toggleExpandAll: () => {
        setExpandAll((value) => !value);
        setExpanded(new Set());
      },
      startResize: (columnId, event: ReactPointerEvent<HTMLElement>) => {
        const root = rootRef.current;
        const entry = latest.current.metaById.get(columnId);
        if (!root || !entry) return;
        startPointerResize(
          event.nativeEvent,
          event.currentTarget,
          root,
          {
            id: columnId,
            minWidth: entry.meta.minWidth,
            maxWidth: entry.meta.maxWidth,
          },
          (width) => commitWidth(columnId, width),
        );
      },
      keyResize: (columnId, event: ReactKeyboardEvent<HTMLElement>) => {
        const root = rootRef.current;
        const entry = latest.current.metaById.get(columnId);
        if (!root || !entry) return;
        if (event.key === "Enter") {
          event.preventDefault();
          const width = measureContentWidth(root, {
            id: columnId,
            minWidth: entry.meta.minWidth,
            maxWidth: entry.meta.maxWidth,
          });
          if (width !== null) commitWidth(columnId, width);
          return;
        }
        const width = keyboardResize(event.nativeEvent, root, {
          id: columnId,
          minWidth: entry.meta.minWidth,
          maxWidth: entry.meta.maxWidth,
        });
        if (width !== null) commitWidth(columnId, width);
      },
    }),
    [setSorting, setSelection, updatePreferences, definitions, commitWidth],
  );

  /* ── Menus' content ───────────────────────────────────────────────────────────── */
  const resolveRowMenu = useCallback(
    (rowId: string): MenuContent<T> | null => {
      const current = latest.current;
      const row = current.rowsById.get(rowId);
      const set = row === undefined ? undefined : actionsOf(row);
      if (row === undefined || !set) return null;
      return {
        groups: resolveActions(set, [row], "menu"),
        targets: [row],
        label: current.getLabel(row),
      };
    },
    [actionsOf],
  );

  /** "Only this value" / "Exclude this value" for the right-clicked cell, when its column filters by value. */
  const resolveCellFilter = (
    rowId: string,
    target: EventTarget | null,
    rowElement: Element,
  ) => {
    if (!cellFilterable || !(target instanceof Element)) return null;
    const cell = target.closest<HTMLElement>("[data-col]");
    const columnId =
      cell && rowElement.contains(cell)
        ? idByKey.get(cell.dataset.col ?? "")
        : undefined;
    if (!columnId) return null;
    const row = pageRows.find((entry) => entry.id === rowId);
    const found = row
      ? cellFilter(filterController, columnId, row.getValue(columnId))
      : null;
    return found ? (
      <CellFilterItems target={found} controller={filterController} />
    ) : null;
  };

  /** The right-click menu for a row, or null when nothing applies (the native menu stays). */
  const resolveContextMenu = (
    rowId: string,
    target: EventTarget | null,
    rowElement: Element,
  ): MenuContent<T> | null => {
    const row = rowsById.get(rowId);
    if (row === undefined) return null;
    // Right-click inside a multi-selection acts on the selection, like a file manager.
    const many = Boolean(selection[rowId]) && selectedTargets.length > 1;
    const targets = many ? selectedTargets : [row];
    const custom = renderRowContextMenu?.(row, targets);
    // One row resolves its own set (its header's); a selection shares what every row's set offers.
    const groups = hasActions
      ? resolveRowActions(targets, actionsOf, "context")
      : [];
    const filter = resolveCellFilter(rowId, target, rowElement);
    if ((custom === undefined || custom === null) && !groups.length && !filter)
      return null;
    return {
      groups,
      targets,
      custom,
      filter,
      label: many ? formatCount(targets.length, noun) : getLabel(row),
    };
  };

  const bulkGroups = useMemo(
    () =>
      hasActions && selectedTargets.length
        ? resolveRowActions(selectedTargets, actionsOf, "bulk")
        : [],
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- actionsOf reads the latest props; the sets are the identity
    [hasActions, actions, getRowActions, selectedTargets, actionsOf],
  );

  /* ── Delegated pointer and keyboard handling on the rows ──────────────────────── */
  /** The body line under an event: a row, or (grouped) a group header or "Show more". */
  const lineFromEvent = (target: EventTarget | null) => {
    if (!(target instanceof Element)) return null;
    const element = target.closest<HTMLElement>("[data-item][data-index]");
    if (!element || !scrollRef.current?.contains(element)) return null;
    const kind = element.dataset.item as "row" | "group" | "more";
    return {
      element,
      kind,
      rowId: element.dataset.rowId ?? "",
      groupId: element.dataset.groupId ?? "",
      index: Number(element.dataset.index),
    };
  };
  const rowFromEvent = (target: EventTarget | null) => {
    const hit = lineFromEvent(target);
    return hit?.kind === "row" ? hit : null;
  };

  const onRowsClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    const hit = rowFromEvent(event.target);
    if (!hit || isInteractive(event.target, hit.element)) return;
    setActiveIndex(hit.index);
    if (!selectable) return;
    if (event.shiftKey && anchor.current) {
      setSelection(
        selectRange(selection, order, anchor.current, hit.rowId, true),
      );
    } else if (event.metaKey || event.ctrlKey) {
      setSelection(toggleOne(selection, hit.rowId));
      anchor.current = hit.rowId;
    }
  };
  const onRowsDoubleClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    const hit = rowFromEvent(event.target);
    if (!hit || isInteractive(event.target, hit.element)) return;
    const row = rowsById.get(hit.rowId);
    if (row !== undefined) props.onRowOpen?.(row);
  };
  const onRowsMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    // Shift-click selects rows, not text.
    if (event.shiftKey && rowFromEvent(event.target)) event.preventDefault();
  };

  /** Keys on a group header or "Show more" line: toggle, collapse, expand, show more. */
  const onLineKeyDown = (
    event: ReactKeyboardEvent<HTMLDivElement>,
    hit: NonNullable<ReturnType<typeof lineFromEvent>>,
  ) => {
    const collapsed = groupState.collapsed.includes(hit.groupId);
    switch (event.key) {
      case "Enter":
      case " ":
        event.preventDefault();
        if (hit.kind === "more") rowController.showMore(hit.groupId);
        else rowController.toggleGroup(hit.groupId, event.altKey);
        return true;
      case "ArrowLeft":
      case "ArrowRight":
        if (hit.kind !== "group") return false;
        event.preventDefault();
        if (collapsed === (event.key === "ArrowLeft")) return true;
        setGroups((current) =>
          setCollapsed(current, hit.groupId, event.key === "ArrowLeft"),
        );
        return true;
      default:
        return false;
    }
  };

  const onGridKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const line = lineFromEvent(event.target);
    if (!line || event.target !== line.element) return;
    if (line.kind !== "row" && onLineKeyDown(event, line)) return;
    const hit = line;
    const page = Math.max(
      1,
      Math.floor(
        (metrics.bodyHeight || metrics.rowHeight * 10) / metrics.rowHeight,
      ) - 1,
    );
    /** The row id at a line index (grouped bodies hold headers too). */
    const rowIdAt = (index: number) => {
      const clamped = Math.min(Math.max(index, 0), lineCount - 1);
      if (!lines) return order[clamped];
      const target = lines[clamped];
      return target?.kind === "row" ? target.row.id : undefined;
    };
    const move = (index: number) => {
      event.preventDefault();
      focusRow(index);
      const target = rowIdAt(index);
      if (event.shiftKey && selectable && target && hit.kind === "row") {
        setSelection(
          selectRange(
            selection,
            order,
            anchor.current ?? hit.rowId,
            target,
            true,
          ),
        );
        anchor.current ??= hit.rowId;
      }
    };
    const mod = event.metaKey || event.ctrlKey;
    switch (event.key) {
      case "ArrowDown":
        return move(hit.index + 1);
      case "ArrowUp":
        return move(hit.index - 1);
      case "Home":
        return move(0);
      case "End":
        return move(lineCount - 1);
      case "PageDown":
        return move(hit.index + page);
      case "PageUp":
        return move(hit.index - page);
      case " ":
        if (!selectable || hit.kind !== "row") return;
        event.preventDefault();
        return toggleRow(hit.rowId, !selection[hit.rowId], event.shiftKey);
      case "Enter": {
        const row = hit.kind === "row" ? rowsById.get(hit.rowId) : undefined;
        if (row !== undefined && props.onRowOpen) {
          event.preventDefault();
          props.onRowOpen(row);
        }
        return;
      }
      case "ArrowRight":
        if (
          hit.kind === "row" &&
          hiddenColumns.length &&
          !expandAll &&
          !expanded.has(hit.rowId)
        ) {
          event.preventDefault();
          rowController.toggleExpanded(hit.rowId);
        }
        return;
      case "ArrowLeft":
        if (
          hit.kind === "row" &&
          hiddenColumns.length &&
          expanded.has(hit.rowId)
        ) {
          event.preventDefault();
          rowController.toggleExpanded(hit.rowId);
        }
        return;
      case "Escape":
        if (selected) {
          event.preventDefault();
          setSelection({});
        }
        return;
      case "ContextMenu":
      case "F10":
        // The context menu's trigger takes the key when the rows have one (R11.5).
        if ((event.key === "F10" && !event.shiftKey) || event.defaultPrevented)
          return;
        event.preventDefault();
        hit.element.querySelector<HTMLElement>(".fa-dt-actions")?.click();
        return;
      default:
        if (mod && event.key.toLowerCase() === "a" && selectable) {
          event.preventDefault();
          setSelection(togglePage(selection, order, true));
        }
    }
  };

  /* ── Scroll: sync the header, show edges, keep the reader in place ────────────── */
  const edges = useScrollEdges(scrollRef);
  const onScroll = () => {
    if (headRef.current && scrollRef.current)
      headRef.current.scrollLeft = scrollRef.current.scrollLeft;
  };
  const lastQuery = useRef(queryKey);
  useLayoutEffect(() => {
    if (lastQuery.current === queryKey) return;
    lastQuery.current = queryKey;
    // A new page or sort starts at the top.
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    setActiveIndex(0);
  }, [queryKey]);

  const applyPending = () => {
    liveRows.apply();
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  };

  /* ── Which body to draw ───────────────────────────────────────────────────────── */
  // Grouped: collapsed groups are content too (their headers), even with no rows loaded.
  const hasLines = Boolean(lines?.length);
  const showSkeleton = loading && data.length === 0 && !hasLines;
  const showError = !showSkeleton && Boolean(error);
  const showEmpty =
    !showSkeleton && !showError && data.length === 0 && !hasLines;
  const fillRows = metrics.rowHeight
    ? Math.ceil(metrics.bodyHeight / metrics.rowHeight)
    : pagination.pageSize;
  const skeletonCount = Math.max(
    1,
    height === "fill" && measured
      ? Math.min(pagination.pageSize, fillRows || pagination.pageSize)
      : pagination.pageSize,
  );
  const firstRowIndex =
    (cursor || grouping ? 0 : pagination.pageIndex * pagination.pageSize) + 2;
  const totalRows = grouping
    ? undefined
    : (rowCount ?? (cursor ? undefined : data.length));
  const colCount = visibleColumns.length + (selectable ? 2 : 1);

  const rowsContainerProps = {
    onClick: onRowsClick,
    onDoubleClick: onRowsDoubleClick,
    onMouseDown: onRowsMouseDown,
  };
  const hasContextMenu = Boolean(
    hasActions || renderRowContextMenu || cellFilterable,
  );
  const wrapRows = (element: ReactElement) =>
    hasContextMenu ? (
      <RowContextMenu<T>
        trigger={element}
        content={contextContent}
        onRun={onRun}
        onOpenChange={(open, details) => {
          if (!open) return;
          const eventTarget = details.event?.target ?? null;
          const hit = rowFromEvent(eventTarget);
          const content = hit
            ? resolveContextMenu(hit.rowId, eventTarget, hit.element)
            : null;
          if (!hit || !content) {
            details.cancel();
            return;
          }
          setContextContent(content);
          setActiveIndex(hit.index);
        }}
      />
    ) : (
      element
    );

  let body: ReactElement;
  if (showSkeleton) {
    body =
      mode === "cards" ? (
        <div role="rowgroup" className="fa-dt-cards" aria-hidden>
          <SkeletonCards
            count={Math.min(skeletonCount, 6)}
            layout={cards}
            selectable={selectable}
          />
        </div>
      ) : (
        <div
          role="rowgroup"
          className="fa-dt-rows"
          aria-hidden
          style={{ height: `calc(var(--_row-h) * ${skeletonCount})` }}
        >
          <SkeletonRows
            count={skeletonCount}
            columns={visibleColumns}
            selectable={selectable}
          />
        </div>
      );
  } else if (showError || showEmpty) {
    body = (
      <div
        role="rowgroup"
        className="fa-dt-message-group"
        style={
          height === "auto"
            ? { minHeight: `calc(var(--_row-h) * ${skeletonCount})` }
            : undefined
        }
      >
        {showError ? (
          <BodyMessage
            tone="error"
            action={onRetry ? <RetryButton onRetry={onRetry} /> : undefined}
          >
            {error}
          </BodyMessage>
        ) : (
          <BodyMessage
            tone="empty"
            action={
              searching || filters.length ? (
                <>
                  {searching ? (
                    <Button
                      size="sm"
                      onClick={() => {
                        setSearch("");
                        searchHandle.current?.focus({ open: false });
                      }}
                    >
                      Clear search
                    </Button>
                  ) : null}
                  {filters.length ? (
                    <Button size="sm" onClick={filterController.clearAll}>
                      Clear filters
                    </Button>
                  ) : null}
                </>
              ) : (
                emptyAction
              )
            }
          >
            {emptyText(
              noun,
              searching ? searchQuery : "",
              filters.length,
              emptyMessage,
            )}
          </BodyMessage>
        )}
      </div>
    );
  } else if (mode === "cards") {
    body = wrapRows(
      <div {...rowsContainerProps} role="rowgroup" className="fa-dt-cards">
        <CardList<T>
          rows={pageRows}
          items={
            lines as readonly GroupedItem<Row<DataTableFeatures, T>>[] | null
          }
          noun={noun}
          layout={cards}
          selection={selection}
          selectable={selectable}
          activeIndex={active}
          firstRowIndex={firstRowIndex}
          controller={rowController}
          getLabel={getLabel}
        />
      </div>,
    );
  } else {
    body = (
      <VirtualRows<T>
        rows={pageRows}
        items={
          lines as readonly GroupedItem<Row<DataTableFeatures, T>>[] | null
        }
        noun={noun}
        colSpan={colCount}
        scrollRef={scrollRef}
        virtualizerRef={virtualizerRef}
        columns={visibleColumns}
        hidden={hiddenColumns}
        selection={selection}
        selectable={selectable}
        activeIndex={active}
        expanded={expanded}
        expandAll={expandAll}
        rowHeight={metrics.rowHeight}
        detailHeight={detailRem * metrics.rem}
        firstRowIndex={firstRowIndex}
        renderAll={height === "auto"}
        controller={rowController}
        getLabel={getLabel}
        containerProps={rowsContainerProps}
        wrapContainer={wrapRows}
      />
    );
  }

  const settingsColumns = useMemo(
    () =>
      orderColumns(definitions, pinnedIds).map((entry) => ({
        id: entry.id,
        label: entry.meta.label,
        hideable: entry.meta.hideable,
      })),
    [definitions, pinnedIds],
  );
  const autoHiddenSet = useMemo(
    () => new Set(layout.autoHidden),
    [layout.autoHidden],
  );
  const effectiveDensity = density ?? globalDensity();

  return (
    // oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- delegated: "/" anywhere inside the table focuses its search (R16.8)
    <div
      ref={rootRef}
      id={domId}
      className={cx("fa-dt", className)}
      onKeyDown={searchBinding ? onRootKeyDown : undefined}
      data-height={height}
      data-mode={mode}
      data-density={density}
      data-selectable={selectable ? "" : undefined}
      data-trail={layout.trailButtons}
      data-pinned={
        visibleColumns.some((column) => column.pinned) ? "" : undefined
      }
      data-scrolled-top={edges.top ? "" : undefined}
      data-scrolled-bottom={edges.bottom ? "" : undefined}
      data-scrolled-left={edges.left ? "" : undefined}
      data-refetching={refetching ? "" : undefined}
      data-measured={measured ? "" : undefined}
      data-tier={statusOnly ? "status" : undefined}
      style={rootVars}
    >
      <span ref={probeRef} className="fa-dt-probe" aria-hidden />
      {toolbar || hasFilterBar || searchBinding ? (
        <div className="fa-dt-toolbar">
          {hasFilterBar || searchBinding ? (
            <FilterBar
              controller={filterController}
              toggles={toggles}
              search={searchBinding}
            />
          ) : null}
          {toolbar ? <div className="fa-dt-toolbar-end">{toolbar}</div> : null}
        </div>
      ) : null}
      <div className="fa-dt-frame">
        <div
          role="grid"
          className="fa-dt-grid"
          aria-label={label}
          aria-rowcount={
            showSkeleton || showError || showEmpty
              ? -1
              : totalRows === undefined
                ? -1
                : totalRows + 1
          }
          aria-colcount={colCount}
          aria-multiselectable={selectable || undefined}
          aria-busy={loading || refetching || undefined}
          tabIndex={-1}
          onKeyDown={onGridKeyDown}
        >
          {mode === "table" ? (
            <div
              role="rowgroup"
              ref={headRef}
              className="glass-inset fa-dt-head"
            >
              <DataTableHeader
                columns={visibleColumns}
                sorting={sorting}
                sized={sized}
                selectable={selectable}
                pageSelection={pageSelection(selection, order)}
                pageRowCount={order.length}
                hiddenCount={hiddenColumns.length}
                expandedAll={expandAll}
                columnMenu={columnMenu}
                controller={headerController}
                filtered={filtered}
                settings={
                  <SettingsMenu
                    columns={settingsColumns}
                    userHidden={userHidden}
                    autoHidden={autoHiddenSet}
                    density={effectiveDensity}
                    controller={headerController}
                  />
                }
              />
            </div>
          ) : null}
          {/* The body box: a fill table's scroller is absolutely positioned inside it, which
              makes the scroller a relayout boundary (rows mount without laying out the page). */}
          <div className="fa-dt-body">
            <div
              ref={scrollRef}
              className="fa-dt-scroll"
              data-scroll-container=""
              onScroll={onScroll}
            >
              {body}
            </div>
          </div>
        </div>
        <div className="fa-dt-progress" aria-hidden />
        {liveRows.pending > 0 ? (
          <div className="fa-dt-new">
            <Button
              size="sm"
              variant="primary"
              shape="circle"
              icon={<IconArrowUp />}
              onClick={applyPending}
            >
              {liveRows.pending} new
            </Button>
          </div>
        ) : null}
      </div>
      <DataTableFooter<T>
        pageIndex={pagination.pageIndex}
        pageSize={pagination.pageSize}
        pageRows={data.length}
        rowCount={rowCount}
        pageSizes={pageSizes}
        cursor={cursor}
        onPageChange={(pageIndex) =>
          setPagination((current) => ({ ...current, pageIndex }))
        }
        onPageSizeChange={(pageSize) =>
          setPagination({ pageIndex: 0, pageSize })
        }
        compact={compactFooter}
        disabled={showSkeleton}
        loading={showSkeleton}
        updatedAt={updatedAt}
        status={status}
        label={label}
        countLabel={formatCount(
          grouping ? groupTotal : (rowCount ?? data.length),
          noun,
        )}
        grouped={Boolean(grouping)}
        bulk={{
          count: selected,
          targets: selectedTargets,
          groups: bulkGroups,
          onRun,
          label: formatCount(selectedTargets.length, noun),
          custom: renderBulkActions?.(selectedTargets, () => setSelection({})),
          clear: () => setSelection({}),
          narrow: measured && widthRem < 40,
        }}
      />
      {hasActions && !renderRowActions ? (
        <RowActionsMenu<T>
          handle={rowMenu}
          resolve={resolveRowMenu}
          onRun={onRun}
        />
      ) : null}
      {mode === "table" ? (
        <ColumnMenu
          handle={columnMenu}
          controller={headerController}
          sorting={sorting}
          sized={sized}
          pinned={pinnedSet}
          filters={filterController}
        />
      ) : null}
      {hasFilterBar ? <FilterPopover controller={filterController} /> : null}
    </div>
  );
}
