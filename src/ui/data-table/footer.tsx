import type { RowData } from "@tanstack/react-table"
import type { ReactNode } from "react"
import { IconChevronDown, IconClose, IconMoreHorizontal } from "../../icons/generated/icons.js"
import type { ResolvedAction, ResolvedGroup } from "../../lib/actions/actions.js"
import { ActionMenuItems, useActionRunner, type ActionRunHandler } from "../actions/index.js"
import { Button, type ButtonVariant } from "../button/index.js"
import { Menu } from "../menu/index.js"
import { Pagination, type PaginationCursor } from "../pagination/index.js"
import { useLocale } from "../../lib/locale/use-locale.js"
import { formatNumber, formatRelative } from "./format.js"
import { useNow } from "./use-now.js"

/** "Updated 2 min ago", on the shared clock. */
function UpdatedAt({ value }: { value: Date | number }) {
  const now = useNow()
  const locale = useLocale()
  const time = value instanceof Date ? value.getTime() : value
  // The shared clock ticks every 15 s: a refresh newer than its last tick is "just now",
  // never "in less than a minute".
  const relative = formatRelative(time, Math.max(now || time, time), locale)
  return (
    <span className="fa-dt-status-item" suppressHydrationWarning>
      {relative === "just now" ? "Updated just now" : `Updated ${relative}`}
    </span>
  )
}

export interface BulkProps<T extends RowData> {
  /** Item count shown by the component. */
  count: number
  /** Selected entities passed to action visibility, enablement, confirmation and execution. */
  targets: T[]
  /** `resolveActions(set, targets, "bulk")`. */
  groups: ResolvedGroup<T>[]
  /** The table's `onAction`; without it the shared runner runs (confirm → run → toast). */
  onRun: ActionRunHandler<T> | undefined
  /** Names the selection in menus: "3 endpoints". */
  label: string
  custom?: ReactNode
  clear: () => void
  /** Icon-only buttons in a narrow footer. */
  narrow: boolean
}

const MAX_BULK_BUTTONS = 3

function variantOf<T>(action: ResolvedAction<T>): ButtonVariant {
  return action.definition.group === "danger" ? "danger-soft" : "secondary"
}

/** One bulk action: a button, or a menu button when it has sub-actions. */
function BulkButton<T extends RowData>({
  action,
  targets,
  label,
  narrow,
  onRun,
}: {
  /** Trailing action for a notice or result. */
  action: ResolvedAction<T>
  /** Selected entities passed to action visibility, enablement, confirmation and execution. */
  targets: T[]
  label: string
  narrow: boolean
  /** The table's `onAction`, called with the action, the selected rows and `"bulk"` when the person presses the button; without it the shared runner runs the action. */
  onRun: ActionRunHandler<T> | undefined
}) {
  const { start } = useActionRunner()
  const Icon = action.definition.icon
  const iconOnly = Boolean(narrow && Icon)
  const icon = Icon ? <Icon /> : undefined
  // The Button keeps a disabled action focusable and shows why in its tooltip (R12.3).
  const disabledReason = action.disabledReason ?? undefined

  if (action.children.length) {
    return (
      <Menu.Root>
        <Menu.Trigger
          disabled={Boolean(disabledReason)}
          render={
            <Button
              size="sm"
              variant={variantOf(action)}
              icon={icon}
              iconEnd={iconOnly ? undefined : <IconChevronDown />}
              aria-label={iconOnly ? action.label : undefined}
              disabledReason={disabledReason}
            >
              {iconOnly ? undefined : action.label}
            </Button>
          }
        />
        <Menu.Popup side="top" align="start" aria-label={`${action.label} for ${label}`}>
          <ActionMenuItems groups={[{ group: action.definition.group, actions: action.children }]} targets={targets} surface="bulk" onRun={onRun} />
        </Menu.Popup>
      </Menu.Root>
    )
  }

  return (
    <Button
      size="sm"
      variant={variantOf(action)}
      icon={icon}
      aria-label={iconOnly ? action.label : undefined}
      disabledReason={disabledReason}
      onClick={() => (onRun ? onRun(action, targets, "bulk") : void start(action, targets, "bulk"))}
    >
      {iconOnly ? undefined : action.label}
    </Button>
  )
}

/**
 * The bulk-action bar (R16.5). It overlays the status bar in the same box, so selecting
 * rows never moves the footer or the rows above it (R9.5). Its actions are the entity's
 * bulk actions, run like every other surface's and reported by a toast (R12.5).
 */
function BulkBar<T extends RowData>({ count, targets, groups, onRun, label, custom, clear, narrow }: BulkProps<T>) {
  const locale = useLocale()
  const open = count > 0
  const actions = groups.flatMap((group) => group.actions)
  const shown = actions.slice(0, MAX_BULK_BUTTONS)
  const overflow = groups
    .map((group) => ({ ...group, actions: group.actions.filter((action) => !shown.includes(action)) }))
    .filter((group) => group.actions.length)
  return (
    <div className="fa-dt-bulk" data-open={open ? "" : undefined} inert={!open} role="toolbar" aria-label="Selected rows">
      <span className="fa-dt-bulk-count" data-numeric>
        {formatNumber(count, 0, locale)} selected
      </span>
      <div className="fa-dt-bulk-actions">
        {custom ??
          shown.map((action) => <BulkButton key={action.id} action={action} targets={targets} label={label} narrow={narrow} onRun={onRun} />)}
        {!custom && overflow.length ? (
          <Menu.Root>
            <Menu.Trigger
              render={
                narrow ? (
                  <Button size="sm" variant="secondary" icon={<IconMoreHorizontal />} aria-label={`More actions for ${label}`} />
                ) : (
                  <Button size="sm" variant="secondary" iconEnd={<IconChevronDown />}>
                    More
                  </Button>
                )
              }
            />
            <Menu.Popup side="top" align="end" aria-label={`More actions for ${label}`}>
              <ActionMenuItems groups={overflow} targets={targets} surface="bulk" onRun={onRun} />
            </Menu.Popup>
          </Menu.Root>
        ) : null}
      </div>
      <Button size="sm" variant="ghost" icon={<IconClose />} onClick={clear} aria-label={narrow ? "Clear selection" : undefined}>
        {narrow ? undefined : "Clear"}
      </Button>
    </div>
  )
}

export interface FooterProps<T extends RowData> {
  pageIndex: number
  /** Number of records per page. */
  pageSize: number
  pageRows: number
  rowCount?: number
  /** Page-size choices offered by pagination. */
  pageSizes: readonly number[]
  /** Controlled cursor or crosshair state. */
  cursor?: PaginationCursor
  /** Called with the zero-based index of the page the person asks for. Pair with `pageIndex`. */
  onPageChange: (pageIndex: number) => void
  /** Called with the rows-per-page the person picks from `pageSizes`. Pair with `pageSize`. */
  onPageSizeChange: (pageSize: number) => void
  compact: boolean
  disabled: boolean
  /** First load: placeholders instead of counts. */
  loading: boolean
  updatedAt?: Date | number
  /** Current operation or connection status. */
  status?: ReactNode
  label: string
  /** Count text for a table that fits on one page ("5 applications"). */
  countLabel: string
  /** Grouped tables page each group on its own ("Show more"): a count instead of a pager. */
  grouped?: boolean
  bulk: BulkProps<T>
}

/** The table's status bar: freshness and status on the left, the pager on the right. */
export function DataTableFooter<T extends RowData>({
  pageIndex,
  pageSize,
  pageRows,
  rowCount,
  pageSizes,
  cursor,
  onPageChange,
  onPageSizeChange,
  compact,
  disabled,
  loading,
  updatedAt,
  status,
  label,
  countLabel,
  grouped = false,
  bulk,
}: FooterProps<T>) {
  const bulkOpen = bulk.count > 0
  // One page and nowhere to go (or groups paged in place): a count instead of a pager.
  const singlePage =
    (grouped && !loading) || (!loading && !cursor && pageIndex === 0 && (rowCount ?? pageRows) <= pageSize && pageRows <= pageSize)
  return (
    <div className="fa-dt-footer" data-compact={compact ? "" : undefined}>
      <div className="fa-dt-status" inert={bulkOpen} data-hidden={bulkOpen ? "" : undefined}>
        {!compact && (updatedAt !== undefined || status) ? (
          <div className="fa-dt-status-text">
            {status}
            {updatedAt !== undefined ? <UpdatedAt value={updatedAt} /> : null}
          </div>
        ) : null}
        {singlePage ? (
          <span className="fa-dt-count" data-numeric>
            {countLabel}
          </span>
        ) : (
          <Pagination
            className="fa-dt-pager"
            pageIndex={pageIndex}
            pageSize={pageSize}
            pageRows={pageRows}
            rowCount={rowCount}
            pageSizes={pageSizes}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            cursor={cursor}
            compact={compact}
            disabled={disabled}
            loading={loading}
            label={`${label} pages`}
          />
        )}
      </div>
      <BulkBar {...bulk} />
    </div>
  )
}
