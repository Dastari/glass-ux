import {
  defaultRangeExtractor,
  useVirtualizer,
  type Range,
} from "@tanstack/react-virtual";
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type Key,
  type ReactNode,
  type Ref,
} from "react";
import { cx } from "../../lib/cx.js";
import { useControllable } from "../../lib/use-controllable.js";

/** Scroll position options supported by VirtualList. */
export interface VirtualListScrollOptions {
  /** Which part of the viewport receives the row; auto uses the nearest edge. */
  align?: "auto" | "start" | "center" | "end";
  /** Instant scrolling by default. Smooth scrolling is unsuitable for dynamically measured rows. */
  behavior?: "auto" | "smooth";
}

/** Imperative access to a virtual list's scroll position. */
export interface VirtualListHandle {
  /** Scroll to a zero-based item index. Out-of-range indices are clamped. */
  scrollToIndex: (index: number, options?: VirtualListScrollOptions) => void;
}

/** A measured, virtualised collection with stable item identities. */
export interface VirtualListProps<T> extends Omit<
  ComponentProps<"div">,
  "children" | "ref" | "role"
> {
  /** Loaded items, in display order. */
  items: readonly T[];
  /** Stable identity for focus retention and React reconciliation. */
  getKey: (item: T, index: number) => Key;
  /** Initial row height in CSS pixels, or a function of item and index. Rows are measured after rendering. */
  estimateSize: number | ((item: T, index: number) => number);
  /** Row content. List mode may contain interactive controls; listbox mode should contain presentation content only. */
  renderItem: (item: T, index: number) => ReactNode;
  /** Extra rows rendered beyond each edge; defaults to 5. */
  overscan?: number;
  /** Called once for each loaded end identity when the visible range approaches it. */
  onEndReached?: () => void;
  /** Number of remaining rows that triggers onEndReached; defaults to 5. */
  endReachedThreshold?: number;
  /** Loading row after the items. While present, onEndReached is paused. */
  loading?: ReactNode;
  /** Content shown when there are no items and no loading row. */
  empty?: ReactNode;
  /** List semantics by default; listbox adds single selection and arrow/Home/End navigation. */
  role?: "list" | "listbox";
  /** Controlled single selection in listbox mode. */
  selectedKey?: Key | null;
  /** Initial single selection in listbox mode. */
  defaultSelectedKey?: Key | null;
  /** Called when a listbox option is selected with pointer, Enter or Space. */
  onSelectedKeyChange?: (key: Key | null) => void;
  /** Receives scrollToIndex. */
  ref?: Ref<VirtualListHandle>;
}

/**
 * Render large collections in a bounded container or inside ScrollArea. Only visible rows,
 * overscan and the currently focused row stay mounted. Give the parent a definite height.
 * Listbox mode uses roving focus; selection follows activation rather than scrolling.
 */
export function VirtualList<T>({
  items,
  getKey,
  estimateSize,
  renderItem,
  overscan = 5,
  onEndReached,
  endReachedThreshold = 5,
  loading,
  empty,
  role = "list",
  selectedKey,
  defaultSelectedKey = null,
  onSelectedKeyChange,
  ref,
  className,
  onFocusCapture,
  onBlurCapture,
  onKeyDown,
  ...props
}: VirtualListProps<T>) {
  const root = useRef<HTMLDivElement>(null);
  const [external, setExternal] = useState<HTMLElement | null>(null);
  const [margin, setMargin] = useState(0);
  const [focused, setFocused] = useState<Key | null>(null);
  const [selected, select] = useControllable(
    selectedKey,
    defaultSelectedKey,
    onSelectedKeyChange,
  );
  const pendingFocus = useRef(false);
  const keys = useMemo(() => items.map(getKey), [items, getKey]);
  const focusedIndex = focused === null ? -1 : keys.indexOf(focused);
  const rangeExtractor = useCallback(
    (range: Range) => {
      const indices = defaultRangeExtractor(range);
      if (focusedIndex >= 0 && !indices.includes(focusedIndex))
        indices.push(focusedIndex);
      return indices.sort((a, b) => a - b);
    },
    [focusedIndex],
  );
  useLayoutEffect(() => {
    const viewport =
      root.current?.parentElement?.closest<HTMLElement>(
        ".fa-scroll-viewport[data-scroll-container]",
      ) ?? null;
    setExternal(viewport);
    if (!viewport || !root.current) return;
    const measure = () =>
      setMargin(
        root.current!.getBoundingClientRect().top -
          viewport.getBoundingClientRect().top +
          viewport.scrollTop,
      );
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => external ?? root.current,
    getItemKey: (index) => keys[index]!,
    estimateSize: (index) =>
      typeof estimateSize === "number"
        ? estimateSize
        : estimateSize(items[index]!, index),
    overscan,
    rangeExtractor,
    scrollMargin: margin,
  });
  useImperativeHandle(
    ref,
    () => ({
      scrollToIndex: (index, options) => {
        if (items.length)
          virtualizer.scrollToIndex(
            Math.max(0, Math.min(items.length - 1, index)),
            options,
          );
      },
    }),
    [virtualizer, items.length],
  );
  useLayoutEffect(() => {
    if (!pendingFocus.current) return;
    const target = root.current?.querySelector<HTMLElement>(
      `[data-virtual-index="${focusedIndex}"]`,
    );
    if (target) {
      target.focus({ preventScroll: true });
      pendingFocus.current = false;
    }
  });
  const end = virtualizer.range?.endIndex ?? -1;
  const notified = useRef<{ length: number; key: Key | undefined } | null>(
    null,
  );
  useEffect(() => {
    if (!items.length) {
      notified.current = null;
      return;
    }
    if (
      loading ||
      !onEndReached ||
      end < items.length - 1 - Math.max(0, endReachedThreshold)
    )
      return;
    const key = keys.at(-1);
    if (
      notified.current?.length === items.length &&
      notified.current.key === key
    )
      return;
    notified.current = { length: items.length, key };
    onEndReached();
  }, [end, items.length, keys, loading, onEndReached, endReachedThreshold]);
  const virtualRows = virtualizer.getVirtualItems();
  const preferredTabKey = focused ?? selected;
  const tabKey = virtualRows.some((row) => row.key === preferredTabKey)
    ? preferredTabKey
    : virtualRows[0]?.key;
  return (
    <div
      {...props}
      ref={root}
      className={cx("fa-virtual-list", className)}
      data-external-scroll={external ? "" : undefined}
      role={role}
      tabIndex={role === "listbox" && items.length ? -1 : 0}
      aria-busy={loading ? true : undefined}
      onFocusCapture={(event) => {
        const row = (event.target as HTMLElement).closest<HTMLElement>(
          "[data-virtual-index]",
        );
        if (row) setFocused(keys[Number(row.dataset.virtualIndex)] ?? null);
        onFocusCapture?.(event);
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setFocused(null);
        onBlurCapture?.(event);
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (
          event.defaultPrevented ||
          role !== "listbox" ||
          !items.length ||
          event.altKey ||
          event.ctrlKey ||
          event.metaKey
        )
          return;
        const currentRow = (event.target as HTMLElement).closest<HTMLElement>(
          "[data-virtual-index]",
        );
        const currentIndex = currentRow
          ? Number(currentRow.dataset.virtualIndex)
          : focusedIndex;
        let next: number | undefined;
        if (event.key === "ArrowDown")
          next = Math.min(items.length - 1, currentIndex + 1);
        if (event.key === "ArrowUp") next = Math.max(0, currentIndex - 1);
        if (event.key === "Home") next = 0;
        if (event.key === "End") next = items.length - 1;
        if (next !== undefined) {
          event.preventDefault();
          pendingFocus.current = true;
          setFocused(keys[next]!);
          virtualizer.scrollToIndex(next);
        } else if (
          (event.key === "Enter" || event.key === " ") &&
          currentIndex >= 0
        ) {
          event.preventDefault();
          select(keys[currentIndex]!);
        }
      }}
    >
      <div
        className="fa-virtual-list-content"
        role="presentation"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualRows.map((row) => (
          <div
            key={row.key}
            ref={virtualizer.measureElement}
            data-index={row.index}
            data-virtual-index={row.index}
            className="fa-virtual-list-row"
            role={role === "listbox" ? "option" : "listitem"}
            aria-setsize={items.length}
            aria-posinset={row.index + 1}
            aria-selected={
              role === "listbox" ? selected === row.key : undefined
            }
            tabIndex={
              role === "listbox" ? (tabKey === row.key ? 0 : -1) : undefined
            }
            onClick={role === "listbox" ? () => select(row.key) : undefined}
            style={{ transform: `translateY(${row.start - margin}px)` }}
          >
            {renderItem(items[row.index]!, row.index)}
          </div>
        ))}
      </div>
      {loading ? (
        <div role={role === "listbox" ? "presentation" : "listitem"}>
          {loading}
        </div>
      ) : !items.length ? (
        <div role={role === "listbox" ? "presentation" : "listitem"}>
          {empty}
        </div>
      ) : null}
    </div>
  );
}
