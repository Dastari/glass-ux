/** Card moves as data: what a drop does to the host's list of cards. */

/** The least a card needs: its id and the column it is in. */
export interface KanbanCardData {
  /** Unique among the cards. */
  id: string
  /** The column it is in. */
  columnId: string
}

/** Where a card is: its column and its index among that column's cards. */
export interface KanbanPlace {
  columnId: string
  index: number
}

/** The cards of one column, in order. */
export function cardsIn<C extends KanbanCardData>(cards: readonly C[], columnId: string): C[] {
  return cards.filter((card) => card.columnId === columnId)
}

/** Where a card is now, or null when it is not in the list. */
export function placeOf<C extends KanbanCardData>(cards: readonly C[], cardId: string): KanbanPlace | null {
  const card = cards.find((entry) => entry.id === cardId)
  if (!card) return null
  return { columnId: card.columnId, index: cardsIn(cards, card.columnId).findIndex((entry) => entry.id === cardId) }
}

/**
 * The cards after moving one to `to`: into that column at that index (clamped to its length).
 * Other cards keep their order; the moved card sits just before the card it lands above, or
 * after the column's last card, so the list's overall order stays meaningful.
 */
export function moveCard<C extends KanbanCardData>(cards: readonly C[], cardId: string, to: KanbanPlace): C[] {
  const card = cards.find((entry) => entry.id === cardId)
  if (!card) return [...cards]
  const rest = cards.filter((entry) => entry.id !== cardId)
  const column = rest.filter((entry) => entry.columnId === to.columnId)
  const index = Math.max(0, Math.min(to.index, column.length))
  const moved = card.columnId === to.columnId ? card : { ...card, columnId: to.columnId }
  const before = column[index]
  if (before) {
    const at = rest.indexOf(before)
    return [...rest.slice(0, at), moved, ...rest.slice(at)]
  }
  const last = column.at(-1)
  const at = last ? rest.indexOf(last) + 1 : rest.length
  return [...rest.slice(0, at), moved, ...rest.slice(at)]
}
