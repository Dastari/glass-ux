import { useCallback, useLayoutEffect, useMemo, useReducer, useRef, useState, type CSSProperties, type Key, type ReactNode } from "react"
import { cx } from "../../lib/cx.js"
import { observeElementSizes, type ElementSizeGroup } from "../../lib/resize-observer.js"
import type { GridMin, LayoutGap } from "../layout/layout.js"
import { layoutMasonry } from "./layout.js"

const useIsomorphicLayoutEffect = typeof window === "undefined" ? () => {} : useLayoutEffect

const NAMED_MIN = new Set<string>(["xs", "sm", "md", "lg", "xl"])
/** A spacing role (`--gap-tiles`) or a step on the space scale (`--space-3`), as Stack and Grid read it. */
const gapValue = (gap: LayoutGap) =>
  gap === "none" ? "0" : typeof gap === "number" ? `var(--space-${String(gap).replace(".", "-")})` : gap === "half" ? "var(--space-half)" : `var(--gap-${gap})`

export interface MasonryProps<T> {
  /** The items, in reading order. Appending items never moves the ones before them. */
  items: readonly T[]
  /** Draws one item. It fills the item's box, whose width is the column's and whose height follows `getRatio`. */
  renderItem: (item: T, index: number) => ReactNode
  /** A stable key for an item. Default the index, which is right for a list that only grows at the end. */
  getKey?: (item: T, index: number) => Key
  /**
   * An item's width divided by its height, known before it loads: a picture's pixel size, a video's
   * shape. The item's box is reserved from it, so nothing moves as pictures arrive. An item without
   * one (return `undefined`) is measured after it renders and moves the items after it in its
   * column once its height settles.
   */
  getRatio?: (item: T, index: number) => number | undefined
  /** The narrowest a column may be: a named width (`xs` 8rem … `xl` 24rem, as Grid) or any CSS length. As many columns as fit are used. Default `md`. */
  columnWidth?: GridMin | (string & {})
  /** A fixed number of columns, instead of as many as `columnWidth` allows. */
  columns?: number
  /** The most columns to use. */
  maxColumns?: number
  /** The room between items, a spacing role or a step on the space scale. Default `tiles`. */
  gap?: LayoutGap
  /** Names the list. */
  "aria-label"?: string
  /** Names the list by another element, such as a heading. */
  "aria-labelledby"?: string
  /** Layout only. */
  className?: string
}

interface Measure {
  width: number
  min: number
  gap: number
}

/**
 * Items of different heights in columns, laid out from the box's width. Every item goes to the
 * shortest column so far, so the columns stay level without the content reflowing, and the order
 * of the items is the order of reading: each item's top is at or below the one before it, and
 * level only further along the row. Tab follows the DOM, which is that order, so focus never
 * jumps between columns. (CSS `columns` fills a column at a time and breaks exactly this.)
 *
 * With a ratio for each item, the layout is arithmetic from the width and the ratios, with no
 * measuring of pictures: nothing moves while they load and the items before an appended one never
 * move. It renders every item: for a very long list load it in pages, or place the items yourself
 * with `layoutMasonry` and render only those near the viewport. The first render has no width
 * to lay out from, so on the server the items are present and hidden until the browser measures.
 *
 * Right to left starts the columns at the right. Items are `li` in a list, so put a name on it.
 *
 * @example
 * <Masonry items={photos} getRatio={(photo) => photo.width / photo.height} renderItem={(photo) => <Image src={photo.src} alt={photo.alt} ratio={photo.width / photo.height} />} />
 */
export function Masonry<T>({
  items,
  renderItem,
  getKey,
  getRatio,
  columnWidth = "md",
  columns,
  maxColumns,
  gap = "tiles",
  "aria-label": ariaLabel,
  "aria-labelledby": labelledBy,
  className,
}: MasonryProps<T>) {
  const root = useRef<HTMLDivElement>(null)
  const probe = useRef<HTMLSpanElement>(null)
  const [measure, setMeasure] = useState<Measure>({ width: 0, min: 0, gap: 0 })
  // Heights of the items that have no ratio, read from the boxes after they render.
  const measured = useRef(new Map<number, number>())
  const elements = useRef(new Map<number, HTMLElement>())
  const group = useRef<ElementSizeGroup | null>(null)
  const [version, refresh] = useReducer((count: number) => count + 1, 0)

  const read = useCallback(() => {
    const element = root.current
    const sample = probe.current
    if (!element || !sample) return
    const next = { width: element.getBoundingClientRect().width, min: sample.getBoundingClientRect().width, gap: sample.getBoundingClientRect().height }
    setMeasure((current) => (current.width === next.width && current.min === next.min && current.gap === next.gap ? current : next))
    let changed = false
    for (const [index, item] of elements.current) {
      const height = item.getBoundingClientRect().height
      if (measured.current.get(index) !== height) {
        measured.current.set(index, height)
        changed = true
      }
    }
    if (changed) refresh()
  }, [])

  useIsomorphicLayoutEffect(() => {
    const observer = observeElementSizes(read)
    group.current = observer
    if (root.current) observer.observe(root.current)
    if (probe.current) observer.observe(probe.current)
    for (const item of elements.current.values()) observer.observe(item)
    read()
    return () => {
      observer.disconnect()
      group.current = null
    }
  }, [read])

  const ratios = useMemo(() => items.map((item, index) => getRatio?.(item, index)), [items, getRatio])
  const layout = useMemo(
    () =>
      layoutMasonry(items.length, { width: measure.width, gap: measure.gap, minColumnWidth: measure.min, columns, maxColumns }, (index, width) => {
        const ratio = ratios[index]
        // An item without a ratio takes its last measured height, or a square until it is measured.
        return ratio && ratio > 0 ? width / ratio : (measured.current.get(index) ?? width)
      }),
    // `version` stands for the measured heights, which live in a ref.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
    [items.length, ratios, measure, columns, maxColumns, version],
  )

  // The items with no ratio are watched: they are the ones whose height is only known once they render.
  useIsomorphicLayoutEffect(() => {
    const watched = new Map<number, HTMLElement>()
    for (const element of root.current?.querySelectorAll<HTMLElement>(".fa-masonry-item:not([data-fixed])") ?? []) watched.set(Number(element.dataset.index), element)
    for (const [index, element] of elements.current) {
      if (watched.get(index) === element) continue
      group.current?.unobserve(element)
      measured.current.delete(index)
    }
    for (const [index, element] of watched) if (elements.current.get(index) !== element) group.current?.observe(element)
    elements.current = watched
    read()
  }, [items, ratios, read])

  const min = typeof columnWidth === "string" && NAMED_MIN.has(columnWidth) ? `var(--_${columnWidth})` : columnWidth
  return (
    <div
      ref={root}
      className={cx("fa-masonry", className)}
      data-ready={layout.columns ? "" : undefined}
      style={{ "--_min": min, "--_gap": gapValue(gap) } as CSSProperties}
    >
      {/* oxlint-disable-next-line jsx-a11y/no-redundant-roles -- list-style: none drops the list role in Safari */}
      <ul className="fa-masonry-list" role="list" aria-label={ariaLabel} aria-labelledby={labelledBy} style={{ blockSize: layout.height }}>
        {items.map((item, index) => {
          const place = layout.placements[index]
          const fixed = ratios[index] !== undefined
          return (
            <li
              key={getKey ? getKey(item, index) : index}
              className="fa-masonry-item"
              data-index={index}
              data-column={place?.column}
              data-fixed={fixed ? "" : undefined}
              style={
                place
                  ? { insetInlineStart: place.x, insetBlockStart: place.y, inlineSize: place.width, blockSize: fixed ? place.height : undefined }
                  : undefined
              }
            >
              {renderItem(item, index)}
            </li>
          )
        })}
      </ul>
      <span ref={probe} className="fa-masonry-probe" aria-hidden />
    </div>
  )
}
