import { useCallback, useRef } from "react"
import { useControllable } from "./use-controllable.js"

/**
 * What changed a selection, named as Base UI names its change reasons: a click, Enter or
 * Space on an item (`item-press`), Escape (`escape-key`) or a click outside every item
 * (`outside-press`).
 */
export type SelectionChangeReason = "item-press" | "escape-key" | "outside-press"

/**
 * The second argument of `onSelectedIdChange` on Tree, TopologyCanvas, GeoMap and
 * SessionNav: why the selection changed, the event behind it and the item now selected.
 */
export interface SelectionChangeDetails<Item> {
  /** What changed the selection. */
  reason: SelectionChangeReason
  /**
   * The DOM event behind the change: the click or key press. Undefined when there is none,
   * as when a custom cluster popup calls `openPoint`.
   */
  event: Event | undefined
  /** The item with the new id, or null when the selection is cleared. */
  item: Item | null
}

/** Reports a new selected id with its details; see {@link SelectionChangeDetails}. */
export type SelectedIdChangeHandler<Item> = (id: string | null, details: SelectionChangeDetails<Item>) => void

/**
 * The selected id of a single-selection component: controlled while `selectedId` is
 * defined (null selects nothing) and uncontrolled from `defaultSelectedId` otherwise. The
 * returned `select` updates uncontrolled state and calls `onSelectedIdChange` only when the
 * id differs from the one shown, so pressing the selected item again reports nothing.
 */
export function useSelectedId<Item>(
  selectedId: string | null | undefined,
  defaultSelectedId: string | null | undefined,
  onSelectedIdChange: SelectedIdChangeHandler<Item> | undefined
): [string | null, (id: string | null, details: SelectionChangeDetails<Item>) => void] {
  const [current, setCurrent] = useControllable<string | null>(selectedId, defaultSelectedId ?? null)
  // Read by the stable `select`, which engine and keyboard callbacks bind once.
  const latest = useRef({ current, onSelectedIdChange })
  latest.current = { current, onSelectedIdChange }

  const select = useCallback(
    (id: string | null, details: SelectionChangeDetails<Item>) => {
      if (id === latest.current.current) return
      setCurrent(id)
      latest.current.onSelectedIdChange?.(id, details)
    },
    [setCurrent]
  )
  return [current, select]
}
