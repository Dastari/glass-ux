import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { IconChevronDown, IconMoreHorizontal } from "../../icons/generated/icons.js"
import { resolveActions, splitForHeader, type ActionSet, type ResolvedAction, type ResolvedGroup } from "../../lib/actions/actions.js"
import { cx } from "../../lib/cx.js"
import { useElementSize } from "../../lib/use-element-size.js"
import { Button, ButtonGroup, useActionFeedback, type ButtonVariant } from "../button/index.js"
import { Menu } from "../menu/index.js"
import { ActionMenuItems } from "./action-menu.js"
import { useActionRunner } from "./action-provider.js"

const useIsomorphicLayoutEffect = typeof window === "undefined" ? () => {} : useLayoutEffect

export type ActionBarLevel = "full" | "compact" | "collapsed"

interface Fit {
  /** How many promoted actions stay buttons. */
  count: number
  /** full: "More actions ▾" · compact: an icon-only More · collapsed: one ⋯ menu. */
  level: ActionBarLevel
}

interface Widths {
  /** Natural width of each candidate button, keyed by action id. */
  buttons: Map<string, number>
  /** Count or definition of remaining items. */
  more: number
  moreIcon: number
  gap: number
}

/** The most buttons that fit, keeping the primary longest (R21.2: at the narrowest, one ⋯). */
function fit<T>(groups: ResolvedGroup<T>[], max: number, available: number, widths: Widths | null): Fit {
  const total = groups.reduce((sum, group) => sum + group.actions.length, 0)
  const candidates = splitForHeader(groups, max).promoted.length
  if (!widths || available <= 0) return { count: candidates, level: "full" }
  for (let count = candidates; count >= 1; count--) {
    const kept = splitForHeader(groups, count).promoted
    const buttons = kept.reduce((sum, action) => sum + (widths.buttons.get(action.id) ?? 0), 0) + widths.gap * (kept.length - 1)
    const overflow = total > kept.length
    if (!overflow && buttons <= available) return { count, level: "full" }
    if (overflow && buttons + widths.gap + widths.more <= available) return { count, level: "full" }
    if (overflow && buttons + widths.gap + widths.moreIcon <= available) return { count, level: "compact" }
  }
  return { count: 0, level: "collapsed" }
}

function iconOf<T>(action: ResolvedAction<T>) {
  const Icon = action.definition.icon
  return Icon ? <Icon /> : undefined
}

function variantOf<T>(action: ResolvedAction<T>): ButtonVariant {
  if (action.definition.primary) return "primary"
  if (action.definition.group === "danger") return "danger-soft"
  return "secondary"
}

interface HeaderButtonProps<T> {
  /** Trailing action for a notice or result. */
  action: ResolvedAction<T>
  /** Selected entities passed to action visibility, enablement, confirmation and execution. */
  targets: readonly T[]
  label: string
  /** Rendered off-screen for measuring: inert, no behaviour. */
  measuring?: boolean
}

/** A promoted action. Async work confirms in place: pending → ✓ / ✕ (R9.2, R12.5). */
function HeaderButton<T>({ action, targets, label, measuring }: HeaderButtonProps<T>) {
  const { start } = useActionRunner()
  const { status, run } = useActionFeedback()
  const variant = variantOf(action)
  const disabled = Boolean(action.disabledReason)
  // The Button keeps a disabled action focusable and shows why in its tooltip (R12.3).
  const disabledReason = action.disabledReason ?? undefined
  const icon = iconOf(action)

  const onRun = () => {
    if (measuring) return
    const pending = start(action, targets, "header")
    if (pending) void run(() => pending)
  }

  // A primary with children is a split button; any other parent is a menu button.
  if (action.children.length) {
    const menu = (
      <Menu.Popup align="end" aria-label={`${action.label} for ${label}`}>
        <ActionMenuItems
          // The split button's main half already runs the parent; don't list it again.
          groups={[{ group: action.definition.group, actions: action.children.filter((child) => !child.id.endsWith(":self")) }]}
          targets={targets}
          surface="menu"
        />
      </Menu.Popup>
    )
    if (action.definition.primary && action.definition.run) {
      return (
        <ButtonGroup attached>
          <Button variant={variant} icon={icon} status={status} disabledReason={disabledReason} onClick={onRun}>
            {action.label}
          </Button>
          <Menu.Root>
            <Menu.Trigger
              disabled={disabled}
              render={<Button variant={variant} icon={<IconChevronDown />} aria-label={`More ${action.label.toLowerCase()} options`} />}
            />
            {measuring ? null : menu}
          </Menu.Root>
        </ButtonGroup>
      )
    }
    return (
      <Menu.Root>
        <Menu.Trigger
          disabled={disabled}
          render={
            <Button variant={variant} icon={icon} iconEnd={<IconChevronDown />} disabledReason={disabledReason}>
              {action.label}
            </Button>
          }
        />
        {measuring ? null : menu}
      </Menu.Root>
    )
  }

  return (
    <Button variant={variant} icon={icon} status={status} disabledReason={disabledReason} onClick={onRun}>
      {action.label}
    </Button>
  )
}

/** The overflow menu is always a ghost button: it is a menu, not an action. */
function MoreMenu<T>({ groups, targets, label, compact }: { groups: ResolvedGroup<T>[]; targets: readonly T[]; label: string; compact: boolean }) {
  const trigger = compact ? (
    <Button variant="ghost" icon={<IconMoreHorizontal />} aria-label={`More actions for ${label}`} />
  ) : (
    <Button variant="ghost" iconEnd={<IconChevronDown />}>
      More actions
    </Button>
  )
  return (
    <Menu.Root>
      <Menu.Trigger render={trigger} />
      <Menu.Popup align="end" aria-label={`More actions for ${label}`}>
        <ActionMenuItems groups={groups} targets={targets} surface="menu" />
      </Menu.Popup>
    </Menu.Root>
  )
}

export interface ActionBarProps<T> {
  /** Shared action definitions used by menus, headers and the command palette. */
  set: ActionSet<T>
  /** Selected entities passed to action visibility, enablement, confirmation and execution. */
  targets: readonly T[]
  /** The target's name, for accessible names: "More actions for NST-C106". */
  label: string
  /** Most buttons to promote when there is room (the primary included). */
  maxButtons?: number
  className?: string
  /** Report the current level (tests, stories). */
  onLevelChange?: (level: ActionBarLevel, count: number) => void
  /**
   * The room the bar may use, when its container decides it: an entity header, where the
   * name and facts keep their width first. The bar then folds buttons into More to fit and
   * is only as wide as what it shows, so the room it leaves stays with its neighbours.
   * Omitted, the bar measures its own box and asks for room for every button.
   */
  available?: number
}

/**
 * The entity header's actions (R12.1): the top-priority actions as buttons, the primary
 * right-most, the rest under "More actions ▾". It adapts to its container, not the
 * viewport: as the space narrows, buttons move into the More menu (lowest priority
 * first), More becomes ⋯, and at the narrowest everything collapses into a single ⋯
 * menu (R21.2). The bar is right-aligned and one control tall at every level, so the
 * primary never moves and nothing around it shifts.
 */
export function ActionBar<T>({ set, targets, label, maxButtons = 3, className, onLevelChange, available }: ActionBarProps<T>) {
  const groups = resolveActions(set, targets, "header")
  const candidates = splitForHeader(groups, maxButtons).promoted
  const barRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const { width } = useElementSize(barRef)
  const measureSize = useElementSize(measureRef)
  const [widths, setWidths] = useState<Widths | null>(null)
  const signature = candidates.map((action) => `${action.id}:${action.label}:${action.disabledReason ?? ""}`).join("|")

  // Measure each candidate's natural width from an inert copy, so the decision never
  // depends on what is currently shown (no feedback loops, no flicker).
  useIsomorphicLayoutEffect(() => {
    const layer = measureRef.current
    if (!layer) return
    const read = (selector: string) => layer.querySelector<HTMLElement>(selector)?.getBoundingClientRect().width ?? 0
    const buttons = new Map<string, number>()
    for (const action of candidates) buttons.set(action.id, read(`[data-measure="${CSS.escape(action.id)}"]`))
    const gap = Number.parseFloat(getComputedStyle(layer).columnGap) || 0
    setWidths({ buttons, more: read('[data-measure="more"]'), moreIcon: read('[data-measure="more-icon"]'), gap })
  }, [signature, measureSize.width, measureSize.height])

  const { count, level } = fit(groups, maxButtons, available ?? width, widths)
  const { promoted, overflow } = splitForHeader(groups, count)

  // The width the bar wants with every candidate showing. As its preferred width (not a
  // flex-basis, which a column container would apply to its height) it lets a header give
  // the actions their room first and truncate the title's subtitle instead.
  const total = groups.reduce((sum, group) => sum + group.actions.length, 0)
  const fullWidth = widths
    ? candidates.reduce((sum, action) => sum + (widths.buttons.get(action.id) ?? 0), 0) +
      widths.gap * Math.max(0, candidates.length - 1) +
      (total > candidates.length ? widths.gap + widths.more : 0)
    : undefined

  useIsomorphicLayoutEffect(() => {
    onLevelChange?.(level, count)
  }, [level, count])

  if (!groups.length) return null

  let content: ReactNode
  if (level === "collapsed") {
    content = <MoreMenu groups={groups} targets={targets} label={label} compact />
  } else {
    // Secondary buttons, then More, then the primary right-most (as in the header mockup).
    const secondary = promoted.filter((action) => !action.definition.primary)
    const primary = promoted.filter((action) => action.definition.primary)
    content = (
      <>
        {secondary.map((action) => (
          <HeaderButton key={action.id} action={action} targets={targets} label={label} />
        ))}
        {overflow.length ? <MoreMenu groups={overflow} targets={targets} label={label} compact={level === "compact"} /> : null}
        {primary.map((action) => (
          <HeaderButton key={action.id} action={action} targets={targets} label={label} />
        ))}
      </>
    )
  }

  return (
    <div
      ref={barRef}
      className={cx("fa-action-bar", className)}
      style={fullWidth && available === undefined ? ({ "--_full": `${Math.ceil(fullWidth)}px` } as CSSProperties) : undefined}
      data-sizing={available === undefined ? undefined : "container"}
      data-level={level}
      data-count={count}
      role="toolbar"
      aria-label={`Actions for ${label}`}
    >
      <div className="fa-action-bar-row">{content}</div>
      <div ref={measureRef} className="fa-action-bar-measure" aria-hidden inert>
        {candidates.map((action) => (
          <span key={action.id} data-measure={action.id} className="fa-action-bar-cell">
            <HeaderButton action={action} targets={targets} label={label} measuring />
          </span>
        ))}
        <span data-measure="more" className="fa-action-bar-cell">
          <Button variant="ghost" iconEnd={<IconChevronDown />} tabIndex={-1}>
            More actions
          </Button>
        </span>
        <span data-measure="more-icon" className="fa-action-bar-cell">
          <Button variant="ghost" icon={<IconMoreHorizontal />} aria-label="More actions" tabIndex={-1} />
        </span>
      </div>
    </div>
  )
}
