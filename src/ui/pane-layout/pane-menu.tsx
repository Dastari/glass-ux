/** A panel's menus, loaded when a layout can be edited, so a locked mail layout carries none of this. */
import type { ReactElement, ReactNode } from "react"
import { IconMoreHorizontal } from "../../icons/generated/icons.js"
import { resolveActions, type ActionSurface, type ResolvedAction } from "../../lib/actions/actions.js"
import { useMessages } from "../../lib/i18n/index.js"
import { ActionMenuItems } from "../actions/action-menu.js"
import { Button } from "../button/index.js"
import { ContextMenu } from "../context-menu/index.js"
import { Menu } from "../menu/index.js"
import { paneLayoutMessages } from "./messages.js"
import { usePanelActions } from "./pane-actions.js"

const SKIP_CONTEXT = {} as never

/** The rows run themselves: moves report through the layout, not a toast. */
const run = (action: ResolvedAction<string>, targets: readonly string[]) => void action.definition.run?.(targets, SKIP_CONTEXT)

function Rows({ id, surface }: { id: string; surface: ActionSurface }) {
  const set = usePanelActions()
  const groups = resolveActions(set, [id], surface)
  return <ActionMenuItems groups={groups} targets={[id]} surface={surface} onRun={run} />
}

/** The rows a tab's context menu adds; the strip adds its own Close. */
export function PaneTabRows({ id }: { id: string }) {
  return <Rows id={id} surface="context" />
}

/** The ⋯ button of a stack's bar: every action for its active panel (R11.6). */
export function PaneMenuButton({ id, title, extra }: { id: string; title: string; extra?: ReactNode }) {
  const messages = useMessages(paneLayoutMessages)
  const label = messages.panelActions(title)
  return (
    <Menu.Root>
      <Menu.Trigger render={<Button variant="ghost" size="sm" icon={<IconMoreHorizontal />} aria-label={label} />} />
      <Menu.Popup align="end" aria-label={label}>
        {extra}
        <Rows id={id} surface="menu" />
      </Menu.Popup>
    </Menu.Root>
  )
}

/** The same menu on a panel's title: right-click, long-press, Shift+F10 or the Menu key. */
export function PaneTitleMenu({ id, title, extra, children }: { id: string; title: string; extra?: ReactNode; children: ReactElement }) {
  const messages = useMessages(paneLayoutMessages)
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger render={children} />
      <ContextMenu.Popup aria-label={messages.panelActions(title)}>
        {extra}
        <Rows id={id} surface="menu" />
      </ContextMenu.Popup>
    </ContextMenu.Root>
  )
}
