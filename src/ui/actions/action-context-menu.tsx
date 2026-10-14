import type { ReactElement } from "react"
import { resolveActions, type ActionSet } from "../../lib/actions/actions.js"
import { ContextMenu } from "../context-menu/index.js"
import { ActionMenuItems } from "./action-menu.js"

export interface ActionContextMenuProps<T> {
  /** Shared action definitions used by menus, headers and the command palette. */
  set: ActionSet<T>
  /** Selected entities passed to action visibility, enablement, confirmation and execution. */
  targets: readonly T[]
  /** The target's name: "Actions for NST-C106". */
  label: string
  /**
   * The row or card that owns the actions. It must forward its ref and spread props; make
   * it focusable so Shift+F10 and the Menu key reach the menu from the keyboard.
   */
  children: ReactElement
}

/**
 * Right-click (long-press, Shift+F10, the Menu key) on a row or card opens exactly the
 * menu its ⋯ button opens (R11.6) — the same definition, the same item parts.
 */
export function ActionContextMenu<T>({ set, targets, label, children }: ActionContextMenuProps<T>) {
  const groups = resolveActions(set, targets, "context")
  return (
    <ContextMenu.Root disabled={!groups.length}>
      <ContextMenu.Trigger render={children} />
      <ContextMenu.Popup aria-label={`Actions for ${label}`}>
        <ActionMenuItems groups={groups} targets={targets} surface="context" />
      </ContextMenu.Popup>
    </ContextMenu.Root>
  )
}
