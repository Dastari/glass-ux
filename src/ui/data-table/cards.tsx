import { useDataTableMessages } from "./use-messages.js";
import type { RowData } from "@tanstack/react-table";
import type { Row, RowSelectionState } from "@tanstack/react-table";
import { Fragment, memo, type CSSProperties, type ReactElement, type ReactNode } from "react";
import { IconChevronDown, IconChevronUp } from "../../icons/generated/icons.js";
import { Button } from "../button/index.js";
import { Skeleton } from "../skeleton/index.js";
import { CellPlaceholder, type BodyExpansion } from "./body.js";
import { SelectCheckbox } from "./checkbox.js";
import { countRender } from "./debug.js";
import { levelStyle, RowExpander } from "./row-expander.js";
import type { BodyLine } from "./expansion.js";
import type { DataTableFeatures } from "./features.js";
import { GroupLine } from "./group-rows.js";
import { columnKey } from "./layout.js";
import { GripButton } from "./reorder-handle.js";
import {
  cellContent,
  sameExpansion,
  type ColumnInfo,
  type RowController,
  type RowExpansionProps,
} from "./row.js";
import type { DataTableCard, DataTableNoun } from "./types.js";

/** Which columns fill which slot of a card, from each column's `cardRole`. */
export interface CardLayout {
  /** Drawn across the top of the card, above the title. */
  media?: ColumnInfo | undefined;
  title: ColumnInfo | undefined;
  /** Data shown beneath or beside the title. */
  subtitle: ColumnInfo | undefined;
  /** Current operation or connection status, beside the title. */
  status: ColumnInfo | undefined;
  /** Supporting data shown on the card's field line, most important first. */
  meta: readonly ColumnInfo[];
  /** Narrow cards: the status column, leading the field line instead of the title row. */
  inlineStatus?: ColumnInfo;
  /** Remaining fields, including application defaults and user-hidden columns. */
  details: readonly ColumnInfo[];
}

/** Below this width (rem) a card's status leaves the title row for the field line. */
export const CARD_INLINE_STATUS_REM = 22;

export function cardLayout(
  columns: readonly ColumnInfo[],
  hidden: ReadonlySet<string> = new Set(),
  { inlineStatus = false }: { inlineStatus?: boolean } = {},
): CardLayout {
  const visible = columns.filter((column) => !hidden.has(column.id));
  const byRole = (role: string) =>
    visible.find((column) => column.meta.cardRole === role);
  const media = byRole("media");
  const title = byRole("title") ?? visible.find((column) => column !== media);
  const subtitle = byRole("subtitle");
  const status = byRole("status");
  // The most important fields lead the card's field line (priority 1 → 5, then the
  // definition order), so a narrow card shows them first.
  const meta = visible
    .filter((column) => column.meta.cardRole === "meta" && column !== title)
    .map((column, order) => ({ column, order }))
    .toSorted(
      (a, b) =>
        a.column.meta.priority - b.column.meta.priority || a.order - b.order,
    )
    .map(({ column }) => column);
  const shown = new Set([media, title, subtitle, status, ...meta]);
  const details = columns.filter((column) => !shown.has(column));
  // A narrow title row keeps its width for the title: the status badge leads the fields.
  if (inlineStatus && status)
    return {
      media,
      title,
      subtitle,
      status: undefined,
      meta: [status, ...meta],
      inlineStatus: status,
      details,
    };
  return { media, title, subtitle, status, meta, details };
}

/** A media column's box: its aspect ratio, read by the card and the table cell. */
export function mediaStyle(column: ColumnInfo): CSSProperties {
  return { "--_media-ratio": column.meta.mediaRatio ?? "4 / 3" } as CSSProperties;
}

interface CardProps<T extends RowData> extends RowExpansionProps {
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
  /** The host draws the card's content. */
  renderCard?: (row: T, card: DataTableCard) => ReactNode;
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
  treegrid = false,
  level,
  position,
  setSize,
  openable = false,
  open = false,
  panelId,
  context = false,
  renderCard,
}: CardProps<T>) {
  const m = useDataTableMessages();
  countRender("cards");
  const cells = row.getAllCellsByColumnId();
  const tabIndex = active ? 0 : -1;
  const render = (column: ColumnInfo | undefined) => {
    const cell = column ? cells[column.id] : undefined;
    return cell ? cellContent(cell) : null;
  };
  const select = selectable ? (
    <SelectCheckbox
      checked={selected}
      label={m.selectRow(label)}
      tabIndex={tabIndex}
      onToggle={(value, { shift }) => controller.toggleRow(rowId, value, shift)}
    />
  ) : null;
  const expander = openable ? (
    <RowExpander
      label={label}
      open={open}
      openable
      panelId={panelId}
      tabIndex={tabIndex}
      onToggle={() => controller.toggleOpen(rowId)}
    />
  ) : null;
  const fields = (columns: readonly ColumnInfo[], className: string) => (
    <dl className={className}>
      {columns.map((column) => (
        <div
          key={column.id}
          className="fa-dt-card-field"
          data-col={column.key}
          data-status={column === layout.inlineStatus ? "" : undefined}
        >
          <dt className="fa-dt-card-label">{column.meta.label}</dt>
          <dd className="fa-dt-card-value">{render(column)}</dd>
        </div>
      ))}
    </dl>
  );
  // The fields flow on one wrapping line, which the "+N" toggle ends; a card without
  // fields keeps the toggle beside its actions.
  const fieldLine = layout.meta.length > 0;
  const more = layout.details.length ? (
    <Button
      variant="ghost"
      size="sm"
      className="fa-dt-card-more"
      icon={expanded ? <IconChevronUp /> : <IconChevronDown />}
      aria-label={m.moreFields({
        expanded: expanded,
        count: layout.details.length,
        label: label,
      })}
      aria-expanded={expanded}
      tabIndex={tabIndex}
      data-dt-interactive=""
      onClick={() => controller.toggleExpanded(rowId)}
    >
      +{layout.details.length}
    </Button>
  ) : null;
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
      data-open={open ? "" : undefined}
      data-context={context ? "" : undefined}
      aria-level={treegrid ? level : undefined}
      aria-posinset={treegrid ? position : undefined}
      aria-setsize={treegrid ? setSize : undefined}
      aria-expanded={treegrid && openable ? open : undefined}
      style={levelStyle(level)}
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
      {renderCard ? (
        <div role="gridcell" className="fa-dt-card-slot">
          {renderCard(row.original, {
            label,
            selected,
            open,
            tabIndex,
            select,
            actions: controller.renderActions(rowId, label, tabIndex),
            expander,
            cell: (columnId) => {
              const cell = cells[columnId];
              return cell ? (
                <div className="fa-dt-card-part" data-col={columnKey(columnId)}>
                  {cellContent(cell)}
                </div>
              ) : null;
            },
          })}
        </div>
      ) : (
        <div role="gridcell" className="fa-dt-card-cell" data-media={layout.media ? "" : undefined}>
          {layout.media ? (
            <div className="fa-dt-card-media" data-col={layout.media.key} style={mediaStyle(layout.media)}>
              {render(layout.media)}
            </div>
          ) : null}
          <div
            className="fa-dt-card-head"
            data-subtitle={layout.subtitle ? "" : undefined}
          >
            {select}
            <div className="fa-dt-card-title" data-col={layout.title?.key}>
              {render(layout.title)}
            </div>
            {layout.subtitle ? (
              <div
                className="fa-dt-card-subtitle"
                data-col={layout.subtitle.key}
              >
                {render(layout.subtitle)}
              </div>
            ) : null}
            {layout.status ? (
              <div className="fa-dt-card-status" data-col={layout.status.key}>
                {render(layout.status)}
              </div>
            ) : null}
            <div className="fa-dt-card-actions">
              {expander}
              {fieldLine ? null : more}
              {controller.renderActions(rowId, label, tabIndex)}
            </div>
          </div>
          {fieldLine ? (
            <div className="fa-dt-card-body" data-more={more ? "" : undefined}>
              {fields(layout.meta, "fa-dt-card-meta")}
              {more}
            </div>
          ) : null}
          {expanded && layout.details.length
            ? fields(layout.details, "fa-dt-card-meta fa-dt-card-details")
            : null}
        </div>
      )}
    </div>
  );
  return controller.wrap(rowId, element);
}

export const DataCard = /* @__PURE__ */ memo(
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
    a.revision === b.revision &&
    a.renderCard === b.renderCard &&
    sameExpansion(a, b),
) as <T extends RowData>(props: CardProps<T>) => ReactElement;

export function CardList<T extends RowData>({
  rows,
  items,
  expansion,
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
  tail,
  renderCard,
}: {
  /** Records or matrix rows in display order. */
  rows: readonly Row<DataTableFeatures, T>[];
  /** Infinite loading: the line after the cards (a placeholder card, or the failure with Retry). */
  tail?: ReactNode;
  /** Grouped tables: group headers and "Show more" lines between the cards. */
  items?: readonly BodyLine<Row<DataTableFeatures, T>>[] | null;
  /** A table with `renderRowDetail` or `tree`. */
  expansion?: BodyExpansion<T>;
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
  /** The host draws each card's content. */
  renderCard?: (row: T, card: DataTableCard) => ReactNode;
}) {
  const lines =
    items ??
    rows.map((row, index): BodyLine<Row<DataTableFeatures, T>> => ({
      kind: "row",
      key: row.id,
      row,
      group: "",
      level: 1,
      position: index + 1,
      setSize: rows.length,
      nested: false,
    }));
  return (
    <>
      {lines.map((item, index) =>
        item.kind === "detail" ||
        item.kind === "child-status" ||
        item.kind === "child-more" ? (
          <Fragment key={item.key}>
            {expansion?.renderLine(item, { index })}
          </Fragment>
        ) : item.kind === "row" ? (
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
            renderCard={renderCard}
            {...expansion?.rowProps(item)}
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
            treegridGroups={
              expansion?.treegrid ? expansion.groupCount : undefined
            }
          />
        ),
      )}
      {tail}
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
  renderSkeleton,
}: {
  /** The host's placeholder for a card it draws (`renderCardSkeleton`). */
  renderSkeleton?: () => ReactNode;
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
          {renderSkeleton ? (
            <div className="fa-dt-card-slot">{renderSkeleton()}</div>
          ) : (
            <div className="fa-dt-card-cell" data-media={layout.media ? "" : undefined}>
              {layout.media ? (
                <Skeleton.Block className="fa-dt-card-media" style={mediaStyle(layout.media)} />
              ) : null}
              <div
                className="fa-dt-card-head"
                data-subtitle={layout.subtitle ? "" : undefined}
              >
                {selectable ? (
                  <Skeleton.Block className="fa-dt-skel-check" radius="check" />
                ) : null}
                <div className="fa-dt-card-title">
                  <CellPlaceholder
                    kind={layout.title?.meta.skeleton ?? "text"}
                    seed={index}
                  />
                </div>
                {layout.subtitle ? (
                  <div className="fa-dt-card-subtitle">
                    <Skeleton.Text type="caption" width="40%" />
                  </div>
                ) : null}
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
                      length:
                        Number(
                          layout.details.length > 0 && !layout.meta.length,
                        ) + Number(actions),
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
                <div
                  className="fa-dt-card-body"
                  data-more={layout.details.length ? "" : undefined}
                >
                  <dl className="fa-dt-card-meta">
                    {layout.meta.map((column, columnIndex) => (
                      <div
                        key={column.id}
                        className="fa-dt-card-field"
                        data-status={
                          column === layout.inlineStatus ? "" : undefined
                        }
                      >
                        <dt className="fa-dt-card-label">
                          {column.meta.label}
                        </dt>
                        <dd className="fa-dt-card-value">
                          <CellPlaceholder
                            kind={column.meta.skeleton}
                            seed={index + columnIndex}
                          />
                        </dd>
                      </div>
                    ))}
                  </dl>
                  {layout.details.length ? (
                    <Skeleton.Block
                      className="fa-dt-skel-action fa-dt-card-more"
                      radius="control"
                    />
                  ) : null}
                </div>
              ) : null}
            </div>
          )}
        </div>
      ))}
    </>
  );
}
