import type { RowData } from "@tanstack/react-table"
import type { Row, RowSelectionState } from "@tanstack/react-table"
import { defaultRangeExtractor, useVirtualizer, type Virtualizer } from "@tanstack/react-virtual"
import { useCallback, useLayoutEffect, type HTMLAttributes, type ReactElement, type ReactNode, type RefObject } from "react"
import { IconAlert } from "../../icons/generated/icons.js"
import { Button } from "../button/index.js"
import { EntityIdentitySkeleton } from "../entity/index.js"
import { Skeleton } from "../skeleton/index.js"
import type { CellSkeleton, DataTableFeatures } from "./features.js"
import { GroupLine } from "./group-rows.js"
import type { GroupedItem } from "./grouping.js"
import { DataRow, type ColumnInfo, type RowController } from "./row.js"
import type { DataTableNoun } from "./types.js"

export interface VirtualRowsProps<T extends RowData> {
  /** Records or matrix rows in display order. */
  rows: readonly Row<DataTableFeatures, T>[]
  /**
   * Grouped tables: the body in display order (group headers, rows, "Show more" lines). Each
   * line is one row tall; indexes, keyboard focus and aria-rowindex count every line.
   */
  items?: readonly GroupedItem<Row<DataTableFeatures, T>>[] | null
  scrollRef: RefObject<HTMLDivElement | null>
  virtualizerRef: RefObject<Virtualizer<HTMLDivElement, Element> | null>
  /** Typed column definitions, including rendering, sorting, priorities and filters. */
  columns: readonly ColumnInfo[]
  /** Keeps the item out of the visible layout. */
  hidden: readonly ColumnInfo[]
  selection: RowSelectionState
  selectable: boolean
  activeIndex: number
  expanded: ReadonlySet<string>
  expandAll: boolean
  rowHeight: number
  detailHeight: number
  /** aria-rowindex of the first body row (header is 1). */
  firstRowIndex: number
  /** Render every row (auto-height tables). */
  renderAll: boolean
  controller: RowController
  getLabel: (row: T) => string
  /** Grouped tables: what a group header's count counts ("8 devices"). */
  noun: DataTableNoun
  /** Cells a group line spans. */
  colSpan: number
  /** Props for the rowgroup element (delegated pointer handlers live here). */
  containerProps: HTMLAttributes<HTMLDivElement>
  /** Wrap the rowgroup (the context-menu trigger renders it). */
  wrapContainer: (element: ReactElement) => ReactElement
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
}: VirtualRowsProps<T>) {
  const isExpanded = useCallback(
    (row: Row<DataTableFeatures, T> | undefined) => Boolean(row && hidden.length && (expandAll || expanded.has(row.id))),
    [expandAll, expanded, hidden.length]
  )
  const count = items ? items.length : rows.length
  const rowAt = (index: number): Row<DataTableFeatures, T> | undefined => {
    if (!items) return rows[index]
    const item = items[index]
    return item?.kind === "row" ? item.row : undefined
  }
  const keyAt = (index: number) => {
    if (!items) return rows[index]?.id ?? index
    const item = items[index]
    if (!item) return index
    return item.kind === "row" ? item.row.id : item.key
  }
  // oxlint-disable-next-line react/incompatible-library -- TanStack Virtual is the table's virtualizer (R16); rows are memoised by data identity, not by the compiler
  const virtualizer = useVirtualizer<HTMLDivElement, Element>({
    count,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => rowHeight + (isExpanded(rowAt(index)) ? detailHeight : 0),
    getItemKey: keyAt,
    overscan: renderAll ? count : 6,
    initialRect: { width: 0, height: renderAll ? count * rowHeight : 0 },
    rangeExtractor: (range) => {
      const indexes = defaultRangeExtractor(range)
      if (activeIndex >= 0 && activeIndex < count && !indexes.includes(activeIndex)) {
        indexes.push(activeIndex)
        indexes.sort((a, b) => a - b)
      }
      return indexes
    },
  })
  virtualizerRef.current = virtualizer

  // Heights change with density, expansion and the grouped lines; re-measure in the same frame.
  useLayoutEffect(() => {
    virtualizer.measure()
  }, [virtualizer, rowHeight, detailHeight, expandAll, expanded, hidden.length, items])

  const virtualItems = virtualizer.getVirtualItems()
  return wrapContainer(
    <div {...containerProps} role="rowgroup" className="fa-dt-rows" style={{ height: virtualizer.getTotalSize() }}>
      {virtualItems.map((virtual) => {
        const item = items?.[virtual.index]
        if (item && item.kind !== "row") {
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
            />
          )
        }
        const row = item ? item.row : rows[virtual.index]
        if (!row) return null
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
          />
        )
      })}
    </div>
  )
}

/* ── Placeholders ──────────────────────────────────────────────────────────────── */

const SKELETON_WIDTHS = ["72%", "54%", "86%", "63%", "78%", "47%"]

export function CellPlaceholder({ kind, seed }: { kind: CellSkeleton; seed: number }) {
  const width = SKELETON_WIDTHS[seed % SKELETON_WIDTHS.length]
  switch (kind) {
    case "none":
      return null
    case "identity":
      return <EntityIdentitySkeleton tier="row" />
    case "badge":
      return <Skeleton.Block className="fa-dt-skel-badge" radius="full" />
    case "sparkline":
      return <Skeleton.Block className="fa-dt-skel-spark" radius="item" />
    case "number":
      return <Skeleton.Text type="body" width="48%" className="fa-dt-skel-end" />
    case "time":
      return <Skeleton.Text type="body" width="58%" />
    default:
      return <Skeleton.Text type="body" width={width} />
  }
}

/** Skeleton rows in the exact row box (R9.3, R16.4). */
export function SkeletonRows({ count, columns, selectable }: { count: number; columns: readonly ColumnInfo[]; selectable: boolean }) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="fa-dt-row fa-dt-skel-row"
          aria-hidden
          style={{ transform: `translateY(calc(var(--_row-h) * ${index}))` }}
        >
          {selectable ? (
            <div className="fa-dt-cell fa-dt-select">
              <Skeleton.Block className="fa-dt-skel-check" radius="check" />
            </div>
          ) : null}
          {columns.map((column, columnIndex) => (
            <div key={column.id} className="fa-dt-cell" data-col={column.key} data-align={column.meta.align} data-pinned={column.pinned ? "" : undefined} data-edge={column.edge ? "" : undefined} style={column.style}>
              <CellPlaceholder kind={column.meta.skeleton} seed={index + columnIndex * 3} />
            </div>
          ))}
          <div className="fa-dt-cell fa-dt-trail" />
        </div>
      ))}
    </>
  )
}

/** Empty and error states: one line in the body's own box, never pushing anything (R9.1). */
export function BodyMessage({
  tone,
  children,
  action,
}: {
  tone: "empty" | "error"
  children: ReactNode
  /** Trailing action for a notice or result. */
  action?: ReactNode
}) {
  return (
    <div role="row" className="fa-dt-message-row">
      <div role="gridcell" className="fa-dt-message" data-tone={tone}>
        {tone === "error" ? <IconAlert className="fa-dt-message-icon" /> : null}
        <span className="fa-dt-message-text">{children}</span>
        {action ? <span className="fa-dt-message-action">{action}</span> : null}
      </div>
    </div>
  )
}

export function RetryButton({ onRetry }: { onRetry: () => void }) {
  return (
    <Button size="sm" onClick={onRetry}>
      Retry
    </Button>
  )
}
