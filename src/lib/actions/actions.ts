/**
 * Actions: define once, render everywhere (docs/ui-rules.md R12).
 *
 * An entity's actions are declared once with `defineActions`. Renderers read the same
 * definition:
 *   ActionMenu         the row ⋯ menu                      surface "menu"
 *   ActionContextMenu  right-click on a row or card         surface "context"
 *   ActionBar          the entity header (buttons + More ▾)  surface "header"
 *   command palette    while the entity is selected/in view surface "palette"
 *   bulk bar           selected rows (actions with bulk)     surface "bulk"
 *
 * Adding an action to a definition adds it to every surface. Renderers never filter by
 * hand; they call `resolveActions`, which applies visibility, enablement, ordering and
 * surface restrictions consistently.
 */
import type { IconComponent } from "../../ui/icon/index.js"

export type ActionSurface = "menu" | "context" | "header" | "palette" | "bulk"

/**
 * Fixed group order (R12.2). Groups render in this order, separated in menus;
 * `danger` is always last.
 */
export const ACTION_GROUPS = ["open", "connect", "manage", "organise", "danger"] as const
export type ActionGroup = (typeof ACTION_GROUPS)[number]

export interface ConfirmSpec {
  title: string
  /** One factual sentence: what will happen and whether it can be undone. */
  body?: string
  /** Visible label naming the outcome of the confirmation. */
  confirmLabel: string
  tone?: "default" | "warning" | "danger"
}

/** Services an action may use. Provided by the app shell through ActionProvider. */
export interface ActionContext {
  /** Rendering context, such as a page, card or docked pane. */
  surface: ActionSurface
  navigate: (to: string) => void
  toast: (message: { title: string; description?: string; tone?: "success" | "info" | "warning" | "danger" }) => void
  /** Application callback opening a serialisable view in a managed window. */
  openWindow: (kind: string, params: Record<string, string>) => void
}

export interface ActionDefinition<T> {
  id: string
  /** Label for one target; receives every target for bulk use ("Restart 3 endpoints"). */
  label: string | ((targets: readonly T[]) => string)
  icon?: IconComponent
  group: ActionGroup
  /** Keyboard shortcut shown in menus and registered in the palette, e.g. "mod+shift+r". */
  shortcut?: string
  /**
   * Header promotion: the lowest numbers become header buttons (ActionBar). Actions
   * without a priority only appear in menus.
   */
  priority?: number
  /** At most one action per definition is primary; it renders as the primary button. */
  primary?: boolean
  /** Can run against several targets at once (bulk bar, multi-select menus). */
  bulk?: boolean
  /** Restrict to some surfaces. Default: every surface. */
  surfaces?: readonly ActionSurface[]
  /** Hide when the action does not apply to these targets. */
  visible?: (targets: readonly T[]) => boolean
  /** Return a reason string to show the action disabled with that reason. */
  disabledReason?: (targets: readonly T[]) => string | false | null | undefined
  confirm?: (targets: readonly T[]) => ConfirmSpec | null
  /**
   * Sub-actions render as a submenu (menus) or a menu button (header). If the action also
   * has its own `run`, menus list that run as the submenu's first item (a split button's
   * main half), so it is reachable from every surface.
   */
  children?: readonly ActionDefinition<T>[]
  /** Operation invoked by the component. */
  run?: (targets: readonly T[], context: ActionContext) => unknown | Promise<unknown>
  /** Message for the success toast when run from a menu, palette or bulk bar. */
  successMessage?: (targets: readonly T[]) => string
}

/**
 * One entity type's actions, declared once and read by every renderer: `ActionMenu`,
 * `ActionContextMenu`, `ActionBar`, `usePaletteActions`, a DataTable's `actions` and bulk
 * bar. Create it with {@link defineActions}, at module scope or memoised.
 *
 * @typeParam T - The entity the actions run against (a table row, a selected record).
 */
export interface ActionSet<T> {
  /** Entity type name, such as "site"; groups the actions in the command palette. */
  readonly entity: string
  /** The entity's actions in definition order; renderers group and order them. */
  readonly actions: readonly ActionDefinition<T>[]
}

/**
 * Declare an entity's actions once (R12). `entity` names the type for palette grouping.
 * Throws when more than one action is `primary` or two actions share an id.
 *
 * @example
 * ```ts
 * import { defineActions } from "glass-ux/actions"
 *
 * export const siteActions = defineActions<Site>("site", [
 *   { id: "open", label: "Show details", group: "open", run: ([site]) => open(site) },
 *   { id: "acknowledge", label: "Acknowledge alerts", group: "manage", primary: true, bulk: true, run: acknowledge },
 * ])
 * ```
 */
export function defineActions<T>(entity: string, actions: readonly ActionDefinition<T>[]): ActionSet<T> {
  const primaries = actions.filter((action) => action.primary)
  if (primaries.length > 1) {
    throw new Error(`${entity}: at most one primary action (found ${primaries.map((a) => a.id).join(", ")})`)
  }
  const ids = new Set<string>()
  for (const action of actions) {
    if (ids.has(action.id)) throw new Error(`${entity}: duplicate action id ${action.id}`)
    ids.add(action.id)
  }
  return { entity, actions }
}

export interface ResolvedAction<T> {
  definition: ActionDefinition<T>
  id: string
  label: string
  /** Explains why the action is unavailable; the control remains focusable so the reason is accessible. */
  disabledReason: string | null
  children: ResolvedAction<T>[]
}

export interface ResolvedGroup<T> {
  group: ActionGroup
  /** Supporting actions rendered in the action slot. */
  actions: ResolvedAction<T>[]
}

function resolveOne<T>(action: ActionDefinition<T>, targets: readonly T[], surface: ActionSurface): ResolvedAction<T> | null {
  if (action.surfaces && !action.surfaces.includes(surface)) return null
  if (targets.length > 1 && !action.bulk) return null
  if (action.visible && !action.visible(targets)) return null
  const children = (action.children ?? [])
    .map((child) => resolveOne(child, targets, surface))
    .filter((child): child is ResolvedAction<T> => child !== null)
  if (action.children?.length && !children.length) return null
  const reason = action.disabledReason?.(targets)
  const label = typeof action.label === "function" ? action.label(targets) : action.label
  // A parent that also runs (a split action) offers its own run first inside the submenu.
  if (action.run && children.length) {
    const own: ActionDefinition<T> = { ...action, id: `${action.id}:self`, children: undefined, primary: false, priority: undefined }
    children.unshift({ definition: own, id: own.id, label, disabledReason: reason ? reason : null, children: [] })
  }
  return {
    definition: action,
    id: action.id,
    label,
    disabledReason: reason ? reason : null,
    children,
  }
}

/** Visible actions for these targets on this surface, grouped in the fixed order. */
export function resolveActions<T>(set: ActionSet<T>, targets: readonly T[], surface: ActionSurface): ResolvedGroup<T>[] {
  if (!targets.length) return []
  return ACTION_GROUPS.map((group) => ({
    group,
    actions: set.actions
      .filter((action) => action.group === group)
      .map((action) => resolveOne(action, targets, surface))
      .filter((action): action is ResolvedAction<T> => action !== null),
  })).filter((group) => group.actions.length > 0)
}

/**
 * Split actions for a header: the promoted ones (by priority, primary last so it sits
 * right-most) and the overflow for "More actions ▾".
 */
export function splitForHeader<T>(groups: ResolvedGroup<T>[], maxButtons: number) {
  const all = groups.flatMap((group) => group.actions)
  const promoted = all
    .filter((action) => action.definition.priority !== undefined || action.definition.primary)
    .toSorted((a, b) => (a.definition.priority ?? 0) - (b.definition.priority ?? 0))
    .slice(0, maxButtons)
    .toSorted((a, b) => Number(Boolean(a.definition.primary)) - Number(Boolean(b.definition.primary)))
  const promotedIds = new Set(promoted.map((action) => action.id))
  const overflow = groups
    .map((group) => ({ ...group, actions: group.actions.filter((action) => !promotedIds.has(action.id)) }))
    .filter((group) => group.actions.length > 0)
  return { promoted, overflow }
}
