import type { RowData } from "@tanstack/react-table";
import type { Row, RowSelectionState } from "@tanstack/react-table";
import { memo, type ReactElement } from "react";
import { IconChevronDown, IconChevronUp } from "../../icons/generated/icons.js";
import { Button } from "../button/index.js";
import { Skeleton } from "../skeleton/index.js";
import { CellPlaceholder } from "./body.js";
import { SelectCheckbox } from "./checkbox.js";
import { countRender } from "./debug.js";
import type { DataTableFeatures } from "./features.js";
import { GroupLine } from "./group-rows.js";
import type { GroupedItem } from "./grouping.js";
import { GripButton } from "./reorder-handle.js";
import { cellContent, type ColumnInfo, type RowController } from "./row.js";
import type { DataTableNoun } from "./types.js";

/** Which columns fill which slot of a card, from each column's `cardRole`. */
export interface CardLayout {
  title: ColumnInfo | undefined;
  /** Data shown beneath or beside the title. */
  subtitle: ColumnInfo | undefined;
  /** Current operation or connection status. */
  status: ColumnInfo | undefined;
  /** Supporting data displayed with the item. */
  meta: readonly ColumnInfo[];
  /** Remaining fields, including application defaults and user-hidden columns. */
  details: readonly ColumnInfo[];
}

export function cardLayout(
  columns: readonly ColumnInfo[],
  hidden: ReadonlySet<string> = new Set(),
): CardLayout {
  const visible = columns.filter((column) => !hidden.has(column.id));
  const byRole = (role: string) =>
    visible.find((column) => column.meta.cardRole === role);
  const title = byRole("title") ?? visible[0];
  const subtitle = byRole("subtitle");
  const status = byRole("status");
  const meta = visible.filter(
    (column) => column.meta.cardRole === "meta" && column !== title,
  );
  const shown = new Set([title, subtitle, status, ...meta]);
  return {
    title,
    subtitle,
    status,
    meta,
    details: columns.filter((column) => !shown.has(column)),
  };
}

interface CardProps<T extends RowData> {
  row: Row<DataTableFeatures, T>;
  original: T;
  rowId: string;
  /** Index of the current item. */
  index: number;
  ariaRowIndex: number;
  /** Layout or presentation mode. */
  layout: CardLayout;
  selectable: boolean;
  /** The selected state or collection. */
  selected: boolean;
  /** Marks the current destination or active choice. */
  active: boolean;
  expanded: boolean;
  label: string;
  controller: RowController;
  /** Reorderable tables: "" when the grip is available, else why not. */
  grip?: string;
  /** Bumps when row-level renderers change. */
  revision?: object;
}

function CardView<T extends RowData>({
  row,
  rowId,
  index,
  ariaRowIndex,
  layout,
  selectable,
  selected,
  active,
  expanded,
  label,
  controller,
  grip,
}: CardProps<T>) {
  countRender("cards");
  const cells = row.getAllCellsByColumnId();
  const tabIndex = active ? 0 : -1;
  const render = (column: ColumnInfo | undefined) => {
    const cell = column ? cells[column.id] : undefined;
    return cell ? cellContent(cell) : null;
  };
  const element = (
    <div
      role="row"
      className="glass-control fa-dt-card"
      aria-rowindex={ariaRowIndex}
      aria-selected={selectable ? selected : undefined}
      tabIndex={tabIndex}
      data-row-id={rowId}
      data-index={index}
      data-item="row"
      data-selected={selected ? "" : undefined}
    >
      {grip !== undefined && controller.grip ? (
        <div role="gridcell" className="fa-dt-card-grip">
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
      <div role="gridcell" className="fa-dt-card-cell">
        <div className="fa-dt-card-head">
          {selectable ? (
            <SelectCheckbox
              checked={selected}
              label={`Select ${label}`}
              tabIndex={tabIndex}
              onToggle={(value, { shift }) =>
                controller.toggleRow(rowId, value, shift)
              }
            />
          ) : null}
          <div className="fa-dt-card-title" data-col={layout.title?.key}>
            {render(layout.title)}
          </div>
          {layout.status ? (
            <div className="fa-dt-card-status" data-col={layout.status.key}>
              {render(layout.status)}
            </div>
          ) : null}
          <div className="fa-dt-card-actions">
            {layout.details.length ? (
              <Button
                variant="ghost"
                size="sm"
                icon={expanded ? <IconChevronUp /> : <IconChevronDown />}
                aria-label={`${expanded ? "Hide" : "Show"} ${layout.details.length} more fields for ${label}`}
                aria-expanded={expanded}
                tabIndex={tabIndex}
                data-dt-interactive=""
                onClick={() => controller.toggleExpanded(rowId)}
              >
                +{layout.details.length}
              </Button>
            ) : null}
            {controller.renderActions(rowId, label, tabIndex)}
          </div>
        </div>
        {layout.subtitle ? (
          <div className="fa-dt-card-subtitle" data-col={layout.subtitle.key}>
            {render(layout.subtitle)}
          </div>
        ) : null}
        {layout.meta.length ? (
          <dl className="fa-dt-card-meta">
            {layout.meta.map((column) => (
              <div
                key={column.id}
                className="fa-dt-card-field"
                data-col={column.key}
              >
                <dt className="fa-dt-card-label">{column.meta.label}</dt>
                <dd className="fa-dt-card-value">{render(column)}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {expanded && layout.details.length ? (
          <dl className="fa-dt-card-meta fa-dt-card-details">
            {layout.details.map((column) => (
              <div
                key={column.id}
                className="fa-dt-card-field"
                data-col={column.key}
              >
                <dt className="fa-dt-card-label">{column.meta.label}</dt>
                <dd className="fa-dt-card-value">{render(column)}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </div>
  );
  return controller.wrap(rowId, element);
}

export const DataCard = memo(
  CardView,
  (a, b) =>
    a.original === b.original &&
    a.index === b.index &&
    a.ariaRowIndex === b.ariaRowIndex &&
    a.layout === b.layout &&
    a.selectable === b.selectable &&
    a.selected === b.selected &&
    a.active === b.active &&
    a.expanded === b.expanded &&
    a.label === b.label &&
    a.controller === b.controller &&
    a.grip === b.grip &&
    a.revision === b.revision,
) as <T extends RowData>(props: CardProps<T>) => ReactElement;

export function CardList<T extends RowData>({
  rows,
  items,
  layout,
  expanded,
  expandAll,
  selection,
  selectable,
  activeIndex,
  firstRowIndex,
  controller,
  getLabel,
  noun,
  gripOf,
  revision,
}: {
  /** Records or matrix rows in display order. */
  rows: readonly Row<DataTableFeatures, T>[];
  /** Grouped tables: group headers and "Show more" lines between the cards. */
  items?: readonly GroupedItem<Row<DataTableFeatures, T>>[] | null;
  /** Layout or presentation mode. */
  layout: CardLayout;
  expanded: ReadonlySet<string>;
  expandAll: boolean;
  selection: RowSelectionState;
  selectable: boolean;
  activeIndex: number;
  firstRowIndex: number;
  controller: RowController;
  getLabel: (row: T) => string;
  /** Singular and plural names used in counts and accessible labels. */
  noun: DataTableNoun;
  /** Reorderable tables: a row's grip state ("" available, else the reason). */
  gripOf?: (row: Row<DataTableFeatures, T>) => string;
  /** Bumps when row-level renderers change. */
  revision: object;
}) {
  const lines =
    items ??
    rows.map((row): GroupedItem<Row<DataTableFeatures, T>> => ({
      kind: "row",
      key: row.id,
      row,
      group: "",
    }));
  return (
    <>
      {lines.map((item, index) =>
        item.kind === "row" ? (
          <DataCard<T>
            key={item.row.id}
            row={item.row}
            original={item.row.original}
            rowId={item.row.id}
            index={index}
            ariaRowIndex={firstRowIndex + index}
            layout={layout}
            selectable={selectable}
            selected={selection[item.row.id] === true}
            active={index === activeIndex}
            expanded={expandAll || expanded.has(item.row.id)}
            label={getLabel(item.row.original)}
            controller={controller}
            grip={gripOf?.(item.row)}
            revision={revision}
          />
        ) : (
          <GroupLine
            key={item.key}
            item={item}
            index={index}
            ariaRowIndex={firstRowIndex + index}
            active={index === activeIndex}
            colSpan={1}
            noun={noun}
            controller={controller}
          />
        ),
      )}
    </>
  );
}

/** Card placeholders with the same slots as a real card. */
export function SkeletonCards({
  count,
  layout,
  selectable,
  actions,
  grip = false,
}: {
  /** Item count shown by the component. */
  count: number;
  /** Layout or presentation mode. */
  layout: CardLayout;
  selectable: boolean;
  /** Reserve the row-action controls while the host loads records. */
  actions: boolean;
  /** Reserve the reorder grip. */
  grip?: boolean;
}) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="glass-control fa-dt-card fa-dt-skel-card"
          aria-hidden
        >
          {grip ? (
            <div className="fa-dt-card-grip">
              <span className="fa-dt-grip-space" />
            </div>
          ) : null}
          <div className="fa-dt-card-cell">
            <div className="fa-dt-card-head">
              {selectable ? (
                <Skeleton.Block className="fa-dt-skel-check" radius="check" />
              ) : null}
              <div className="fa-dt-card-title">
                <CellPlaceholder
                  kind={layout.title?.meta.skeleton ?? "text"}
                  seed={index}
                />
              </div>
              {layout.status ? (
                <div className="fa-dt-card-status">
                  <CellPlaceholder
                    kind={layout.status.meta.skeleton}
                    seed={index}
                  />
                </div>
              ) : null}
              <div className="fa-dt-card-actions">
                {Array.from(
                  {
                    length: Number(layout.details.length > 0) + Number(actions),
                  },
                  (_, action) => (
                    <Skeleton.Block
                      key={action}
                      className="fa-dt-skel-action"
                      radius="control"
                    />
                  ),
                )}
              </div>
            </div>
            {layout.meta.length ? (
              <dl className="fa-dt-card-meta">
                {layout.meta.map((column, columnIndex) => (
                  <div key={column.id} className="fa-dt-card-field">
                    <dt className="fa-dt-card-label">{column.meta.label}</dt>
                    <dd className="fa-dt-card-value">
                      <CellPlaceholder
                        kind={column.meta.skeleton}
                        seed={index + columnIndex}
                      />
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        </div>
      ))}
    </>
  );
}
