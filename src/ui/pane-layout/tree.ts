/**
 * The layout tree: pure functions over plain JSON, free of React and the DOM, so migrations and
 * tests run anywhere. Every operation returns a normalised layout, and returns the same object
 * when nothing changed.
 */

/** A number is a share of the free space (`fr`); a rem length is a fixed track that follows UI scale. */
export type PaneSize = number | `${number}rem`

/** Children side by side or one above the other. */
export interface PaneSplit {
  type: "split"
  id: string
  /** `horizontal`: side by side. `vertical`: one above the other. As SplitPane. */
  orientation: "horizontal" | "vertical"
  children: readonly PaneNode[]
  /** One per child. Stored in reading order, so RTL mirrors without changing the JSON. */
  sizes: readonly PaneSize[]
}

/** One place on screen that shows one panel at a time. */
export interface PaneStack {
  type: "stack"
  id: string
  /** Host-owned ids, in tab order. A stack of one panel draws no tab strip by default. */
  panels: readonly string[]
  /** The panel shown. */
  active: string | null
  /** Hidden behind a rail button, as SplitPane's collapsed pane. */
  collapsed?: boolean
  /** `auto` (default): a strip from two panels. `always` and `never` fix it. */
  tabs?: "auto" | "always" | "never"
}

/** A node of the layout tree. */
export type PaneNode = PaneSplit | PaneStack

/**
 * A saved layout: structure and ids only, never React nodes, callbacks or credentials. Fields
 * this release does not know, such as a later optional `floating`, pass through unchanged.
 */
export interface PaneLayoutState {
  version: 1
  root: PaneNode
  /** The id of a stack filling the layout. */
  maximised?: string | null
}

/** Where a panel goes: into a stack (at `index` among its panels, default the end), or beside one, splitting it. */
export type PaneTarget = { stack: string; index?: number } | { stack: string; edge: PaneEdge }

const VERSION = 1

/** A node carrying the size `sized` gave it, until a split takes it into `sizes`. */
type Sized = PaneNode & { size?: PaneSize }

const isRem = (value: unknown): value is `${number}rem` => typeof value === "string" && /^\d+(\.\d+)?rem$/.test(value) && Number.parseFloat(value) > 0
const isSize = (value: unknown): value is PaneSize => (typeof value === "number" && Number.isFinite(value) && value > 0) || isRem(value)

/** A node without the size `sized` gave it. */
function bare(node: Sized): PaneNode {
  if (node.size === undefined) return node
  const { size: _size, ...rest } = node
  return rest as PaneNode
}

function split(orientation: PaneSplit["orientation"], prefix: string, children: readonly PaneNode[]): PaneSplit {
  const list = children as readonly Sized[]
  return {
    type: "split",
    id: `${prefix}:${list.map((child) => child.id).join("+")}`,
    orientation,
    children: list.map(bare),
    sizes: list.map((child) => child.size ?? 1),
  }
}

/** Children side by side. Each takes an equal share unless wrapped in {@link sized}. */
export const row = (...children: readonly PaneNode[]): PaneSplit => split("horizontal", "row", children)

/** Children one above the other. Each takes an equal share unless wrapped in {@link sized}. */
export const column = (...children: readonly PaneNode[]): PaneSplit => split("vertical", "column", children)

/** A stack of panels, the first one active. */
export function stack(...panels: readonly string[]): PaneStack {
  return { type: "stack", id: `stack:${panels[0] ?? ""}`, panels: [...panels], active: panels[0] ?? null }
}

/** A child of {@link row} or {@link column} with its size: a share of the free space, or a fixed rem length. */
export const sized = (node: PaneNode, size: PaneSize): PaneNode => ({ ...node, size }) as Sized

/** A layout from its root node. */
export const layoutOf = (root: PaneNode): PaneLayoutState => normaliseLayout({ version: VERSION, root: bare(root as Sized) })

/** A layout with nothing in it: one empty stack. */
export const emptyLayout = (): PaneLayoutState => ({ version: VERSION, root: { type: "stack", id: "stack:root", panels: [], active: null } })

/** Every node in reading order, depth first. */
function nodesOf(node: PaneNode): PaneNode[] {
  return node.type === "split" ? [node, ...node.children.flatMap(nodesOf)] : [node]
}

/** Every stack in reading order. */
export const stacksOf = (root: PaneNode): PaneStack[] => nodesOf(root).filter((node): node is PaneStack => node.type === "stack")

/** Every panel id in reading order. */
export const panelsOf = (root: PaneNode): string[] => stacksOf(root).flatMap((node) => node.panels)

/** The stack holding a panel. */
export const stackOf = (root: PaneNode, id: string) => stacksOf(root).find((node) => node.panels.includes(id))

const sameList = <T>(a: readonly T[], b: readonly T[]) => a.length === b.length && a.every((value, index) => value === b[index])

interface Seen {
  panels: Set<string>
  nodes: Set<string>
}

/** The smallest `<prefix>:<n>` no node uses. */
function freshId(prefix: string, used: Set<string>) {
  for (let n = 1; ; n += 1) {
    const id = `${prefix}:${n}`
    if (!used.has(id)) return id
  }
}

/** A node's id, replaced when another node already has it. */
function claimId(id: string, prefix: string, seen: Seen) {
  const next = seen.nodes.has(id) ? freshId(prefix, seen.nodes) : id
  seen.nodes.add(next)
  return next
}

function normaliseStack(node: PaneStack, seen: Seen): PaneStack {
  const panels = node.panels.filter((id) => !seen.panels.has(id) && Boolean(seen.panels.add(id)))
  const active = node.active !== null && panels.includes(node.active) ? node.active : (panels[0] ?? null)
  const id = claimId(node.id, "stack", seen)
  if (id === node.id && active === node.active && sameList(panels, node.panels)) return node
  return { ...node, id, panels, active }
}

/** A node with its problems repaired, or null when nothing of it is left. */
function normaliseNode(node: PaneNode, seen: Seen): PaneNode | null {
  if (node.type === "stack") {
    const next = normaliseStack(node, seen)
    return next.panels.length ? next : null
  }
  const id = claimId(node.id, "split", seen)
  const children: PaneNode[] = []
  const sizes: PaneSize[] = []
  node.children.forEach((child, index) => {
    const next = normaliseNode(child, seen)
    if (!next) return
    children.push(next)
    const size = node.sizes[index]
    sizes.push(isSize(size) ? size : 1)
  })
  if (children.length === 0) return null
  if (children.length === 1) return children[0]!
  if (id === node.id && sameList(children, node.children) && sameList(sizes, node.sizes)) return node
  return { ...node, id, children, sizes }
}

/**
 * A layout with its tree in order: empty stacks and splits gone, a split of one replaced by its
 * child, one entry in `sizes` per child, each panel in one stack, every `active` a panel of its
 * stack. Returns the same object when it is already in order.
 */
export function normaliseLayout(layout: PaneLayoutState): PaneLayoutState {
  const seen: Seen = { panels: new Set(), nodes: new Set() }
  const root = normaliseNode(layout.root, seen) ?? emptyLayout().root
  const maximised = layout.maximised && stacksOf(root).some((node) => node.id === layout.maximised) ? layout.maximised : null
  if (root === layout.root && maximised === (layout.maximised ?? null)) return layout
  const { maximised: _maximised, ...rest } = layout
  return maximised ? { ...rest, root, maximised } : { ...rest, root }
}

/** A node rebuilt with `change` applied to each stack and split, bottom up. */
function mapNode(node: PaneNode, change: (node: PaneNode) => PaneNode): PaneNode {
  if (node.type === "stack") return change(node)
  const children = node.children.map((child) => mapNode(child, change))
  return change(sameList(children, node.children) ? node : { ...node, children })
}

const withRoot = (layout: PaneLayoutState, root: PaneNode): PaneLayoutState => normaliseLayout(root === layout.root ? layout : { ...layout, root })

/** A stack without a panel, the panel's neighbour active if it was the active one. */
function without(node: PaneStack, id: string): PaneStack {
  const index = node.panels.indexOf(id)
  if (index < 0) return node
  const panels = node.panels.filter((panel) => panel !== id)
  const active = node.active === id ? (panels[index] ?? panels[index - 1] ?? null) : node.active
  return { ...node, panels, active }
}

const removePanel = (root: PaneNode, id: string) => mapNode(root, (node) => (node.type === "stack" ? without(node, id) : node))

/** Half of a size, for a new sibling that shares its track. */
function halve(size: PaneSize): PaneSize {
  if (typeof size === "number") return size / 2
  return `${Number.parseFloat(size) / 2}rem`
}

/** A side of a stack a panel can split to. */
export type PaneEdge = "start" | "end" | "top" | "bottom"

const EDGE_REACH = 0.25

/** Where a point lands in a box: the outer quarter on a side splits to it, the centre joins the stack. */
export function edgeAt(box: { left: number; top: number; width: number; height: number }, point: { x: number; y: number }, rtl: boolean): PaneEdge | "centre" {
  const left = (point.x - box.left) / box.width
  const top = (point.y - box.top) / box.height
  const reaches: [PaneEdge, number][] = [
    [rtl ? "end" : "start", left],
    [rtl ? "start" : "end", 1 - left],
    ["top", top],
    ["bottom", 1 - top],
  ]
  const [edge, reach] = reaches.reduce((nearest, entry) => (entry[1] < nearest[1] ? entry : nearest))
  return reach < EDGE_REACH ? edge : "centre"
}

const AXIS = { start: "horizontal", end: "horizontal", top: "vertical", bottom: "vertical" } as const

/** Beside `target`: in its parent split when that runs the same way, else in a new split in its place. */
function besideStack(root: PaneNode, target: string, placed: PaneStack, edge: keyof typeof AXIS): PaneNode {
  const orientation = AXIS[edge]
  const first = edge === "start" || edge === "top"
  const pair = (node: PaneNode) => (first ? [placed, node] : [node, placed])
  let joined = false
  const next = mapNode(root, (node) => {
    if (node.type !== "split" || node.orientation !== orientation) return node
    const index = node.children.findIndex((child) => child.id === target)
    if (index < 0) return node
    joined = true
    const size = node.sizes[index] ?? 1
    const half = halve(size)
    return { ...node, children: node.children.flatMap((child, at) => (at === index ? pair(child) : [child])), sizes: node.sizes.flatMap((value, at) => (at === index ? [half, half] : [value])) }
  })
  if (joined) return next
  const used = new Set(nodesOf(root).map((node) => node.id))
  const id = freshId("split", used)
  return mapNode(root, (node) => (node.id === target ? { type: "split", id, orientation, children: pair(node), sizes: [1, 1] } : node))
}

/**
 * A layout with a panel moved: into a stack, or beside one, which splits it. Nothing changes for
 * an unknown panel or stack, or for a move that would leave the panel where it is.
 */
export function movePanel(layout: PaneLayoutState, id: string, to: PaneTarget): PaneLayoutState {
  const source = stackOf(layout.root, id)
  const target = stacksOf(layout.root).find((node) => node.id === to.stack)
  if (!source || !target) return layout
  if ("edge" in to && to.edge) {
    if (source === target && source.panels.length === 1) return layout
    const used = new Set(nodesOf(layout.root).map((node) => node.id))
    const placed: PaneStack = { type: "stack", id: freshId("stack", used), panels: [id], active: id }
    return withRoot(layout, besideStack(removePanel(layout.root, id), to.stack, placed, to.edge))
  }
  const rest = target.panels.filter((panel) => panel !== id)
  const index = Math.max(0, Math.min(rest.length, ("index" in to ? to.index : undefined) ?? rest.length))
  const panels = [...rest.slice(0, index), id, ...rest.slice(index)]
  if (source === target && sameList(panels, target.panels) && target.active === id) return layout
  const root = mapNode(removePanel(layout.root, id), (node) => (node.id === to.stack && node.type === "stack" ? { ...node, panels, active: id } : node))
  return withRoot(layout, root)
}

/** A layout without a panel. An emptied stack closes and its siblings take the room. */
export function closePanel(layout: PaneLayoutState, id: string): PaneLayoutState {
  return stackOf(layout.root, id) ? withRoot(layout, removePanel(layout.root, id)) : layout
}

/** A layout with a new panel in a stack (default the first) or beside one. Reveals a panel already there. */
export function openPanel(layout: PaneLayoutState, id: string, to?: PaneTarget): PaneLayoutState {
  if (stackOf(layout.root, id)) return to ? movePanel(layout, id, to) : revealPanel(layout, id)
  const stacks = stacksOf(layout.root)
  const target = stacks.find((node) => node.id === to?.stack) ?? stacks[0]!
  const held = { ...target, panels: [...target.panels, id], active: id }
  const root = mapNode(layout.root, (node) => (node.id === target.id ? held : node))
  const opened = withRoot(layout, root)
  return to ? movePanel(opened, id, { ...to, stack: target.id }) : opened
}

/** A layout showing a panel: its stack's active panel, its stack open, and not behind another stack. */
export function revealPanel(layout: PaneLayoutState, id: string): PaneLayoutState {
  const holder = stackOf(layout.root, id)
  if (!holder) return layout
  const covered = layout.maximised && layout.maximised !== holder.id
  if (holder.active === id && !holder.collapsed && !covered) return layout
  const root = mapNode(layout.root, (node) => (node.id === holder.id ? { ...holder, active: id, collapsed: false } : node))
  return setMaximised(withRoot(layout, root), covered ? null : (layout.maximised ?? null))
}

/** A layout with a stack hidden behind its rail, or shown again. */
export function setStackCollapsed(layout: PaneLayoutState, id: string, collapsed: boolean): PaneLayoutState {
  return withRoot(layout, mapNode(layout.root, (node) => (node.id === id && node.type === "stack" && Boolean(node.collapsed) !== collapsed ? { ...node, collapsed } : node)))
}

/** A layout with a stack filling it, or none. */
export function setMaximised(layout: PaneLayoutState, id: string | null): PaneLayoutState {
  if ((layout.maximised ?? null) === id) return layout
  const { maximised: _maximised, ...rest } = layout
  return normaliseLayout(id ? { ...rest, maximised: id } : rest)
}

/** A layout with new sizes for a split's children, in `children` order. */
export function setSizes(layout: PaneLayoutState, id: string, sizes: readonly PaneSize[]): PaneLayoutState {
  return withRoot(layout, mapNode(layout.root, (node) => (node.id === id && node.type === "split" && !sameList(node.sizes, sizes) ? { ...node, sizes } : node)))
}

const round = (value: number) => Math.round(value * 1000) / 1000

/**
 * Two neighbouring tracks after their separator moves `delta` px from their sizes `a` and `b` in
 * px. Their sum holds: two shares trade shares, and a fixed track takes its new length while a
 * share beside it absorbs the difference.
 */
export function resizedPair(first: PaneSize, second: PaneSize, a: number, b: number, delta: number, rem: number): [PaneSize, PaneSize] {
  const total = a + b
  const shares = (typeof first === "number" ? first : 0) + (typeof second === "number" ? second : 0)
  const length = (px: number): `${number}rem` => `${round(px / rem)}rem`
  if (typeof first === "number" && typeof second === "number") {
    const next = round((shares * (a + delta)) / total)
    return [next, round(shares - next)]
  }
  return [typeof first === "number" ? first : length(a + delta), typeof second === "number" ? second : length(b - delta)]
}

/** Whether a value has the shape of a saved node, repaired where it can be. */
function parseNode(value: unknown): PaneNode | null {
  if (!value || typeof value !== "object") return null
  const node = value as Record<string, unknown>
  if (typeof node.id !== "string" || !node.id) return null
  if (node.type === "stack") {
    if (!Array.isArray(node.panels)) return null
    const panels = node.panels.filter((id): id is string => typeof id === "string" && id !== "")
    const parsed: PaneStack = { type: "stack", id: node.id, panels, active: typeof node.active === "string" ? node.active : null }
    if (node.collapsed === true) parsed.collapsed = true
    if (node.tabs === "auto" || node.tabs === "always" || node.tabs === "never") parsed.tabs = node.tabs
    return parsed
  }
  if (node.type !== "split" || !Array.isArray(node.children)) return null
  if (node.orientation !== "horizontal" && node.orientation !== "vertical") return null
  const sizes = Array.isArray(node.sizes) ? node.sizes : []
  const children: PaneNode[] = []
  const kept: PaneSize[] = []
  node.children.forEach((child, index) => {
    const parsed = parseNode(child)
    if (!parsed) return
    children.push(parsed)
    const size: unknown = sizes[index]
    kept.push(isSize(size) ? size : 1)
  })
  return { type: "split", id: node.id, orientation: node.orientation, children, sizes: kept }
}

/**
 * A saved layout read safely: malformed nodes drop, sizes renormalise and duplicate panels keep
 * their first place. Returns null for a value that is not a layout, and for a newer `version`,
 * so the host falls back to its default. Panel ids are never checked here: an id no `panel`
 * resolves today stays in the JSON (see `pruneLayout`).
 */
export function parsePaneLayout(value: unknown): PaneLayoutState | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const layout = value as Record<string, unknown>
  if (layout.version !== VERSION) return null
  const root = parseNode(layout.root)
  if (!root) return null
  const { maximised, ...rest } = layout
  const parsed: PaneLayoutState = { ...rest, version: VERSION, root }
  return normaliseLayout(typeof maximised === "string" ? { ...parsed, maximised } : parsed)
}

/** A layout without the panels `known` refuses, for a host that prefers dropping them to keeping them dormant. */
export function pruneLayout(layout: PaneLayoutState, known: (id: string) => boolean): PaneLayoutState {
  return panelsOf(layout.root).reduce((next, id) => (known(id) ? next : closePanel(next, id)), layout)
}
