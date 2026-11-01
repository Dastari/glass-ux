import { useEffect, useId, useLayoutEffect, useRef, useState, type ComponentProps, type KeyboardEvent, type MouseEvent, type ReactNode } from "react"
import { useAnnounce } from "../../hooks/use-announce.js"
import { IconBell, IconCheck, IconCheckCheck, IconClose, IconError, IconMail } from "../../icons/generated/icons.js"
import { useClock } from "../../lib/clock.js"
import { cx } from "../../lib/cx.js"
import { useMessages } from "../../lib/i18n/index.js"
import { useLocale } from "../../lib/locale/use-locale.js"
import { useControllable } from "../../lib/use-controllable.js"
import { useHeldRows } from "../../lib/use-held-rows.js"
import type { BadgeTone } from "../badge/index.js"
import { Button } from "../button/index.js"
import { toTime } from "../data-table/format.js"
import { RelativeTime } from "../data-table/cells/relative-time.js"
import { EmptyState } from "../empty-state/index.js"
import { ScrollArea } from "../scroll-area/index.js"
import { Segmented } from "../segmented/index.js"
import { Skeleton } from "../skeleton/index.js"
import { ToneDot } from "../tone-dot/index.js"
import { VisuallyHidden } from "../visually-hidden/index.js"
import { dayLabel, dayNumber } from "./group.js"
import { notificationListMessages } from "./messages.js"

/** One notification. It names no kind of thing: the application writes the words. */
export interface NotificationItem {
  /** Stable identifier. */
  id: string
  /** What happened, as a sentence: it also names the row's controls. */
  title: string
  /** A second line of data. Text and inline elements only: it sits inside the row's link or button. */
  description?: ReactNode
  /** When it happened, as epoch milliseconds, ISO string or Date. */
  at: Date | number | string
  /** Whether the person has read it. Default false. */
  read?: boolean
  /** Leading icon or Avatar. Pass an icon without a size. */
  icon?: ReactNode
  /** Colours the marker when there is no icon. Tones mean status (R3.3). */
  tone?: BadgeTone
  /** Names the marker when `title` does not say what the tone means. */
  toneLabel?: string
  /** The group's heading when `groupBy` is `host`. */
  group?: string
  /** Makes the row a link. */
  href?: string
  /** One action of its own, called through `onAction`; with `href` it is a link instead. */
  action?: { label: string; href?: string }
}

/** A choice in the filter. */
export interface NotificationFilter {
  /** Identifier, reported by `onFilterChange`. */
  id: string
  /** The option's name. */
  label: string
  /** Keeps a row when `filtering` is `client`. Absent, every row stays. */
  matches?: (item: NotificationItem) => boolean
}

/** How rows are grouped: by the day of `at`, by the `group` of each item, or not at all. */
export type NotificationGrouping = "day" | "host" | "none"

export interface NotificationListProps extends Omit<ComponentProps<"div">, "children"> {
  /** The rows, controlled, in display order: newest first, as the host keeps them. */
  items?: readonly NotificationItem[]
  /** The rows at first when uncontrolled. The list then applies read and dismiss itself. */
  defaultItems?: readonly NotificationItem[]
  /** Called with the next rows after a change the list made itself. */
  onItemsChange?: (items: readonly NotificationItem[]) => void
  /** Called when a row is opened. Makes rows without `href` a button; with `href`, call `preventDefault` to route. */
  onOpen?: (item: NotificationItem, event: MouseEvent) => void
  /** Called when rows are marked read or unread, opening one included. Without it there is no read control. */
  onReadChange?: (ids: readonly string[], read: boolean) => void
  /** Called for Mark all read, which may reach rows not loaded. Without it there is no such control. */
  onMarkAllRead?: () => void
  /** Called when a row is dismissed. Without it there is no dismiss control. */
  onDismiss?: (item: NotificationItem) => void
  /** Called for an item's own `action`. */
  onAction?: (item: NotificationItem) => void
  /** Choices in the filter, or `false` for no filter. Default All and Unread. */
  filters?: readonly NotificationFilter[] | false
  /** The chosen filter's id, controlled. */
  filter?: string
  /** The chosen filter at first when uncontrolled. Default the first. */
  defaultFilter?: string
  /** Called with the chosen filter's id. */
  onFilterChange?: (filter: string) => void
  /** `client` filters the loaded rows; `host` shows `items` as given, for a list paged on the server (R16.7). Default `client`. */
  filtering?: "client" | "host"
  /** How rows are grouped. Default `day`. */
  groupBy?: NotificationGrouping
  /** Unread rows everywhere, loaded or not. Mark all read stays available while this is above zero. Default: counted from the rows. */
  unreadCount?: number
  /** First load, or a whole list being replaced: skeleton rows in the list's box, and nothing is held. */
  loading?: boolean
  /** Skeleton rows to draw. Default 5. */
  loadingRows?: number
  /** Why the list failed, shown in its box. Default a factual line. Pass `true` for that line. */
  error?: ReactNode
  /** Offers Retry after `error`, and calls it. */
  onRetry?: () => void
  /** The empty line. Default "No notifications". */
  emptyLabel?: string
  /** More rows exist. The list calls `onLoadMore` when its end comes into view, and shows a button there. */
  hasMore?: boolean
  /** Called for the next page. */
  onLoadMore?: () => void
  /** The next page is on its way. */
  loadingMore?: boolean
  /** The next page failed. Its place shows this and Retry, which calls `onLoadMore`. Default a factual line. Pass `true` for that line. */
  loadMoreError?: ReactNode
  /** New rows wait behind a count until asked for, so nothing moves under the pointer (R17.3). `false` shows them at once. Default true. */
  holdNew?: boolean
}

const ROW = "[data-notification-row]"
const CONTROL = "a[href], button, time[tabindex]"

/** The row's first focusable control. */
function firstControl(row: Element | null | undefined) {
  return row?.querySelector<HTMLElement>(CONTROL) ?? null
}

interface RowProps {
  item: NotificationItem
  /** This row's controls are in the tab order: the list is one tab stop (R11.5). */
  current: boolean
  onOpen?: (item: NotificationItem, event: MouseEvent) => void
  onRead?: (item: NotificationItem) => void
  onDismiss?: (item: NotificationItem) => void
  onAction?: (item: NotificationItem) => void
}

function Row({ item, current, onOpen, onRead, onDismiss, onAction }: RowProps) {
  const messages = useMessages(notificationListMessages)
  const tabIndex = current ? 0 : -1
  const unread = !item.read
  const text = (
    <>
      <span className="fa-notification-title">
        {unread ? <VisuallyHidden>{messages.unreadPrefix} </VisuallyHidden> : null}
        {item.title}
      </span>
      {item.description ? <span className="fa-notification-description">{item.description}</span> : null}
    </>
  )
  const opens = item.href !== undefined || onOpen !== undefined
  const open = (event: MouseEvent) => {
    onOpen?.(item, event)
    if (unread) onRead?.(item)
  }
  const time = <span className="fa-notification-time"><RelativeTime value={item.at} tabIndex={opens ? undefined : tabIndex} /></span>
  return (
    <li className="fa-notification" data-notification-row={item.id} data-unread={unread ? "" : undefined}>
      <span className="fa-notification-dot" aria-hidden />
      <span
        className="fa-notification-marker"
        data-tone={item.tone}
        role={item.toneLabel ? "img" : undefined}
        aria-label={item.toneLabel}
        aria-hidden={item.toneLabel ? undefined : true}
      >
        {item.icon ?? (item.tone ? <ToneDot tone={item.tone} /> : <IconBell />)}
      </span>
      {item.href !== undefined ? (
        <a className="fa-notification-main" href={item.href} tabIndex={tabIndex} onClick={open}>
          {text}
          {time}
        </a>
      ) : onOpen ? (
        <button type="button" className="fa-notification-main" tabIndex={tabIndex} onClick={open}>
          {text}
          {time}
        </button>
      ) : (
        <div className="fa-notification-main">
          {text}
          {time}
        </div>
      )}
      {item.action ? (
        <span className="fa-notification-action">
          {item.action.href !== undefined ? (
            <a className="fa-notification-link" href={item.action.href} tabIndex={tabIndex}>
              {item.action.label}
            </a>
          ) : onAction ? (
            <Button size="xs" tabIndex={tabIndex} onClick={() => onAction(item)}>
              {item.action.label}
            </Button>
          ) : null}
        </span>
      ) : null}
      {onRead || onDismiss ? (
        <span className="fa-notification-tools">
          {onRead ? (
            <Button
              variant="ghost"
              size="xs"
              tabIndex={tabIndex}
              icon={unread ? <IconCheck /> : <IconMail />}
              aria-label={unread ? messages.markRead(item.title) : messages.markUnread(item.title)}
              tooltip={unread ? messages.markRead(item.title) : messages.markUnread(item.title)}
              onClick={() => onRead(item)}
            />
          ) : null}
          {onDismiss ? (
            <Button
              variant="ghost"
              size="xs"
              tabIndex={tabIndex}
              icon={<IconClose />}
              aria-label={messages.dismiss(item.title)}
              onClick={() => onDismiss(item)}
            />
          ) : null}
        </span>
      ) : null}
    </li>
  )
}

function SkeletonRows({ rows }: { rows: number }) {
  return (
    <div className="fa-notification-rows" aria-hidden>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="fa-notification" data-skeleton="">
          <span className="fa-notification-dot" />
          <Skeleton.Circle className="fa-notification-marker" size="var(--icon-md)" />
          <span className="fa-notification-main">
            <Skeleton.Text type="label" width={`${70 - (index % 3) * 12}%`} />
            <Skeleton.Text type="caption" width="30%" />
          </span>
        </div>
      ))}
    </div>
  )
}

interface Group {
  key: string
  label: string | null
  rows: NotificationItem[]
}

function groupRows(rows: readonly NotificationItem[], by: NotificationGrouping, label: (item: NotificationItem) => string): Group[] {
  if (by === "none") return rows.length ? [{ key: "all", label: null, rows: [...rows] }] : []
  const groups = new Map<string, Group>()
  for (const item of rows) {
    const key = by === "day" ? String(dayNumber(toTime(item.at))) : (item.group ?? "")
    const group = groups.get(key)
    if (group) group.rows.push(item)
    else groups.set(key, { key, label: by === "day" ? label(item) : item.group || null, rows: [item] })
  }
  return [...groups.values()]
}

/**
 * Notifications from the host, grouped by day or by the host's groups. Unread rows carry a dot,
 * a heavier title and "Unread:" at the start of their accessible name. Mark read, Mark all read,
 * dismiss and each item's action exist only when the host supplies their callback.
 *
 * The list is one tab stop (R11.5): ↑ ↓ Home End move between rows, and Tab walks the current
 * row's controls. New rows wait behind a count at the top (R17.3), announced politely, and rows
 * marked read stay under an Unread filter until it changes, so nothing moves under the pointer.
 * It fills its box: give the parent a height. The host owns every read, write and subscription.
 */
export function NotificationList({
  items,
  defaultItems = [],
  onItemsChange,
  onOpen,
  onReadChange,
  onMarkAllRead,
  onDismiss,
  onAction,
  filters,
  filter,
  defaultFilter,
  onFilterChange,
  filtering = "client",
  groupBy = "day",
  unreadCount,
  loading = false,
  loadingRows = 5,
  error,
  onRetry,
  emptyLabel,
  hasMore = false,
  onLoadMore,
  loadingMore = false,
  loadMoreError,
  holdNew = true,
  className,
  "aria-label": label,
  ...rest
}: NotificationListProps) {
  const messages = useMessages(notificationListMessages)
  const locale = useLocale()
  const now = useClock()
  const announce = useAnnounce()
  const prefix = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const footRef = useRef<HTMLDivElement>(null)
  const [rows, setRows] = useControllable(items, defaultItems, onItemsChange)
  const uncontrolled = items === undefined

  const choices =
    filters === false
      ? []
      : (filters ?? [
          { id: "all", label: messages.all },
          { id: "unread", label: messages.unread, matches: (item: NotificationItem) => !item.read },
        ])
  const [filterId, setFilterId] = useControllable(filter, defaultFilter ?? choices[0]?.id ?? "")
  const choice = choices.find((option) => option.id === filterId)

  const ids = rows.map((item) => item.id)
  const { held, reveal } = useHeldRows(ids, { enabled: holdNew && !loading })

  // A row that has matched the filter stays until the filter changes: marking one read under
  // Unread leaves it in place, where the pointer is.
  const [stay, setStay] = useState<{ filter: string; ids: ReadonlySet<string> }>({ filter: filterId, ids: new Set() })
  if (stay.filter !== filterId) setStay({ filter: filterId, ids: new Set() })
  const stays = stay.filter === filterId ? stay.ids : null
  const matches = filtering === "client" && choice?.matches
  const shown = rows.filter((item) => !held.has(item.id) && (!matches || matches(item) || stays?.has(item.id)))
  const heldCount = rows.filter((item) => held.has(item.id) && (!matches || matches(item))).length
  if (matches) {
    const missing = shown.filter((item) => !stays?.has(item.id))
    if (missing.length) setStay({ filter: filterId, ids: new Set([...(stays ?? []), ...missing.map((item) => item.id)]) })
  }

  const chooseFilter = (next: string) => {
    setFilterId(next)
    onFilterChange?.(next)
    reveal()
  }

  // Roving focus: one row's controls are in the tab order.
  const [focused, setFocused] = useState<string | null>(null)
  const stop = shown.some((item) => item.id === focused) ? focused : (shown[0]?.id ?? null)
  const focusRow = (id: string | null | undefined) => {
    const root = rootRef.current
    if (!root || !id) return
    firstControl(root.querySelector(`${ROW}[data-notification-row="${CSS.escape(id)}"]`))?.focus()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement
    const row = target.closest(ROW)
    if (!row || !["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return
    const all = [...event.currentTarget.querySelectorAll(ROW)]
    const index = all.indexOf(row)
    const next = event.key === "Home" ? 0 : event.key === "End" ? all.length - 1 : index + (event.key === "ArrowDown" ? 1 : -1)
    const control = firstControl(all[Math.max(0, Math.min(all.length - 1, next))])
    if (!control) return
    event.preventDefault()
    control.focus()
  }

  const setRead = (item: NotificationItem, read: boolean) => {
    if (uncontrolled) setRows((current) => current.map((row) => (row.id === item.id ? { ...row, read } : row)))
    onReadChange?.([item.id], read)
    announce(read ? messages.markedRead : messages.markedUnread)
  }

  // Dismissing removes the focused control, so focus goes to a neighbour once the row has gone (R20.3).
  const removal = useRef<{ id: string; neighbour: string | null } | null>(null)
  const dismiss = (item: NotificationItem) => {
    const index = shown.findIndex((row) => row.id === item.id)
    removal.current = { id: item.id, neighbour: (shown[index + 1] ?? shown[index - 1])?.id ?? null }
    if (uncontrolled) setRows((current) => current.filter((row) => row.id !== item.id))
    onDismiss?.(item)
    announce(messages.dismissed)
  }
  useLayoutEffect(() => {
    const pending = removal.current
    if (!pending || ids.includes(pending.id)) return
    removal.current = null
    const active = document.activeElement
    if (active && active !== document.body) return
    if (pending.neighbour) focusRow(pending.neighbour)
    else rootRef.current?.querySelector<HTMLElement>(".fa-notification-toolbar button, .fa-notification-body button")?.focus()
  })

  const showNew = () => {
    const first = rows.find((item) => held.has(item.id))?.id
    reveal()
    // After the rows render: the button that was focused is about to empty.
    requestAnimationFrame(() => {
      rootRef.current?.querySelector(".fa-scroll-viewport")?.scrollTo({ top: 0 })
      focusRow(first)
    })
  }

  // Announce arrivals and pages, whichever way they show.
  const known = useRef<ReadonlySet<string> | null>(null)
  const signature = ids.join("\n")
  useEffect(() => {
    if (loading) {
      known.current = null
      return
    }
    const before = known.current
    known.current = new Set(ids)
    if (!before) return
    const added = ids.filter((id) => !before.has(id))
    if (!added.length) return
    const lastKnown = ids.findLastIndex((id) => before.has(id))
    const arrived = added.filter((id) => ids.indexOf(id) < lastKnown || before.size === 0).length
    // What is waiting, rather than this delivery: two quick arrivals read "2 new notifications".
    if (arrived) announce(messages.arrived(Math.max(arrived, held.size), locale), { key: "notification-arrivals" })
    if (added.length > arrived) announce(messages.loaded(added.length - arrived, locale), { key: "notification-page" })
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- the signature stands for `ids`
  }, [signature, loading, announce, messages, locale])

  // Pages load as the end of the list comes into view. The foot stays for the keyboard and for a retry.
  const autoLoad = hasMore && !loadingMore && !loadMoreError && !loading && !error && Boolean(onLoadMore)
  const latestLoad = useRef(onLoadMore)
  latestLoad.current = onLoadMore
  useEffect(() => {
    const foot = footRef.current
    if (!autoLoad || !foot || typeof IntersectionObserver !== "function") return
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) latestLoad.current?.()
    })
    observer.observe(foot)
    return () => observer.disconnect()
  }, [autoLoad, signature])

  const unread = unreadCount ?? rows.filter((item) => !item.read).length
  const words = { today: messages.today, yesterday: messages.yesterday }
  const groups = groupRows(shown, groupBy, (item) => dayLabel(toTime(item.at), now, locale, words))
  const name = label ?? messages.notifications

  const toolbar = choices.length > 0 || onMarkAllRead || holdNew
  const content = error ? (
    <EmptyState
      icon={<IconError />}
      tone="danger"
      action={onRetry ? <Button size="sm" onClick={onRetry}>{messages.retry}</Button> : undefined}
    >
      {error === true ? messages.loadFailed : error}
    </EmptyState>
  ) : loading ? (
    <SkeletonRows rows={loadingRows} />
  ) : groups.length === 0 && !hasMore ? (
    choice?.matches ? (
      <EmptyState icon={<IconBell />} action={<Button size="sm" onClick={() => chooseFilter(choices[0]!.id)}>{messages.showAll}</Button>}>
        {messages.emptyFilter(choice.label)}
      </EmptyState>
    ) : (
      <EmptyState icon={<IconBell />}>{emptyLabel ?? messages.empty}</EmptyState>
    )
  ) : (
    <ScrollArea tabIndex={-1}>
      {/* Roving focus: keys are handled once here, around every group. */}
      {/* oxlint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div className="fa-notification-rows" onKeyDown={onKeyDown} onFocus={(event) => setFocused((event.target as HTMLElement).closest(ROW)?.getAttribute("data-notification-row") ?? null)}>
        {groups.map((group) => {
          const headingId = `${prefix}-${group.key}`
          return (
            <div key={group.key} className="fa-notification-group">
              {/* A label, not a heading: the host owns the page's outline. */}
              {group.label ? (
                <div className="fa-notification-heading" id={headingId}>
                  {group.label}
                </div>
              ) : null}
              <ul className="fa-notification-items" aria-label={group.label ? undefined : name} aria-labelledby={group.label ? headingId : undefined}>
                {group.rows.map((item) => (
                  <Row
                    key={item.id}
                    item={item}
                    current={item.id === stop}
                    onOpen={onOpen}
                    onRead={onReadChange ? (row) => setRead(row, !row.read) : undefined}
                    onDismiss={onDismiss ? dismiss : undefined}
                    onAction={onAction}
                  />
                ))}
              </ul>
            </div>
          )
        })}
        {hasMore ? (
          <div ref={footRef} className="fa-notification-foot" data-failed={loadMoreError ? "" : undefined}>
            {loadMoreError ? (
              <>
                <span className="fa-notification-foot-text">{loadMoreError === true ? messages.loadMoreFailed : loadMoreError}</span>
                <Button size="sm" onClick={onLoadMore}>
                  {messages.retry}
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                status={loadingMore ? "pending" : "idle"}
                pendingLabel={messages.loadingMore}
                statusAnnouncement={false}
                onClick={onLoadMore}
              >
                {messages.loadMore}
              </Button>
            )}
          </div>
        ) : null}
      </div>
    </ScrollArea>
  )

  return (
    <div {...rest} ref={rootRef} className={cx("fa-notification-list", className)} role="region" aria-label={name} aria-busy={loading || undefined}>
      {toolbar ? (
        <div className="fa-notification-toolbar">
          {choices.length ? (
            <Segmented
              size="sm"
              aria-label={messages.filterLabel}
              options={choices.map((option) => ({ value: option.id, label: option.label }))}
              value={filterId}
              onValueChange={chooseFilter}
            />
          ) : null}
          {/* The count's place is always there, so its arrival moves nothing (R9.1). */}
          <span className="fa-notification-new">
            {heldCount > 0 ? (
              <Button variant="soft" size="xs" aria-label={messages.showNew(heldCount, locale)} tooltip={false} onClick={showNew}>
                {messages.newCount(heldCount, locale)}
              </Button>
            ) : null}
          </span>
          {onMarkAllRead ? (
            <Button
              variant="ghost"
              size="sm"
              icon={<IconCheckCheck />}
              aria-label={messages.markAllRead}
              disabledReason={unread > 0 ? undefined : messages.nothingUnread}
              onClick={() => {
                if (uncontrolled) setRows((current) => current.map((row) => ({ ...row, read: true })))
                onMarkAllRead()
                announce(messages.allMarkedRead)
              }}
            />
          ) : null}
        </div>
      ) : null}
      <div className="fa-notification-body">{content}</div>
    </div>
  )
}
