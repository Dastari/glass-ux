import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react"
import { IconCalendar, IconChevronLeft, IconChevronRight, IconColumns, IconGrid, IconList } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { useMessages } from "../../lib/i18n/use-messages.js"
import { useLocale } from "../../lib/locale/use-locale.js"
import { useRemPx } from "../../lib/rem.js"
import { useControllable } from "../../lib/use-controllable.js"
import { useElementSize } from "../../lib/use-element-size.js"
import { Button } from "../button/index.js"
import { firstDayOfWeek, type IsoDate } from "../date-picker/calendar-date.js"
import { Segmented, type SegmentedOption } from "../segmented/index.js"
import { AgendaView } from "./agenda-view.js"
import { describeWhen, SchedulerContext, type PendingChange, type SchedulerContextValue } from "./context.js"
import { placeEvent, type PlacedEvent } from "./layout.js"
import { schedulerMessages, type SchedulerMessages } from "./messages.js"
import { MonthView } from "./month-view.js"
import { rangeTitle, shiftDate, visibleDays } from "./range.js"
import { TimeGrid } from "./time-grid.js"
import type { SchedulerEvent, SchedulerEventChange, SchedulerResource, SchedulerSlot, SchedulerTime, SchedulerView } from "./types.js"
import { browserTimeZone, zonedToday } from "./zone.js"

const ALL_VIEWS: readonly SchedulerView[] = ["month", "week", "day", "agenda"]
const VIEW_ICONS = { month: <IconGrid />, week: <IconColumns />, day: <IconCalendar />, agenda: <IconList /> }
/** Below this container width (in rem) a week shows one day and a month shows dots. */
const COMPACT_REM = 40

/** Props for {@link Scheduler}. */
export interface SchedulerProps<E extends SchedulerEvent = SchedulerEvent> {
  /** The events to show. Keep the array stable between renders; a new array drops optimistic changes the host has not kept. */
  events: readonly E[]
  /** The view shown (controlled). */
  view?: SchedulerView
  /** The first view when uncontrolled. Default "week". */
  defaultView?: SchedulerView
  /** Called with the view the person switches to, or "day" when they open a day's heading. */
  onViewChange?: (view: SchedulerView) => void
  /** The views in the switch, in order. Default month, week, day and agenda. */
  views?: readonly SchedulerView[]
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
  /** Let people move and resize events by dragging and with the keyboard. A function decides per event. */
  editable?: boolean | ((event: E) => boolean)
  /** Minutes that drags and arrow keys snap to. Default 15. */
  snapMinutes?: number
  /** Minutes in one slot of the time grid: its lines and what a click selects. Default 30. */
  slotMinutes?: number
  /** The time of day the week and day views scroll to when they open ("07:00"). Default "07:00". */
  scrollToTime?: string
  /** Called when the person opens an event (click, tap or Enter). */
  onEventClick?: (event: E, details: { element: HTMLElement }) => void
  /** Called with an empty stretch of time chosen by click, drag or keyboard. Without it, empty time cannot be selected. */
  onSlotSelect?: (slot: SchedulerSlot) => void
  /**
   * Called when the person moves or resizes an event. The event shows at its new time at
   * once; update `events` to keep it there. Return a promise to hold it there until it
   * settles: a rejection puts it back and announces that the change failed.
   */
  onEventChange?: (change: SchedulerEventChange<E>) => void | Promise<unknown>
  /** Resources named on events by `resourceId`. */
  resources?: readonly SchedulerResource[]
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
export function Scheduler<E extends SchedulerEvent = SchedulerEvent>({
  events,
  view: viewProp,
  defaultView = "week",
  onViewChange,
  views = ALL_VIEWS,
  date: dateProp,
  defaultDate,
  onDateChange,
  timeZone: zoneProp,
  locale: localeProp,
  weekStartsOn,
  now: nowProp,
  loading = false,
  editable = false,
  snapMinutes = 15,
  slotMinutes = 30,
  scrollToTime = "07:00",
  onEventClick,
  onSlotSelect,
  onEventChange,
  resources,
  compact: compactProp,
  labels,
  className,
  style,
  "aria-label": ariaLabel,
}: SchedulerProps<E>) {
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

  // Optimistic positions for changes the host has not passed back yet.
  const [overrides, setOverrides] = useState<ReadonlyMap<string, Override>>(() => new Map())
  const placed = useMemo(() => {
    const list: PlacedEvent<E>[] = []
    for (const event of events) {
      const override = overrides.get(event.id)
      const live = override && (override.pending || override.events === events) ? ({ ...event, start: override.start, end: override.end } as E) : event
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

  const days = useMemo(() => visibleDays(view, date, firstDay, compact), [view, date, firstDay, compact])
  const title = rangeTitle(view, date, days, locale)

  // Keep focus on an event the keyboard moved, even when it lands in another column.
  const refocus = useRef<string | null>(null)
  useIsoLayoutEffect(() => {
    const id = refocus.current
    if (!id || !root.current) return
    const target = root.current.querySelector<HTMLElement>(`[data-event-id="${CSS.escape(id)}"]`)
    if (target && document.activeElement !== target) target.focus({ preventScroll: false })
    refocus.current = null
  })

  const latest = useRef({ events, onEventChange, onEventClick, onSlotSelect, editable, days, view, setDate })
  latest.current = { events, onEventChange, onEventClick, onSlotSelect, editable, days, view, setDate }

  const commit = useCallback(
    (change: PendingChange) => {
      const { events: current, onEventChange: report, days: shown, setDate: show } = latest.current
      const event = change.placed.event as E
      const start = change.days ? change.days.start : change.startMs
      const end = change.days ? change.days.end : change.endMs
      const result = report?.({
        event,
        start: new Date(change.startMs),
        end: new Date(change.endMs),
        allDay: change.placed.allDay,
        days: change.days,
        kind: change.kind,
        input: change.input,
      })
      const pending = Boolean(result && typeof (result as Promise<unknown>).then === "function")
      setOverrides((previous) => new Map(previous).set(event.id, { start, end, events: current, pending }))
      const moved = placeEvent({ ...event, start, end } as E, timeZone)
      if (moved) {
        const when = describeWhen(moved, locale, t)
        announce(change.kind === "move" ? t.moved(event.title, when) : t.resized(event.title, when))
        if (change.input === "keyboard") {
          refocus.current = event.id
          // Follow the event out of the visible range.
          if (!shown.includes(moved.startDay)) show(moved.startDay)
        }
      }
      if (pending)
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
    [announce, locale, t, timeZone],
  )

  const swallow = useRef(0)
  const swallowClick = useCallback(() => {
    swallow.current = performance.now()
  }, [])
  const swallowed = () => performance.now() - swallow.current < 400

  const selectable = Boolean(onSlotSelect)
  const resourceTitles = useMemo(() => new Map(resources?.map((resource) => [resource.id, resource.title])), [resources])

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
        return typeof rule === "function" ? rule(item.event as E) : rule
      },
      resourceTitle: (id) => (id ? resourceTitles.get(id) : undefined),
      openEvent: (item, element) => {
        if (swallowed()) return
        latest.current.onEventClick?.(item.event as E, { element })
      },
      selectSlot: (slot) => latest.current.onSlotSelect?.(slot),
      commit,
      announce,
      setDate,
      setView,
      swallowClick,
    }),
    [locale, timeZone, t, view, date, today, nowMs, firstDay, compact, loading, selectable, snapMinutes, slotMinutes, resourceTitles, commit, announce, setDate, setView, swallowClick],
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
        data-compact={compact ? "" : undefined}
        data-loading={loading ? "" : undefined}
        data-selectable={selectable ? "" : undefined}
      >
        <div className="fa-sch-head">
          <div className="fa-sch-nav">
            <Button size="sm" variant="secondary" onClick={() => setDate(today)}>
              {t.today}
            </Button>
            <Button size="sm" variant="ghost" icon={<IconChevronLeft />} aria-label={t.previous(view)} onClick={() => setDate(shiftDate(view, date, -1, compact))} />
            <Button size="sm" variant="ghost" icon={<IconChevronRight />} aria-label={t.next(view)} onClick={() => setDate(shiftDate(view, date, 1, compact))} />
          </div>
          <div className="fa-sch-title" aria-live="polite">
            {title}
          </div>
          {viewOptions.length > 1 ? (
            <div className="fa-sch-views">
              <Segmented size="sm" options={viewOptions} value={view} onValueChange={setView} aria-label={t.views} />
            </div>
          ) : null}
        </div>
        <div className="fa-sch-body">
          {view === "month" ? <MonthView events={placed} days={days} /> : view === "agenda" ? <AgendaView events={placed} days={days} title={title} /> : <TimeGrid events={placed} days={days} scrollToTime={scrollToTime} />}
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
