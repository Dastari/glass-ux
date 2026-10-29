/**
 * RelationshipCanvas geometry: card sizes, row anchors, the automatic layout and edge paths.
 * Pure (no DOM), so it is unit tested. Heights are computed, not measured, so every edge
 * anchor is exact before the cards render.
 */
import type {
  RelationshipCard,
  RelationshipEdge,
  RelationshipEdgePath,
  RelationshipEndpoint,
  RelationshipMetrics,
  RelationshipPoint,
  RelationshipPositions,
} from "./types.js"

/** The geometry at UI scale 1, for tests and the server; the canvas reads its tokens instead. */
export const DEFAULT_METRICS: RelationshipMetrics = { cardWidth: 264, headerHeight: 44, rowHeight: 28, listPadding: 4, gapX: 120, gapY: 40 }

/** The smallest bend: an edge between close cards still leaves and enters horizontally. */
const MIN_BEND = 48
/** Parallel edges between the same two anchors fan out by this much each. */
const FAN = 14

/** A card's height: its header, at least one row's height, and the list padding above and below. */
export function cardHeight(card: Pick<RelationshipCard, "rows">, metrics: RelationshipMetrics): number {
  return metrics.headerHeight + Math.max(1, card.rows.length) * metrics.rowHeight + metrics.listPadding * 2
}

/** The vertical centre of a row inside its card; the header's centre when there is no such row. */
export function rowAnchor(card: Pick<RelationshipCard, "rows">, rowId: string | undefined, metrics: RelationshipMetrics): number {
  const index = rowId === undefined ? -1 : card.rows.findIndex((row) => row.id === rowId)
  return index < 0 ? metrics.headerHeight / 2 : metrics.headerHeight + metrics.listPadding + index * metrics.rowHeight + metrics.rowHeight / 2
}

/** Problems with the data, for a development warning: duplicate ids and endpoints that do not exist. */
export function diagnose(cards: readonly RelationshipCard[], edges: readonly RelationshipEdge[]): string[] {
  const problems: string[] = []
  const byId = new Map<string, RelationshipCard>()
  for (const card of cards) {
    if (byId.has(card.id)) problems.push(`duplicate card id "${card.id}"`)
    byId.set(card.id, card)
    const rows = new Set<string>()
    for (const row of card.rows) {
      if (rows.has(row.id)) problems.push(`duplicate row id "${row.id}" in card "${card.id}"`)
      rows.add(row.id)
    }
  }
  const edgeIds = new Set<string>()
  const check = (edge: RelationshipEdge, end: RelationshipEndpoint, side: string) => {
    const card = byId.get(end.card)
    if (!card) problems.push(`edge "${edge.id}" ${side} card "${end.card}" does not exist`)
    else if (end.row !== undefined && !card.rows.some((row) => row.id === end.row)) problems.push(`edge "${edge.id}" ${side} row "${end.row}" is not in card "${end.card}"`)
  }
  for (const edge of edges) {
    if (edgeIds.has(edge.id)) problems.push(`duplicate edge id "${edge.id}"`)
    edgeIds.add(edge.id)
    check(edge, edge.from, "from")
    check(edge, edge.to, "to")
  }
  return problems
}

/**
 * Place every card without overlap. With edges, a card sits one column to the right of the
 * deepest card it links to, so referenced cards stand to the left (cycles are broken where
 * they close); each column keeps the cards' order. Without edges, a near-square grid.
 */
export function autoLayout(cards: readonly RelationshipCard[], edges: readonly RelationshipEdge[], metrics: RelationshipMetrics): Record<string, RelationshipPoint> {
  const positions: Record<string, RelationshipPoint> = {}
  const ids = new Set(cards.map((card) => card.id))
  const linking = edges.filter((edge) => edge.from.card !== edge.to.card && ids.has(edge.from.card) && ids.has(edge.to.card))
  const step = metrics.cardWidth + metrics.gapX
  if (!linking.length) {
    const columns = Math.max(1, Math.ceil(Math.sqrt(cards.length)))
    let y = 0
    for (let start = 0; start < cards.length; start += columns) {
      const row = cards.slice(start, start + columns)
      row.forEach((card, index) => (positions[card.id] = { x: index * step, y }))
      y += Math.max(...row.map((card) => cardHeight(card, metrics))) + metrics.gapY
    }
    return positions
  }
  const targets = new Map<string, string[]>()
  for (const edge of linking) targets.set(edge.from.card, [...(targets.get(edge.from.card) ?? []), edge.to.card])
  const rank = new Map<string, number>()
  const visit = (id: string, path: Set<string>): number => {
    const known = rank.get(id)
    if (known !== undefined) return known
    if (path.has(id)) return 0
    path.add(id)
    const value = Math.max(-1, ...(targets.get(id) ?? []).map((target) => visit(target, path))) + 1
    path.delete(id)
    rank.set(id, value)
    return value
  }
  for (const card of cards) visit(card.id, new Set())
  const columns = new Map<number, RelationshipCard[]>()
  for (const card of cards) {
    const column = rank.get(card.id) ?? 0
    columns.set(column, [...(columns.get(column) ?? []), card])
  }
  for (const [column, members] of columns) {
    let y = 0
    for (const card of members) {
      positions[card.id] = { x: column * step, y }
      y += cardHeight(card, metrics) + metrics.gapY
    }
  }
  return positions
}

/** Keep the given positions; place cards without one by the automatic layout, below the placed cards. */
export function mergePositions(
  cards: readonly RelationshipCard[],
  edges: readonly RelationshipEdge[],
  stored: RelationshipPositions,
  metrics: RelationshipMetrics,
): RelationshipPositions {
  const missing = cards.filter((card) => !stored[card.id])
  if (!missing.length) return stored
  const placed = cards.filter((card) => stored[card.id])
  const auto = autoLayout(cards, edges, metrics)
  const offset = placed.length ? Math.max(...placed.map((card) => stored[card.id]!.y + cardHeight(card, metrics))) + metrics.gapY : 0
  const left = placed.length ? Math.min(...placed.map((card) => stored[card.id]!.x)) : 0
  const top = Math.min(...missing.map((card) => auto[card.id]!.y))
  const added = Object.fromEntries(missing.map((card) => [card.id, { x: left + auto[card.id]!.x, y: auto[card.id]!.y - top + offset }]))
  return { ...stored, ...added }
}

/** The box around every card. */
export function bounds(cards: readonly RelationshipCard[], positions: RelationshipPositions, metrics: RelationshipMetrics) {
  if (!cards.length) return { x: 0, y: 0, width: 0, height: 0 }
  let left = Number.POSITIVE_INFINITY
  let top = Number.POSITIVE_INFINITY
  let right = Number.NEGATIVE_INFINITY
  let bottom = Number.NEGATIVE_INFINITY
  for (const card of cards) {
    const at = positions[card.id] ?? { x: 0, y: 0 }
    left = Math.min(left, at.x)
    top = Math.min(top, at.y)
    right = Math.max(right, at.x + metrics.cardWidth)
    bottom = Math.max(bottom, at.y + cardHeight(card, metrics))
  }
  return { x: left, y: top, width: right - left, height: bottom - top }
}

/**
 * Each edge as a cubic Bézier from its source row to its target row. It leaves the side of the
 * source that faces the target and enters the target's facing side; a link to the same card
 * loops out on its right. Parallel edges between the same anchors fan out so each stays visible.
 */
export function edgePaths(
  cards: ReadonlyMap<string, RelationshipCard>,
  edges: readonly RelationshipEdge[],
  positions: RelationshipPositions,
  metrics: RelationshipMetrics,
): RelationshipEdgePath[] {
  const seen = new Map<string, number>()
  const paths: RelationshipEdgePath[] = []
  for (const edge of edges) {
    const from = cards.get(edge.from.card)
    const to = cards.get(edge.to.card)
    const a = positions[edge.from.card]
    const b = positions[edge.to.card]
    if (!from || !to || !a || !b) continue
    const key = `${edge.from.card}:${edge.from.row ?? ""}>${edge.to.card}:${edge.to.row ?? ""}`
    const nth = seen.get(key) ?? 0
    seen.set(key, nth + 1)
    const fan = nth * FAN
    const startY = a.y + rowAnchor(from, edge.from.row, metrics)
    const endY = b.y + rowAnchor(to, edge.to.row, metrics)
    if (from === to) {
      // A self-link: out of the right side and back in, wider for each parallel loop.
      const x = a.x + metrics.cardWidth
      const reach = MIN_BEND + fan
      const lift = startY === endY ? metrics.rowHeight : 0
      paths.push({
        edge,
        path: `M ${x} ${startY} C ${x + reach} ${startY - lift}, ${x + reach} ${endY + lift}, ${x} ${endY}`,
        labelX: x + reach * 0.75 + 4,
        labelY: (startY + endY) / 2 - 6,
      })
      continue
    }
    const rightward = a.x + metrics.cardWidth / 2 <= b.x + metrics.cardWidth / 2
    const startX = rightward ? a.x + metrics.cardWidth : a.x
    const endX = rightward ? b.x : b.x + metrics.cardWidth
    const bend = (Math.max(MIN_BEND, Math.abs(endX - startX) / 2) + fan) * (rightward ? 1 : -1)
    paths.push({
      edge,
      path: `M ${startX} ${startY} C ${startX + bend} ${startY}, ${endX - bend} ${endY}, ${endX} ${endY}`,
      labelX: (startX + endX) / 2,
      labelY: (startY + endY) / 2 - 6 - nth * FAN,
    })
  }
  return paths
}

/**
 * The nearest card in a direction from another, for arrow-key travel: candidates lie in that
 * half-plane, and distance across the direction counts double, so travel stays in its lane.
 */
export function nearestCard(
  from: string,
  direction: "left" | "right" | "up" | "down",
  cards: readonly RelationshipCard[],
  positions: RelationshipPositions,
  metrics: RelationshipMetrics,
): string | undefined {
  const centre = (card: RelationshipCard) => {
    const at = positions[card.id] ?? { x: 0, y: 0 }
    return { x: at.x + metrics.cardWidth / 2, y: at.y + cardHeight(card, metrics) / 2 }
  }
  const origin = cards.find((card) => card.id === from)
  if (!origin) return cards[0]?.id
  const o = centre(origin)
  let best: { id: string; score: number } | undefined
  for (const card of cards) {
    if (card.id === from) continue
    const c = centre(card)
    const along = direction === "left" ? o.x - c.x : direction === "right" ? c.x - o.x : direction === "up" ? o.y - c.y : c.y - o.y
    const across = direction === "left" || direction === "right" ? Math.abs(c.y - o.y) : Math.abs(c.x - o.x)
    if (along <= 0) continue
    const score = along + across * 2
    if (!best || score < best.score) best = { id: card.id, score }
  }
  return best?.id
}

/** Cards in reading order (top to bottom, then left to right), for Home and End. */
export function readingOrder(cards: readonly RelationshipCard[], positions: RelationshipPositions): string[] {
  return [...cards]
    .sort((a, b) => {
      const pa = positions[a.id] ?? { x: 0, y: 0 }
      const pb = positions[b.id] ?? { x: 0, y: 0 }
      return pa.y - pb.y || pa.x - pb.x
    })
    .map((card) => card.id)
}
