import { useCallback, useId, useMemo, useRef, useState } from "react"

/** Why a typeahead asked to close. */
export type TypeaheadCloseReason = "escape" | "pick" | "outside-press"

/** The keyboard event `onKeyDown` reads: a React event, or a native one from an editor engine. */
export interface TypeaheadKeyEvent {
  key: string
  preventDefault: () => void
  isComposing?: boolean
  nativeEvent?: { isComposing: boolean }
}

export interface UseTypeaheadOptions<Item> {
  /** Whether the list is showing. The host decides, from what is being typed. */
  open: boolean
  /** The rows. Without `filter` they are shown exactly as supplied, so the host owns matching. */
  items: readonly Item[]
  /** The text typed so far. A new query replaces the rows at once; rows that arrive for the same query never move one in view. */
  query?: string
  /** Keep the items this returns, for a list the host does not filter itself. */
  filter?: (item: Item, query: string) => boolean
  /** A stable identifier for an item. Default: its `id` property. */
  getId?: (item: Item) => string
  /** Called when a row is chosen with a click, Enter or Tab. Replace the typed text and close the list here. */
  onPick: (item: Item) => void
  /** Called on Escape, and by `TypeaheadPopup` on a press outside. Set `open` to false in response. */
  onClose: (reason: TypeaheadCloseReason) => void
  /** The listbox id. Default: generated. */
  id?: string
  /**
   * The text element holds more than one line (a textarea or rich text). It then stays a
   * textbox: the ARIA combobox role has no multi-line form, and HTML does not allow it on a
   * textarea. Default false, for a single-line input, which takes `role="combobox"`.
   */
  multiline?: boolean
}

/** The ARIA attributes for the text element that keeps focus. */
export interface TypeaheadTextProps {
  /** `combobox` on a single-line input; absent on multi-line text. */
  role?: "combobox"
  "aria-autocomplete": "list"
  "aria-haspopup": "listbox"
  /** Present on a single-line input only: a textbox does not support it. */
  "aria-expanded"?: boolean
  /** The listbox, while it is showing. */
  "aria-controls"?: string
  /** The highlighted row, while there is one. */
  "aria-activedescendant"?: string
}

export interface TypeaheadState<Item> {
  /** The listbox id. */
  id: string
  open: boolean
  /** The rows to draw, in order. */
  items: readonly Item[]
  /** The query in force. */
  query: string
  /** The highlighted row's index. */
  activeIndex: number
  /** The highlighted row. */
  activeItem: Item | undefined
  /** The highlighted row's element id, for `aria-activedescendant`. */
  activeDescendant: string | undefined
  /** Whether the highlight was last moved with the keyboard, so a list knows to scroll to it. */
  navigated: boolean
  /** Highlight a row by index, as a row under the pointer does. */
  setActiveIndex: (index: number) => void
  /** Put the highlight back on the first row. */
  reset: () => void
  /** Choose a row. */
  pick: (item: Item) => void
  /** Ask to close. */
  close: (reason: TypeaheadCloseReason) => void
  /** Handle a key from the text element. Returns true when the list used it, and the host then does nothing more with it. */
  onKeyDown: (event: TypeaheadKeyEvent) => boolean
  /** Spread on the text element, which keeps focus throughout. */
  textProps: TypeaheadTextProps
  /** Spread on the list's scrolling box: while the pointer is moving over it, late rows wait. */
  listProps: { onPointerMove: () => void; onPointerLeave: () => void }
}

const defaultId = (item: unknown) => (item as { id: string }).id

/**
 * The rows that are showing, updated with `next` without moving any of them: each row stays
 * where it is (with its latest data, or as it was if the host dropped it) and new rows go
 * after the last one.
 */
export function holdRows<Item>(shown: readonly Item[], next: readonly Item[], getId: (item: Item) => string): readonly Item[] {
  const fresh = new Map(next.map((item) => [getId(item), item]))
  const kept = shown.map((item) => fresh.get(getId(item)) ?? item)
  const present = new Set(shown.map(getId))
  return [...kept, ...next.filter((item) => !present.has(getId(item)))]
}

/**
 * The state of a list that opens from text and leaves focus there: the highlight, the keys
 * and the ARIA attributes, for any text element. It holds no trigger logic and no editor:
 * the host says when it is open and with which rows, and replaces the text on `onPick`.
 *
 * Results may arrive at any time. Once the pointer has moved over the list, or an arrow key
 * has moved the highlight, rows that arrive for the same query join the end of the list and
 * the rest wait, so a row is never moved out from under a press (R9). A changed query is
 * the person's own doing and replaces the rows at once.
 *
 * Keys   ↑ ↓ move and wrap · Enter or Tab pick · Esc closes. Other keys stay with the text.
 */
export function useTypeahead<Item>({
  open,
  items,
  query = "",
  filter,
  getId = defaultId,
  onPick,
  onClose,
  id: idProp,
  multiline = false,
}: UseTypeaheadOptions<Item>): TypeaheadState<Item> {
  const generated = useId()
  const id = idProp ?? generated
  const [activeId, setActiveId] = useState<string | null>(null)
  const [navigated, setNavigated] = useState(false)
  const [hovered, setHovered] = useState(false)

  // A new query or a reopened list starts again: the highlight returns to the first row.
  const [seen, setSeen] = useState({ open, query })
  if (seen.open !== open || seen.query !== query) {
    setSeen({ open, query })
    setActiveId(null)
    setNavigated(false)
    // A pointer left resting where the list opened is not pointing at anything yet.
    setHovered(false)
  }

  const source = useMemo(() => (filter ? items.filter((item) => filter(item, query)) : items), [filter, items, query])
  const held = hovered || navigated
  const rows = useRef({ shown: source, source, query, held })
  const last = rows.current
  if (last.source !== source || last.query !== query || last.held !== held) {
    const hold = held && last.query === query
    rows.current = { shown: hold ? holdRows(last.shown, source, getId) : source, source, query, held }
  }
  const shown = rows.current.shown

  const found = activeId === null ? -1 : shown.findIndex((item) => getId(item) === activeId)
  const activeIndex = Math.max(0, found)
  const activeItem = open ? shown[activeIndex] : undefined
  const activeDescendant = activeItem === undefined ? undefined : `${id}-${activeIndex}`

  const latest = useRef({ shown, activeIndex, activeItem, open, getId, onPick, onClose })
  latest.current = { shown, activeIndex, activeItem, open, getId, onPick, onClose }

  const setActiveIndex = useCallback((index: number) => {
    const item = latest.current.shown[index]
    if (item !== undefined) setActiveId(latest.current.getId(item))
  }, [])
  const reset = useCallback(() => {
    setActiveId(null)
    setNavigated(false)
  }, [])
  const pick = useCallback((item: Item) => latest.current.onPick(item), [])
  const close = useCallback((reason: TypeaheadCloseReason) => latest.current.onClose(reason), [])

  const onKeyDown = useCallback((event: TypeaheadKeyEvent) => {
    const { open, shown, activeIndex, activeItem, getId } = latest.current
    if (!open || (event.isComposing ?? event.nativeEvent?.isComposing)) return false
    if (shown.length) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault()
        const step = event.key === "ArrowDown" ? 1 : -1
        setActiveId(getId(shown[(activeIndex + step + shown.length) % shown.length]!))
        setNavigated(true)
        return true
      }
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault()
        latest.current.onPick(activeItem!)
        return true
      }
    }
    if (event.key === "Escape") {
      event.preventDefault()
      latest.current.onClose("escape")
      return true
    }
    return false
  }, [])

  const listProps = useMemo(
    () => ({ onPointerMove: () => setHovered(true), onPointerLeave: () => setHovered(false) }),
    []
  )

  return {
    id,
    open,
    items: shown,
    query,
    activeIndex,
    activeItem,
    activeDescendant,
    navigated,
    setActiveIndex,
    reset,
    pick,
    close,
    onKeyDown,
    textProps: {
      ...(multiline ? {} : { role: "combobox" as const, "aria-expanded": open }),
      "aria-autocomplete": "list",
      "aria-haspopup": "listbox",
      "aria-controls": open && shown.length ? id : undefined,
      "aria-activedescendant": activeDescendant,
    },
    listProps,
  }
}
