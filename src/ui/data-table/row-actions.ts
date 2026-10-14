/**
 * Per-row actions (R12): when a table's rows are different kinds (a device list: an endpoint
 * is not a printer), each row has its own ActionSet. One row resolves its own set, so its ⋯
 * and right-click match its header exactly. Several rows of different kinds share what every
 * one of their sets offers for the selection: an action whose id each set resolves, bulk in
 * each, run against each set's own rows with that set's definition. When every kind's
 * definition runs the same function (an action shared by every kind, such as one that opens a
 * dialog for the selection), it runs once, with every row.
 */
import {
  ACTION_GROUPS,
  resolveActions,
  type ActionDefinition,
  type ActionSet,
  type ActionSurface,
  type ConfirmSpec,
  type ResolvedAction,
  type ResolvedGroup,
} from "../../lib/actions/actions.js"

export type RowActionsOf<T> = (row: T) => ActionSet<T> | undefined

interface Part<T> {
  /** Shared action definitions used by menus, headers and the command palette. */
  set: ActionSet<T>
  /** Selected entities passed to action visibility, enablement, confirmation and execution. */
  targets: T[]
}

/** Targets split by the set each belongs to, in first-seen order. Targets without a set are dropped. */
function partition<T>(targets: readonly T[], setOf: RowActionsOf<T>): Part<T>[] {
  const parts = new Map<ActionSet<T>, T[]>()
  for (const target of targets) {
    const set = setOf(target)
    if (!set) continue
    const bucket = parts.get(set)
    if (bucket) bucket.push(target)
    else parts.set(set, [target])
  }
  return [...parts.entries()].map(([set, bucket]) => ({ set, targets: bucket }))
}

const flatten = <T>(groups: ResolvedGroup<T>[]) => groups.flatMap((group) => group.actions)

/**
 * Merge one action resolved by each part into one action for every target. Children merge by
 * id the same way; a parent whose children share nothing is dropped.
 */
function merge<T>(resolved: ResolvedAction<T>[], parts: Part<T>[], all: readonly T[], setOf: RowActionsOf<T>): ResolvedAction<T> | null {
  const first = resolved[0]!
  // A submenu in one kind and a plain action in another are not the same action.
  if (resolved.some((action) => Boolean(action.children.length) !== Boolean(first.children.length))) return null
  const definitions = new Map(parts.map((part, index) => [part.set, resolved[index]!.definition]))
  const children = first.children.flatMap((child) => {
    const matches = resolved.map((action) => action.children.find((candidate) => candidate.id === child.id))
    if (matches.some((match) => !match)) return []
    const merged = merge(matches as ResolvedAction<T>[], parts, all, setOf)
    return merged ? [merged] : []
  })
  if (first.children.length && !children.length) return null
  const defs = [...definitions.values()]
  const runnable = defs.every((definition) => definition.run)
  const shared = runnable && defs.every((definition) => definition.run === defs[0]!.run) ? defs[0]!.run : undefined
  const definition: ActionDefinition<T> = {
    ...first.definition,
    children: undefined,
    // A confirmation any kind asks for is asked once, naming the whole selection.
    confirm: defs.some((entry) => entry.confirm)
      ? (targets) => defs.reduce<ConfirmSpec | null>((found, entry) => found ?? entry.confirm?.(targets) ?? null, null)
      : undefined,
    successMessage: defs.find((entry) => entry.successMessage)?.successMessage,
    // One function shared by every kind runs once; otherwise each kind runs its own definition
    // against its own rows.
    run: shared
      ? (targets, context) => shared(targets, context)
      : runnable
      ? async (targets, context) => {
          const runs = partition(targets, setOf).map((part) => definitions.get(part.set)?.run?.(part.targets, context))
          await Promise.all(runs)
        }
      : undefined,
  }
  return {
    definition,
    id: first.id,
    label: typeof first.definition.label === "function" ? first.definition.label(all) : first.label,
    disabledReason: resolved.find((action) => action.disabledReason)?.disabledReason ?? null,
    children,
  }
}

/**
 * The actions for these targets on this surface, when each row has its own set. One kind of
 * row resolves its set as usual (`resolveActions`); several kinds share the actions every set
 * resolves (bulk in each when there is more than one target), in the fixed group order.
 */
export function resolveRowActions<T>(targets: readonly T[], setOf: RowActionsOf<T>, surface: ActionSurface): ResolvedGroup<T>[] {
  const parts = partition(targets, setOf)
  if (!parts.length) return []
  // Some targets have no actions at all: nothing applies to the selection as a whole.
  if (parts.reduce((sum, part) => sum + part.targets.length, 0) !== targets.length) return []
  if (parts.length === 1) return resolveActions(parts[0]!.set, targets, surface)
  const many = targets.length > 1
  const resolved = parts.map((part) => flatten(resolveActions(part.set, part.targets, surface)))
  const [lead, ...rest] = resolved
  const merged = (lead ?? []).flatMap((action) => {
    const matches = [action, ...rest.map((actions) => actions.find((candidate) => candidate.id === action.id))]
    if (matches.some((match) => !match || (many && !match.definition.bulk))) return []
    const result = merge(matches as ResolvedAction<T>[], parts, targets, setOf)
    return result ? [result] : []
  })
  return ACTION_GROUPS.map((group) => ({ group, actions: merged.filter((action) => action.definition.group === group) })).filter((group) => group.actions.length > 0)
}
