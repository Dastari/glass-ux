import { useDataTableMessages } from "./use-messages.js";
import { usePrinting } from "../../lib/use-printing.js";
import type { RowData } from "@tanstack/react-table";
import type { Row, RowSelectionState } from "@tanstack/react-table";
import {
  defaultRangeExtractor,
  useVirtualizer,
  type Virtualizer,
} from "@tanstack/react-virtual";
import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  type Ref,
  type RefObject,
} from "react";
import { IconAlert } from "../../icons/generated/icons.js";
import { Button } from "../button/index.js";
import { EntityIdentitySkeleton } from "../entity/index.js";
import { cx } from "../../lib/cx.js";
import { Skeleton } from "../skeleton/index.js";
import type { BodyLine, RowLine } from "./expansion.js";
import type { CellSkeleton, DataTableFeatures } from "./features.js";
import { GroupLine } from "./group-rows.js";
import {
  DataRow,
  type ColumnInfo,
  type RowController,
  type RowExpansionProps,
} from "./row.js";
import type { DataTableNoun } from "./types.js";

/** What rows and cards ask a table with `renderRowDetail` or `tree`. */
export interface BodyExpansion<T extends RowData> {
  treegrid: boolean;
  expanderColumn: string | undefined;
  /** How many groups a treegrid's group headers count among. */
  groupCount: number;
  rowProps: (line: RowLine<Row<DataTableFeatures, T>>) => RowExpansionProps;
  /** A panel, status or "Show more" line. `top` is undefined in the card list. */
  renderLine: (
    line: Exclude<
      BodyLine<Row<DataTableFeatures, T>>,
      { kind: "row" | "group" | "more" }
    >,
    placement: {
      index: number;
      top?: number;
      measureRef?: (element: HTMLDivElement | null) => void;
    },
  ) => ReactElement;
  /** A panel's height before it is measured (px). */
  panelEstimate: (row: T) => number;
}

/** The first line in view: what stays put when lines around it change. */
interface ScrollAnchor {
  key: unknown;
  /** Line's start minus the scroll position. */
  offset: number;
}

const lineKeyOf = <R extends { id: string }>(line: BodyLine<R>) =>
  line.kind === "row" ? line.row.id : line.key;

export interface VirtualRowsProps<T extends RowData> {
  /** Records or matrix rows in display order. */
  rows: readonly Row<DataTableFeatures, T>[];
  /**
   * Grouped tables: the body in display order (group headers, rows, "Show more" lines). Each
   * line is one row tall; indexes, keyboard focus and aria-rowindex count every line.
   */
  items?: readonly BodyLine<Row<DataTableFeatures, T>>[] | null;
  /** A table with `renderRowDetail` or `tree`. */
  expansion?: BodyExpansion<T>;
  scrollRef: RefObject<HTMLDivElement | null>;
  virtualizerRef: RefObject<Virtualizer<HTMLDivElement, Element> | null>;
  /** Typed column definitions, including rendering, sorting, priorities and filters. */
  columns: readonly ColumnInfo[];
  /** Keeps the item out of the visible layout. */
  hidden: readonly ColumnInfo[];
  selection: RowSelectionState;
  selectable: boolean;
  activeIndex: number;
  expanded: ReadonlySet<string>;
  expandAll: boolean;
  rowHeight: number;
  detailHeight: number;
  /** aria-rowindex of the first body row (header is 1). */
  firstRowIndex: number;
  /** Render every row (auto-height tables). */
  renderAll: boolean;
  controller: RowController;
  getLabel: (row: T) => string;
  /** Grouped tables: what a group header's count counts ("8 devices"). */
  noun: DataTableNoun;
  /** Cells a group line spans. */
  colSpan: number;
  /** Props for the rowgroup element (delegated pointer handlers live here). */
  containerProps: HTMLAttributes<HTMLDivElement>;
  /** Wrap the rowgroup (the context-menu trigger renders it). */
  wrapContainer: (element: ReactElement) => ReactElement;
  /** Reorderable tables: a row's grip state ("" available, else the reason). */
  gripOf?: (row: Row<DataTableFeatures, T>) => string;
  /** Bumps when row-level renderers change (memoised rows redraw). */
  revision: object;
  /**
   * Infinite loading: a line after the rows (a placeholder row, or the failure with Retry),
   * one row tall and always mounted, so it can watch for the end of the list coming into view.
   */
  renderTail?: (placement: { index: number; top: number }) => ReactElement;
}

/**
 * The body rows, virtualized with @tanstack/react-virtual. Row height is fixed by the
 * density token (--row-h); an expanded row adds the detail line. The focused row is kept
 * mounted so keyboard focus survives scrolling. A grouped body virtualizes its group headers
 * and "Show more" lines with the rows, each one row tall.
 */
export function VirtualRows<T extends RowData>({
  rows,
  items,
  expansion,
  scrollRef,
  virtualizerRef,
  columns,
  hidden,
  selection,
  selectable,
  activeIndex,
  expanded,
  expandAll,
  rowHeight,
  detailHeight,
  firstRowIndex,
  renderAll,
  controller,
  getLabel,
  noun,
  colSpan,
  containerProps,
  wrapContainer,
  gripOf,
  revision,
  renderTail,
}: VirtualRowsProps<T>) {
  const isExpanded = useCallback(
    (row: Row<DataTableFeatures, T> | undefined) =>
      Boolean(row && hidden.length && (expandAll || expanded.has(row.id))),
    [expandAll, expanded, hidden.length],
  );
  const printing = usePrinting();
  const lineCount = items ? items.length : rows.length;
  const count = lineCount + (renderTail ? 1 : 0);
  /** Measured panel heights. `virtualizer.measure()` forgets its own; these survive it. */
  const panelSizes = useRef(new Map<unknown, number>());

  /** Bumps when a panel's height changes. */
  const sizeVersion = useRef(0);
  /** The first line in view, noted on every scroll. */
  const anchor = useRef<ScrollAnchor | null>(null);
  const laidOut = useRef({ items, sizes: 0 });
  const rowAt = (index: number): Row<DataTableFeatures, T> | undefined => {
    if (!items) return rows[index];
    const item = items[index];
    return item?.kind === "row" ? item.row : undefined;
  };
  // TanStack keys its measurement cache by this callback's identity. Keep scroll renders
  // from rebuilding the geometry for every loaded row; new data/order still invalidates it.
  const keyAt = useCallback(
    (index: number) => {
      if (index === lineCount) return "\u0000tail";
      if (!items) return rows[index]?.id ?? index;
      const item = items[index];
      if (!item) return index;
      return lineKeyOf(item);
    },
    [rows, items, lineCount],
  );
  const lineSize = (index: number) => {
    const item = items?.[index];
    if (item?.kind === "detail")
      return (
        panelSizes.current.get(item.key) ??
        expansion?.panelEstimate(item.row.original) ??
        rowHeight
      );
    if (item?.kind === "child-status") return rowHeight * item.lines;
    return rowHeight + (isExpanded(rowAt(index)) ? detailHeight : 0);
  };
  // oxlint-disable-next-line react/incompatible-library -- TanStack Virtual is the table's virtualizer (R16); rows are memoised by data identity, not by the compiler
  const virtualizer = useVirtualizer<HTMLDivElement, Element>({
    count,
    getScrollElement: () => scrollRef.current,
    estimateSize: lineSize,
    getItemKey: keyAt,
    // A panel's new height moves the rows under it, which a ResizeObserver callback must not do.
    useAnimationFrameWithResizeObserver: Boolean(expansion),
    // Only panels attach a ref, so this reads their height alone.
    measureElement: expansion
      ? (element, entry, instance) => {
          const box = entry?.borderBoxSize?.[0];
          const size = Math.round(
            box ? box.blockSize : element.getBoundingClientRect().height,
          );
          const key = instance.options.getItemKey(
            instance.indexFromElement(element),
          );
          if (panelSizes.current.get(key) !== size) sizeVersion.current++;
          panelSizes.current.set(key, size);
          return size;
        }
      : undefined,
    // Printing lays out every loaded row (print.css puts them in document flow).
    overscan: renderAll || printing ? count : 6,
    initialRect: { width: 0, height: renderAll ? count * rowHeight : 0 },
    rangeExtractor: (range) => {
      const indexes = defaultRangeExtractor(range);
      if (
        activeIndex >= 0 &&
        activeIndex < lineCount &&
        !indexes.includes(activeIndex)
      ) {
        indexes.push(activeIndex);
        indexes.sort((a, b) => a - b);
      }
      // A mounted row's panel is mounted with it: its expander's aria-controls names it.
      if (items && expansion) {
        for (const index of indexes.slice())
          if (
            items[index]?.kind === "row" &&
            items[index + 1]?.kind === "detail" &&
            !indexes.includes(index + 1)
          )
            indexes.push(index + 1);
        indexes.sort((a, b) => a - b);
      }
      // The end line stays mounted: it watches for the end of the list coming near.
      if (renderTail && !indexes.includes(lineCount)) indexes.push(lineCount);
      return indexes;
    },
  });
  virtualizerRef.current = virtualizer;
  // Anchoring below has one owner: left to the virtualizer too, the two would fight.
  virtualizer.shouldAdjustScrollPositionOnItemSizeChange = expansion
    ? () => false
    : undefined;

  // Heights change with density, expansion and the grouped lines; re-measure in the same frame.
  useLayoutEffect(() => {
    virtualizer.measure();
  }, [
    virtualizer,
    rowHeight,
    detailHeight,
    expandAll,
    expanded,
    hidden.length,
    items,
  ]);

  // Lines coming and going, and panels measuring themselves, must not move what the reader is
  // looking at: the first line in view stays where it was. A line that went (its parent
  // closed) leaves the place to the first line after it that remains.
  const anchoring = Boolean(expansion);
  useEffect(() => {
    const scroller = scrollRef.current;
    if (!anchoring || !scroller) return;
    const note = () => {
      const { scrollTop } = scroller;
      const first =
        scrollTop > 0
          ? virtualizerRef.current?.getVirtualItemForOffset(scrollTop)
          : undefined;
      anchor.current = first
        ? { key: first.key, offset: first.start - scrollTop }
        : null;
    };
    scroller.addEventListener("scroll", note, { passive: true });
    return () => scroller.removeEventListener("scroll", note);
  }, [anchoring, scrollRef, virtualizerRef]);
  useLayoutEffect(() => {
    if (!anchoring) return;
    const before = laidOut.current;
    if (before.items === items && before.sizes === sizeVersion.current) return;
    laidOut.current = { items, sizes: sizeVersion.current };
    const place = anchor.current;
    const scroller = scrollRef.current;
    if (!place || !scroller || !items) return;
    const indexes = new Map(items.map((line, index) => [lineKeyOf(line), index]));
    const previous = before.items ?? [];
    let index = indexes.get(place.key as string);
    if (index === undefined) {
      const gone = previous.findIndex((line) => lineKeyOf(line) === place.key);
      for (let at = gone + 1; gone >= 0 && at < previous.length; at++) {
        const key = lineKeyOf(previous[at]!);
        index = indexes.get(key);
        if (index === undefined) continue;
        place.key = key;
        break;
      }
    }
    if (index === undefined) return;
    virtualizer.getTotalSize();
    const start = virtualizer.measurementsCache[index]?.start;
    if (start === undefined) return;
    const scrollTop = start - place.offset;
    if (Math.abs(scroller.scrollTop - scrollTop) >= 1)
      scroller.scrollTop = scrollTop;
  });

  const virtualItems = virtualizer.getVirtualItems();
  return wrapContainer(
    <div
      {...containerProps}
      role="rowgroup"
      className="fa-dt-rows"
      style={{ height: virtualizer.getTotalSize() }}
    >
      {virtualItems.map((virtual) => {
        if (renderTail && virtual.index === lineCount)
          return (
            <Fragment key="\u0000tail">
              {renderTail({ index: virtual.index, top: virtual.start })}
            </Fragment>
          );
        const item = items?.[virtual.index];
        if (item?.kind === "group" || item?.kind === "more") {
          return (
            <GroupLine
              key={item.key}
              item={item}
              index={virtual.index}
              ariaRowIndex={firstRowIndex + virtual.index}
              top={virtual.start}
              active={virtual.index === activeIndex}
              colSpan={colSpan}
              noun={noun}
              controller={controller}
              treegridGroups={expansion?.treegrid ? expansion.groupCount : undefined}
            />
          );
        }
        if (item && item.kind !== "row" && expansion)
          return (
            <Fragment key={item.key}>
              {expansion.renderLine(item, {
                index: virtual.index,
                top: virtual.start,
                measureRef: virtualizer.measureElement,
              })}
            </Fragment>
          );
        if (item && item.kind !== "row") return null;
        const row = item ? item.row : rows[virtual.index];
        if (!row) return null;
        const next = rowAt(virtual.index + 1);
        return (
          <DataRow<T>
            key={row.id}
            row={row}
            original={row.original}
            rowId={row.id}
            index={virtual.index}
            ariaRowIndex={firstRowIndex + virtual.index}
            top={virtual.start}
            columns={columns}
            hidden={hidden}
            selectable={selectable}
            selected={selection[row.id] === true}
            active={virtual.index === activeIndex}
            expanded={isExpanded(row)}
            label={getLabel(row.original)}
            controller={controller}
            grip={gripOf?.(row)}
            selectedNext={next ? selection[next.id] === true : false}
            revision={revision}
            {...(item ? expansion?.rowProps(item) : undefined)}
          />
        );
      })}
    </div>,
  );
}

/* ── Placeholders ──────────────────────────────────────────────────────────────── */

const SKELETON_WIDTHS = ["72%", "54%", "86%", "63%", "78%", "47%"];

export function CellPlaceholder({
  kind,
  seed,
}: {
  kind: CellSkeleton;
  seed: number;
}) {
  const width = SKELETON_WIDTHS[seed % SKELETON_WIDTHS.length];
  switch (kind) {
    case "none":
      return null;
    case "identity":
      return <EntityIdentitySkeleton tier="row" />;
    case "badge":
      return <Skeleton.Block className="fa-dt-skel-badge" radius="full" />;
    case "sparkline":
      return <Skeleton.Block className="fa-dt-skel-spark" radius="item" />;
    case "number":
      return (
        <Skeleton.Text type="body" width="48%" className="fa-dt-skel-end" />
      );
    case "time":
      return <Skeleton.Text type="body" width="58%" />;
    default:
      return <Skeleton.Text type="body" width={width} />;
  }
}

/** Skeleton rows in the exact row box (R9.3, R16.4). */
export function SkeletonRows({
  count,
  columns,
  selectable,
  grip = false,
}: {
  /** Item count shown by the component. */
  count: number;
  /** Typed column definitions, including rendering, sorting, priorities and filters. */
  columns: readonly ColumnInfo[];
  selectable: boolean;
  /** Reserve the reorder grip column. */
  grip?: boolean;
}) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <SkeletonRow
          key={index}
          seed={index}
          top={`calc(var(--_row-h) * ${index})`}
          columns={columns}
          selectable={selectable}
          grip={grip}
        />
      ))}
    </>
  );
}

/** One skeleton row at `top` (a CSS length), in the exact row box. */
export function SkeletonRow({
  seed,
  top,
  columns,
  selectable,
  grip = false,
  className,
  ref,
  expanderColumn,
}: {
  /** Varies the placeholder widths. */
  seed: number;
  top: string;
  /** Typed column definitions, including rendering, sorting, priorities and filters. */
  columns: readonly ColumnInfo[];
  selectable: boolean;
  /** Reserve the reorder grip column. */
  grip?: boolean;
  className?: string;
  ref?: Ref<HTMLDivElement>;
  /** The column that holds the expander: its content starts after the indent. */
  expanderColumn?: string;
}) {
  return (
    <div
      ref={ref}
      className={cx("fa-dt-row fa-dt-skel-row", className)}
      aria-hidden
      style={{ transform: `translateY(${top})` }}
    >
      {grip ? <div className="fa-dt-cell fa-dt-grip" /> : null}
      {selectable ? (
        <div className="fa-dt-cell fa-dt-select">
          <Skeleton.Block className="fa-dt-skel-check" radius="check" />
        </div>
      ) : null}
      {columns.map((column, columnIndex) => (
        <div
          key={column.id}
          className="fa-dt-cell"
          data-col={column.key}
          data-align={column.meta.align}
          data-pinned={column.pinned ? "" : undefined}
          data-edge={column.edge ? "" : undefined}
          data-expander={column.id === expanderColumn ? "" : undefined}
          style={column.style}
        >
          {column.id === expanderColumn ? (
            <span className="fa-dt-expander" data-spacer="" />
          ) : null}
          <CellPlaceholder
            kind={column.meta.skeleton}
            seed={seed + columnIndex * 3}
          />
        </div>
      ))}
      <div className="fa-dt-cell fa-dt-trail" />
    </div>
  );
}

/** Empty and error states: one line in the body's own box, never pushing anything (R9.1). */
export function BodyMessage({
  tone,
  children,
  action,
}: {
  tone: "empty" | "error";
  children: ReactNode;
  /** Trailing action for a notice or result. */
  action?: ReactNode;
}) {
  return (
    <div role="row" className="fa-dt-message-row">
      <div role="gridcell" className="fa-dt-message" data-tone={tone}>
        {tone === "error" ? <IconAlert className="fa-dt-message-icon" /> : null}
        <span className="fa-dt-message-text">{children}</span>
        {action ? <span className="fa-dt-message-action">{action}</span> : null}
      </div>
    </div>
  );
}

export function RetryButton({ onRetry }: { onRetry: () => void }) {
  const m = useDataTableMessages();
  return (
    <Button size="sm" onClick={onRetry}>
      {m.retry}
    </Button>
  );
}
