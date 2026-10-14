/**
 * Row selection rules (R11.8): checkboxes, Shift-click ranges, ⌘/Ctrl-click toggles.
 * Selection is a set of row ids (TanStack's RowSelectionState), so it survives paging
 * and sorting; ranges apply to the rows currently on screen, in display order.
 */
import type { RowSelectionState } from "@tanstack/react-table"

/** Set every row between `anchorId` and `targetId` (inclusive) to `value`. */
export function selectRange(
  selection: RowSelectionState,
  order: readonly string[],
  anchorId: string | null,
  targetId: string,
  value: boolean
): RowSelectionState {
  const target = order.indexOf(targetId)
  const anchor = anchorId === null ? -1 : order.indexOf(anchorId)
  if (target < 0) return selection
  const [from, to] = anchor < 0 ? [target, target] : [Math.min(anchor, target), Math.max(anchor, target)]
  const next: RowSelectionState = { ...selection }
  for (let index = from; index <= to; index++) {
    const id = order[index]
    if (id === undefined) continue
    if (value) next[id] = true
    else delete next[id]
  }
  return next
}

export function toggleOne(selection: RowSelectionState, id: string, value = !selection[id]): RowSelectionState {
  const next: RowSelectionState = { ...selection }
  if (value) next[id] = true
  else delete next[id]
  return next
}

/** Select or clear every row on the page, keeping selections from other pages. */
export function togglePage(selection: RowSelectionState, order: readonly string[], value: boolean): RowSelectionState {
  const next: RowSelectionState = { ...selection }
  for (const id of order) {
    if (value) next[id] = true
    else delete next[id]
  }
  return next
}

export type PageSelection = "none" | "some" | "all"

export function pageSelection(selection: RowSelectionState, order: readonly string[]): PageSelection {
  let count = 0
  for (const id of order) if (selection[id]) count++
  if (count === 0) return "none"
  return count === order.length ? "all" : "some"
}

export function selectedCount(selection: RowSelectionState) {
  let count = 0
  for (const id in selection) if (selection[id]) count++
  return count
}
