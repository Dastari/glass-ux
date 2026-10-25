/**
 * Check states for a hierarchy of checkboxes (TreeSelect and Cascader with `multiple`), kept
 * pure so the strategies are cheap to test. A node is checked, unchecked or mixed; a branch
 * is checked when every child is, mixed when some are. The value lists checked nodes by the
 * chosen strategy, in tree order.
 */

/**
 * Which checked nodes the value lists.
 *
 * - `parent` (default): a fully checked branch stands for everything under it, so the value
 *   holds the topmost fully checked nodes. Children loaded later are included.
 * - `child`: only leaves (and branches whose children are not loaded yet).
 * - `all`: every checked node, branches and leaves.
 */
export type CheckStrategy = "all" | "parent" | "child"

/** A node's checkbox: ticked, unticked or mixed (some of its descendants are ticked). */
export type CheckState = "checked" | "unchecked" | "mixed"

/** The shape the check logic reads: an id, loaded children and a disabled flag. */
export interface CheckNodeLike<T extends CheckNodeLike<T>> {
  id: string
  children?: readonly T[]
  disabled?: boolean
}

/** Parents, children and tree order of a hierarchy, built once per `nodes`. */
export interface CheckIndex<T extends CheckNodeLike<T>> {
  /** Every node by id. */
  byId: ReadonlyMap<string, T>
  /** Each node's parent id (null at the top). */
  parentOf: ReadonlyMap<string, string | null>
  /** Ids in tree (pre-)order. */
  order: readonly string[]
  /** Top-level nodes. */
  roots: readonly T[]
}

/** Index a hierarchy for the check functions. Ids must be unique. */
export function indexChecks<T extends CheckNodeLike<T>>(nodes: readonly T[]): CheckIndex<T> {
  const byId = new Map<string, T>()
  const parentOf = new Map<string, string | null>()
  const order: string[] = []
  const visit = (list: readonly T[], parent: string | null) => {
    for (const node of list) {
      byId.set(node.id, node)
      parentOf.set(node.id, parent)
      order.push(node.id)
      if (node.children?.length) visit(node.children, node.id)
    }
  }
  visit(nodes, null)
  return { byId, parentOf, order, roots: nodes }
}

const hasLoadedChildren = <T extends CheckNodeLike<T>>(node: T) => Boolean(node.children?.length)

/**
 * The ticked "units" a value stands for: every listed node and all of its loaded
 * descendants. Ids the index does not know are ignored here (and kept by `toggleCheck`).
 */
function tickedFrom<T extends CheckNodeLike<T>>(index: CheckIndex<T>, value: readonly string[]): Set<string> {
  const ticked = new Set<string>()
  const mark = (node: T) => {
    ticked.add(node.id)
    node.children?.forEach(mark)
  }
  for (const id of value) {
    const node = index.byId.get(id)
    if (node) mark(node)
  }
  return ticked
}

/** Derive every node's state bottom-up from the ticked leaves. */
function statesFrom<T extends CheckNodeLike<T>>(index: CheckIndex<T>, ticked: ReadonlySet<string>): Map<string, CheckState> {
  const states = new Map<string, CheckState>()
  const visit = (node: T): CheckState => {
    if (!hasLoadedChildren(node)) {
      const state: CheckState = ticked.has(node.id) ? "checked" : "unchecked"
      states.set(node.id, state)
      return state
    }
    let checked = 0
    let touched = false
    for (const child of node.children!) {
      const state = visit(child)
      if (state === "checked") checked += 1
      if (state !== "unchecked") touched = true
    }
    const state: CheckState = checked === node.children!.length ? "checked" : touched ? "mixed" : "unchecked"
    states.set(node.id, state)
    return state
  }
  index.roots.forEach(visit)
  return states
}

/** Every known node's state for a value (nodes not in the map are unchecked). */
export function checkStates<T extends CheckNodeLike<T>>(index: CheckIndex<T>, value: readonly string[]): Map<string, CheckState> {
  return statesFrom(index, tickedFrom(index, value))
}

/** The value for a set of states under a strategy, in tree order. */
function serialise<T extends CheckNodeLike<T>>(index: CheckIndex<T>, states: ReadonlyMap<string, CheckState>, strategy: CheckStrategy): string[] {
  const out: string[] = []
  if (strategy === "all") {
    for (const id of index.order) if (states.get(id) === "checked") out.push(id)
    return out
  }
  if (strategy === "child") {
    for (const id of index.order) if (states.get(id) === "checked" && !hasLoadedChildren(index.byId.get(id)!)) out.push(id)
    return out
  }
  const visit = (list: readonly T[]) => {
    for (const node of list) {
      const state = states.get(node.id)
      if (state === "checked") out.push(node.id)
      else if (state === "mixed" && node.children) visit(node.children)
    }
  }
  visit(index.roots)
  return out
}

/** Rewrite a value in a strategy's form (e.g. after `nodes` load children, or the strategy changed). */
export function normaliseChecks<T extends CheckNodeLike<T>>(index: CheckIndex<T>, value: readonly string[], strategy: CheckStrategy = "parent"): string[] {
  const unknown = value.filter((id) => !index.byId.has(id))
  return [...serialise(index, checkStates(index, value), strategy), ...unknown]
}

/** A node can be toggled when neither it nor an ancestor is disabled. */
export function checkDisabled<T extends CheckNodeLike<T>>(index: CheckIndex<T>, id: string): boolean {
  let current: string | null | undefined = id
  while (current) {
    if (index.byId.get(current)?.disabled) return true
    current = index.parentOf.get(current)
  }
  return false
}

/**
 * Toggle a node: an unchecked or mixed node checks every enabled descendant; a checked one
 * clears them. Disabled descendants keep their state, so their branch may stay mixed. Ids
 * in `value` that the index does not know (under a branch that has not loaded) are kept.
 */
export function toggleCheck<T extends CheckNodeLike<T>>(
  index: CheckIndex<T>,
  value: readonly string[],
  id: string,
  strategy: CheckStrategy = "parent",
): string[] {
  const node = index.byId.get(id)
  if (!node || checkDisabled(index, id)) return [...value]
  const ticked = tickedFrom(index, value)
  const before = statesFrom(index, ticked)
  const on = before.get(id) !== "checked"
  const apply = (current: T) => {
    if (current.disabled) return
    if (!hasLoadedChildren(current)) {
      if (on) ticked.add(current.id)
      else ticked.delete(current.id)
      return
    }
    current.children!.forEach(apply)
  }
  apply(node)
  // Ancestors that were ticked as a whole lose that when a descendant clears.
  if (!on) {
    let parent = index.parentOf.get(id)
    while (parent) {
      ticked.delete(parent)
      parent = index.parentOf.get(parent)
    }
    ticked.delete(id)
  }
  // A leaf's own tick is its unit; a branch's state derives from its children.
  for (const known of ticked) if (hasLoadedChildren(index.byId.get(known)!)) ticked.delete(known)
  const unknown = value.filter((item) => !index.byId.has(item))
  return [...serialise(index, statesFrom(index, ticked), strategy), ...unknown]
}

/**
 * Check or clear every enabled node. Disabled nodes keep their state. Clearing also drops
 * ids the index does not know; checking keeps them.
 */
export function setAllChecks<T extends CheckNodeLike<T>>(index: CheckIndex<T>, value: readonly string[], all: boolean, strategy: CheckStrategy = "parent"): string[] {
  const ticked = tickedFrom(index, value)
  for (const id of index.order) {
    if (hasLoadedChildren(index.byId.get(id)!)) {
      ticked.delete(id)
      continue
    }
    if (checkDisabled(index, id)) continue
    if (all) ticked.add(id)
    else ticked.delete(id)
  }
  const unknown = all ? value.filter((item) => !index.byId.has(item)) : []
  return [...serialise(index, statesFrom(index, ticked), strategy), ...unknown]
}
