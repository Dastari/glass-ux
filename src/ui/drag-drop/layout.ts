/**
 * Geometry for sortable drop zones: where the items of a zone sit while an item is lifted out
 * of it or carried into it, and which slot the carried item is over. Pure and unit-tested; the
 * manager measures the boxes once per drag and moves the items with `translate`.
 *
 * Boxes are in the zone's content coordinates (px from the zone's border box, plus its own
 * scroll offset), so scrolling during a drag does not invalidate them.
 */

/** How a sortable zone lays out its items. */
export type DropZoneSort = "vertical" | "horizontal" | "grid"

/** A layout box in px. */
export interface Box {
  x: number
  y: number
  w: number
  h: number
}

/** A displacement in px. */
export interface Shift {
  x: number
  y: number
}

/** Where a zone's items go for one arrangement, and the slot the carried item lands in. */
export interface Arrangement {
  /** One shift per measured item, in the measured order. */
  shifts: Shift[]
  /** The landing slot, or null when the carried item is not in this zone. */
  slot: Box | null
}

/** The input to {@link arrange}. */
export interface ArrangeInput {
  sort: DropZoneSort
  /** Every item of the zone in document order, measured before anything moved. */
  boxes: readonly Box[]
  /** The index (in `boxes`) of the carried item when it came from this zone and left a gap. */
  removed: number | null
  /** The insertion index among the remaining items, or null when the item is elsewhere. */
  insert: number | null
  /** The carried item's size. */
  size: { w: number; h: number }
  /** Space between consecutive items along the main axis (px). */
  gap: number
  /** Space between rows of a grid (px). */
  rowGap: number
  /** Where the first item starts when the zone is empty (its content box start). */
  origin: { x: number; y: number }
  /** Right-to-left: horizontal lists flow from the right edge. */
  rtl?: boolean
}

const ZERO: Shift = { x: 0, y: 0 }
const round = (value: number) => Math.round(value * 100) / 100

/**
 * Lay the items of a zone out with the carried item removed from `removed` and a gap of its
 * size opened at `insert`. Lists flow item after item, so items of different sizes close up
 * correctly; grids move each item into the cell of its new position (uniform cells).
 */
export function arrange(input: ArrangeInput): Arrangement {
  return input.sort === "grid" ? arrangeGrid(input) : arrangeList(input)
}

function arrangeList({ sort, boxes, removed, insert, size, gap, origin, rtl }: ArrangeInput): Arrangement {
  const vertical = sort === "vertical"
  const shifts: Shift[] = boxes.map(() => ZERO)
  if (removed === null && insert === null) return { shifts, slot: null }
  const main = (box: Box) => (vertical ? box.h : box.w)
  // The flow starts where the first item (carried or not) started.
  const first = boxes[0]
  const reverse = !vertical && rtl
  let cursor = first ? (vertical ? first.y : reverse ? first.x + first.w : first.x) : vertical ? origin.y : origin.x
  const cross = first ? (vertical ? first.x : first.y) : vertical ? origin.x : origin.y
  const crossSize = first ? (vertical ? first.w : first.h) : vertical ? size.w : size.h
  const order = boxes.map((_, index) => index).filter((index) => index !== removed)
  let slot: Box | null = null
  const place = (length: number) => {
    const start = reverse ? cursor - length : cursor
    cursor = reverse ? cursor - length - gap : cursor + length + gap
    return start
  }
  const openSlot = () => {
    const length = vertical ? size.h : size.w
    const start = place(length)
    slot = vertical ? { x: cross, y: start, w: crossSize, h: length } : { x: start, y: cross, w: length, h: crossSize }
  }
  order.forEach((index, position) => {
    if (position === insert) openSlot()
    const box = boxes[index] as Box
    const start = place(main(box))
    shifts[index] = vertical ? { x: 0, y: round(start - box.y) } : { x: round(start - box.x), y: 0 }
  })
  if (insert !== null && insert >= order.length) openSlot()
  return { shifts, slot }
}

/** Columns in a measured grid: the items on the first row. */
export function gridColumns(boxes: readonly Box[]) {
  const first = boxes[0]
  if (!first) return 1
  let columns = 0
  for (const box of boxes) {
    if (Math.abs(box.y - first.y) > first.h / 2) break
    columns++
  }
  return Math.max(1, columns)
}

/** The cell at position `index` of a measured grid, extrapolated past its last item. */
export function gridCell(boxes: readonly Box[], index: number, columns: number, rowGap: number, origin: { x: number; y: number }, size: { w: number; h: number }): Box {
  const known = boxes[index]
  if (known) return known
  const first = boxes[0]
  if (!first) return { x: origin.x, y: origin.y, w: size.w, h: size.h }
  const column = index % columns
  const row = Math.floor(index / columns)
  const columnBox = boxes[column] ?? first
  const rowStep = boxes[columns] ? (boxes[columns] as Box).y - first.y : first.h + rowGap
  return { x: columnBox.x, y: first.y + row * rowStep, w: first.w, h: first.h }
}

function arrangeGrid({ boxes, removed, insert, size, rowGap, origin }: ArrangeInput): Arrangement {
  const shifts: Shift[] = boxes.map(() => ZERO)
  if (removed === null && insert === null) return { shifts, slot: null }
  const columns = gridColumns(boxes)
  const cell = (index: number) => gridCell(boxes, index, columns, rowGap, origin, size)
  const order = boxes.map((_, index) => index).filter((index) => index !== removed)
  let slot: Box | null = null
  let position = 0
  order.forEach((index, at) => {
    if (at === insert) slot = cell(position++)
    const target = cell(position++)
    const box = boxes[index] as Box
    shifts[index] = { x: round(target.x - box.x), y: round(target.y - box.y) }
  })
  if (insert !== null && insert >= order.length) slot = cell(position)
  return { shifts, slot }
}

/**
 * The insertion index for a carried item whose centre is at `point`, among the zone's items
 * without the carried one. Lists pass a neighbour once the centre crosses the neighbour's
 * midpoint, measured with the gap closed, so an item swaps as soon as it is half over its
 * neighbour. Grids take the nearest cell.
 */
export function insertionIndex(sort: DropZoneSort, boxes: readonly Box[], removed: number | null, point: { x: number; y: number }, options: { gap: number; rowGap: number; origin: { x: number; y: number }; size: { w: number; h: number }; rtl?: boolean }): number {
  if (sort === "grid") {
    const count = boxes.length - (removed === null ? 0 : 1)
    const columns = gridColumns(boxes)
    let best = 0
    let distance = Infinity
    for (let index = 0; index <= count; index++) {
      const box = gridCell(boxes, index, columns, options.rowGap, options.origin, options.size)
      const d = (box.x + box.w / 2 - point.x) ** 2 + (box.y + box.h / 2 - point.y) ** 2
      if (d < distance) {
        distance = d
        best = index
      }
    }
    return best
  }
  // The remaining items with the gap closed.
  const { shifts } = arrangeList({ sort, boxes, removed, insert: null, size: options.size, gap: options.gap, rowGap: 0, origin: options.origin, rtl: options.rtl })
  const vertical = sort === "vertical"
  let index = 0
  for (const [at, box] of boxes.entries()) {
    if (at === removed) continue
    const shift = removed === null ? ZERO : (shifts[at] ?? ZERO)
    const mid = vertical ? box.y + shift.y + box.h / 2 : box.x + shift.x + box.w / 2
    const past = vertical ? point.y > mid : options.rtl ? point.x < mid : point.x > mid
    if (!past) break
    index++
  }
  return index
}

/**
 * The index a keyboard move reaches from `index` in a zone of `count` remaining items, or null
 * when the key leaves the zone (past its start or end, or across a list's axis).
 */
export function keyboardStep(sort: DropZoneSort | null, key: string, index: number, count: number, columns = 1, rtl = false): number | "previous" | "next" | null {
  const back = rtl ? "ArrowRight" : "ArrowLeft"
  const forward = rtl ? "ArrowLeft" : "ArrowRight"
  const clamp = (next: number) => Math.min(Math.max(next, 0), count)
  if (sort === null) {
    if (key === "ArrowUp" || key === back) return "previous"
    if (key === "ArrowDown" || key === forward) return "next"
    return null
  }
  if (sort === "vertical") {
    if (key === "ArrowUp") return clamp(index - 1)
    if (key === "ArrowDown") return clamp(index + 1)
    if (key === back) return "previous"
    if (key === forward) return "next"
    return null
  }
  if (sort === "horizontal") {
    if (key === back) return clamp(index - 1)
    if (key === forward) return clamp(index + 1)
    if (key === "ArrowUp") return "previous"
    if (key === "ArrowDown") return "next"
    return null
  }
  if (key === back) return clamp(index - 1)
  if (key === forward) return clamp(index + 1)
  if (key === "ArrowUp") return index - columns < 0 ? "previous" : index - columns
  if (key === "ArrowDown") return index + columns > count ? (index === count ? "next" : count) : index + columns
  return null
}

/* ── Applying a drop to host data ──────────────────────────────────────────────────── */

/**
 * Move one item of a list from `from` to `to` (the index it ends up at). Returns a new array;
 * an out-of-range index returns a copy.
 */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items]
  if (from === to || from < 0 || from >= items.length || to < 0 || to >= items.length) return next
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item as T)
  return next
}

/** Insert `item` at `index` (clamped). Returns a new array. */
export function insertItem<T>(items: readonly T[], item: T, index: number): T[] {
  const next = [...items]
  next.splice(Math.min(Math.max(index, 0), next.length), 0, item)
  return next
}

/**
 * Apply a drop between keyed lists held in one record (`{ backlog: [...], done: [...] }`):
 * the item leaves its source list (unless `copy`) and enters the target list at the drop
 * index, or at the end when the target is not sortable. Returns a new record; lists that did
 * not change keep their identity. Unknown list ids leave the record unchanged.
 */
export function applyDrop<T>(lists: Readonly<Record<string, readonly T[]>>, drop: { item: { id: string; data: unknown }; source: { zoneId: string | null; index: number | null }; target: { zoneId: string; index: number | null }; effect: "move" | "copy" }, getKey: (item: T) => string): Record<string, T[]> {
  const next: Record<string, T[]> = {}
  for (const [key, list] of Object.entries(lists)) next[key] = list as T[]
  const targetList = lists[drop.target.zoneId]
  if (!targetList) return next
  const sourceId = drop.source.zoneId
  const sourceList = sourceId === null ? undefined : lists[sourceId]
  const found = sourceList?.find((item) => getKey(item) === drop.item.id)
  const item = (found ?? drop.item.data) as T
  const at = drop.target.index ?? Number.POSITIVE_INFINITY
  if (sourceId === drop.target.zoneId && drop.effect === "move") {
    const from = targetList.findIndex((entry) => getKey(entry) === drop.item.id)
    if (from < 0) next[sourceId] = insertItem(targetList, item, at)
    else next[sourceId] = moveItem(targetList, from, Math.min(at, targetList.length - 1))
    return next
  }
  if (sourceId !== null && sourceList && drop.effect === "move") next[sourceId] = sourceList.filter((entry) => getKey(entry) !== drop.item.id)
  next[drop.target.zoneId] = insertItem(targetList, item, at)
  return next
}
