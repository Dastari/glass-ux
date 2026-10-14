import { Fragment, useId, useLayoutEffect, useRef, useState, type ReactElement } from "react"
import { IconMoreHorizontal } from "../../icons/generated/icons.js"
import { resolveActions, type ActionSet, type ActionSurface, type ResolvedAction, type ResolvedGroup } from "../../lib/actions/actions.js"
import { Button, type ButtonSize } from "../button/index.js"
import { Menu, MenuPreview, reasonRuns } from "../menu/index.js"
import { useActionRunner } from "./action-provider.js"

/** Menus run actions after they close, so focus is home before a confirm or window opens. */
const afterClose = (task: () => void) => setTimeout(task, 0)

function actionIcon<T>(action: ResolvedAction<T>) {
  const Icon = action.definition.icon
  return Icon ? <Icon /> : undefined
}

function toneOf<T>(action: ResolvedAction<T>) {
  return action.definition.group === "danger" ? ("danger" as const) : ("default" as const)
}

/** Runs a chosen action in place of the shared runner. */
export type ActionRunHandler<T> = (action: ResolvedAction<T>, targets: readonly T[], surface: ActionSurface) => void

export interface ActionMenuItemsProps<T> {
  /** Action groups in display order. */
  groups: ResolvedGroup<T>[]
  /** Selected entities passed to action visibility, enablement, confirmation and execution. */
  targets: readonly T[]
  /** The surface the actions report as (menu, context, palette, bulk). */
  surface: ActionSurface
  /**
   * Run chosen actions yourself instead of with the shared runner (confirm → run → toast).
   * The handler then owns confirmation and feedback. A DataTable's `onAction` uses it.
   */
  onRun?: ActionRunHandler<T> | undefined
}

interface RowProps<T> {
  /** Trailing action for a notice or result. */
  action: ResolvedAction<T>
  /** Selected entities passed to action visibility, enablement, confirmation and execution. */
  targets: readonly T[]
  /** Rendering context, such as a page, card or docked pane. */
  surface: ActionSurface
  /** Whether the state’s explanation is visible. */
  reasonShown: boolean
  /** ID of the element explaining the current state. */
  reasonId: string
  /** Called when run occurs. The callback type specifies its arguments. */
  onRun: ActionRunHandler<T> | undefined
}

function ActionItem<T>({ action, targets, surface, reasonShown, reasonId, onRun }: RowProps<T>) {
  const { start } = useActionRunner()
  if (action.children.length) {
    return (
      <Menu.Submenu
        icon={actionIcon(action)}
        label={action.label}
        disabledReason={action.disabledReason}
        reasonShown={reasonShown}
        reasonId={reasonId}
        tone={toneOf(action)}
      >
        <ActionRows actions={action.children} targets={targets} surface={surface} onRun={onRun} />
      </Menu.Submenu>
    )
  }
  return (
    <Menu.Item
      icon={actionIcon(action)}
      shortcut={action.definition.shortcut}
      tone={toneOf(action)}
      disabledReason={action.disabledReason}
      reasonShown={reasonShown}
      reasonId={reasonId}
      onClick={() => afterClose(() => (onRun ? onRun(action, targets, surface) : void start(action, targets, surface)))}
    >
      {action.label}
    </Menu.Item>
  )
}

/** A list of rows. Rows disabled for the same reason in a run share one reason line. */
function ActionRows<T>({
  actions,
  targets,
  surface,
  onRun,
}: {
  /** Supporting actions rendered in the action slot. */
  actions: ResolvedAction<T>[]
  /** Selected entities passed to action visibility, enablement, confirmation and execution. */
  targets: readonly T[]
  /** Rendering context, such as a page, card or docked pane. */
  surface: ActionSurface
  /** Called when run occurs. The callback type specifies its arguments. */
  onRun: ActionRunHandler<T> | undefined
}) {
  const base = useId()
  const owners = reasonRuns(actions.map((action) => action.disabledReason))
  return actions.map((action, index) => (
    <ActionItem
      key={action.id}
      action={action}
      targets={targets}
      surface={surface}
      reasonShown={owners[index] === index}
      reasonId={`${base}-${owners[index] ?? index}`}
      onRun={onRun}
    />
  ))
}

/**
 * The rows of an action menu: groups in the fixed order (R12.2), set apart by space, with
 * one hairline before the destructive group. Shared by ActionMenu, ActionContextMenu and
 * the ActionBar's overflow so they can never differ.
 */
export function ActionMenuItems<T>({ groups, targets, surface, onRun }: ActionMenuItemsProps<T>) {
  return groups.map((group, index) => (
    <Fragment key={group.group}>
      {group.group === "danger" && index > 0 ? <Menu.Separator /> : null}
      <Menu.Group>
        <ActionRows actions={group.actions} targets={targets} surface={surface} onRun={onRun} />
      </Menu.Group>
    </Fragment>
  ))
}

export interface ActionMenuProps<T> {
  /** Shared action definitions used by menus, headers and the command palette. */
  set: ActionSet<T>
  /** Selected entities passed to action visibility, enablement, confirmation and execution. */
  targets: readonly T[]
  /** The target's name, for the trigger's accessible name: "Actions for NST-C106". */
  label: string
  size?: ButtonSize
  /** Replace the ⋯ trigger (it must forward its ref and spread props). */
  trigger?: ReactElement
  /** Alignment of the overlay relative to its anchor. */
  align?: "start" | "center" | "end"
}

/** The row ⋯ menu (R12.1): a ghost icon button that opens every action for the row. */
export function ActionMenu<T>({ set, targets, label, size = "sm", trigger, align = "end" }: ActionMenuProps<T>) {
  const groups = resolveActions(set, targets, "menu")
  if (!groups.length) return null
  return (
    <Menu.Root>
      <Menu.Trigger
        render={trigger ?? <Button variant="ghost" size={size} icon={<IconMoreHorizontal />} aria-label={`Actions for ${label}`} />}
      />
      <Menu.Popup align={align} aria-label={`Actions for ${label}`}>
        <ActionMenuItems groups={groups} targets={targets} surface="menu" />
      </Menu.Popup>
    </Menu.Root>
  )
}

/**
 * The same menu drawn statically, for documentation. `openSubmenu` shows one submenu open
 * beside it, and `highlight` marks a row as if hovered.
 */
export function ActionMenuPreview<T>({
  set,
  targets,
  label,
  openSubmenu,
  highlight,
}: {
  /** Shared action definitions used by menus, headers and the command palette. */
  set: ActionSet<T>
  /** Selected entities passed to action visibility, enablement, confirmation and execution. */
  targets: readonly T[]
  label: string
  /** Currently open submenu identifier. */
  openSubmenu?: string
  /** Ranges or value highlighted in a search result. */
  highlight?: string
}) {
  const groups = resolveActions(set, targets, "menu")
  const open = groups.flatMap((group) => group.actions).find((action) => action.id === openSubmenu)
  const rootRef = useRef<HTMLDivElement>(null)
  const [offset, setOffset] = useState(0)
  // Line the submenu's first row up with the row that opens it, as the live menu does.
  useLayoutEffect(() => {
    if (!openSubmenu) return
    const opener = rootRef.current?.querySelector<HTMLElement>("[data-popup-open]")
    const surface = rootRef.current?.firstElementChild as HTMLElement | null
    if (opener && surface) setOffset(opener.getBoundingClientRect().top - surface.getBoundingClientRect().top)
  }, [openSubmenu])
  const rows = (actions: ResolvedAction<T>[]) => {
    const owners = reasonRuns(actions.map((action) => action.disabledReason))
    return actions.map((action, index) => row(action, owners[index] === index))
  }
  const row = (action: ResolvedAction<T>, reasonShown: boolean) => (
    <MenuPreview.Item
      key={action.id}
      icon={actionIcon(action)}
      shortcut={action.definition.shortcut}
      tone={toneOf(action)}
      disabledReason={action.disabledReason}
      reasonShown={reasonShown}
      submenu={action.children.length > 0}
      open={action.id === openSubmenu}
      highlighted={action.id === highlight}
    >
      {action.label}
    </MenuPreview.Item>
  )
  return (
    <div ref={rootRef} className="fa-action-menu-preview">
      <MenuPreview.Surface label={`Actions for ${label}`}>
        {groups.map((group, index) => (
          <Fragment key={group.group}>
            {group.group === "danger" && index > 0 ? <MenuPreview.Separator /> : null}
            <MenuPreview.Group>{rows(group.actions)}</MenuPreview.Group>
          </Fragment>
        ))}
      </MenuPreview.Surface>
      {open ? (
        <div className="fa-action-submenu-preview" style={{ marginTop: offset }}>
          <MenuPreview.Surface label={open.label}>{rows(open.children)}</MenuPreview.Surface>
        </div>
      ) : null}
    </div>
  )
}
