import { useDataTableMessages } from "./use-messages.js";
import {
  flexRender,
  type Cell,
  type Row,
  type RowData,
} from "@tanstack/react-table";
import {
  memo,
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from "react";
import { IconChevronDown, IconChevronUp } from "../../icons/generated/icons.js";
import { Button } from "../button/index.js";
import { SelectCheckbox } from "./checkbox.js";
import { metaOf } from "./columns.js";
import { EditableValue } from "./editing.js";
import { countRender } from "./debug.js";
import type { DataColumnMeta, DataTableFeatures } from "./features.js";
import { columnStyle } from "./layout.js";
import { GripButton, type GripController } from "./reorder-handle.js";

/** Everything a row needs to know about one visible column; stable per layout. */
export interface ColumnInfo {
  id: string;
  key: string;
  /** Supporting data displayed with the item. */
  meta: DataColumnMeta;
  pinned: boolean;
  /** The last pinned column: draws the scroll-edge line while scrolled sideways. */
  edge: boolean;
  style: CSSProperties;
}

/** Stable callbacks shared by every row (one object for the table's lifetime). */
export interface RowController {
  toggleRow: (rowId: string, value: boolean, shift: boolean) => void;
  toggleExpanded: (rowId: string) => void;
  renderActions: (rowId: string, label: string, tabIndex: number) => ReactNode;
  wrap: (rowId: string, element: ReactElement) => ReactElement;
  /** Grouped tables: collapse or expand a group (`all`: every group the same way). */
  toggleGroup: (groupId: string, all: boolean) => void;
  /** Grouped tables: the group's "Show more". */
  showMore: (groupId: string) => void;
  /** Reorderable tables: what every grip shares. */
  grip?: GripController;
}

export interface DataRowProps<T extends RowData> {
  row: Row<DataTableFeatures, T>;
  /** Data identity: the row only re-renders when this object changes. */
  original: T;
  rowId: string;
  /** Index of the current item. */
  index: number;
  ariaRowIndex: number;
  /** Offset from the top of the body (px). */
  top: number;
  /** Typed column definitions, including rendering, sorting, priorities and filters. */
  columns: readonly ColumnInfo[];
  /** Keeps the item out of the visible layout. */
  hidden: readonly ColumnInfo[];
  selectable: boolean;
  /** The selected state or collection. */
  selected: boolean;
  /** The roving tab stop. */
  active: boolean;
  expanded: boolean;
  label: string;
  controller: RowController;
  /** Reorderable tables: "" when the row's grip is available, else why not. Undefined: no grip column. */
  grip?: string;
  /** The next line is a selected row (joins the selection band without a sibling :has()). */
  selectedNext?: boolean;
  /** Bumps when row-level renderers (actions, wrapper) change, so memoised rows redraw. */
  revision?: object;
}

export function renderCellContent(content: ReactNode) {
  if (content === null || content === undefined || content === "")
    return <span className="fa-dt-text fa-dt-muted">—</span>;
  if (typeof content === "string" || typeof content === "number")
    return <span className="fa-dt-text">{content}</span>;
  return content;
}

function renderedContent<T extends RowData>(
  cell: Cell<DataTableFeatures, T, unknown>,
) {
  const { columnDef } = cell.column;
  // A column without a renderer shows its value as truncating text. (TanStack's default
  // cell renders through a component, which would bypass the text wrapper.)
  if (columnDef.meta?.plain)
    return renderCellContent(cell.renderValue() as ReactNode);
  return renderCellContent(
    flexRender(columnDef.cell, cell.getContext()) as ReactNode,
  );
}

export function cellContent<T extends RowData>(
  cell: Cell<DataTableFeatures, T, unknown>,
) {
  if (!metaOf(cell.column).edit) return renderedContent(cell);
  return (
    <EditableValue
      row={cell.row.original}
      rowId={cell.row.id}
      columnId={cell.column.id}
      meta={metaOf(cell.column)}
      raw={cell.getValue()}
    >
      {renderedContent(cell)}
    </EditableValue>
  );
}

function sameValue(a: unknown, b: unknown) {
  if (Object.is(a, b)) return true;
  if (a instanceof Date && b instanceof Date)
    return a.getTime() === b.getTime();
  if (Array.isArray(a) && Array.isArray(b))
    return (
      a.length === b.length &&
      a.every((value, index) => Object.is(value, b[index]))
    );
  return false;
}

/**
 * Start the flash keyframe on a cell (motion.css `fa-flash`), or restart it if the cell is
 * still flashing. Restarting goes through the running animation rather than removing the
 * attribute and forcing a reflow, so a live update that flashes many cells lays out once.
 */
function flash(cell: HTMLElement) {
  if (cell.hasAttribute("data-flash")) {
    const running = cell
      .getAnimations?.({ subtree: true })
      .find(
        (animation) => (animation as CSSAnimation).animationName === "fa-flash",
      );
    if (running) {
      running.currentTime = 0;
      return;
    }
    cell.removeAttribute("data-flash");
    void cell.offsetWidth;
  }
  cell.setAttribute("data-flash", "");
  cell.addEventListener(
    "animationend",
    () => cell.removeAttribute("data-flash"),
    { once: true },
  );
}

function DataRowView<T extends RowData>({
  row,
  original,
  rowId,
  index,
  ariaRowIndex,
  top,
  columns,
  hidden,
  selectable,
  selected,
  active,
  expanded,
  label,
  controller,
  grip,
  selectedNext = false,
}: DataRowProps<T>) {
  const m = useDataTableMessages();
  countRender("rows");
  const ref = useRef<HTMLDivElement>(null);
  const previous = useRef<{ original: T; values: Map<string, unknown> } | null>(
    null,
  );
  const cells = row.getAllCellsByColumnId();
  const tabIndex = active ? 0 : -1;

  // R9.4: a live update that changes a value flashes that cell, in place.
  useLayoutEffect(() => {
    const values = new Map<string, unknown>();
    for (const column of columns)
      if (column.meta.flash) values.set(column.id, row.getValue(column.id));
    const before = previous.current;
    if (before && before.original !== original && ref.current) {
      for (const [id, value] of values) {
        if (!before.values.has(id) || sameValue(before.values.get(id), value))
          continue;
        const cell = ref.current.querySelector<HTMLElement>(
          `.fa-dt-cell[data-col="${columns.find((c) => c.id === id)?.key}"]`,
        );
        if (cell) flash(cell);
      }
    }
    previous.current = { original, values };
  }, [original, row, columns]);

  const element = (
    <div
      ref={ref}
      role="row"
      className="fa-dt-row"
      aria-rowindex={ariaRowIndex}
      aria-selected={selectable ? selected : undefined}
      tabIndex={tabIndex}
      data-row-id={rowId}
      data-index={index}
      data-item="row"
      data-selected={selected ? "" : undefined}
      data-selected-next={selected && selectedNext ? "" : undefined}
      data-expanded={expanded ? "" : undefined}
      style={{ transform: `translateY(${top}px)` }}
    >
      {grip !== undefined && controller.grip ? (
        <div role="gridcell" className="fa-dt-cell fa-dt-grip">
          <GripButton
            rowId={rowId}
            index={index}
            label={label}
            tabIndex={tabIndex}
            reason={grip}
            grip={controller.grip}
          />
        </div>
      ) : null}
      {selectable ? (
        <div role="gridcell" className="fa-dt-cell fa-dt-select">
          <SelectCheckbox
            checked={selected}
            label={m.selectRow(label)}
            tabIndex={tabIndex}
            onToggle={(value, { shift }) =>
              controller.toggleRow(rowId, value, shift)
            }
          />
        </div>
      ) : null}
      {columns.map((column) => {
        const cell = cells[column.id];
        return (
          <div
            key={column.id}
            role="gridcell"
            className="fa-dt-cell"
            data-col={column.key}
            data-align={column.meta.align}
            data-wrap={column.meta.truncate === "wrap" ? "" : undefined}
            data-pinned={column.pinned ? "" : undefined}
            data-edge={column.edge ? "" : undefined}
            style={column.style}
          >
            {cell ? cellContent(cell) : null}
          </div>
        );
      })}
      <div role="gridcell" className="fa-dt-cell fa-dt-trail">
        {hidden.length ? (
          <Button
            variant="ghost"
            size="sm"
            className="fa-dt-row-button fa-dt-expand"
            icon={expanded ? <IconChevronUp /> : <IconChevronDown />}
            aria-label={m.moreFields({ expanded: expanded, count: hidden.length, label: label })}
            aria-expanded={expanded}
            tabIndex={tabIndex}
            data-dt-interactive=""
            onClick={() => controller.toggleExpanded(rowId)}
          />
        ) : null}
        {controller.renderActions(rowId, label, tabIndex)}
      </div>
      {expanded && hidden.length ? (
        <div role="gridcell" className="fa-dt-detail">
          {hidden.map((column) => {
            const cell = cells[column.id];
            return (
              <div
                key={column.id}
                className="fa-dt-detail-field"
                data-col={column.key}
              >
                <span className="fa-dt-detail-label">{column.meta.label}</span>
                <span className="fa-dt-detail-value">
                  {cell ? cellContent(cell) : null}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
  return controller.wrap(rowId, element);
}

function rowPropsEqual<T extends RowData>(
  a: DataRowProps<T>,
  b: DataRowProps<T>,
) {
  return (
    a.original === b.original &&
    a.rowId === b.rowId &&
    a.index === b.index &&
    a.ariaRowIndex === b.ariaRowIndex &&
    a.top === b.top &&
    a.columns === b.columns &&
    a.hidden === b.hidden &&
    a.selectable === b.selectable &&
    a.selected === b.selected &&
    a.active === b.active &&
    a.expanded === b.expanded &&
    a.label === b.label &&
    a.controller === b.controller &&
    a.grip === b.grip &&
    a.selectedNext === b.selectedNext &&
    a.revision === b.revision
  );
}

/** A body row. Memoised on data identity, so hovering, selecting or live-updating one row
 *  never re-renders the others. */
export const DataRow = /* @__PURE__ */ memo(DataRowView, rowPropsEqual) as <T extends RowData>(
  props: DataRowProps<T>,
) => ReactElement;

/** Column info for the visible ids (memoise the result per layout). */
export function columnInfos(
  ids: readonly string[],
  metas: ReadonlyMap<string, { meta: DataColumnMeta; key: string }>,
  pinned: ReadonlySet<string>,
): ColumnInfo[] {
  const lastPinned = ids.findLast((id) => pinned.has(id));
  return ids.flatMap((id) => {
    const info = metas.get(id);
    if (!info) return [];
    const isPinned = pinned.has(id);
    return [
      {
        id,
        key: info.key,
        meta: info.meta,
        pinned: isPinned,
        edge: id === lastPinned,
        style: columnStyle(id, isPinned) as CSSProperties,
      },
    ];
  });
}
