import { useMemo } from "react"
import { resolveActions, type ActionSet, type ResolvedAction } from "../../lib/actions/actions.js"
import { useShortcutCommands, type ShortcutCommand } from "../keymap/index.js"
import { useActionRunner } from "./action-provider.js"

/**
 * Register an entity's actions with the KeymapProvider while the caller is mounted: the same
 * definition as its menus and palette entries (R1.2). Each action with a `shortcut` becomes a
 * command with a stable id, `<entity>.<action id>`, so a rebinding survives a change of
 * target, and menus and the palette then show the rebound keys. Runs through the action
 * runner, confirmation included. Actions left off the palette surface are left out, as they
 * are from its key handling. Memoise `targets`.
 *
 * @param group The heading in the help dialog; the entity's plural name, or the target's.
 */
export function useActionShortcuts<T>(set: ActionSet<T>, targets: readonly T[], group: string): void {
  const { start } = useActionRunner()
  const commands = useMemo(() => {
    const list: ShortcutCommand[] = []
    const add = (action: ResolvedAction<T>, parent?: ResolvedAction<T>) => {
      if (action.children.length) {
        for (const child of action.children) add(child, action)
        return
      }
      const keys = action.definition.shortcut
      if (!keys || !action.commandId) return
      list.push({
        id: action.commandId,
        label: parent ? `${parent.label} › ${action.label}` : action.label,
        group,
        keys,
        textEntry: action.definition.shortcutTextEntry,
        disabledReason: action.disabledReason ?? parent?.disabledReason ?? null,
        run: () => void start(action, targets, "palette"),
      })
    }
    for (const resolved of resolveActions(set, targets, "palette")) for (const action of resolved.actions) add(action)
    return list
  }, [set, targets, group, start])
  useShortcutCommands(commands)
}
