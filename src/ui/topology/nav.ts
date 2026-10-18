/**
 * Keyboard movement on a laid-out topology (R11.5: arrow keys move within a composite
 * widget). The map reads like a family tree, so the arrows follow it:
 *
 *   ↑  the member above in a block; from a block's top row, the nearest block on the shelf
 *      above; from the top shelf, the parent
 *   ↓  the member below in a block, then the nearest block on the shelf below; otherwise the
 *      child nearest below the node
 *   ← → the previous or next member in a block's row, then the block beside it on its shelf;
 *       otherwise the neighbour in the same row of the map (a parent's group of blocks is
 *       entered at its nearest member)
 *   Home / End  the first node drawn / the last
 */
import type { LaidOutCluster, LaidOutNode, TopologyLayout } from "./types.js"

export type TopologyMove = "up" | "down" | "left" | "right" | "home" | "end"

type Box = { x: number; y: number; width: number; height: number }
const centre = (box: Box) => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 })

/** One box in a map row: a structural node, or a parent's column of blocks. */
export interface TopologyRowEntry {
  id: string
  /** Horizontal coordinate or accessor. */
  x: number
  node?: LaidOutNode
  /** A parent's blocks, top to bottom. */
  blocks?: readonly LaidOutCluster[]
}

export interface TopologyIndex {
  /** Graph or tree nodes with stable identifiers and relationships. */
  nodes: ReadonlyMap<string, LaidOutNode>
  clusters: ReadonlyMap<string, LaidOutCluster>
  /** Each row of the map, left to right. */
  rows: ReadonlyArray<readonly TopologyRowEntry[]>
  /** What hangs below each node: its structural children and its column of blocks. */
  below: ReadonlyMap<string, readonly TopologyRowEntry[]>
  /** Each parent's blocks, in reading order. */
  stacks: ReadonlyMap<string, readonly LaidOutCluster[]>
  /** Drawing order: rows top to bottom, a column's members in place of the column. */
  order: readonly string[]
}

const parentKey = (parentId: string | null) => parentId ?? ""

/** Indexes a laid-out topology for keyboard navigation and drawing: nodes and clusters by id, rows left to right, what hangs below each node, each parent's blocks and the drawing order. */
export function indexTopology(layout: TopologyLayout): TopologyIndex {
  const nodes = new Map(layout.nodes.map((node) => [node.id, node] as const))
  const clusters = new Map(layout.clusters.map((cluster) => [cluster.id, cluster] as const))
  const stacks = new Map<string, LaidOutCluster[]>()
  for (const cluster of layout.clusters) stacks.set(parentKey(cluster.parentId), [...(stacks.get(parentKey(cluster.parentId)) ?? []), cluster])
  for (const stack of stacks.values()) stack.sort((a, b) => a.stack - b.stack)

  const rows: TopologyRowEntry[][] = []
  const below = new Map<string, TopologyRowEntry[]>()
  const add = (depth: number, parentId: string | null, entry: TopologyRowEntry) => {
    ;(rows[depth] ??= []).push(entry)
    if (parentId) below.set(parentId, [...(below.get(parentId) ?? []), entry])
  }
  for (const node of layout.nodes) if (!node.clusterId) add(node.depth, node.parentId, { id: node.id, x: node.x, node })
  for (const [key, blocks] of stacks) add(blocks[0]!.depth, blocks[0]!.parentId, { id: `${key}::stack`, x: blocks[0]!.x, blocks })
  for (const row of rows) row?.sort((a, b) => a.x - b.x)
  const order = rows.flatMap((row) => (row ?? []).flatMap((entry) => (entry.blocks ? entry.blocks.flatMap((block) => [...block.members]) : [entry.id])))
  return { nodes, clusters, rows: rows.map((row) => row ?? []), below, stacks, order }
}

/** The member of a column of blocks nearest a point. */
function nearestMember(index: TopologyIndex, blocks: readonly LaidOutCluster[], from: { x: number; y: number }) {
  let best: string | undefined
  let bestDistance = Number.POSITIVE_INFINITY
  for (const id of blocks.flatMap((block) => block.members)) {
    const node = index.nodes.get(id)
    if (!node) continue
    const point = centre(node)
    const d = Math.hypot(point.x - from.x, point.y - from.y)
    if (d < bestDistance) {
      best = id
      bestDistance = d
    }
  }
  return best
}

/** Where a key moves focus from `currentId`; undefined when there is nowhere to go. */
export function moveFocus(index: TopologyIndex, currentId: string | null, move: TopologyMove): string | undefined {
  if (move === "home" || !currentId) return index.order[0]
  if (move === "end") return index.order.at(-1)
  const node = index.nodes.get(currentId)
  if (!node) return index.order[0]
  const cluster = node.clusterId ? index.clusters.get(node.clusterId) : undefined

  if (cluster) {
    const position = cluster.members.indexOf(node.id)
    const columns = cluster.columns
    const column = position % columns
    const lastRow = Math.floor((cluster.members.length - 1) / columns)
    const row = Math.floor(position / columns)
    const group = index.stacks.get(parentKey(cluster.parentId)) ?? [cluster]
    const here = centre(node)
    // The nearest block on a neighbouring shelf, or beside this one on the same shelf.
    const onShelf = (shelf: number) => group.filter((block) => block.shelf === shelf)
    const beside = (step: -1 | 1) => {
      const shelf = onShelf(cluster.shelf).toSorted((a, b) => a.x - b.x)
      return shelf[shelf.indexOf(cluster) + step]
    }
    if (move === "up") {
      if (row > 0) return cluster.members[position - columns]
      const above = onShelf(cluster.shelf - 1)
      if (above.length) return nearestMember(index, above, here)
      return cluster.parentId && index.nodes.has(cluster.parentId) ? cluster.parentId : undefined
    }
    if (move === "down") {
      if (row < lastRow) return cluster.members[Math.min(position + columns, cluster.members.length - 1)]
      const below = onShelf(cluster.shelf + 1)
      return below.length ? nearestMember(index, below, here) : undefined
    }
    if (move === "left" && column > 0) return cluster.members[position - 1]
    if (move === "right" && column < columns - 1 && position + 1 < cluster.members.length) return cluster.members[position + 1]
    const next = beside(move === "left" ? -1 : 1)
    if (next) return nearestMember(index, [next], here)
  }

  if (move === "up") return node.parentId && index.nodes.has(node.parentId) ? node.parentId : undefined
  if (move === "down") {
    const here = centre(node)
    let best: TopologyRowEntry | undefined
    let bestOffset = Number.POSITIVE_INFINITY
    for (const entry of index.below.get(node.id) ?? []) {
      const box = entry.node ?? entry.blocks![0]!
      const offset = Math.abs(centre(box).x - here.x)
      if (offset < bestOffset) {
        best = entry
        bestOffset = offset
      }
    }
    if (!best) return undefined
    return best.node ? best.node.id : best.blocks![0]!.members[0]
  }

  // Left and right: the neighbour box in the map row (a member's own column counts as one).
  const row = index.rows[node.depth] ?? []
  const own = cluster ? `${parentKey(cluster.parentId)}::stack` : node.id
  const at = row.findIndex((entry) => entry.id === own)
  const next = row[at + (move === "left" ? -1 : 1)]
  if (!next) return undefined
  return next.blocks ? nearestMember(index, next.blocks, centre(node)) : next.id
}
