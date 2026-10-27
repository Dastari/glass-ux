import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { IconCalendar, IconChevronLeft, IconChevronRight, IconColumns, IconGrid, IconList } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { useMessages } from "../../lib/i18n/use-messages.js"
import { useLocale } from "../../lib/locale/use-locale.js"
import { useRemPx } from "../../lib/rem.js"
import { useControllable } from "../../lib/use-controllable.js"
import { useElementSize } from "../../lib/use-element-size.js"
import { Button } from "../button/index.js"
import { firstDayOfWeek, type IsoDate } from "../date-picker/calendar-date.js"
import type { DragEffect, DragInfo, DropAccept, DropVerdict } from "../drag-drop/types.js"
import { Segmented, type SegmentedOption } from "../segmented/index.js"
import { AgendaView } from "./agenda-view.js"
import { describeWhen, SchedulerContext, type PendingChange, type SchedulerContextValue } from "./context.js"
import { placeEvent, type PlacedEvent } from "./layout.js"
import { schedulerMessages, type SchedulerMessages } from "./messages.js"
import { MonthView } from "./month-view.js"
import { rangeTitle, shiftDate, timelineDays, visibleDays, withoutHidden } from "./range.js"
import { TimeGrid } from "./time-grid.js"
import { TimelineView } from "./timeline-view.js"
import type {
  SchedulerBlock,
  SchedulerDrop,
  SchedulerDropTarget,
  SchedulerEvent,
  SchedulerEventChange,
  SchedulerEventRenderInfo,
  SchedulerLayout,
  SchedulerRange,
  SchedulerResource,
  SchedulerResourceRenderInfo,
  SchedulerSlot,
  SchedulerSlotDetails,
  SchedulerTime,
  SchedulerView,
} from "./types.js"
import { addDays } from "../date-picker/calendar-date.js"
import { browserTimeZone, zonedInstant, zonedToday } from "./zone.js"

const ALL_VIEWS: readonly SchedulerView[] = ["month", "week", "day", "agenda"]
const TIMELINE_VIEWS: readonly SchedulerView[] = ["day", "week", "month"]
const VIEW_ICONS = { month: <IconGrid />, week: <IconColumns />, day: <IconCalendar />, agenda: <IconList /> }
/** Below this container width (in rem) a week shows one day and a month shows dots. */
const COMPACT_REM = 40

/** Props for {@link Scheduler}. */
export interface SchedulerProps<E extends SchedulerEvent = SchedulerEvent, R extends SchedulerResource = SchedulerResource> {
  /** The events to show. Keep the array stable between renders; a new array drops optimistic changes the host has not kept. */
  events: readonly E[]
  /** The view shown (controlled). */
  view?: SchedulerView
  /** The first view when uncontrolled. Default "week". */
  defaultView?: SchedulerView
  /** Called with the view the person switches to, or "day" when they open a day's heading. */
  onViewChange?: (view: SchedulerView) => void
  /** The views in the switch, in order. Default month, week, day and agenda; with the timeline layout day, week and month. */
  views?: readonly SchedulerView[]
  /**
   * How day, week and month are drawn. "calendar" (default): hours in day columns and a month
   * grid. "timeline": a row per resource and a column per day, events as bars in their
   * resource's row (`resourceId`). The agenda is the same in both.
   */
  layout?: SchedulerLayout
  /**
   * Timeline month: one strip from the month before to the month after that scrolls sideways;
   * scrolling into another month makes it the date (`onDateChange`), and previous and next move
   * a month. Fetch what `onRangeChange` reports.
   */
  continuous?: boolean
  /** ISO weekdays to leave out (1 = Monday … 7 = Sunday): `[6, 7]` hides weekends. Applies to the week view and the timeline. */
  hiddenDays?: readonly number[]
  /** Called with the days shown whenever they change, to load their events. */
  onRangeChange?: (range: SchedulerRange) => void
  /** A day in the range shown (controlled): the month, week or day around it. */
  date?: IsoDate
  /** The first day shown when uncontrolled. Default today in `timeZone`. */
  defaultDate?: IsoDate
  /** Called with the new day when the person moves with previous, next, Today or a day's heading. */
  onDateChange?: (date: IsoDate) => void
  /** The IANA zone whose wall clock the grid shows ("Australia/Sydney"). Default the browser's. */
  timeZone?: string
  /** BCP 47 locale for names, times and the first day of the week. Default the nearest `LocaleProvider`, then `configureLocale()`, then `<html lang>`. */
  locale?: string
  /** First day of the week, 1 = Monday … 7 = Sunday. Default the locale's. */
  weekStartsOn?: number
  /** The current time, for today and the time line. Default the clock, updated each minute. */
  now?: Date | number
  /** Events are loading: the grid keeps its geometry and shows placeholders where events go. */
  loading?: boolean
  /**
   * Let people move and resize events by dragging and with the keyboard. A function decides per
   * event; returning a string locks the event and says why ("Sent to the crew").
   */
  editable?: boolean | ((event: E) => boolean | string)
  /** Whether an editable event's ends can be changed. Default: when it is editable. A function decides per event (single-day tasks that only move). */
  resizable?: boolean | ((event: E) => boolean)
  /** Timeline: whether dragging an event moves it (default) or copies it, leaving it in place (templates, repeating work). */
  eventEffect?: (event: E) => DragEffect
  /** Minutes that drags and arrow keys snap to. Default 15. */
  snapMinutes?: number
  /** Minutes in one slot of the time grid: its lines and what a click selects. Default 30. */
  slotMinutes?: number
  /** The time of day the week and day views scroll to when they open ("07:00"). Default "07:00". */
  scrollToTime?: string
  /** Called when the person opens an event (click, tap or Enter). */
  onEventClick?: (event: E, details: { element: HTMLElement }) => void
  /**
   * Called with an empty stretch of time chosen by click, drag or keyboard; in the timeline with
   * its row's `resourceId`. `details.element` is the highlighted selection, to anchor a popover
   * to. Without it, empty time cannot be selected.
   */
  onSlotSelect?: (slot: SchedulerSlot, details: SchedulerSlotDetails) => void
  /**
   * Called when the person moves or resizes an event. The event shows at its new time at
   * once; update `events` to keep it there. Return a promise to hold it there until it
   * settles: a rejection puts it back and announces that the change failed.
   */
  onEventChange?: (change: SchedulerEventChange<E>) => void | Promise<unknown>
  /** Resources named on events by `resourceId`, and the timeline's rows in this order (sticky ones first). */
  resources?: readonly R[]
  /** Timeline: the content of an event's card, instead of its title and time. Buttons and links in it keep their own behaviour. */
  renderEvent?: (event: E, info: SchedulerEventRenderInfo) => ReactNode
  /** Timeline: a row's heading, instead of its title and description. */
  renderResource?: (resource: R, info: SchedulerResourceRenderInfo) => ReactNode
  /** Timeline: the heading above the row headings ("Staff", a search field). Default "Resources". */
  resourceHeader?: ReactNode
  /** Timeline: the width of the row headings column (a CSS length). Default 14rem. */
  resourceWidth?: string
  /** Timeline: the narrowest a day column gets before the timeline scrolls sideways (a CSS length). Default by view. */
  columnWidth?: string
  /** Timeline: which of your DragDrop items its rows take (a type, types or a test). Default none: rows only take its own events. */
  dropAccept?: DropAccept
  /**
   * Timeline: whether a row takes the item being dragged now, or why not, for its own events and
   * your items alike. `target` is where it would land: the day, the proposed interval and the
   * resource's blocks it would overlap. Asked again as the day or row under it changes, and for
   * moves and resizes made with the keyboard.
   */
  validateDrop?: (drag: DragInfo, resource: R, target: SchedulerDropTarget) => DropVerdict
  /** Timeline: when resources are not available (leave, closures), shaded on their rows. */
  blocks?: readonly SchedulerBlock[]
  /**
   * Timeline: one of your DragDrop items was dropped on a row and day. Apply it to your data;
   * return false to refuse it, or a promise to show the row as saving (a rejection shows it in
   * error and announces the failure).
   */
  onDrop?: (drop: SchedulerDrop) => void | boolean | Promise<unknown>
  /** Content beside the view switch: an Add button, filters. */
  actions?: ReactNode
  /** Force the compact form (one day column, dots in the month) on or off. Default: by the container's width. */
  compact?: boolean
  /** Replace any of the wording (see `schedulerMessages`). */
  labels?: Partial<SchedulerMessages>
  /** Layout only. */
  className?: string
  /** Layout only. */
  style?: CSSProperties
  /** Accessible name for the whole scheduler. Default the visible range. */
  "aria-label"?: string
}

interface Override {
  start: SchedulerTime
  end: SchedulerTime
  /** The resource it moved to, when it did. */
  resourceId?: string
  /** The events array it was made against; it lapses when the host passes another. */
  events: readonly SchedulerEvent[]
  pending: boolean
}

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect

/**
 * An events calendar for planning: maintenance windows, bookings and shifts. Month, week, day
 * and agenda views share a header with previous, next, Today, the visible range and a view
 * switch. Overlapping events sit side by side; all-day and multi-day events run as bars in a
 * band above the hours, and a month cell that overflows offers "+N more". The grid is drawn in
 * the browser's zone or `timeZone`. Click or drag over empty time to select a slot; with
 * `editable`, drag events to move them, drag their lower edge to resize, or focus one and use
 * the arrow keys (Shift for the end). In a narrow container the week shows one day with a day
 * strip and the month shows dots with the selected day's events below. It fills its
 * container's height; give it one (a Panel body, a sized region).
 */
export function Scheduler<E extends SchedulerEvent = SchedulerEvent, R extends SchedulerResource = SchedulerResource>({
  events,
  view: viewProp,
  defaultView = "week",
  onViewChange,
  layout = "calendar",
  views = layout === "timeline" ? TIMELINE_VIEWS : ALL_VIEWS,
  continuous = false,
  hiddenDays,
  onRangeChange,
  date: dateProp,
  defaultDate,
  onDateChange,
  timeZone: zoneProp,
  locale: localeProp,
  weekStartsOn,
  now: nowProp,
  loading = false,
  editable = false,
  resizable,
  eventEffect,
  snapMinutes = 15,
  slotMinutes = 30,
  scrollToTime = "07:00",
  onEventClick,
  onSlotSelect,
  onEventChange,
  resources,
  renderEvent,
  renderResource,
  resourceHeader,
  resourceWidth,
  columnWidth,
  dropAccept,
  validateDrop,
  blocks,
  onDrop,
  actions,
  compact: compactProp,
  labels,
  className,
  style,
  "aria-label": ariaLabel,
}: SchedulerProps<E, R>) {
  const locale = useLocale(localeProp)
  const t = useMessages(schedulerMessages, { labels, locale })
  const timeZone = useMemo(() => zoneProp ?? browserTimeZone(), [zoneProp])
  const clock = useClock(nowProp === undefined)
  const nowMs = nowProp === undefined ? clock : typeof nowProp === "number" ? nowProp : nowProp.getTime()
  const today = zonedToday(nowMs, timeZone)
  const [view, setView] = useControllable(viewProp, defaultView, onViewChange)
  const [date, setDate] = useControllable(dateProp, defaultDate ?? today, onDateChange)
  const firstDay = weekStartsOn ?? firstDayOfWeek(locale)

  const root = useRef<HTMLDivElement>(null)
  const { width } = useElementSize(root)
  const rem = useRemPx()
  const compact = compactProp ?? (width > 0 && width < COMPACT_REM * rem)

  const resourceTitles = useMemo(() => new Map(resources?.map((resource) => [resource.id, resource.title])), [resources])
  const rows = useMemo(() => [...(resources ?? []).filter((resource) => resource.sticky), ...(resources ?? []).filter((resource) => !resource.sticky)], [resources])

  // Optimistic positions for changes the host has not passed back yet.
  const [overrides, setOverrides] = useState<ReadonlyMap<string, Override>>(() => new Map())
  const placed = useMemo(() => {
    const list: PlacedEvent<E>[] = []
    for (const event of events) {
      const override = overrides.get(event.id)
      const live = override && (override.pending || override.events === events) ? ({ ...event, start: override.start, end: override.end, ...(override.resourceId === undefined ? {} : { resourceId: override.resourceId }) } as E) : event
      const result = placeEvent(live, timeZone)
      if (result) list.push(result)
    }
    return list.toSorted((a, b) => a.startMs - b.startMs || b.endMs - a.endMs)
  }, [events, overrides, timeZone])

  const [announcement, setAnnouncement] = useState("")
  const announce = useCallback((message: string) => {
    // A repeated message must still be read: clear, then set on the next frame.
    setAnnouncement("")
    requestAnimationFrame(() => setAnnouncement(message))
  }, [])

  const timeline = layout === "timeline" && view !== "agenda"
  const hiddenKey = hiddenDays?.join() ?? ""
  const days = useMemo(
    () => (timeline ? timelineDays(view, date, firstDay, compact, continuous, hiddenDays) : view === "week" && !compact ? withoutHidden(visibleDays(view, date, firstDay), hiddenDays) : visibleDays(view, date, firstDay, compact)),
    [timeline, view, date, firstDay, compact, continuous, hiddenKey], // oxlint-disable-line react-hooks/exhaustive-deps -- hiddenDays by value
  )
  // A compact timeline shows one day, so previous and next move by a day.
  const stepView: SchedulerView = timeline && compact ? "day" : view
  const title = timeline && continuous && view === "month" && !compact ? rangeTitle("month", date, days, locale) : rangeTitle(stepView, date, days, locale)

  // Report the days shown, to load their events.
  const dayKey = days.join()
  const reportRange = useRef(onRangeChange)
  reportRange.current = onRangeChange
  useEffect(() => {
    const first = days[0]
    const last = days.at(-1)
    if (!first || !last) return
    reportRange.current?.({ first, last, start: new Date(zonedInstant(first, 0, timeZone)), end: new Date(zonedInstant(addDays(last, 1), 0, timeZone)) })
  }, [dayKey, timeZone]) // oxlint-disable-line react-hooks/exhaustive-deps -- by the days' value

  // Keep focus on an event the keyboard moved, even when it lands in another column.
  const refocus = useRef<string | null>(null)
  useIsoLayoutEffect(() => {
    const id = refocus.current
    if (!id || !root.current) return
    const target = root.current.querySelector<HTMLElement>(`[data-event-id="${CSS.escape(id)}"]`)
    if (target && document.activeElement !== target) target.focus({ preventScroll: false })
    refocus.current = null
  })

  const latest = useRef({ events, onEventChange, onEventClick, onSlotSelect, editable, resizable, eventEffect, days, view, setDate, dropAccept, validateDrop, onDrop, resources })
  latest.current = { events, onEventChange, onEventClick, onSlotSelect, editable, resizable, eventEffect, days, view, setDate, dropAccept, validateDrop, onDrop, resources }

  // Blocks in the zone, by resource.
  const placedBlocks = useMemo(() => {
    const map = new Map<string, Array<{ placed: PlacedEvent; block: SchedulerBlock }>>()
    for (const block of blocks ?? []) {
      const placed = placeEvent({ id: block.id, title: block.title ?? "", start: block.start, end: block.end, allDay: block.allDay ?? true, tone: block.tone ?? "neutral" }, timeZone)
      if (!placed) continue
      const list = map.get(block.resourceId) ?? []
      list.push({ placed, block })
      map.set(block.resourceId, list)
    }
    return map
  }, [blocks, timeZone])

  const commit = useCallback(
    (change: PendingChange) => {
      const { events: current, onEventChange: report, days: shown, setDate: show } = latest.current
      const event = change.placed.event as E
      const start = change.days ? change.days.start : change.startMs
      const end = change.days ? change.days.end : change.endMs
      const resourceId = change.resourceId
      const copy = change.effect === "copy"
      const result = report?.({
        event,
        start: new Date(change.startMs),
        end: new Date(change.endMs),
        allDay: change.placed.allDay,
        days: change.days,
        kind: change.kind,
        ...(change.kind === "resize" ? { edge: change.edge ?? "end" } : {}),
        ...(resourceId === undefined ? {} : { resourceId }),
        ...(copy ? { effect: "copy" as const } : {}),
        input: change.input,
      })
      const pending = Boolean(result && typeof (result as Promise<unknown>).then === "function")
      // A copy leaves the event where it is; the host adds the new one.
      if (!copy) setOverrides((previous) => new Map(previous).set(event.id, { start, end, resourceId, events: current, pending }))
      const moved = placeEvent({ ...event, start, end } as E, timeZone)
      if (moved) {
        const resource = resourceId === undefined ? undefined : resourceTitles.get(resourceId)
        const when = resource ? t.atResource(resource, describeWhen(moved, locale, t)) : describeWhen(moved, locale, t)
        announce(copy ? t.copied(event.title, when) : change.kind === "move" ? t.moved(event.title, when) : t.resized(event.title, when))
        if (change.input === "keyboard" && !copy) {
          refocus.current = event.id
          // Follow the event out of the visible range.
          if (!shown.includes(moved.startDay)) show(moved.startDay)
        }
      }
      if (pending && copy) (result as Promise<unknown>).catch(() => announce(t.changeFailed(event.title)))
      else if (pending)
        (result as Promise<unknown>).then(
          () =>
            setOverrides((previous) => {
              const entry = previous.get(event.id)
              return entry?.start === start ? new Map(previous).set(event.id, { ...entry, pending: false }) : previous
            }),
          () => {
            setOverrides((previous) => {
              if (previous.get(event.id)?.start !== start) return previous
              const next = new Map(previous)
              next.delete(event.id)
              return next
            })
            announce(t.changeFailed(event.title))
          },
        )
    },
    [announce, locale, t, timeZone, resourceTitles],
  )

  const swallow = useRef(0)
  const swallowClick = useCallback(() => {
    swallow.current = performance.now()
  }, [])
  const swallowed = () => performance.now() - swallow.current < 400

  const selectable = Boolean(onSlotSelect)

  const context = useMemo<SchedulerContextValue>(
    () => ({
      locale,
      timeZone,
      t,
      view,
      date,
      today,
      nowMs,
      firstDay,
      compact,
      loading,
      selectable,
      snapMinutes,
      slotMinutes,
      canEdit: (item) => {
        const rule = latest.current.editable
        return (typeof rule === "function" ? rule(item.event as E) : rule) === true
      },
      canResize: (item) => {
        const rule = latest.current.editable
        if ((typeof rule === "function" ? rule(item.event as E) : rule) !== true) return false
        const resize = latest.current.resizable
        return resize === undefined ? true : typeof resize === "function" ? resize(item.event as E) : resize
      },
      effectOf: (item) => latest.current.eventEffect?.(item.event as E) ?? "move",
      lockReason: (item) => {
        const rule = latest.current.editable
        const verdict = typeof rule === "function" ? rule(item.event as E) : rule
        return typeof verdict === "string" ? verdict : null
      },
      resourceTitle: (id) => (id ? resourceTitles.get(id) : undefined),
      openEvent: (item, element) => {
        if (swallowed()) return
        latest.current.onEventClick?.(item.event as E, { element })
      },
      selectSlot: (slot, element = null) => latest.current.onSlotSelect?.(slot, { element }),
      layout,
      views,
      resources: rows,
      neighbourResource: (id, delta) => {
        const index = rows.findIndex((resource) => resource.id === id)
        return index === -1 ? undefined : rows[index + delta]?.id
      },
      continuous: continuous && view === "month",
      columnWidth,
      resourceWidth,
      renderEvent: renderEvent as SchedulerContextValue["renderEvent"],
      renderResource: renderResource as SchedulerContextValue["renderResource"],
      resourceHeader,
      acceptsDrop: (item) => {
        const accept = latest.current.dropAccept
        if (accept === undefined) return false
        if (typeof accept === "function") return accept(item)
        return typeof accept === "string" ? accept === item.type : accept.includes(item.type)
      },
      validateDrop: (drag, resource, target) => latest.current.validateDrop?.(drag, resource as R, target) ?? true,
      blocksOf: (resourceId) => placedBlocks.get(resourceId) ?? [],
      dropItem: (drop) => latest.current.onDrop?.(drop),
      commit,
      announce,
      setDate,
      setView,
      swallowClick,
    }),
    [locale, timeZone, t, view, date, today, nowMs, firstDay, compact, loading, selectable, snapMinutes, slotMinutes, resourceTitles, commit, announce, setDate, setView, swallowClick, layout, views, rows, continuous, columnWidth, resourceWidth, renderEvent, renderResource, resourceHeader, placedBlocks],
  )

  const viewOptions = useMemo<SegmentedOption<SchedulerView>[]>(() => views.map((value) => ({ value, label: t[value], icon: VIEW_ICONS[value] })), [views, t])

  return (
    <SchedulerContext value={context}>
      <div
        ref={root}
        role="region"
        aria-label={ariaLabel ?? title}
        aria-busy={loading || undefined}
        className={cx("fa-scheduler", className)}
        style={style}
        data-view={view}
        data-layout={layout}
        data-compact={compact ? "" : undefined}
        data-loading={loading ? "" : undefined}
        data-selectable={selectable ? "" : undefined}
      >
        <div className="fa-sch-head">
          <div className="fa-sch-nav">
            <Button size="sm" variant="secondary" onClick={() => setDate(today)}>
              {t.today}
            </Button>
            <Button size="sm" variant="ghost" icon={<IconChevronLeft />} aria-label={t.previous(stepView)} onClick={() => setDate(shiftDate(stepView, date, -1, compact))} />
            <Button size="sm" variant="ghost" icon={<IconChevronRight />} aria-label={t.next(stepView)} onClick={() => setDate(shiftDate(stepView, date, 1, compact))} />
          </div>
          <div className="fa-sch-title" aria-live="polite">
            {title}
          </div>
          {actions ? <div className="fa-sch-actions">{actions}</div> : null}
          {viewOptions.length > 1 ? (
            <div className="fa-sch-views">
              <Segmented size="sm" options={viewOptions} value={view} onValueChange={setView} aria-label={t.views} />
            </div>
          ) : null}
        </div>
        <div className="fa-sch-body">
          {timeline ? (
            <TimelineView events={placed} days={days} />
          ) : view === "month" ? (
            <MonthView events={placed} days={days} />
          ) : view === "agenda" ? (
            <AgendaView events={placed} days={days} title={title} />
          ) : (
            <TimeGrid events={placed} days={days} scrollToTime={scrollToTime} />
          )}
        </div>
        <span className="fa-sch-announcer" aria-live="polite" aria-atomic="true">
          {announcement}
        </span>
      </div>
    </SchedulerContext>
  )
}

/** The current time, updated at each minute's turn. */
function useClock(enabled: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!enabled) return
    let timer = 0
    const tick = () => {
      setNow(Date.now())
      timer = window.setTimeout(tick, 60_000 - (Date.now() % 60_000))
    }
    timer = window.setTimeout(tick, 60_000 - (Date.now() % 60_000))
    return () => window.clearTimeout(timer)
  }, [enabled])
  return now
}
