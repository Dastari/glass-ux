/**
 * Row grouping (R16): group header rows that collapse, with counts from the server.
 *
 * The server contract (docs/data-filters.md §7) is one grouped count plus one list per
 * expanded group:
 *   - `groups` comes from a grouped count with the list's own `Where`: every group with
 *     rows under the current filters, in display order, with its total.
 *   - rows come from the list query once per expanded group (`Where` And the group's key),
 *     each group paged on its own: the first `pageSize` rows, then `pageSize` more for each
 *     "Show more". A collapsed group fetches no rows; its header still shows its count.
 * The table never counts rows itself: a header's count is the server's, so it is right for
 * rows the browser has not loaded.
 */
import type { ReactNode } from "react"

/** One group as the server reports it. */
export interface DataTableGroup {
  /** The group's key: what the server grouped by (a class id, a site, a state). */
  id: string
  /** "Phones". */
  label: string
  /** Rows in the group under the current filters (a grouped count from the server). */
  count: number
  /** A glyph before the label. Pass it without a size; the table sizes it. */
  icon?: ReactNode
  /** Data after the count, e.g. "Yealink ×8". */
  detail?: ReactNode
}

export interface DataTableGrouping<T> {
  /** The group a row belongs to: the same key the server grouped by. */
  groupOf: (row: T) => string
  /** Every group with rows under the current filters, in display order, with server counts. */
  groups: readonly DataTableGroup[]
  /** Rows a group shows before "Show more", and how many each "Show more" adds (default 25). */
  pageSize?: number
}

/** Grouping state (in the URL with the sort and filters). */
export interface DataTableGroupState {
  /** Collapsed group ids. */
  collapsed: string[]
  /** Rows a group shows, when more than the page size ("Show more"). */
  shown: Record<string, number>
}

/** Group state with every group expanded and none showing extra rows. */
export const EMPTY_GROUP_STATE: DataTableGroupState = { collapsed: [], shown: {} }

/** Rows a group shows before "Show more" when `grouping.pageSize` is not set. */
export const DEFAULT_GROUP_PAGE_SIZE = 25

/** One line of a grouped body: a group header, a row, or a group's "Show more". */
export type GroupedItem<R> =
  | { kind: "group"; key: string; group: DataTableGroup; collapsed: boolean; index: number }
  | { kind: "row"; key: string; row: R; group: string }
  | {
      /** Semantic entity or content kind, used to choose labels and rendering. */
      kind: "more"
      key: string
      group: DataTableGroup
      /** Rows the group shows now. */
      loaded: number
      /** How many the next "Show more" adds. */
      next: number
      /** "Show more" was asked for and the rows have not arrived. */
      pending: boolean
    }

/** How many rows a group shows: its "Show more" count, else the page size. */
export function shownFor(state: DataTableGroupState, groupId: string, pageSize: number) {
  const shown = state.shown[groupId]
  return shown !== undefined && Number.isInteger(shown) && shown > 0 ? shown : pageSize
}

/**
 * The grouped body in display order: each group's header, then (expanded) its loaded rows and
 * a "Show more" line while it has more rows on the server. Groups with no rows are left out.
 * Rows whose group the server did not report follow, under their own header, so nothing
 * loaded is ever hidden.
 */
export function groupItems<R>(
  rows: readonly R[],
  groupOf: (row: R) => string,
  groups: readonly DataTableGroup[],
  state: DataTableGroupState,
  pageSize = DEFAULT_GROUP_PAGE_SIZE
): GroupedItem<R>[] {
  const buckets = new Map<string, R[]>()
  for (const row of rows) {
    const id = groupOf(row)
    const bucket = buckets.get(id)
    if (bucket) bucket.push(row)
    else buckets.set(id, [row])
  }
  const known = new Set(groups.map((group) => group.id))
  const strays = [...buckets.entries()]
    .filter(([id]) => !known.has(id))
    .map(([id, bucket]): DataTableGroup => ({ id, label: id, count: bucket.length }))
  const collapsed = new Set(state.collapsed)
  const items: GroupedItem<R>[] = []
  let index = 0
  for (const group of [...groups, ...strays]) {
    if (group.count <= 0) continue
    const isCollapsed = collapsed.has(group.id)
    items.push({ kind: "group", key: `group:${group.id}`, group, collapsed: isCollapsed, index: index++ })
    if (isCollapsed) continue
    const limit = shownFor(state, group.id, pageSize)
    const bucket = (buckets.get(group.id) ?? []).slice(0, limit)
    for (const row of bucket) items.push({ kind: "row", key: "", row, group: group.id })
    if (group.count > bucket.length) {
      items.push({
        kind: "more",
        key: `more:${group.id}`,
        group,
        loaded: bucket.length,
        next: Math.min(pageSize, group.count - bucket.length),
        pending: bucket.length < Math.min(limit, group.count),
      })
    }
  }
  return items
}

/** Toggle one group, or every group (`all`) to the toggled group's new state. */
export function toggleCollapsed(state: DataTableGroupState, groupId: string, groups: readonly DataTableGroup[], all = false): DataTableGroupState {
  const collapsing = !state.collapsed.includes(groupId)
  if (all) return { ...state, collapsed: collapsing ? groups.filter((group) => group.count > 0).map((group) => group.id) : [] }
  return { ...state, collapsed: collapsing ? [...state.collapsed, groupId] : state.collapsed.filter((id) => id !== groupId) }
}

export function setCollapsed(state: DataTableGroupState, groupId: string, value: boolean): DataTableGroupState {
  if (state.collapsed.includes(groupId) === value) return state
  return { ...state, collapsed: value ? [...state.collapsed, groupId] : state.collapsed.filter((id) => id !== groupId) }
}

/** "Show more": the group shows `pageSize` more rows. */
export function showMore(state: DataTableGroupState, groupId: string, pageSize: number): DataTableGroupState {
  return { ...state, shown: { ...state.shown, [groupId]: shownFor(state, groupId, pageSize) + pageSize } }
}

/* ── URL ──────────────────────────────────────────────────────────────────────── */

const escapeId = (id: string) => id.replaceAll("\\", "\\\\").replaceAll(",", "\\,").replaceAll(":", "\\:")

/** Split on unescaped commas, unescaping each part. */
function splitList(value: string): string[] {
  const parts: string[] = []
  let current = ""
  for (let index = 0; index < value.length; index++) {
    const char = value[index]!
    if (char === "\\" && index + 1 < value.length) {
      current += value[++index]
      continue
    }
    if (char === ",") {
      parts.push(current)
      current = ""
      continue
    }
    current += char
  }
  parts.push(current)
  return parts.filter((part) => part !== "")
}

/** `collapsed`: group ids, comma-separated (`printer,voip-phone`). */
export function encodeCollapsed(collapsed: readonly string[]) {
  return collapsed.length ? collapsed.map(escapeId).join(",") : undefined
}

/** Reads the `collapsed` search param made by `encodeCollapsed` into unique group ids; anything but a string gives `[]`. */
export function decodeCollapsed(value: unknown): string[] {
  if (typeof value !== "string") return []
  return [...new Set(splitList(value))]
}

/** `shown`: `id:count` pairs (`endpoint:50,printer:50`). */
export function encodeShown(shown: Readonly<Record<string, number>>) {
  const entries = Object.entries(shown).filter(([, count]) => Number.isInteger(count) && count > 0)
  return entries.length ? entries.map(([id, count]) => `${escapeId(id)}:${count}`).join(",") : undefined
}

/** Reads the `shown` search param made by `encodeShown`; keeps only pairs with a non-empty id and a whole count from 1 to 10,000. */
export function decodeShown(value: unknown): Record<string, number> {
  if (typeof value !== "string" && typeof value !== "number") return {}
  const out: Record<string, number> = {}
  // Find the last unescaped colon in each part.
  for (const raw of rawPairs(String(value))) {
    const at = raw.lastColon
    if (at < 0) continue
    const count = Number(raw.text.slice(at + 1))
    const id = unescape(raw.text.slice(0, at))
    if (id && Number.isInteger(count) && count > 0 && count <= 10_000) out[id] = count
  }
  return out
}

function unescape(text: string) {
  return text.replace(/\\(.)/g, "$1")
}

/** Parts split on unescaped commas, keeping escapes, with each part's last unescaped colon. */
function rawPairs(value: string) {
  const parts: Array<{ text: string; lastColon: number }> = []
  let text = ""
  let lastColon = -1
  for (let index = 0; index < value.length; index++) {
    const char = value[index]!
    if (char === "\\" && index + 1 < value.length) {
      text += char + value[++index]
      continue
    }
    if (char === ",") {
      parts.push({ text, lastColon })
      text = ""
      lastColon = -1
      continue
    }
    if (char === ":") lastColon = text.length
    text += char
  }
  parts.push({ text, lastColon })
  return parts.filter((part) => part.text !== "")
}
