import { useDataTableMessages } from "./use-messages.js";
import {
  DropZoneScope,
  useDraggable,
  useDropZone,
} from "../drag-drop/index.js";
import type { Column, RowData, SortingState } from "@tanstack/react-table";
import {
  memo,
  useId,
  useCallback,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import {
  IconChevronDown,
  IconClose,
  IconColumns,
  IconEyeOff,
  IconFilter,
  IconFitWidth,
  IconGrip,
  IconPin,
  IconSort,
  IconSortAsc,
  IconSortDesc,
  IconUndo,
} from "../../icons/generated/icons.js";
import { Button } from "../button/index.js";
import { Menu, type MenuPrimitive } from "../menu/index.js";
import { SelectCheckbox } from "./checkbox.js";
import type { DataTableFeatures } from "./features.js";
import type { FilterController } from "./filters/controller.js";
import type { PageSelection } from "./selection.js";
import type { ColumnInfo } from "./row.js";
import type { DataTableDensity } from "./types.js";

export interface HeaderController {
  moveColumn: (
    columnId: string,
    to: number | "left" | "right" | "start" | "end",
  ) => void;
  reorderColumn: (columnId: string, targetId: string) => void;
  toggleSort: (columnId: string, event: unknown) => void;
  sortBy: (columnId: string, desc: boolean | null) => void;
  togglePage: (value: boolean) => void;
  togglePin: (columnId: string) => void;
  hide: (columnId: string) => void;
  setUserHidden: (columnId: string, hidden: boolean) => void;
  autosize: (columnId: string) => void;
  resetWidth: (columnId: string) => void;
  resetColumns: () => void;
  /** Open the column's filter editor anchored to its header cell (R16.7). */
  openFilter: (columnId: string) => void;
  setDensity: (density: DataTableDensity) => void;
  toggleExpandAll: () => void;
  startResize: (
    columnId: string,
    event: ReactPointerEvent<HTMLElement>,
  ) => void;
  keyResize: (columnId: string, event: ReactKeyboardEvent<HTMLElement>) => void;
  getColumn: (
    columnId: string,
  ) => Column<DataTableFeatures, RowData> | undefined;
}

export interface HeaderProps {
  /** Typed column definitions, including rendering, sorting, priorities and filters. */
  columns: readonly ColumnInfo[];
  sorting: SortingState;
  /** User-sized columns (have a width to reset). */
  sized: ReadonlySet<string>;
  selectable: boolean;
  pageSelection: PageSelection;
  pageRowCount: number;
  /** Infinite loading: the select-all box covers the loaded rows, not a page. */
  loadedRows?: boolean;
  hiddenCount: number;
  expandedAll: boolean;
  columnMenu: MenuPrimitive.Handle<string>;
  controller: HeaderController;
  /** Filtered column ids: their headers show the filter glyph. */
  filtered: ReadonlySet<string>;
  settings: ReactNode;
  /** Draw the reorder grip column's header. */
  reorderable?: boolean;
}

function SortGlyph({ direction }: { direction: false | "asc" | "desc" }) {
  if (direction === "asc")
    return <IconSortAsc className="fa-dt-sort-glyph" data-active="" />;
  if (direction === "desc")
    return <IconSortDesc className="fa-dt-sort-glyph" data-active="" />;
  return <IconSort className="fa-dt-sort-glyph" />;
}

function HeaderCell({
  column,
  sortIndex,
  direction,
  multi,
  filtered,
  columnMenu,
  controller,
}: {
  column: ColumnInfo;
  sortIndex: number;
  direction: false | "asc" | "desc";
  multi: boolean;
  filtered: boolean;
  columnMenu: MenuPrimitive.Handle<string>;
  controller: HeaderController;
}) {
  const m = useDataTableMessages();
  const drag = useDraggable({
    id: column.id,
    type: column.pinned ? "pinned-column" : "column",
    data: column.id,
    label: m.reorderColumn(column.meta.label),
  });
  const { meta } = column;
  const sortable = controller.getColumn(column.id)?.getCanSort() ?? false;
  const ariaSort =
    sortIndex === 0 && direction
      ? direction === "asc"
        ? "ascending"
        : "descending"
      : undefined;
  const label = (
    <>
      <span className="fa-dt-th-label">{meta.label}</span>
      {filtered ? (
        <>
          <IconFilter className="fa-dt-filter-glyph" />
          <span className="sr-only">{m.filtered}</span>
        </>
      ) : null}
      {sortable ? <SortGlyph direction={direction} /> : null}
      {multi && direction ? (
        <span className="fa-dt-sort-index" aria-hidden>
          {sortIndex + 1}
        </span>
      ) : null}
    </>
  );
  // On sortable columns the menu button stays out of the tab order: Alt+↓, Shift+F10 or the
  // context-menu key on the sort button (or a right-click) opens it, so a column costs two
  // tab stops (sort, resize), not three.
  const openMenu = (cell: HTMLElement) =>
    cell.querySelector<HTMLElement>(".fa-dt-th-menu")?.click();
  return (
    <div
      ref={drag.ref}
      role="columnheader"
      className="fa-dt-th"
      tabIndex={-1}
      onContextMenu={(event) => {
        event.preventDefault();
        openMenu(event.currentTarget);
      }}
      onKeyDown={(event) => {
        if (
          event.target !== event.currentTarget.querySelector(".fa-dt-th-button")
        )
          return;
        if (
          (event.altKey && event.key === "ArrowDown") ||
          event.key === "ContextMenu" ||
          (event.shiftKey && event.key === "F10")
        ) {
          event.preventDefault();
          openMenu(event.currentTarget);
        }
      }}
      aria-sort={ariaSort}
      data-col={column.key}
      data-align={meta.align}
      data-pinned={column.pinned ? "" : undefined}
      data-edge={column.edge ? "" : undefined}
      data-sorted={direction || undefined}
      data-filtered={filtered ? "" : undefined}
      style={column.style}
    >
      <span
        ref={drag.handleRef}
        {...drag.handleProps}
        className="fa-dt-column-grip"
        aria-roledescription={m.draggable}
        aria-label={m.reorderColumn(meta.label)}
      >
        <IconGrip />
      </span>
      {sortable ? (
        <button
          type="button"
          className="fa-dt-th-button fa-pressable"
          onClick={(event) => controller.toggleSort(column.id, event)}
          aria-keyshortcuts="Alt+ArrowDown"
          title={multi || direction ? undefined : m.multiSortHint}
        >
          {label}
        </button>
      ) : (
        <span className="fa-dt-th-button">{label}</span>
      )}
      <Menu.Trigger
        handle={columnMenu}
        payload={column.id}
        render={
          <Button
            variant="ghost"
            size="sm"
            className="fa-dt-th-menu"
            icon={<IconChevronDown />}
            aria-label={m.columnOptions(meta.label)}
            tabIndex={sortable ? -1 : undefined}
          />
        }
      />
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={m.resizeColumn(meta.label)}
        aria-valuemin={Math.round(meta.minWidth * 16)}
        aria-valuemax={Math.round(meta.maxWidth * 16)}
        aria-valuenow={Math.round(meta.width * 16)}
        tabIndex={0}
        className="fa-dt-resize"
        onPointerDown={(event) => controller.startResize(column.id, event)}
        onKeyDown={(event) => controller.keyResize(column.id, event)}
        onDoubleClick={() => controller.autosize(column.id)}
      />
    </div>
  );
}

function HeaderView({
  columns,
  sorting,
  selectable,
  pageSelection,
  pageRowCount,
  loadedRows = false,
  hiddenCount,
  expandedAll,
  columnMenu,
  controller,
  filtered,
  settings,
  reorderable = false,
}: HeaderProps) {
  const m = useDataTableMessages();
  const zoneId = useId();
  const headerRef = useRef<HTMLDivElement>(null);
  const clearMarker = () =>
    headerRef.current
      ?.querySelectorAll("[data-column-insertion]")
      .forEach((el) => el.removeAttribute("data-column-insertion"));
  const pinnedCount = columns.filter((column) => column.pinned).length;
  const zone = useDropZone({
    id: zoneId,
    label: m.columns,
    sort: "horizontal",
    accept: ["column", "pinned-column"],
    validate: (drag, target) =>
      target.index !== null &&
      (drag.item.type === "pinned-column"
        ? target.index < pinnedCount
        : target.index >= pinnedCount),
    onDragOver: (event) => {
      clearMarker();
      const targetIndex = event.target.index;
      if (targetIndex == null) return;
      const from = columns.findIndex((column) => column.id === event.item.id);
      const target = headerRef.current?.querySelectorAll<HTMLElement>(
        ".fa-dt-th[data-col]",
      )[targetIndex];
      target?.setAttribute(
        "data-column-insertion",
        from < targetIndex ? "after" : "before",
      );
    },
    onDragLeave: clearMarker,
    onDrop: (event) => {
      clearMarker();
      const target = columns[event.target.index ?? -1];
      if (target) controller.reorderColumn(event.item.id, target.id);
    },
  });
  const setHeaderRef = useCallback(
    (element: HTMLDivElement | null) => {
      headerRef.current = element;
      zone.ref(element);
    },
    [zone.ref],
  );
  const multi = sorting.length > 1;
  return (
    <DropZoneScope zoneId={zoneId}>
      <div
        ref={setHeaderRef}
        role="row"
        className="fa-dt-row fa-dt-head-row"
        aria-rowindex={1}
      >
        {reorderable ? (
          <div role="columnheader" className="fa-dt-th fa-dt-grip">
            {/* Named in text, not aria-label: a header needs content (axe empty-table-header). */}
            <span className="fa-dt-sr">{m.rowOrder}</span>
          </div>
        ) : null}
        {selectable ? (
          <div role="columnheader" className="fa-dt-th fa-dt-select">
            <SelectCheckbox
              checked={pageSelection === "all"}
              indeterminate={pageSelection === "some"}
              label={loadedRows ? m.selectLoaded : m.selectPage}
              onToggle={() => controller.togglePage(pageSelection !== "all")}
              tabIndex={pageRowCount ? 0 : -1}
            />
          </div>
        ) : null}
        {columns.map((column) => {
          const sortIndex = sorting.findIndex((sort) => sort.id === column.id);
          const sort = sortIndex >= 0 ? sorting[sortIndex] : undefined;
          return (
            <HeaderCell
              key={column.id}
              column={column}
              sortIndex={sortIndex}
              direction={sort ? (sort.desc ? "desc" : "asc") : false}
              multi={multi}
              filtered={filtered.has(column.id)}
              columnMenu={columnMenu}
              controller={controller}
            />
          );
        })}
        <div
          role="columnheader"
          className="fa-dt-th fa-dt-trail"
          aria-label={m.rowActions}
        >
          {hiddenCount ? (
            <Button
              variant={expandedAll ? "soft" : "ghost"}
              size="sm"
              className="fa-dt-more"
              aria-pressed={expandedAll}
              aria-label={m.moreColumns(hiddenCount)}
              onClick={controller.toggleExpandAll}
            >
              +{hiddenCount}
            </Button>
          ) : null}
          {settings}
        </div>
      </div>
    </DropZoneScope>
  );
}

export const DataTableHeader = memo(HeaderView);

/** One column menu for the whole header (sort, filter, pin, fit, reset, hide): the shared Menu. */
export function ColumnMenu({
  handle,
  controller,
  sorting,
  sized,
  pinned,
  filters,
}: {
  handle: MenuPrimitive.Handle<string>;
  controller: HeaderController;
  sorting: SortingState;
  sized: ReadonlySet<string>;
  pinned: ReadonlySet<string>;
  filters: FilterController;
}) {
  // Choosing m.filter hands focus to the editor, so the closing menu must not take it back.
  const m = useDataTableMessages();
  const openingFilter = useRef(false);
  return (
    <Menu.Root
      handle={handle}
      onOpenChange={(open) => {
        if (open) openingFilter.current = false;
      }}
    >
      {({ payload }) => {
        const column = payload ? controller.getColumn(payload) : undefined;
        if (!column || !payload)
          return <Menu.Popup align="start">{null}</Menu.Popup>;
        const meta = column.columnDef.meta;
        const sort = sorting.find((entry) => entry.id === payload);
        const canSort = column.getCanSort();
        const isPinned = pinned.has(payload);
        const canFilter = Boolean(filters.column(payload));
        const hint = filters.hintOf(payload);
        return (
          <Menu.Popup
            align="start"
            aria-label={m.columnMenu(meta?.label ?? payload)}
            finalFocus={() => !openingFilter.current}
          >
            {canSort ? (
              <Menu.Group>
                <Menu.Item
                  icon={<IconSortAsc />}
                  data-selected={sort && !sort.desc ? "" : undefined}
                  onClick={() => controller.sortBy(payload, false)}
                >
                  {m.sortAscending}
                </Menu.Item>
                <Menu.Item
                  icon={<IconSortDesc />}
                  data-selected={sort?.desc ? "" : undefined}
                  onClick={() => controller.sortBy(payload, true)}
                >
                  {m.sortDescending}
                </Menu.Item>
                {sort ? (
                  <Menu.Item
                    icon={<IconClose />}
                    onClick={() => controller.sortBy(payload, null)}
                  >
                    {m.clearSort}
                  </Menu.Item>
                ) : null}
              </Menu.Group>
            ) : null}
            {canFilter ? (
              <Menu.Group>
                <Menu.Item
                  icon={<IconFilter />}
                  trail={hint ?? undefined}
                  onClick={() => {
                    openingFilter.current = true;
                    controller.openFilter(payload);
                  }}
                >
                  {m.filter}
                </Menu.Item>
                {hint ? (
                  <Menu.Item
                    icon={<IconClose />}
                    onClick={() => filters.setFilter(payload, undefined)}
                  >
                    {m.clearFilter}
                  </Menu.Item>
                ) : null}
              </Menu.Group>
            ) : null}
            <Menu.Group>
              <Menu.Item onClick={() => controller.moveColumn(payload, "left")}>
                {m.moveLeft}
              </Menu.Item>
              <Menu.Item
                onClick={() => controller.moveColumn(payload, "right")}
              >
                {m.moveRight}
              </Menu.Item>
              <Menu.Item
                onClick={() => controller.moveColumn(payload, "start")}
              >
                {m.moveStart}
              </Menu.Item>
              <Menu.Item onClick={() => controller.moveColumn(payload, "end")}>
                {m.moveEnd}
              </Menu.Item>
            </Menu.Group>
            <Menu.Group>
              <Menu.Item
                icon={<IconPin />}
                onClick={() => controller.togglePin(payload)}
              >
                {isPinned ? m.unpinColumn : m.pinColumn}
              </Menu.Item>
              <Menu.Item
                icon={<IconFitWidth />}
                onClick={() => controller.autosize(payload)}
              >
                {m.fitContent}
              </Menu.Item>
              {sized.has(payload) ? (
                <Menu.Item
                  icon={<IconUndo />}
                  onClick={() => controller.resetWidth(payload)}
                >
                  {m.resetWidth}
                </Menu.Item>
              ) : null}
              {meta?.hideable !== false ? (
                <Menu.Item
                  icon={<IconEyeOff />}
                  onClick={() => controller.hide(payload)}
                >
                  {m.hideColumn}
                </Menu.Item>
              ) : null}
            </Menu.Group>
          </Menu.Popup>
        );
      }}
    </Menu.Root>
  );
}

/** The trailing header button: choose columns, density, reset. */
export function SettingsMenu({
  columns,
  userHidden,
  autoHidden,
  density,
  controller,
}: {
  /** Typed column definitions, including rendering, sorting, priorities and filters. */
  columns: ReadonlyArray<{ id: string; label: string; hideable: boolean }>;
  userHidden: ReadonlySet<string>;
  autoHidden: ReadonlySet<string>;
  density: DataTableDensity;
  controller: HeaderController;
}) {
  const m = useDataTableMessages();
  return (
    <Menu.Root>
      <Menu.Trigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="fa-dt-settings"
            icon={<IconColumns />}
            aria-label={m.columnsDensity}
          />
        }
      />
      <Menu.Popup align="end" aria-label={m.columnsDensity}>
        <Menu.Group>
          <Menu.GroupLabel>{m.columns}</Menu.GroupLabel>
          {columns.map((column) => (
            <Menu.CheckboxItem
              key={column.id}
              checked={!userHidden.has(column.id)}
              disabled={!column.hideable}
              closeOnClick={false}
              onCheckedChange={(checked) =>
                controller.setUserHidden(column.id, !checked)
              }
              trail={
                autoHidden.has(column.id) && !userHidden.has(column.id)
                  ? m.inDetails
                  : undefined
              }
            >
              {column.label}
            </Menu.CheckboxItem>
          ))}
        </Menu.Group>
        <Menu.Group>
          <Menu.GroupLabel>{m.density}</Menu.GroupLabel>
          <Menu.RadioGroup
            value={density}
            onValueChange={(value) =>
              controller.setDensity(value as DataTableDensity)
            }
          >
            {(["comfortable", "compact"] as const).map((value) => (
              <Menu.RadioItem key={value} value={value} closeOnClick={false}>
                {value === "comfortable" ? m.comfortable : m.compact}
              </Menu.RadioItem>
            ))}
          </Menu.RadioGroup>
        </Menu.Group>
        <Menu.Group>
          <Menu.Item icon={<IconUndo />} onClick={controller.resetColumns}>
            {m.resetColumns}
          </Menu.Item>
        </Menu.Group>
      </Menu.Popup>
    </Menu.Root>
  );
}
