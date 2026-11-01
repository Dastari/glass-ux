import { useMemo } from "react"
import { resolveActions, type ActionSet, type ResolvedAction } from "../../lib/actions/actions.js"
import { useActionRunner } from "../actions/action-provider.js"
import type { MenubarEntry } from "./types.js"

/** What {@link useMenubarActions} returns. */
export interface MenubarActions {
  /** One action as a row or submenu, by id, for a menu laid out by hand. Null when it is hidden for these targets. */
  item: (id: string) => MenubarEntry | null
  /** Every visible action in the set's fixed group order, with the hairline before the danger group. */
  all: MenubarEntry[]
}

function toEntry<T>(action: ResolvedAction<T>, targets: readonly T[], start: ReturnType<typeof useActionRunner>["start"]): MenubarEntry {
  const { definition, label, disabledReason } = action
  const Icon = definition.icon
  const icon = Icon ? <Icon /> : undefined
  const tone = definition.group === "danger" ? "danger" : "default"
  if (action.children.length) {
    return { kind: "submenu", id: action.id, label, icon, tone, disabledReason, items: action.children.map((child) => toEntry(child, targets, start)) }
  }
  return {
    id: action.id,
    label,
    icon,
    tone,
    disabledReason,
    commandId: action.commandId,
    shortcut: definition.shortcut,
    shortcutScoped: definition.shortcutScoped,
    onSelect: () => void start(action, targets, "menu"),
  }
}

function find<T>(actions: readonly ResolvedAction<T>[], id: string): ResolvedAction<T> | undefined {
  for (const action of actions) {
    if (action.id === id) return action
    const child = find(action.children, id)
    if (child) return child
  }
  return undefined
}

/**
 * An action set as menubar rows: the same definition as its menus, palette entries and
 * shortcuts (R1.2). Rows run through the action runner, confirmation included, show a keymap's
 * rebinding, and register nothing. Run the keys with `useActionShortcuts`. Memoise `targets`.
 *
 * @example
 * const actions = useMenubarActions(documentActions, targets)
 * const menus = [{ id: "file", label: "File", items: [actions.item("save"), actions.item("export")] }]
 */
export function useMenubarActions<T>(set: ActionSet<T>, targets: readonly T[]): MenubarActions {
  const { start } = useActionRunner()
  return useMemo(() => {
    const groups = resolveActions(set, targets, "menu")
    const resolved = groups.flatMap((group) => group.actions)
    return {
      item: (id) => {
        const action = find(resolved, id)
        return action ? toEntry(action, targets, start) : null
      },
      all: groups.flatMap((group, index): MenubarEntry[] => {
        const items = group.actions.map((action) => toEntry(action, targets, start))
        const row: MenubarEntry = { kind: "group", id: group.group, items }
        return group.group === "danger" && index > 0 ? [{ kind: "separator", id: "danger-separator" }, row] : [row]
      }),
    }
  }, [set, targets, start])
}
