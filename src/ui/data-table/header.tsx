import type { Column, RowData, SortingState } from "@tanstack/react-table"
import { memo, useRef, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react"
import {
  IconChevronDown,
  IconClose,
  IconColumns,
  IconEyeOff,
  IconFilter,
  IconFitWidth,
  IconPin,
  IconSort,
  IconSortAsc,
  IconSortDesc,
  IconUndo,
} from "../../icons/generated/icons.js"
import { Button } from "../button/index.js"
import { Menu, type MenuPrimitive } from "../menu/index.js"
import { SelectCheckbox } from "./checkbox.js"
import type { DataTableFeatures } from "./features.js"
import type { FilterController } from "./filters/controller.js"
import type { PageSelection } from "./selection.js"
import type { ColumnInfo } from "./row.js"
import type { DataTableDensity } from "./types.js"

export interface HeaderController {
  toggleSort: (columnId: string, event: unknown) => void
  sortBy: (columnId: string, desc: boolean | null) => void
  togglePage: (value: boolean) => void
  togglePin: (columnId: string) => void
  hide: (columnId: string) => void
  setUserHidden: (columnId: string, hidden: boolean) => void
  autosize: (columnId: string) => void
  resetWidth: (columnId: string) => void
  resetColumns: () => void
  /** Open the column's filter editor anchored to its header cell (R16.7). */
  openFilter: (columnId: string) => void
  setDensity: (density: DataTableDensity) => void
  toggleExpandAll: () => void
  startResize: (columnId: string, event: ReactPointerEvent<HTMLElement>) => void
  keyResize: (columnId: string, event: ReactKeyboardEvent<HTMLElement>) => void
  getColumn: (columnId: string) => Column<DataTableFeatures, RowData> | undefined
}

export interface HeaderProps {
  /** Typed column definitions, including rendering, sorting, priorities and filters. */
  columns: readonly ColumnInfo[]
  sorting: SortingState
  /** User-sized columns (have a width to reset). */
  sized: ReadonlySet<string>
  selectable: boolean
  pageSelection: PageSelection
  pageRowCount: number
  hiddenCount: number
  expandedAll: boolean
  columnMenu: MenuPrimitive.Handle<string>
  controller: HeaderController
  /** Filtered column ids: their headers show the filter glyph. */
  filtered: ReadonlySet<string>
  settings: ReactNode
  /** Draw the reorder grip column's header. */
  reorderable?: boolean
}

function SortGlyph({ direction }: { direction: false | "asc" | "desc" }) {
  if (direction === "asc") return <IconSortAsc className="fa-dt-sort-glyph" data-active="" />
  if (direction === "desc") return <IconSortDesc className="fa-dt-sort-glyph" data-active="" />
  return <IconSort className="fa-dt-sort-glyph" />
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
  column: ColumnInfo
  sortIndex: number
  direction: false | "asc" | "desc"
  multi: boolean
  filtered: boolean
  columnMenu: MenuPrimitive.Handle<string>
  controller: HeaderController
}) {
  const { meta } = column
  const sortable = controller.getColumn(column.id)?.getCanSort() ?? false
  const ariaSort = sortIndex === 0 && direction ? (direction === "asc" ? "ascending" : "descending") : undefined
  const label = (
    <>
      <span className="fa-dt-th-label">{meta.label}</span>
      {filtered ? (
        <>
          <IconFilter className="fa-dt-filter-glyph" />
          <span className="sr-only">, filtered</span>
        </>
      ) : null}
      {sortable ? <SortGlyph direction={direction} /> : null}
      {multi && direction ? (
        <span className="fa-dt-sort-index" aria-hidden>
          {sortIndex + 1}
        </span>
      ) : null}
    </>
  )
  // On sortable columns the menu button stays out of the tab order: Alt+↓, Shift+F10 or the
  // context-menu key on the sort button (or a right-click) opens it, so a column costs two
  // tab stops (sort, resize), not three.
  const openMenu = (cell: HTMLElement) => cell.querySelector<HTMLElement>(".fa-dt-th-menu")?.click()
  return (
    <div
      role="columnheader"
      className="fa-dt-th"
      tabIndex={-1}
      onContextMenu={(event) => {
        event.preventDefault()
        openMenu(event.currentTarget)
      }}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget.querySelector(".fa-dt-th-button")) return
        if ((event.altKey && event.key === "ArrowDown") || event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
          event.preventDefault()
          openMenu(event.currentTarget)
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
      {sortable ? (
        <button
          type="button"
          className="fa-dt-th-button fa-pressable"
          onClick={(event) => controller.toggleSort(column.id, event)}
          aria-keyshortcuts="Alt+ArrowDown"
          title={multi || direction ? undefined : "Shift-click to add to the sort"}
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
            aria-label={`${meta.label} column options`}
            tabIndex={sortable ? -1 : undefined}
          />
        }
      />
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={`Resize ${meta.label} column`}
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
  )
}

function HeaderView({
  columns,
  sorting,
  selectable,
  pageSelection,
  pageRowCount,
  hiddenCount,
  expandedAll,
  columnMenu,
  controller,
  filtered,
  settings,
  reorderable = false,
}: HeaderProps) {
  const multi = sorting.length > 1
  return (
    <div role="row" className="fa-dt-row fa-dt-head-row" aria-rowindex={1}>
      {reorderable ? (
        <div role="columnheader" className="fa-dt-th fa-dt-grip">
          {/* Named in text, not aria-label: a header needs content (axe empty-table-header). */}
          <span className="fa-dt-sr">Row order</span>
        </div>
      ) : null}
      {selectable ? (
        <div role="columnheader" className="fa-dt-th fa-dt-select">
          <SelectCheckbox
            checked={pageSelection === "all"}
            indeterminate={pageSelection === "some"}
            label="Select all rows on this page"
            onToggle={() => controller.togglePage(pageSelection !== "all")}
            tabIndex={pageRowCount ? 0 : -1}
          />
        </div>
      ) : null}
      {columns.map((column) => {
        const sortIndex = sorting.findIndex((sort) => sort.id === column.id)
        const sort = sortIndex >= 0 ? sorting[sortIndex] : undefined
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
        )
      })}
      <div role="columnheader" className="fa-dt-th fa-dt-trail" aria-label="Row actions">
        {hiddenCount ? (
          <Button
            variant={expandedAll ? "soft" : "ghost"}
            size="sm"
            className="fa-dt-more"
            aria-pressed={expandedAll}
            aria-label={`Show ${hiddenCount} more columns in rows`}
            onClick={controller.toggleExpandAll}
          >
            +{hiddenCount}
          </Button>
        ) : null}
        {settings}
      </div>
    </div>
  )
}

export const DataTableHeader = memo(HeaderView)

/** One column menu for the whole header (sort, filter, pin, fit, reset, hide): the shared Menu. */
export function ColumnMenu({
  handle,
  controller,
  sorting,
  sized,
  pinned,
  filters,
}: {
  handle: MenuPrimitive.Handle<string>
  controller: HeaderController
  sorting: SortingState
  sized: ReadonlySet<string>
  pinned: ReadonlySet<string>
  filters: FilterController
}) {
  // Choosing "Filter…" hands focus to the editor, so the closing menu must not take it back.
  const openingFilter = useRef(false)
  return (
    <Menu.Root
      handle={handle}
      onOpenChange={(open) => {
        if (open) openingFilter.current = false
      }}
    >
      {({ payload }) => {
        const column = payload ? controller.getColumn(payload) : undefined
        if (!column || !payload) return <Menu.Popup align="start">{null}</Menu.Popup>
        const meta = column.columnDef.meta
        const sort = sorting.find((entry) => entry.id === payload)
        const canSort = column.getCanSort()
        const isPinned = pinned.has(payload)
        const canFilter = Boolean(filters.column(payload))
        const hint = filters.hintOf(payload)
        return (
          <Menu.Popup align="start" aria-label={`${meta?.label ?? payload} column`} finalFocus={() => !openingFilter.current}>
            {canSort ? (
              <Menu.Group>
                <Menu.Item icon={<IconSortAsc />} data-selected={sort && !sort.desc ? "" : undefined} onClick={() => controller.sortBy(payload, false)}>
                  Sort ascending
                </Menu.Item>
                <Menu.Item icon={<IconSortDesc />} data-selected={sort?.desc ? "" : undefined} onClick={() => controller.sortBy(payload, true)}>
                  Sort descending
                </Menu.Item>
                {sort ? (
                  <Menu.Item icon={<IconClose />} onClick={() => controller.sortBy(payload, null)}>
                    Clear sort
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
                    openingFilter.current = true
                    controller.openFilter(payload)
                  }}
                >
                  Filter…
                </Menu.Item>
                {hint ? (
                  <Menu.Item icon={<IconClose />} onClick={() => filters.setFilter(payload, undefined)}>
                    Clear filter
                  </Menu.Item>
                ) : null}
              </Menu.Group>
            ) : null}
            <Menu.Group>
              <Menu.Item icon={<IconPin />} onClick={() => controller.togglePin(payload)}>
                {isPinned ? "Unpin column" : "Pin column"}
              </Menu.Item>
              <Menu.Item icon={<IconFitWidth />} onClick={() => controller.autosize(payload)}>
                Fit to content
              </Menu.Item>
              {sized.has(payload) ? (
                <Menu.Item icon={<IconUndo />} onClick={() => controller.resetWidth(payload)}>
                  Reset width
                </Menu.Item>
              ) : null}
              {meta?.hideable !== false ? (
                <Menu.Item icon={<IconEyeOff />} onClick={() => controller.hide(payload)}>
                  Hide column
                </Menu.Item>
              ) : null}
            </Menu.Group>
          </Menu.Popup>
        )
      }}
    </Menu.Root>
  )
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
  columns: ReadonlyArray<{ id: string; label: string; hideable: boolean }>
  userHidden: ReadonlySet<string>
  autoHidden: ReadonlySet<string>
  density: DataTableDensity
  controller: HeaderController
}) {
  return (
    <Menu.Root>
      <Menu.Trigger
        render={<Button variant="ghost" size="sm" className="fa-dt-settings" icon={<IconColumns />} aria-label="Columns and density" />}
      />
      <Menu.Popup align="end" aria-label="Columns and density">
        <Menu.Group>
          <Menu.GroupLabel>Columns</Menu.GroupLabel>
          {columns.map((column) => (
            <Menu.CheckboxItem
              key={column.id}
              checked={!userHidden.has(column.id)}
              disabled={!column.hideable}
              closeOnClick={false}
              onCheckedChange={(checked) => controller.setUserHidden(column.id, !checked)}
              trail={autoHidden.has(column.id) && !userHidden.has(column.id) ? "In row details" : undefined}
            >
              {column.label}
            </Menu.CheckboxItem>
          ))}
        </Menu.Group>
        <Menu.Group>
          <Menu.GroupLabel>Density</Menu.GroupLabel>
          <Menu.RadioGroup value={density} onValueChange={(value) => controller.setDensity(value as DataTableDensity)}>
            {(["comfortable", "compact"] as const).map((value) => (
              <Menu.RadioItem key={value} value={value} closeOnClick={false}>
                {value === "comfortable" ? "Comfortable" : "Compact"}
              </Menu.RadioItem>
            ))}
          </Menu.RadioGroup>
        </Menu.Group>
        <Menu.Group>
          <Menu.Item icon={<IconUndo />} onClick={controller.resetColumns}>
            Reset columns
          </Menu.Item>
        </Menu.Group>
      </Menu.Popup>
    </Menu.Root>
  )
}
