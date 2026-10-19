/**
 * The topology layout: a tidy tree (d3-hierarchy's Reingold–Tilford `tree`) for the
 * infrastructure, with leaf clients packed into cluster blocks under their parent.
 *
 * Why d3-hierarchy and not elkjs or d3-force:
 *   - A network map here is a tree: every device has one upstream link (TopologyNode.parentId).
 *     A tidy tree is the exact layout for it: O(n), deterministic (the same input draws the
 *     same map, so nothing moves between renders, R1.4) and synchronous (one frame for 300
 *     nodes, no worker).
 *   - elkjs is a general layered-graph engine (~1.4 MB, usually run in a worker) for graphs
 *     with cycles and ports. When LLDP or UniFi port maps arrive (C4) and links stop being a
 *     tree, revisit it; until then it is weight for nothing.
 *   - d3-force is iterative and non-deterministic: nodes drift while it settles, which is
 *     layout shift by design, and it never gives the clean rows a UniFi-style map reads by.
 *
 * Boxes have variable widths (a cluster is wider than a switch), so the tree runs with a
 * one-unit node size and a separation of half of each neighbour's width plus the gap: the
 * separation is then in world units. Row heights are the tallest box in each row.
 *
 * Clients are packed so a busy network stays a few rows deep and not a mile wide: each
 * class under a parent is one block of roughly square proportions, and a parent's blocks
 * pack into shelves under it (left to right, wrapping at about twice as wide as tall). The
 * first shelf takes the parent's link like any children; lower shelves hang off a spine down
 * the left and a bus above each shelf.
 *
 * The module is loaded on demand by the canvas (code split): d3-hierarchy ships only with a
 * screen that draws a map.
 */
import { hierarchy, tree, type HierarchyPointNode } from "d3-hierarchy"
import { clusterLabel } from "./label.js"
import { formatLinkSpeed, speedRange } from "./speed.js"
import type { LaidOutCluster, LaidOutEdge, LaidOutNode, TopologyClusterSpec, TopologyLayout, TopologyLink, TopologyLinkKind, TopologyMetrics, TopologyNode } from "./types.js"

/** World units the layout uses when the caller passes none (CSS px at --ui-scale 1). */
export const DEFAULT_METRICS: TopologyMetrics = {
  cellWidth: 112,
  cellHeight: 84,
  gapX: 24,
  gapY: 64,
  clusterPad: 12,
  clusterGap: 4,
  clusterHeader: 28,
  clusterColumns: 8,
  radius: 8,
}

/**
 * How many columns a block of `count` members takes: about square on screen (cells are wider
 * than tall), at most `max`.
 */
export function clusterColumns(count: number, max: number, cellWidth = DEFAULT_METRICS.cellWidth, cellHeight = DEFAULT_METRICS.cellHeight) {
  return Math.max(1, Math.min(count, max, Math.ceil(Math.sqrt((count * cellHeight) / cellWidth))))
}

interface Block {
  /** Its shelf, and its place in the packed group (set by `pack`). */
  row: number
  dx: number
  dy: number
  id: string
  key: string
  label: string
  members: string[]
  /** Typed column definitions, including rendering, sorting, priorities and filters. */
  columns: number
  /** Available width or named width tier. */
  width: number
  /** Available height used for the component’s size tier. */
  height: number
}

type Datum =
  | { kind: "root"; width: 0; height: 0; children: Datum[] }
  | { kind: "node"; id: string; width: number; height: number; children: Datum[] }
  | { kind: "stack"; id: string; parentId: string | null; blocks: Block[]; width: number; height: number; children: [] }

const clusterId = (parentId: string | null, key: string) => `${parentId ?? ""}::${key}`

/** The parent each node really hangs off: a missing parent or a loop makes it a root. */
function effectiveParents(nodes: readonly TopologyNode[]) {
  const byId = new Map(nodes.map((node) => [node.id, node] as const))
  const parents = new Map<string, string | null>()
  for (const node of nodes) {
    let parent = node.parentId && byId.has(node.parentId) && node.parentId !== node.id ? node.parentId : null
    // Walk up: if the chain comes back to this node, cut it here.
    const seen = new Set([node.id])
    for (let up = parent; up; up = byId.get(up)?.parentId ?? null) {
      if (seen.has(up)) {
        parent = null
        break
      }
      seen.add(up)
      if (!byId.has(up)) break
    }
    parents.set(node.id, parent)
  }
  return parents
}

/** A block's link kind: the members' kind when they agree, unknown otherwise. */
function commonKind(links: ReadonlyArray<TopologyLink | undefined>): TopologyLinkKind {
  const kinds = new Set(links.map((link) => link?.kind ?? "unknown"))
  return kinds.size === 1 ? [...kinds][0]! : "unknown"
}

/** A path through `points` (axis-aligned runs) with its corners rounded to `radius`. */
function rounded(points: ReadonlyArray<readonly [number, number]>, radius: number) {
  const clean = points.filter((point, index) => index === 0 || point[0] !== points[index - 1]![0] || point[1] !== points[index - 1]![1])
  if (clean.length < 2) return ""
  let path = `M${clean[0]![0]},${clean[0]![1]}`
  for (let index = 1; index < clean.length - 1; index++) {
    const [px, py] = clean[index - 1]!
    const [x, y] = clean[index]!
    const [nx, ny] = clean[index + 1]!
    const into = Math.hypot(x - px, y - py)
    const out = Math.hypot(nx - x, ny - y)
    const r = Math.min(radius, into / 2, out / 2)
    const ax = x - (Math.sign(x - px) * r)
    const ay = y - (Math.sign(y - py) * r)
    const bx = x + (Math.sign(nx - x) * r)
    const by = y + (Math.sign(ny - y) * r)
    path += `L${ax},${ay}Q${x},${y} ${bx},${by}`
  }
  const [lx, ly] = clean.at(-1)!
  return `${path}L${lx},${ly}`
}

/**
 * Lay out a topology. Nodes keep the caller's order among their siblings; a parent's client
 * blocks follow its own children, in `clusters` order. Coordinates start at (0, 0).
 */
export function layoutTopology<T>(
  input: readonly TopologyNode<T>[],
  options: {
    metrics?: Partial<TopologyMetrics>
    clusters?: Readonly<Record<string, TopologyClusterSpec>>
    /**
     * The width a block's label line takes ("Storage and power · 1", as `clusterLabel` writes
     * it), so a narrow block widens to its label instead of truncating it, up to three cells.
     */
    labelWidth?: (text: string) => number
  } = {}
): TopologyLayout {
  const m: TopologyMetrics = { ...DEFAULT_METRICS, ...options.metrics }
  const specs = options.clusters ?? {}
  if (!input.length) return { nodes: [], clusters: [], edges: [], width: 0, height: 0 }
  // Between shelves: room for the bus and a speed label on the drop into each block.
  const stackGap = Math.max(m.clusterPad * 2, m.gapY / 2)
  /** Pack blocks into shelves about twice as wide as tall; returns the group's size. */
  const pack = (blocks: Block[]) => {
    const area = blocks.reduce((sum, block) => sum + block.width * block.height, 0)
    const target = Math.max(Math.max(...blocks.map((block) => block.width)), Math.sqrt(area * 2.4))
    let row = 0
    let x = 0
    let y = 0
    let rowHeight = 0
    let width = 0
    for (const block of blocks) {
      if (x > 0 && x + block.width > target) {
        row += 1
        x = 0
        y += rowHeight + stackGap
        rowHeight = 0
      }
      Object.assign(block, { row, dx: x, dy: y })
      x += block.width + m.gapX
      width = Math.max(width, x - m.gapX)
      rowHeight = Math.max(rowHeight, block.height)
    }
    return { width, height: y + rowHeight }
  }

  const byId = new Map(input.map((node) => [node.id, node] as const))
  const parents = effectiveParents(input)
  // These buckets belong to this layout. Append in input order without copying a growing
  // branch for every node (quadratic on a wide branch); the caller's nodes stay untouched.
  const children = new Map<string | null, TopologyNode<T>[]>()
  for (const node of input) {
    const parent = parents.get(node.id) ?? null
    const siblings = children.get(parent)
    if (siblings) siblings.push(node)
    else children.set(parent, [node])
  }
  const hasChildren = (id: string) => (children.get(id)?.length ?? 0) > 0

  const clusterOrder = (key: string) => specs[key]?.order ?? Number.MAX_SAFE_INTEGER
  const build = (parentId: string | null): Datum[] => {
    const own = children.get(parentId) ?? []
    const structural = own.filter((node) => !node.cluster || hasChildren(node.id))
    const grouped = new Map<string, string[]>()
    for (const node of own) {
      if (node.cluster && !hasChildren(node.id)) {
        const members = grouped.get(node.cluster)
        if (members) members.push(node.id)
        else grouped.set(node.cluster, [node.id])
      }
    }
    const blocks: Block[] = [...grouped.entries()]
      .toSorted(([a], [b]) => clusterOrder(a) - clusterOrder(b) || a.localeCompare(b))
      .map(([key, members]) => {
        const columns = clusterColumns(members.length, m.clusterColumns, m.cellWidth, m.cellHeight)
        const rows = Math.ceil(members.length / columns)
        const label = specs[key]?.label ?? key
        const cells = columns * m.cellWidth + (columns - 1) * m.clusterGap
        const text = options.labelWidth ? Math.ceil(Math.min(options.labelWidth(clusterLabel(label, members.length)), m.cellWidth * 3)) : 0
        return {
          row: 0,
          dx: 0,
          dy: 0,
          id: clusterId(parentId, key),
          key,
          label,
          members,
          columns,
          width: Math.max(cells, text) + 2 * m.clusterPad,
          height: m.clusterHeader + rows * m.cellHeight + (rows - 1) * m.clusterGap + 2 * m.clusterPad,
        }
      })
    const ownNodes = structural.map((node): Datum => ({ kind: "node", id: node.id, width: m.cellWidth, height: m.cellHeight, children: build(node.id) }))
    if (!blocks.length) return ownNodes
    const stack: Datum = { kind: "stack", id: `${parentId ?? ""}::stack`, parentId, blocks, ...pack(blocks), children: [] }
    return [...ownNodes, stack]
  }

  const root = hierarchy<Datum>({ kind: "root", width: 0, height: 0, children: build(null) }, (datum) => datum.children)
  const laid = tree<Datum>()
    .nodeSize([1, 1])
    .separation((a, b) => (a.data.width + b.data.width) / 2 + (a.parent === b.parent ? m.gapX : m.gapX * 2))(root)

  // Rows: each depth is as tall as its tallest box (the virtual root is depth 0, dropped).
  const descendants = laid.descendants().filter((entry) => entry.data.kind !== "root")
  const rowHeight: number[] = []
  for (const entry of descendants) rowHeight[entry.depth - 1] = Math.max(rowHeight[entry.depth - 1] ?? 0, entry.data.height)
  const rowTop: number[] = []
  rowHeight.forEach((_, index) => (rowTop[index] = index ? rowTop[index - 1]! + rowHeight[index - 1]! + m.gapY : 0))

  const minX = Math.min(...descendants.map((entry) => entry.x - entry.data.width / 2))
  const maxX = Math.max(...descendants.map((entry) => entry.x + entry.data.width / 2))
  const box = (entry: HierarchyPointNode<Datum>) => ({ x: entry.x - entry.data.width / 2 - minX, y: rowTop[entry.depth - 1]!, width: entry.data.width, height: entry.data.height, depth: entry.depth - 1 })

  const nodes: LaidOutNode[] = []
  const clusters: LaidOutCluster[] = []
  const edges: LaidOutEdge[] = []
  const boxes = new Map<string, { x: number; y: number; width: number; height: number }>()
  const stacks: Array<{ parentId: string | null; blocks: LaidOutCluster[] }> = []
  for (const entry of descendants) {
    const data = entry.data
    const b = box(entry)
    if (data.kind === "node") {
      nodes.push({ id: data.id, parentId: parents.get(data.id) ?? null, ...b })
      boxes.set(data.id, b)
    } else if (data.kind === "stack") {
      const laidBlocks: LaidOutCluster[] = []
      data.blocks.forEach((block, stackIndex) => {
        const placed: LaidOutCluster = {
          id: block.id,
          key: block.key,
          label: block.label,
          parentId: data.parentId,
          columns: block.columns,
          members: block.members,
          x: b.x + block.dx,
          y: b.y + block.dy,
          width: block.width,
          height: block.height,
          depth: b.depth,
          stack: stackIndex,
          shelf: block.row,
        }
        clusters.push(placed)
        laidBlocks.push(placed)
        // Members centre in a block widened to its label.
        const left = placed.x + (block.width - (block.columns * m.cellWidth + (block.columns - 1) * m.clusterGap)) / 2
        const first = placed.y + m.clusterPad + m.clusterHeader
        block.members.forEach((member, index) => {
          const column = index % block.columns
          const row = Math.floor(index / block.columns)
          nodes.push({
            id: member,
            parentId: data.parentId,
            x: left + column * (m.cellWidth + m.clusterGap),
            y: first + row * (m.cellHeight + m.clusterGap),
            width: m.cellWidth,
            height: m.cellHeight,
            depth: b.depth,
            clusterId: block.id,
          })
        })
      })
      stacks.push({ parentId: data.parentId, blocks: laidBlocks })
    }
  }

  const linkOf = (id: string) => byId.get(id)?.link
  // Links: one per structural child, from the parent's bottom to the child's top.
  for (const node of nodes) {
    if (node.clusterId || !node.parentId) continue
    const from = boxes.get(node.parentId)
    if (!from) continue
    const x1 = from.x + from.width / 2
    const y1 = from.y + from.height
    const x2 = node.x + node.width / 2
    const midY = y1 + (node.y - y1) / 2
    const link = linkOf(node.id)
    edges.push({
      id: node.id,
      from: node.parentId,
      to: node.id,
      path: rounded([[x1, y1], [x1, midY], [x2, midY], [x2, node.y]], m.radius),
      kind: link?.kind ?? "unknown",
      label: link?.speedMbps ? formatLinkSpeed(link.speedMbps) : undefined,
      labelX: x2,
      labelY: midY + (node.y - midY) / 2,
    })
  }
  // Blocks: the first shelf joins the parent like any children; a lower shelf hangs off a spine
  // down the group's left and a bus in the gap above the shelf.
  for (const { parentId, blocks } of stacks) {
    const from = parentId ? boxes.get(parentId) : undefined
    if (!from || !parentId) continue
    const x1 = from.x + from.width / 2
    const y1 = from.y + from.height
    const top = Math.min(...blocks.map((block) => block.y))
    const midY = y1 + (top - y1) / 2
    const spineX = Math.min(...blocks.map((block) => block.x)) - m.gapX / 2
    for (const block of blocks) {
      const links = block.members.map(linkOf)
      const speeds = links.flatMap((link) => (link?.speedMbps ? [link.speedMbps] : []))
      const x2 = block.x + block.width / 2
      const busY = block.shelf === 0 ? midY : block.y - stackGap / 2
      const points: Array<readonly [number, number]> =
        block.shelf === 0
          ? [[x1, y1], [x1, midY], [x2, midY], [x2, block.y]]
          : [[x1, y1], [x1, midY], [spineX, midY], [spineX, busY], [x2, busY], [x2, block.y]]
      edges.push({
        id: block.id,
        from: parentId,
        to: block.id,
        path: rounded(points, m.radius),
        kind: commonKind(links),
        label: speedRange(speeds),
        labelX: x2,
        labelY: busY + (block.y - busY) / 2,
      })
    }
  }

  const last = rowHeight.length - 1
  return { nodes, clusters, edges, width: maxX - minX, height: last >= 0 ? rowTop[last]! + rowHeight[last]! : 0 }
}
