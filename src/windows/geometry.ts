import { windowsMessages } from "./messages.js"
/**
 * Window geometry: snap zones, tiling assignment and rectangle maths. Pure functions,
 * no DOM, so the store, the workspace and the tests share one definition.
 *
 * Layout is expressed as fractions of the workspace wherever possible. The workspace is a
 * size container, so a fractional rectangle becomes CSS with container units and needs no
 * measurement: it renders correctly on the first frame and follows every resize for free.
 */
import type { Rect } from "./types.js"

/** A rectangle as fractions (0–1) of the workspace. */
export interface FracRect {
  /** Horizontal coordinate or accessor. */
  x: number
  /** Vertical coordinate or accessor. */
  y: number
  w: number
  h: number
}

const THIRD = 1 / 3

/** The snap zones a window can be tiled into, each a rectangle as fractions (0–1) of the workspace. */
export const SNAP_ZONES = {
  "left-half": { x: 0, y: 0, w: 0.5, h: 1 },
  "right-half": { x: 0.5, y: 0, w: 0.5, h: 1 },
  "left-third": { x: 0, y: 0, w: THIRD, h: 1 },
  "centre-third": { x: THIRD, y: 0, w: THIRD, h: 1 },
  "right-third": { x: 2 * THIRD, y: 0, w: THIRD, h: 1 },
  "left-two-thirds": { x: 0, y: 0, w: 2 * THIRD, h: 1 },
  "right-two-thirds": { x: THIRD, y: 0, w: 2 * THIRD, h: 1 },
  "top-left": { x: 0, y: 0, w: 0.5, h: 0.5 },
  "top-right": { x: 0.5, y: 0, w: 0.5, h: 0.5 },
  "bottom-left": { x: 0, y: 0.5, w: 0.5, h: 0.5 },
  "bottom-right": { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
} as const satisfies Record<string, FracRect>

export type SnapZone = keyof typeof SNAP_ZONES

export function isSnapZone(value: unknown): value is SnapZone {
  return typeof value === "string" && Object.hasOwn(SNAP_ZONES, value)
}

/** The layouts offered in the snap bar while dragging, left to right. */
export const SNAP_LAYOUTS: ReadonlyArray<{ label: string; zones: readonly SnapZone[] }> = [
  { label: windowsMessages.defaults.snapHalves, zones: ["left-half", "right-half"] },
  { label: windowsMessages.defaults.snapThirds, zones: ["left-third", "centre-third", "right-third"] },
  { label: windowsMessages.defaults.snapTwoThirdsAndOneThird, zones: ["left-two-thirds", "right-third"] },
  { label: windowsMessages.defaults.snapQuarters, zones: ["top-left", "top-right", "bottom-left", "bottom-right"] },
]

/** English names for each snap zone, for the snap bar's accessible names and tooltips. */
export const SNAP_ZONE_LABELS: Record<SnapZone, string> = {
  "left-half": windowsMessages.defaults.snapLeftHalf,
  "right-half": windowsMessages.defaults.snapRightHalf,
  "left-third": windowsMessages.defaults.snapLeftThird,
  "centre-third": windowsMessages.defaults.snapCentreThird,
  "right-third": windowsMessages.defaults.snapRightThird,
  "left-two-thirds": windowsMessages.defaults.snapLeftTwoThirds,
  "right-two-thirds": windowsMessages.defaults.snapRightTwoThirds,
  "top-left": windowsMessages.defaults.snapTopLeftQuarter,
  "top-right": windowsMessages.defaults.snapTopRightQuarter,
  "bottom-left": windowsMessages.defaults.snapBottomLeftQuarter,
  "bottom-right": windowsMessages.defaults.snapBottomRightQuarter,
}

const EPSILON = 0.001

/**
 * CSS custom properties for a fractional rectangle. `--_g*` flags say which edges are
 * interior, so the window gives up half a panel gap there and none on the workspace edge.
 */
export function fracVars(rect: FracRect): Record<string, number> {
  return {
    "--_fx": rect.x,
    "--_fy": rect.y,
    "--_fw": rect.w,
    "--_fh": rect.h,
    "--_gl": rect.x > EPSILON ? 1 : 0,
    "--_gr": rect.x + rect.w < 1 - EPSILON ? 1 : 0,
    "--_gt": rect.y > EPSILON ? 1 : 0,
    "--_gb": rect.y + rect.h < 1 - EPSILON ? 1 : 0,
  }
}

/** Pixel rectangle of a fractional one in a workspace of the given size (mirrors the CSS). */
export function fracToRect(rect: FracRect, width: number, height: number, gap: number): Rect {
  const vars = fracVars(rect)
  const x = rect.x * width + (vars["--_gl"] ?? 0) * (gap / 2)
  const y = rect.y * height + (vars["--_gt"] ?? 0) * (gap / 2)
  const w = rect.w * width - ((vars["--_gl"] ?? 0) + (vars["--_gr"] ?? 0)) * (gap / 2)
  const h = rect.h * height - ((vars["--_gt"] ?? 0) + (vars["--_gb"] ?? 0)) * (gap / 2)
  return { x, y, w, h }
}

/** Where a dragged window would land: a zone, the whole stage, or a tiled column. */
export type EdgeTarget = SnapZone | "maximise" | "tile"

/**
 * Edge snapping while dragging: the pointer (in workspace pixels) within `threshold` of
 * an edge selects a half, a corner selects a quarter, the top edge maximises.
 */
export function edgeSnapTarget(
  pointerX: number,
  pointerY: number,
  width: number,
  height: number,
  threshold: number
): EdgeTarget | null {
  if (width <= 0 || height <= 0) return null
  const nearLeft = pointerX <= threshold
  const nearRight = pointerX >= width - threshold
  const corner = height * 0.22
  if (nearLeft || nearRight) {
    const side = nearLeft ? "left" : "right"
    if (pointerY <= corner) return `top-${side}`
    if (pointerY >= height - corner) return `bottom-${side}`
    return `${side}-half`
  }
  if (pointerY <= threshold) return "maximise"
  return null
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max))
}

/** The most columns (primary included) the workspace may tile into. */
export function maxTileColumns(viewportWidth: number, workspaceWidth: number, minColumn: number, gap: number) {
  const byViewport = viewportWidth >= 2560 ? 3 : viewportWidth >= 1024 ? 2 : 1
  const byWorkspace = Math.max(1, Math.floor((workspaceWidth + gap) / (minColumn + gap)))
  return Math.min(byViewport, byWorkspace)
}

export interface TileSlot {
  /** The column, from 0 at the start; column 0 is the primary window's unless it is not reserved. */
  column: number
  row: number
  /** Records or matrix rows in display order. */
  rows: number
}

/**
 * Assign tiled windows to columns beside the primary window. Only as many columns as
 * there are windows are used, so one tiled window gives a two-column split even on an
 * ultra-wide screen. Returns the column count actually used (primary included).
 *
 * With `reservePrimary` false no column is kept for the primary window: the tiles fill every
 * column from 0, and one column stacks them all.
 */
export function assignTiles(ids: readonly string[], maxColumns: number, reservePrimary = true) {
  const reserved = reservePrimary ? 1 : 0
  const columns = Math.min(Math.max(1, maxColumns), Math.max(1, reserved + ids.length))
  const slots = new Map<string, TileSlot>()
  const tileColumns = columns - reserved
  if (tileColumns < 1 || ids.length === 0) return { columns: reservePrimary ? 1 : columns, slots }
  const byColumn: string[][] = Array.from({ length: tileColumns }, () => [])
  ids.forEach((id, index) => {
    const column = Math.min(tileColumns - 1, Math.floor((index * tileColumns) / ids.length))
    byColumn[column]?.push(id)
  })
  byColumn.forEach((members, column) => {
    members.forEach((id, row) => slots.set(id, { column: column + reserved, row, rows: members.length }))
  })
  return { columns, slots }
}

/** Ids in a preferred order: those listed in `order` first, in its order; the rest after, as they came. */
export function orderTiles(ids: readonly string[], order: readonly string[] | undefined): string[] {
  if (!order?.length) return [...ids]
  const rank = new Map(order.map((id, index) => [id, index] as const))
  return ids
    .map((id, index) => ({ id, index, rank: rank.get(id) ?? Number.POSITIVE_INFINITY }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((item) => item.id)
}

export const DEFAULT_SPLITS: Readonly<Record<"2" | "3", readonly number[]>> = {
  "2": [0.5],
  "3": [0.4, 0.7],
}

/**
 * Keep dividers ordered and every column at least `minFraction` wide. Returns a new array.
 */
export function normaliseSplits(splits: readonly number[], columns: number, minFraction: number): number[] {
  const count = columns - 1
  const fallback = DEFAULT_SPLITS[String(columns) as "2" | "3"] ?? []
  const values = Array.from({ length: count }, (_, index) => {
    const value = splits[index]
    return typeof value === "number" && Number.isFinite(value) ? value : (fallback[index] ?? (index + 1) / columns)
  })
  for (let index = 0; index < count; index += 1) {
    const min = (index === 0 ? 0 : (values[index - 1] ?? 0)) + minFraction
    const max = 1 - minFraction * (count - index)
    values[index] = clamp(values[index] ?? 0, min, max)
  }
  return values
}

/** Cascade a new floating window from the centre so successive windows stay visible. */
export function defaultFloatingRect(
  size: { w: number; h: number },
  workspace: { width: number; height: number },
  index: number
): Rect {
  const width = workspace.width > 0 ? workspace.width : 1280
  const height = workspace.height > 0 ? workspace.height : 800
  const w = Math.round(Math.min(size.w, width * 0.9))
  const h = Math.round(Math.min(size.h, height * 0.9))
  const step = 28
  const offset = (index % 6) * step
  return {
    x: Math.round(clamp((width - w) / 2 + offset - step * 1.5, 0, width - w)),
    y: Math.round(clamp((height - h) / 2 + offset - step * 1.5, 0, height - h)),
    w,
    h,
  }
}
