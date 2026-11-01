/**
 * A Sankey diagram's layout: pure maths in pixel space. Nodes stand in columns by the longest
 * path that reaches them, sinks in the last column; heights are proportional to throughput on
 * one scale; a few passes pull each node towards the nodes it connects to; links stack along
 * their nodes in the order of their other ends, so ribbons cross as little as they can.
 * Written here rather than taken from d3-sankey, which brings its own older d3-array and
 * d3-shape into a bundle that already has current ones.
 */

export interface LayoutNodeInput {
  key: string
}

export interface LayoutLinkInput {
  source: string
  target: string
  value: number
}

export interface LaidNode {
  key: string
  /** Index into the input nodes. */
  index: number
  column: number
  /** Throughput: the larger of what enters and what leaves. */
  value: number
  incoming: number
  outgoing: number
  x0: number
  x1: number
  y0: number
  y1: number
}

export interface LaidLink {
  /** Index into the input links. */
  index: number
  /** Index into the laid nodes. */
  source: number
  target: number
  value: number
  /** Thickness, in px. */
  thickness: number
  /** The ribbon's centre at each end, in px. */
  y0: number
  y1: number
  x0: number
  x1: number
}

export interface SankeyLayout {
  nodes: LaidNode[]
  links: LaidLink[]
  columns: number
  /** Input links that close a loop or join a node to itself: a flow diagram cannot draw them. */
  loops: number[]
  /** Px per unit of value. */
  scale: number
}

export interface SankeyOptions {
  /** Available width or named width tier. */
  width: number
  /** Available height used for the component’s size tier. */
  height: number
  /** A node's width, in px. */
  nodeWidth: number
  /** The gap between nodes in a column, in px; it shrinks to fit a crowded column. */
  nodeGap: number
  /** Relaxation passes. */
  iterations?: number
  /** Run the flow from right to left. */
  mirror?: boolean
}

/** Valid links, and those a flow cannot draw: a link back along a path, or from a node to itself. */
function splitLoops(nodes: readonly LayoutNodeInput[], links: readonly LayoutLinkInput[]) {
  const position = new Map(nodes.map((node, index) => [node.key, index]))
  const out = nodes.map(() => [] as number[])
  const loops: number[] = []
  links.forEach((link, index) => {
    const from = position.get(link.source)
    const to = position.get(link.target)
    if (from === undefined || to === undefined || !(link.value > 0)) return
    if (from === to) loops.push(index)
    else out[from]!.push(index)
  })
  // Depth-first: a link to a node still on the path closes a loop.
  const state = new Uint8Array(nodes.length)
  const looping = new Set(loops)
  const visit = (node: number) => {
    state[node] = 1
    for (const index of out[node]!) {
      const next = position.get(links[index]!.target)!
      if (state[next] === 1) looping.add(index)
      else if (state[next] === 0) visit(next)
    }
    state[node] = 2
  }
  nodes.forEach((_, node) => {
    if (state[node] === 0) visit(node)
  })
  const kept: number[] = []
  links.forEach((link, index) => {
    if (position.has(link.source) && position.has(link.target) && link.value > 0 && !looping.has(index)) kept.push(index)
  })
  return { kept, loops: [...looping].toSorted((a, b) => a - b), position }
}

/** Longest-path columns, with sinks pushed to the last column so every flow runs the full width. */
function assignColumns(count: number, edges: ReadonlyArray<readonly [number, number]>) {
  const column = Array.from({ length: count }, () => 0)
  const entering = Array.from({ length: count }, () => 0)
  const leaving = Array.from({ length: count }, () => 0)
  const out = Array.from({ length: count }, () => [] as number[])
  for (const [from, to] of edges) {
    entering[to]!++
    leaving[from]!++
    out[from]!.push(to)
  }
  const ready: number[] = []
  const waiting = [...entering]
  waiting.forEach((value, node) => {
    if (value === 0) ready.push(node)
  })
  for (let cursor = 0; cursor < ready.length; cursor++) {
    const node = ready[cursor]!
    for (const next of out[node]!) {
      column[next] = Math.max(column[next]!, column[node]! + 1)
      if (--waiting[next]! === 0) ready.push(next)
    }
  }
  const last = Math.max(0, ...column)
  return { column: column.map((value, node) => (leaving[node] === 0 && entering[node]! > 0 ? last : value)), columns: last + 1 }
}

export function sankeyLayout(nodes: readonly LayoutNodeInput[], links: readonly LayoutLinkInput[], { width, height, nodeWidth, nodeGap, iterations = 6, mirror = false }: SankeyOptions): SankeyLayout {
  const { kept, loops, position } = splitLoops(nodes, links)
  const connected = [...new Set(kept.flatMap((index) => [position.get(links[index]!.source)!, position.get(links[index]!.target)!]))].toSorted((a, b) => a - b)
  if (connected.length === 0) return { nodes: [], links: [], columns: 0, loops, scale: 0 }
  const slot = new Map(connected.map((index, laid) => [index, laid]))
  const edges = kept.map((index) => [slot.get(position.get(links[index]!.source)!)!, slot.get(position.get(links[index]!.target)!)!] as const)
  const { column, columns } = assignColumns(connected.length, edges)

  const incoming = connected.map(() => 0)
  const outgoing = connected.map(() => 0)
  kept.forEach((index, link) => {
    const [from, to] = edges[link]!
    outgoing[from]! += links[index]!.value
    incoming[to]! += links[index]!.value
  })
  const laid: LaidNode[] = connected.map((index, node) => ({
    key: nodes[index]!.key,
    index,
    column: column[node]!,
    value: Math.max(incoming[node]!, outgoing[node]!),
    incoming: incoming[node]!,
    outgoing: outgoing[node]!,
    x0: 0,
    x1: 0,
    y0: 0,
    y1: 0,
  }))
  const stacks: LaidNode[][] = Array.from({ length: columns }, () => [])
  for (const node of laid) stacks[node.column]!.push(node)

  // One scale for the whole diagram, set by its fullest column; a crowded column gives up its gaps.
  const gap = Math.min(nodeGap, ...stacks.map((stack) => (stack.length > 1 ? (height * 0.5) / (stack.length - 1) : nodeGap)))
  const scale = Math.min(...stacks.map((stack) => (height - gap * (stack.length - 1)) / stack.reduce((sum, node) => sum + node.value, 0)))
  const step = columns > 1 ? (width - nodeWidth) / (columns - 1) : 0
  for (const stack of stacks) {
    const used = stack.reduce((sum, node) => sum + node.value * scale, 0) + gap * (stack.length - 1)
    let y = (height - used) / 2
    for (const node of stack) {
      node.x0 = node.column * step
      node.x1 = node.x0 + nodeWidth
      node.y0 = y
      node.y1 = y + node.value * scale
      y = node.y1 + gap
    }
  }

  const centre = (node: LaidNode) => (node.y0 + node.y1) / 2
  // Push overlapping nodes apart inside the box, keeping their order.
  const settle = (stack: LaidNode[]) => {
    stack.sort((a, b) => a.y0 - b.y0 || a.index - b.index)
    let y = 0
    for (const node of stack) {
      const shift = Math.max(0, y - node.y0)
      node.y0 += shift
      node.y1 += shift
      y = node.y1 + gap
    }
    let bottom = height
    for (const node of stack.toReversed()) {
      const shift = Math.max(0, node.y1 - bottom)
      node.y0 -= shift
      node.y1 -= shift
      bottom = node.y0 - gap
    }
  }
  // Each node moves towards the value-weighted centre of what it connects to.
  const before = laid.map(() => [] as Array<{ node: LaidNode; value: number }>)
  const after = laid.map(() => [] as Array<{ node: LaidNode; value: number }>)
  kept.forEach((index, link) => {
    const [from, to] = edges[link]!
    const { value } = links[index]!
    after[from]!.push({ node: laid[to]!, value })
    before[to]!.push({ node: laid[from]!, value })
  })
  const place = new Map(laid.map((node, index) => [node, index]))
  const relax = (order: readonly LaidNode[][], neighbours: typeof before, alpha: number) => {
    for (const stack of order) {
      for (const node of stack) {
        let sum = 0
        let weight = 0
        for (const { node: other, value } of neighbours[place.get(node)!]!) {
          sum += centre(other) * value
          weight += value
        }
        if (weight === 0) continue
        const shift = (sum / weight - centre(node)) * alpha
        node.y0 += shift
        node.y1 += shift
      }
      settle(stack)
    }
  }
  for (let pass = 0; pass < iterations; pass++) {
    const alpha = 0.99 ** pass * 0.6
    relax(stacks, before, alpha)
    relax(stacks.toReversed(), after, alpha)
  }

  // Links stack along each node in the order of their other ends.
  const nextOut = laid.map((node) => node.y0)
  const nextIn = laid.map((node) => node.y0)
  const out: LaidLink[] = kept.map((index, link) => {
    const [source, target] = edges[link]!
    return { index, source, target, value: links[index]!.value, thickness: links[index]!.value * scale, y0: 0, y1: 0, x0: laid[source]!.x1, x1: laid[target]!.x0 }
  })
  const bySource = out.toSorted((a, b) => centre(laid[a.target]!) - centre(laid[b.target]!) || a.index - b.index)
  for (const link of bySource) {
    link.y0 = nextOut[link.source]! + link.thickness / 2
    nextOut[link.source]! += link.thickness
  }
  const byTarget = out.toSorted((a, b) => centre(laid[a.source]!) - centre(laid[b.source]!) || a.index - b.index)
  for (const link of byTarget) {
    link.y1 = nextIn[link.target]! + link.thickness / 2
    nextIn[link.target]! += link.thickness
  }

  if (mirror) {
    for (const node of laid) {
      const left = width - node.x1
      node.x1 = width - node.x0
      node.x0 = left
    }
    for (const link of out) {
      link.x0 = width - link.x0
      link.x1 = width - link.x1
    }
  }
  return { nodes: laid, links: out, columns, loops, scale }
}

const r = (value: number) => Math.round(value * 100) / 100

/** A ribbon from one column to the next: a band of constant vertical thickness between two curves. */
export function ribbonPath({ x0, x1, y0, y1, thickness }: Pick<LaidLink, "x0" | "x1" | "y0" | "y1" | "thickness">): string {
  const half = thickness / 2
  const mid = r((x0 + x1) / 2)
  return (
    `M${r(x0)},${r(y0 - half)}C${mid},${r(y0 - half)} ${mid},${r(y1 - half)} ${r(x1)},${r(y1 - half)}` +
    `L${r(x1)},${r(y1 + half)}C${mid},${r(y1 + half)} ${mid},${r(y0 + half)} ${r(x0)},${r(y0 + half)}Z`
  )
}

/** The ribbon's centre at a horizontal position, or null past its ends. */
export function ribbonCentreAt({ x0, x1, y0, y1 }: Pick<LaidLink, "x0" | "x1" | "y0" | "y1">, x: number): number | null {
  const span = x1 - x0
  if (span === 0) return null
  const progress = (x - x0) / span
  if (progress < 0 || progress > 1) return null
  // The curve's control points sit at mid-span: x(t) and y(t) are known cubics, so t is found by halving.
  let lo = 0
  let hi = 1
  for (let step = 0; step < 24; step++) {
    const t = (lo + hi) / 2
    const reached = 1.5 * t * (1 - t) + t ** 3
    if (reached < progress) lo = t
    else hi = t
  }
  const t = (lo + hi) / 2
  return y0 + (y1 - y0) * (3 * (1 - t) * t ** 2 + t ** 3)
}

/** The thinnest ribbon under a point, so a slim ribbon stays reachable where it crosses a wide one. */
export function ribbonAt(links: readonly LaidLink[], x: number, y: number, reach = 0): number | null {
  let best: number | null = null
  let thinnest = Infinity
  links.forEach((link, index) => {
    const centre = ribbonCentreAt(link, x)
    if (centre === null || Math.abs(y - centre) > link.thickness / 2 + reach || link.thickness >= thinnest) return
    thinnest = link.thickness
    best = index
  })
  return best
}
