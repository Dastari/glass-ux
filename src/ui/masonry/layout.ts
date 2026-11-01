/** What decides the columns: the box's width, the room between them and the narrowest a column may be. */
export interface MasonryLayoutOptions {
  /** The box's inline size in px. Zero lays nothing out. */
  width: number
  /** The room between columns, and between items in a column, in px. */
  gap: number
  /** The narrowest a column may be, in px. As many columns as fit are used. */
  minColumnWidth: number
  /** A fixed number of columns, which wins over `minColumnWidth`. */
  columns?: number
  /** The most columns to use. */
  maxColumns?: number
}

/** Where one item goes. Positions are from the start of the reading direction (the right in right-to-left) and from the top. */
export interface MasonryPlacement {
  /** The column, counted from the reading start. */
  column: number
  /** Distance from the reading start edge, in px. */
  x: number
  /** Distance from the top, in px. */
  y: number
  /** The column's width, in px. */
  width: number
  /** The item's height, in px. */
  height: number
}

export interface MasonryLayout {
  columns: number
  /** Each column's width, in px. */
  columnWidth: number
  /** The items' places, in the items' order. */
  placements: MasonryPlacement[]
  /** The height of the tallest column, in px. */
  height: number
}

/** How many columns fit: as many as `minColumnWidth` allows, within `columns` or `maxColumns`. */
export function masonryColumns({ width, gap, minColumnWidth, columns, maxColumns }: MasonryLayoutOptions): number {
  if (!(width > 0)) return 0
  const wanted = columns ?? Math.floor((width + gap) / (Math.max(1, minColumnWidth) + gap))
  return Math.max(1, Math.min(Math.floor(wanted), maxColumns ?? Infinity))
}

/**
 * Places `count` items in columns: each goes to the shortest column, the one nearest the reading
 * start when columns are as short as each other. Because every item goes where the columns are
 * shortest so far, the tops never go back up as the items go on: item *n*'s top is at or below
 * item *n − 1*'s, and level with it only when it sits further along the row. The order of the
 * items is therefore the order of reading, which is the order Tab follows, with no `order` or
 * reordered DOM.
 *
 * `heightOf(index, columnWidth)` is the item's height in px at that column width: from a known
 * ratio, so nothing moves as pictures load, or a measured or estimated figure. Appending items
 * never moves the earlier ones; the placement is pure arithmetic, so a host that windows a long
 * list can run it for all the items and render only those near the viewport.
 */
export function layoutMasonry(count: number, options: MasonryLayoutOptions, heightOf: (index: number, columnWidth: number) => number): MasonryLayout {
  const columns = masonryColumns(options)
  if (!columns) return { columns: 0, columnWidth: 0, placements: [], height: 0 }
  const gap = options.gap
  const columnWidth = (options.width - gap * (columns - 1)) / columns
  const bottoms = Array.from({ length: columns }, () => 0)
  const placements: MasonryPlacement[] = []
  for (let index = 0; index < count; index++) {
    let column = 0
    for (let candidate = 1; candidate < columns; candidate++) if (bottoms[candidate]! < bottoms[column]!) column = candidate
    const y = bottoms[column]!
    const height = Math.max(0, heightOf(index, columnWidth))
    placements.push({ column, x: column * (columnWidth + gap), y, width: columnWidth, height })
    bottoms[column] = y + height + gap
  }
  // Every item is followed by a gap; the box ends at the last item.
  const height = count ? Math.max(...bottoms) - gap : 0
  return { columns, columnWidth, placements, height }
}
