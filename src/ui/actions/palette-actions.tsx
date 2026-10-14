import { useMemo } from "react"
import { resolveActions, type ActionSet, type ResolvedAction } from "../../lib/actions/actions.js"
import { usePaletteCommands, type PaletteCommand } from "../command-palette/index.js"
import { useActionRunner } from "./action-provider.js"

/**
 * Register an entity's actions in the command palette while the caller is mounted — the
 * selected row, the open endpoint page (R12.1). They appear under the target's name;
 * submenu actions flatten to "Power › Restart". Memoise `targets`.
 */
export function usePaletteActions<T>(set: ActionSet<T>, targets: readonly T[], label: string) {
  const { start } = useActionRunner()
  const commands = useMemo(() => {
    const list: PaletteCommand[] = []
    const add = (action: ResolvedAction<T>, parent?: ResolvedAction<T>) => {
      if (action.children.length) {
        for (const child of action.children) add(child, action)
        return
      }
      const Icon = action.definition.icon ?? parent?.definition.icon
      list.push({
        id: `${set.entity}:${label}:${parent ? `${parent.id}/` : ""}${action.id}`,
        label: parent ? `${parent.label} › ${action.label}` : action.label,
        group: label,
        icon: Icon ? <Icon /> : undefined,
        keywords: [set.entity, ...(parent ? [parent.label] : [])],
        shortcut: action.definition.shortcut,
        tone: action.definition.group === "danger" ? "danger" : "default",
        disabledReason: action.disabledReason ?? parent?.disabledReason ?? null,
        run: () => start(action, targets, "palette"),
      })
    }
    for (const group of resolveActions(set, targets, "palette")) for (const action of group.actions) add(action)
    return list
  }, [set, targets, label, start])
  usePaletteCommands(commands)
}
