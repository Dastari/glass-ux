import { useVirtualizer } from "@tanstack/react-virtual"
import { memo, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type FocusEvent, type KeyboardEvent, type PointerEvent, type ReactNode } from "react"
import { flushSync } from "react-dom"
import { isRtl, readingKey } from "../../lib/direction.js"
import { dateTimeFormat, listFormat } from "../../lib/locale/intl.js"
import { useElementSize } from "../../lib/use-element-size.js"
import { addDays, fromIsoDate, isoParts, isWeekend, type IsoDate } from "../date-picker/calendar-date.js"
import { DragDropProvider, useDraggable, useDragDropMonitor, useDropZone, useHasDragDropProvider } from "../drag-drop/drag-drop.js"
import type { DragEffect, DragInfo, DragItem, DropVerdict } from "../drag-drop/types.js"
import { eventName, formatDay, formatDayShort, formatMinutes, formatMinutesRange, toneAttribute, useScheduler, type PendingChange } from "./context.js"
import { editEvent, moveEventTo } from "./edit.js"
import { fromPortal, trackPointer } from "./gesture.js"
import { laneSegments, type LaneSegment, type PlacedEvent } from "./layout.js"
import { daysBetween, indexFrom } from "./range.js"
import type { SchedulerBlock, SchedulerDropTarget, SchedulerResource } from "./types.js"
import { DAY_MINUTES, wallPosition, zonedInstant } from "./zone.js"

/** The DragDrop item type of a timeline event, for your own zones that take events (a list of unscheduled work). `item.data` is the event. */
export const SCHEDULER_EVENT_TYPE = "scheduler-event"

/** Above this many rows only the rows in view (and a few either side) are rendered. */
const VIRTUAL_ROWS = 40
/** The most of the timeline's height sticky rows may take and stay pinned. */
const PINNED_SHARE = 0.4
/** Day columns rendered either side of the view while a long timeline scrolls sideways. */
const COLUMN_OVERSCAN = 7

interface TimelineViewProps {
  events: PlacedEvent[]
  days: IsoDate[]
}

interface Cursor {
  /** Index among all rows (sticky first). */
  row: number
  first: number
  last: number
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const monthOf = (day: IsoDate) => day.slice(0, 7)

/** The column under `x` in a row's lanes, by arithmetic: every column is the same width. */
function columnAt(lanes: HTMLElement, x: number, count: number, rtl: boolean): number {
  const rect = lanes.getBoundingClientRect()
  const width = rect.width / count || 1
  return clamp(Math.floor((rtl ? rect.right - x : x - rect.left) / width), 0, count - 1)
}

/** Scroll position from the reading start (Chromium and Firefox report negative scrollLeft in right-to-left). */
const scrollStart = (element: HTMLElement) => Math.abs(element.scrollLeft)
const setScrollStart = (element: HTMLElement, value: number, rtl: boolean) => {
  element.scrollLeft = rtl ? -Math.max(0, value) : Math.max(0, value)
}

/**
 * The timeline: a row per resource and a column per day. Events are bars across the days they
 * touch, packed into lanes so a row grows to fit them; sticky resources stay under the day
 * headings. Rows are DragDrop zones: timeline events move between them (and out to your own
 * zones), and your zones' items drop onto them.
 */
export function TimelineView(props: TimelineViewProps) {
  const inside = useHasDragDropProvider()
  return inside ? (
    <TimelineBody {...props} />
  ) : (
    <DragDropProvider>
      <TimelineBody {...props} />
    </DragDropProvider>
  )
}

function TimelineBody({ events, days }: TimelineViewProps) {
  const context = useScheduler()
  const { t, locale, today, date, compact, loading, selectable, continuous, timeZone, resources, view } = context
  const zonePrefix = useId()
  const scroller = useRef<HTMLDivElement>(null)
  const head = useRef<HTMLDivElement>(null)
  const pinnedBlock = useRef<HTMLDivElement>(null)
  const { height: headHeight } = useElementSize(head)
  const { height: stickyHeight } = useElementSize(pinnedBlock)
  const { width: viewportWidth, height: viewportHeight } = useElementSize(scroller)

  const rows = useMemo(() => [...resources.filter((resource) => resource.sticky), ...resources.filter((resource) => !resource.sticky)], [resources])
  const stickyCount = useMemo(() => resources.filter((resource) => resource.sticky).length, [resources])
  const layouts = useMemo(() => {
    const byResource = new Map<string, PlacedEvent[]>()
    for (const placed of events) {
      const id = placed.event.resourceId
      if (id === undefined) continue
      const list = byResource.get(id)
      if (list) list.push(placed)
      else byResource.set(id, [placed])
    }
    return new Map(rows.map((resource) => [resource.id, laneSegments(byResource.get(resource.id) ?? [], days)]))
  }, [events, rows, days])

  /* ── Columns: widths, the window rendered, and the rolling month ──────────────── */

  const dayKey = days.join()
  const [metrics, setMetrics] = useState({ resource: 0, column: 0 })
  const measure = useCallback(() => {
    const element = head.current?.querySelector<HTMLElement>(".fa-sch-tl-days")
    const corner = head.current?.querySelector<HTMLElement>(".fa-sch-tl-corner")
    if (!element) return { resource: 0, column: 0 }
    const next = { resource: compact ? 0 : (corner?.offsetWidth ?? 0), column: element.offsetWidth / Math.max(1, days.length) }
    setMetrics((current) => (current.resource === next.resource && current.column === next.column ? current : next))
    return next
  }, [compact, days.length])
  useLayoutEffect(() => void measure(), [measure, viewportWidth, dayKey])

  const [span, setSpan] = useState<{ from: number; to: number }>({ from: 0, to: days.length })
  const updateWindow = useCallback(() => {
    const element = scroller.current
    if (!continuous || !element || !metrics.column) return setSpan((current) => (current.from === 0 && current.to === days.length ? current : { from: 0, to: days.length }))
    const start = scrollStart(element)
    const visible = element.clientWidth - metrics.resource
    // Whole weeks, so scrolling re-renders once a week of columns rather than every column.
    const from = Math.max(0, Math.floor((start / metrics.column - COLUMN_OVERSCAN) / 7) * 7)
    const to = Math.min(days.length, Math.ceil(((start + visible) / metrics.column + COLUMN_OVERSCAN) / 7) * 7)
    setSpan((current) => (current.from === from && current.to === to ? current : { from, to }))
  }, [continuous, metrics, days.length])
  useLayoutEffect(() => updateWindow(), [updateWindow, dayKey])

  // A rolling month follows the scroll: when the middle of the view is in another month, that
  // month becomes the date, the days around it change, and the scroll keeps the same day under
  // the same place. Previous, next and Today centre the date instead.
  const anchor = useRef<{ day: IsoDate; offset: number } | null>(null)
  const settle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const onScroll = () => {
    updateWindow()
    if (!continuous) return
    globalThis.clearTimeout(settle.current)
    settle.current = globalThis.setTimeout(() => {
      const element = scroller.current
      if (!element || !metrics.column) return
      const start = scrollStart(element)
      const visible = element.clientWidth - metrics.resource
      const middle = days[clamp(Math.floor((start + visible / 2) / metrics.column), 0, days.length - 1)]
      if (!middle || monthOf(middle) === monthOf(date)) return
      const left = clamp(Math.floor(start / metrics.column), 0, days.length - 1)
      anchor.current = { day: days[left]!, offset: start - left * metrics.column }
      context.setDate(middle)
    }, 140)
  }
  useEffect(() => () => globalThis.clearTimeout(settle.current), [])

  useLayoutEffect(() => {
    const element = scroller.current
    if (!element) return
    const { resource, column } = measure()
    if (!column) return
    const rtl = isRtl(element)
    const held = anchor.current
    anchor.current = null
    if (held) {
      setScrollStart(element, indexFrom(days, held.day) * column + held.offset, rtl)
    } else {
      const index = indexFrom(days, date)
      const visible = element.clientWidth - resource
      const start = scrollStart(element)
      if (continuous || index * column < start || (index + 1) * column > start + visible) setScrollStart(element, index * column - (visible - column) / 2, rtl)
    }
    updateWindow()
  }, [dayKey, date]) // oxlint-disable-line react-hooks/exhaustive-deps -- placed when the days or the date change, not on every measure

  /* ── Rows: sticky ones pinned under the day headings, the rest virtualised ─────── */

  // Sticky rows stay pinned only while they leave most of the view to the others: never in
  // the narrow form, and not when they would take more than PINNED_SHARE of the height, so
  // every row can still be scrolled into the open, tapped and dropped on.
  const pinned = !compact && stickyCount > 0 && viewportHeight > 0 && stickyHeight <= viewportHeight * PINNED_SHARE
  const above = headHeight + stickyHeight
  const covered = headHeight + (pinned ? stickyHeight : 0)
  const body = rows.slice(stickyCount)
  const virtual = body.length > VIRTUAL_ROWS
  const virtualizer = useVirtualizer({
    count: virtual ? body.length : 0,
    getScrollElement: () => scroller.current,
    estimateSize: () => 56,
    overscan: 6,
    scrollMargin: above,
    scrollPaddingStart: covered,
    getItemKey: (index) => body[index]?.id ?? index,
  })
  const items = virtual ? virtualizer.getVirtualItems() : []
  const rendered = virtual ? items.map((item) => ({ resource: body[item.index]!, index: item.index })) : body.map((resource, index) => ({ resource, index }))
  const padStart = virtual && items.length ? items[0]!.start - above : 0
  const padEnd = virtual && items.length ? virtualizer.getTotalSize() - (items.at(-1)!.end - above) : 0

  const scrollRowIntoView = (row: number) => {
    if (row < stickyCount) return
    if (virtual) virtualizer.scrollToIndex(row - stickyCount, { align: "auto" })
    else scroller.current?.querySelector<HTMLElement>(`[data-row-index="${row}"]`)?.scrollIntoView?.({ block: "nearest" })
  }

  /* ── The keyboard cursor: choose a row and days, then Enter ───────────────────── */

  const [cursor, setCursor] = useState<Cursor | null>(null)
  const keyboardDay = () => (cursor ? days[cursor.first] : undefined) ?? (days.includes(today) ? today : days[0]!)
  const describeCursor = (next: Cursor) => {
    const first = days[next.first]!
    const last = days[next.last]!
    const when = first === last ? formatDay(first, locale) : t.timeRange(formatDayShort(first, locale), formatDayShort(last, locale))
    const resource = rows[next.row]
    const blocked = resource ? overlapping(context.blocksOf(resource.id), zonedInstant(first, 0, timeZone), zonedInstant(addDays(last, 1), 0, timeZone)) : []
    return listFormat(locale, { type: "unit", style: "short" }).format([t.atResource(resource?.title ?? "", when), ...blocked.map((block) => block.title).filter((title): title is string => Boolean(title))])
  }
  const placeCursor = (next: Cursor) => {
    setCursor(next)
    context.announce(describeCursor(next))
    scrollRowIntoView(next.row)
    const element = scroller.current
    if (element && metrics.column) {
      const rtl = isRtl(element)
      const start = scrollStart(element)
      const visible = element.clientWidth - metrics.resource
      if (next.first * metrics.column < start) setScrollStart(element, next.first * metrics.column, rtl)
      else if ((next.last + 1) * metrics.column > start + visible) setScrollStart(element, (next.last + 1) * metrics.column - visible, rtl)
    }
  }
  const onFocus = (event: FocusEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || !selectable || cursor || !rows.length) return
    const day = Math.max(0, days.indexOf(keyboardDay()))
    placeCursor({ row: 0, first: day, last: day })
  }
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || !selectable || !cursor) return
    const key = readingKey(event.key, event.currentTarget)
    let next: Cursor | null = null
    if (key === "ArrowUp" || key === "ArrowDown") {
      const row = clamp(cursor.row + (key === "ArrowUp" ? -1 : 1), 0, rows.length - 1)
      next = { ...cursor, row }
    } else if (key === "ArrowLeft" || key === "ArrowRight") {
      const step = key === "ArrowLeft" ? -1 : 1
      next = event.shiftKey ? { ...cursor, last: clamp(cursor.last + step, cursor.first, days.length - 1) } : { row: cursor.row, first: clamp(cursor.first + step, 0, days.length - 1), last: clamp(cursor.first + step, 0, days.length - 1) }
    } else if (key === "Home" || key === "End") {
      const day = key === "Home" ? 0 : days.length - 1
      next = { row: cursor.row, first: day, last: day }
    } else if (key === "Enter" || key === " ") {
      event.preventDefault()
      const resource = rows[cursor.row]
      if (!resource) return
      const element = scroller.current?.querySelector<HTMLElement>(`[data-row-index="${cursor.row}"] .fa-sch-tl-selection`) ?? null
      showSelection(element, cursor.first, cursor.last)
      select(resource, cursor.first, cursor.last, "keyboard", element)
      return
    }
    if (!next) return
    event.preventDefault()
    placeCursor(next)
  }

  /* ── Selecting days in a row ──────────────────────────────────────────────────── */

  const shownSelection = useRef<HTMLElement | null>(null)
  const showSelection = (element: HTMLElement | null, first: number, last: number) => {
    if (shownSelection.current && shownSelection.current !== element) shownSelection.current.removeAttribute("data-show")
    shownSelection.current = element
    if (!element) return
    element.style.setProperty("--_first", String(first + 1))
    element.style.setProperty("--_length", String(last - first + 1))
    element.setAttribute("data-show", "")
  }
  useLayoutEffect(() => showSelection(null, 0, 0), [dayKey]) // oxlint-disable-line react-hooks/exhaustive-deps -- a selection belongs to the days it was made in

  const select = (resource: SchedulerResource, first: number, last: number, input: "pointer" | "keyboard", element: HTMLElement | null) => {
    const start = days[first]!
    const end = addDays(days[last]!, 1)
    context.selectSlot({ start: new Date(zonedInstant(start, 0, timeZone)), end: new Date(zonedInstant(end, 0, timeZone)), allDay: true, days: { start, end }, input, resourceId: resource.id }, element)
  }

  const selectDays = (resource: SchedulerResource) => (event: PointerEvent<HTMLDivElement>) => {
    if (!selectable || event.button !== 0 || fromPortal(event) || (event.target as Element).closest(".fa-sch-ev, button, a, input, select, textarea")) return
    const lanes = event.currentTarget
    const rtl = isRtl(lanes)
    const element = lanes.querySelector<HTMLElement>(":scope > .fa-sch-tl-selection")
    const anchorColumn = columnAt(lanes, event.clientX, days.length, rtl)
    let range = { first: anchorColumn, last: anchorColumn }
    trackPointer(
      event,
      {
        move: (point) => {
          const at = columnAt(lanes, point.x, days.length, rtl)
          range = { first: Math.min(anchorColumn, at), last: Math.max(anchorColumn, at) }
          showSelection(element, range.first, range.last)
        },
        end: () => {
          showSelection(element, range.first, range.last)
          select(resource, range.first, range.last, "pointer", element)
        },
        cancel: () => showSelection(null, 0, 0),
      },
      { touch: "tap", scroller: scroller.current },
    )
  }

  /* ── Drops: timeline events between rows, and your items onto rows ────────────── */

  const grab = useRef<{ id: string; offset: number } | null>(null)
  // The row and column under the drag: the target row re-renders when they change, so its
  // verdict (validateDrop with the proposed day) is asked again, never on every frame.
  const [hovered, setHovered] = useState<{ zoneId: string; column: number } | null>(null)
  const hoveredRef = useRef(hovered)
  const hover = (zoneId: string | null, column: number) => {
    const next = zoneId ? { zoneId, column } : null
    const current = hoveredRef.current
    if (current?.zoneId === next?.zoneId && current?.column === next?.column) return
    hoveredRef.current = next
    setHovered(next)
  }
  const pointer = useRef<{ x: number; y: number } | null>(null)
  const indicator = useRef<HTMLElement | null>(null)
  const ownItem = (item: DragItem) => item.type === SCHEDULER_EVENT_TYPE && item.id.startsWith(`${zonePrefix}:`)
  const placedOf = (item: DragItem) => events.find((placed) => `${zonePrefix}:${placed.id}` === item.id)
  const segmentOf = (placed: PlacedEvent) => layouts.get(placed.event.resourceId ?? "")?.segments.find((segment) => segment.placed.id === placed.id)

  /** The column a drop lands on: under the pointer, or the event's own (keyboard), or the cursor's. */
  const dropColumn = (zone: HTMLElement | null, item: DragItem, input: "pointer" | "keyboard") => {
    if (input === "pointer" && zone && pointer.current) {
      const at = columnAt(zone, pointer.current.x, days.length, isRtl(zone))
      return ownItem(item) && grab.current?.id === item.id ? at - grab.current.offset : at
    }
    const placed = ownItem(item) ? placedOf(item) : undefined
    const segment = placed ? segmentOf(placed) : undefined
    return segment ? segment.first : Math.max(0, days.indexOf(keyboardDay()))
  }
  const zoneElement = (zoneId: string | null) => (zoneId ? (scroller.current?.querySelector<HTMLElement>(`[data-tl-zone="${CSS.escape(zoneId)}"]`) ?? null) : null)
  const hideIndicator = () => {
    indicator.current?.removeAttribute("data-show")
    indicator.current = null
  }
  const showIndicator = (zoneId: string | null, item: DragItem, input: "pointer" | "keyboard") => {
    const zone = zoneElement(zoneId)
    const element = zone?.querySelector<HTMLElement>(":scope > .fa-sch-tl-drop") ?? null
    if (element !== indicator.current) hideIndicator()
    if (!zone || !element) return hover(null, 0)
    const placed = ownItem(item) ? placedOf(item) : undefined
    const length = placed ? (segmentOf(placed)?.length ?? 1) : 1
    const first = clamp(dropColumn(zone, item, input), 0, days.length - 1)
    hover(zoneId, first)
    element.style.setProperty("--_first", String(first + 1))
    element.style.setProperty("--_length", String(Math.min(length, days.length - first)))
    element.setAttribute("data-show", "")
    indicator.current = element
  }
  useDragDropMonitor({
    onDragMove: (event) => {
      pointer.current = event.pointer
      if (event.target.zoneId?.startsWith(`${zonePrefix}:`)) showIndicator(event.target.zoneId, event.item, "pointer")
      else {
        hideIndicator()
        hover(null, 0)
      }
    },
    onDragOver: (event) => {
      if (event.input !== "keyboard") return
      if (event.target.zoneId?.startsWith(`${zonePrefix}:`)) showIndicator(event.target.zoneId, event.item, "keyboard")
      else hideIndicator()
    },
    onDragEnd: () => {
      hideIndicator()
      hover(null, 0)
      pointer.current = null
      grab.current = null
    },
  })

  /** Where an item would land on a row at a column: the change for an event of ours, and the target for validateDrop. */
  const landing = (item: DragItem, resource: SchedulerResource, column: number, input: "pointer" | "keyboard", effect: DragEffect) => {
    const day = days[clamp(column, 0, days.length - 1)]!
    if (ownItem(item)) {
      const placed = placedOf(item)
      if (!placed) return null
      const segment = segmentOf(placed)
      const grabbed = segment ? days[segment.first]! : placed.startDay
      const change = moveAcross(placed, addDays(placed.startDay, daysBetween(grabbed, day)), resource.id, timeZone, input)
      const startMs = change?.startMs ?? placed.startMs
      const endMs = change?.endMs ?? placed.endMs
      const target: SchedulerDropTarget = { day: change?.days?.start ?? addDays(placed.startDay, daysBetween(grabbed, day)), start: new Date(startMs), end: new Date(endMs), allDay: placed.allDay, effect, input, blocks: overlapping(context.blocksOf(resource.id), startMs, endMs) }
      return { change: change && effect === "copy" ? { ...change, effect } : change, target }
    }
    const startMs = zonedInstant(day, 0, timeZone)
    const endMs = zonedInstant(addDays(day, 1), 0, timeZone)
    const target: SchedulerDropTarget = { day, start: new Date(startMs), end: new Date(endMs), allDay: true, effect, input, blocks: overlapping(context.blocksOf(resource.id), startMs, endMs) }
    return { change: null, target }
  }

  const zoneFor = (resource: SchedulerResource) => {
    const zoneId = `${zonePrefix}:${resource.id}`
    return {
      id: zoneId,
      label: resource.title,
      accept: (item: DragItem) => (ownItem(item) ? true : context.acceptsDrop(item)),
      validate: (drag: DragInfo): DropVerdict => {
        if (ownItem(drag.item)) {
          const placed = placedOf(drag.item)
          if (!placed || !context.canEdit(placed)) return false
        }
        const zone = zoneElement(zoneId)
        const land = landing(drag.item, resource, dropColumn(zone, drag.item, drag.input), drag.input, drag.effect)
        return land ? context.validateDrop(drag, resource, land.target) : false
      },
      onDrop: (event: { item: DragItem; input: "pointer" | "keyboard"; effect: DragEffect }) => {
        const zone = zoneElement(zoneId)
        const column = clamp(dropColumn(zone, event.item, event.input), 0, days.length - 1)
        hideIndicator()
        const land = landing(event.item, resource, column, event.input, event.effect)
        if (!land) return false
        if (ownItem(event.item)) {
          if (!land.change) return false
          context.commit(land.change)
          return
        }
        return context.dropItem({ item: event.item, resourceId: resource.id, day: land.target.day, start: land.target.start, end: land.target.end, input: event.input, effect: event.effect })
      },
    }
  }

  /* ── Rendering ────────────────────────────────────────────────────────────────── */

  const narrow = view === "month"
  const weekday = dateTimeFormat(locale, { weekday: narrow ? "narrow" : "short" })
  const monthShort = dateTimeFormat(locale, { month: "short" })
  const dayNumber = dateTimeFormat(locale, { day: "numeric" })
  const opensDay = view !== "day" && context.views.includes("day") && !compact
  const columns = days.slice(span.from, span.to).map((day, offset) => ({ day, index: span.from + offset }))
  const cellsFor = (row: number) => (cursor?.row === row ? cursor : null)
  const hoveredFor = (resource: SchedulerResource) => (hovered?.zoneId === `${zonePrefix}:${resource.id}` ? hovered.column : null)

  const stripes = (
    <div className="fa-sch-tl-stripes" aria-hidden>
      {columns.map(({ day, index }) => (
        <span
          key={day}
          className="fa-sch-tl-stripe"
          style={{ "--_first": index + 1 } as CSSProperties}
          data-today={day === today ? "" : undefined}
          data-weekend={isWeekend(day, locale) ? "" : undefined}
          data-month-start={isoParts(day)?.day === 1 && index > 0 ? "" : undefined}
        />
      ))}
    </div>
  )

  const style = {
    "--_days": days.length,
    "--_head-h": `${headHeight}px`,
    "--_covered": `${covered}px`,
    ...(context.columnWidth ? { "--_col-min": context.columnWidth } : {}),
    ...(context.resourceWidth ? { "--_res-w": context.resourceWidth } : {}),
  } as CSSProperties

  const rowProps = { days, span, compact, loading, selectDays, zoneFor, grab }

  return (
    <div className="fa-sch-tl" data-view={view} data-continuous={continuous ? "" : undefined} style={style}>
      <div
        ref={scroller}
        className="fa-sch-tl-scroll"
        tabIndex={0}
        role="group"
        aria-label={t.timelineSlots(rangeLabel(days, locale))}
        aria-description={selectable ? t.timelineSlotsHint : undefined}
        onScroll={onScroll}
        onFocus={onFocus}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setCursor(null)
        }}
        onKeyDown={onKeyDown}
      >
        <div className="fa-sch-tl-inner">
          <div ref={head} className="fa-sch-tl-head">
            <div className="fa-sch-tl-headrow">
              {compact ? null : <div className="fa-sch-tl-corner">{context.resourceHeader ?? <span className="fa-sch-tl-corner-label">{t.resources}</span>}</div>}
              <div className="fa-sch-tl-days">
                {columns.map(({ day, index }) => {
                  const parts = isoParts(day)
                  const monthStart = parts?.day === 1 || index === 0
                  const Tag = opensDay ? "button" : "span"
                  const label = narrow ? (monthStart && continuous ? monthShort.format(fromIsoDate(day)) : weekday.format(fromIsoDate(day))) : weekday.format(fromIsoDate(day))
                  return (
                    <Tag
                      key={day}
                      {...(opensDay ? { type: "button" as const, onClick: () => (context.setDate(day), context.setView("day")), "aria-label": formatDay(day, locale) } : {})}
                      className="fa-sch-tl-day"
                      style={{ "--_first": index + 1 } as CSSProperties}
                      data-today={day === today ? "" : undefined}
                      data-weekend={isWeekend(day, locale) ? "" : undefined}
                      data-month-start={parts?.day === 1 && index > 0 ? "" : undefined}
                      aria-current={day === today ? "date" : undefined}
                    >
                      {compact ? null : <span className="fa-sch-tl-day-weekday">{label}</span>}
                      <span className="fa-sch-tl-day-number">{compact ? formatDay(day, locale) : narrow ? dayNumber.format(fromIsoDate(day)) : `${dayNumber.format(fromIsoDate(day))} ${monthShort.format(fromIsoDate(day))}`}</span>
                    </Tag>
                  )
                })}
              </div>
            </div>
          </div>
          {stickyCount ? (
            <div ref={pinnedBlock} className="fa-sch-tl-pinned" data-pinned={pinned ? "" : undefined}>
              {stripes}
              {rows.slice(0, stickyCount).map((resource, row) => (
                <TimelineRow key={resource.id} resource={resource} row={row} sticky segments={layouts.get(resource.id)!} cursor={cellsFor(row)} {...rowProps} zonePrefix={zonePrefix} hoveredColumn={hoveredFor(resource)} />
              ))}
            </div>
          ) : null}
          <div className="fa-sch-tl-rows">
            {stripes}
            {padStart > 0 ? <div className="fa-sch-tl-pad" style={{ blockSize: padStart }} /> : null}
            {rendered.map(({ resource, index }) => {
              const row = stickyCount + index
              return (
                <TimelineRow
                  key={resource.id}
                  resource={resource}
                  row={row}
                  segments={layouts.get(resource.id)!}
                  cursor={cellsFor(row)}
                  measure={virtual ? virtualizer.measureElement : undefined}
                  virtualIndex={virtual ? index : undefined}
                  {...rowProps}
                  zonePrefix={zonePrefix}
                  hoveredColumn={hoveredFor(resource)}
                />
              )
            })}
            {padEnd > 0 ? <div className="fa-sch-tl-pad" style={{ blockSize: padEnd }} /> : null}
            {rows.length ? null : <p className="fa-sch-empty">{t.noResources}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Move an event to a day and, maybe, another resource; null when neither changes. */
function moveAcross(placed: PlacedEvent, day: IsoDate, resourceId: string, timeZone: string, input: PendingChange["input"]): PendingChange | null {
  const moved = moveEventTo(placed, day, null, timeZone, input)
  if (resourceId === placed.event.resourceId) return moved
  if (moved) return { ...moved, resourceId }
  const days = placed.allDay ? { start: placed.startDay, end: addDays(placed.endDay, 1) } : undefined
  return { placed, kind: "move", input, startMs: placed.startMs, endMs: placed.endMs, days, resourceId }
}

/** The blocks among `blocks` that overlap [startMs, endMs). */
function overlapping(blocks: ReadonlyArray<{ placed: PlacedEvent; block: SchedulerBlock }>, startMs: number, endMs: number): SchedulerBlock[] {
  return blocks.filter(({ placed }) => placed.startMs < endMs && placed.endMs > startMs).map(({ block }) => block)
}

/** A verdict's reason, or null. */
const reasonOf = (verdict: DropVerdict) => (typeof verdict === "object" ? (verdict.reason ?? null) : null)

function rangeLabel(days: IsoDate[], locale: string) {
  if (days.length === 1) return formatDay(days[0]!, locale)
  return dateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).formatRange(fromIsoDate(days[0]!), fromIsoDate(days.at(-1)!))
}

interface TimelineRowProps {
  resource: SchedulerResource
  row: number
  sticky?: boolean
  segments: { segments: LaneSegment[]; lanes: number }
  days: IsoDate[]
  span: { from: number; to: number }
  compact: boolean
  loading: boolean
  cursor: Cursor | null
  zonePrefix: string
  measure?: (element: Element | null) => void
  virtualIndex?: number
  /** The column a drag is over in this row: changing it re-renders the row, which asks its verdict again. */
  hoveredColumn?: number | null
  selectDays: (resource: SchedulerResource) => (event: PointerEvent<HTMLDivElement>) => void
  zoneFor: (resource: SchedulerResource) => Parameters<typeof useDropZone>[0]
  grab: { current: { id: string; offset: number } | null }
}

const TimelineRow = /* @__PURE__ */ memo(function TimelineRow({ resource, row, sticky, segments, days, span, compact, loading, cursor, zonePrefix, measure, virtualIndex, selectDays, zoneFor, grab }: TimelineRowProps) {
  const context = useScheduler()
  const zone = useDropZone(zoneFor(resource), { trackState: false })
  const hover = useRef<HTMLSpanElement>(null)
  const inWindow = segments.segments.filter((segment) => segment.first < span.to && segment.first + segment.length > span.from)
  const blocks = context.blocksOf(resource.id).flatMap(({ placed, block }) => {
    const first = indexFrom(days, placed.startDay)
    const end = indexFrom(days, addDays(placed.endDay, 1))
    return end > first && first < span.to && end > span.from ? [{ block, first, length: end - first }] : []
  })

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const element = hover.current
    if (!element || !context.selectable || event.pointerType !== "mouse" || compact) return
    if (fromPortal(event) || (event.target as Element).closest(".fa-sch-ev") || document.documentElement.hasAttribute("data-dnd") || document.documentElement.hasAttribute("data-scheduler-gesture")) return element.removeAttribute("data-show")
    element.style.setProperty("--_first", String(columnAt(event.currentTarget, event.clientX, days.length, isRtl(event.currentTarget)) + 1))
    element.setAttribute("data-show", "")
  }

  return (
    <div
      ref={measure}
      data-index={virtualIndex}
      className="fa-sch-tl-row"
      role="group"
      aria-label={resource.title}
      data-row-index={row}
      data-sticky={sticky ? "" : undefined}
    >
      <div className="fa-sch-tl-resource">{context.renderResource ? context.renderResource(resource, { compact, count: segments.segments.length }) : <DefaultResource resource={resource} />}</div>
      <div
        ref={zone.ref}
        className="fa-sch-tl-lanes"
        data-tl-zone={`${zonePrefix}:${resource.id}`}
        style={{ "--_lanes": Math.max(1, segments.lanes) } as CSSProperties}
        onPointerDown={context.selectable ? selectDays(resource) : undefined}
        onPointerMove={onPointerMove}
        onPointerLeave={() => hover.current?.removeAttribute("data-show")}
      >
        {blocks.map(({ block, first, length }) => (
          <span key={block.id} className="fa-sch-tl-block" data-tone={String(block.tone ?? "neutral")} style={{ "--_first": first + 1, "--_length": length } as CSSProperties} aria-hidden>
            {block.title ? <span className="fa-sch-tl-block-title">{block.title}</span> : null}
          </span>
        ))}
        {loading
          ? skeletons(row, days.length).map((first) => <span key={first} className="fa-sch-ev fa-skel fa-shimmer" data-variant="lane" data-skeleton style={{ "--_first": first + 1, "--_length": 1, "--_lane": 1 } as CSSProperties} />)
          : inWindow.map((segment) => <TimelineEvent key={segment.placed.id} segment={segment} days={days} zonePrefix={zonePrefix} grab={grab} />)}
        <span ref={hover} className="fa-sch-tl-hover" aria-hidden />
        <span className="fa-sch-tl-selection" aria-hidden />
        <span className="fa-sch-tl-drop" aria-hidden />
        {cursor ? <span className="fa-sch-tl-cursor" aria-hidden style={{ "--_first": cursor.first + 1, "--_length": cursor.last - cursor.first + 1 } as CSSProperties} /> : null}
      </div>
    </div>
  )
})

function DefaultResource({ resource }: { resource: SchedulerResource }) {
  return (
    <span className="fa-sch-tl-resource-text">
      <span className="fa-sch-tl-resource-title">{resource.title}</span>
      {resource.description ? <span className="fa-sch-tl-resource-description">{resource.description}</span> : null}
    </span>
  )
}

/** Placeholder bars while loading: in the same places every time (R9.3). */
function skeletons(row: number, days: number): number[] {
  if (days === 1) return row % 2 === 0 ? [0] : []
  return [(row * 3) % days, (row * 5 + 2) % days].filter((value, index, list) => list.indexOf(value) === index)
}

interface TimelineEventProps {
  segment: LaneSegment
  days: IsoDate[]
  zonePrefix: string
  grab: { current: { id: string; offset: number } | null }
}

/**
 * A timeline event: a card whose whole face is one button (its accessible name says what, when
 * and where; Enter opens it, arrows edit it, Space picks it up), with your content above it.
 * Buttons and links in your content keep their own behaviour.
 */
function TimelineEvent({ segment, days, zonePrefix, grab }: TimelineEventProps) {
  const context = useScheduler()
  const { placed } = segment
  const { t, locale, timeZone, compact, snapMinutes } = context
  const editable = context.canEdit(placed)
  const resizable = context.canResize(placed)
  const reason = context.lockReason(placed)
  const effect = context.effectOf(placed)
  const itemId = `${zonePrefix}:${placed.id}`
  const draggable = useDraggable({ id: itemId, type: SCHEDULER_EVENT_TYPE, data: placed.event, label: placed.event.title, disabled: editable ? false : (reason ?? true), effect, liftKeys: [" "] })

  /** Ask validateDrop about a keyboard move or a resize before making it; announce a refusal. */
  const allowed = (change: PendingChange) => {
    const resourceId = change.resourceId ?? placed.event.resourceId
    const resource = context.resources.find((candidate) => candidate.id === resourceId)
    if (!resource) return true
    const item = { id: itemId, type: SCHEDULER_EVENT_TYPE, data: placed.event, label: placed.event.title }
    const target: SchedulerDropTarget = {
      day: change.days?.start ?? wallPosition(change.startMs, timeZone).day,
      start: new Date(change.startMs),
      end: new Date(change.endMs),
      allDay: placed.allDay,
      effect: "move",
      input: change.input,
      blocks: overlapping(context.blocksOf(resource.id), change.startMs, change.endMs),
    }
    const verdict = context.validateDrop({ item, source: { zoneId: null, index: null }, input: change.input, effect: "move" }, resource, target)
    if (verdict === true) return true
    context.announce(t.refused(placed.event.title, reasonOf(verdict)))
    return false
  }
  const card = useRef<HTMLDivElement | null>(null)

  const time = placed.allDay ? t.allDay : placed.startDay === placed.endDay ? formatMinutesRange(placed.startMinutes, placed.endMinutes, locale) : t.timeRange(`${formatDayShort(placed.startDay, locale)} ${formatMinutes(placed.startMinutes, locale)}`, `${formatDayShort(placed.endDay, locale)} ${formatMinutes(placed.endMinutes % DAY_MINUTES, locale)}`)
  const content: ReactNode = context.renderEvent ? (
    context.renderEvent(placed.event, { start: new Date(placed.startMs), end: new Date(placed.endMs), allDay: placed.allDay, continuesBefore: segment.continuesBefore, continuesAfter: segment.continuesAfter, time, compact })
  ) : (
    <>
      <span className="fa-sch-ev-title">{placed.event.title}</span>
      {placed.allDay ? null : <span className="fa-sch-ev-time">{time}</span>}
    </>
  )

  /** The next shown day after (or before) `day`, else the neighbouring calendar day. */
  const step = (day: IsoDate, direction: 1 | -1) => (direction > 0 ? days[indexFrom(days, addDays(day, 1))] : days[indexFrom(days, day) - 1]) ?? addDays(day, direction)

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.defaultPrevented || !editable || event.metaKey || event.ctrlKey) return
    const key = readingKey(event.key, event.currentTarget)
    let change: PendingChange | null = null
    if (key === "ArrowLeft" || key === "ArrowRight") {
      const direction = key === "ArrowLeft" ? -1 : 1
      if (event.shiftKey && !resizable) return
      if (event.shiftKey && event.altKey) change = editEvent(placed, { kind: "resize", edge: "start", days: daysBetween(placed.startDay, step(placed.startDay, direction)), snap: snapMinutes }, timeZone, "keyboard")
      else if (event.shiftKey) change = editEvent(placed, { kind: "resize", days: daysBetween(placed.endDay, step(placed.endDay, direction)), snap: snapMinutes }, timeZone, "keyboard")
      else if (!event.altKey) change = editEvent(placed, { kind: "move", days: daysBetween(placed.startDay, step(placed.startDay, direction)) }, timeZone, "keyboard")
    } else if ((key === "ArrowUp" || key === "ArrowDown") && !event.shiftKey && !event.altKey) {
      const resourceId = context.neighbourResource(placed.event.resourceId, key === "ArrowUp" ? -1 : 1)
      if (resourceId) change = moveAcross(placed, placed.startDay, resourceId, timeZone, "keyboard")
    } else return
    event.preventDefault()
    event.stopPropagation()
    if (change && allowed(change)) context.commit(change)
  }

  /* ── Resizing from either edge ────────────────────────────────────────────────── */

  const resize = (edge: "start" | "end") => (event: PointerEvent<HTMLSpanElement>) => {
    if (event.button !== 0) return
    event.stopPropagation()
    const element = card.current
    const lanes = element?.parentElement
    if (!element || !lanes) return
    const rtl = isRtl(lanes)
    const first = segment.first
    const last = segment.first + segment.length - 1
    let target = edge === "start" ? first : last
    const reset = () => {
      element.removeAttribute("data-dragging")
      element.style.removeProperty("--_drag-first")
      element.style.removeProperty("--_drag-length")
    }
    trackPointer(
      event,
      {
        begin: () => element.setAttribute("data-dragging", "resize"),
        move: (point) => {
          const at = columnAt(lanes, point.x, days.length, rtl)
          target = edge === "start" ? Math.min(at, last) : Math.max(at, first)
          const from = edge === "start" ? target : first
          const to = edge === "start" ? last : target
          element.style.setProperty("--_drag-first", String(from + 1))
          element.style.setProperty("--_drag-length", String(to - from + 1))
        },
        end: (_point, began) => {
          if (!began) return reset()
          context.swallowClick()
          const delta = daysBetween(days[edge === "start" ? first : last]!, days[target]!)
          const change = editEvent(placed, { kind: "resize", edge, days: delta, snap: snapMinutes }, timeZone, "pointer")
          if (change && allowed(change)) flushSync(() => context.commit(change))
          reset()
        },
        cancel: reset,
      },
      { touch: "hold" },
    )
  }

  const setCard = (element: HTMLDivElement | null) => {
    card.current = element
    draggable.ref(element)
  }

  return (
    <div
      ref={setCard}
      className="fa-sch-ev fa-sch-tl-ev"
      data-variant="lane"
      data-tone={toneAttribute(placed)}
      data-editable={editable ? "" : undefined}
      data-continues-before={segment.continuesBefore ? "" : undefined}
      data-continues-after={segment.continuesAfter ? "" : undefined}
      data-custom={context.renderEvent ? "" : undefined}
      style={{ "--_first": segment.first + 1, "--_length": segment.length, "--_lane": segment.lane + 1 } as CSSProperties}
      onPointerDown={(event) => {
        if (fromPortal(event)) return
        const lanes = card.current?.parentElement
        if (lanes) grab.current = { id: itemId, offset: columnAt(lanes, event.clientX, days.length, isRtl(lanes)) - segment.first }
      }}
    >
      <button
        ref={draggable.handleRef}
        type="button"
        className="fa-sch-tl-hit"
        data-event-id={placed.id}
        data-dnd-handle=""
        aria-label={eventName(placed, context)}
        aria-description={reason ?? (editable ? t.timelineEditHint : undefined)}
        onClick={(event) => context.openEvent(placed, event.currentTarget)}
        onKeyDown={onKeyDown}
      />
      <div className="fa-sch-tl-ev-body">{content}</div>
      {resizable && !segment.continuesBefore ? <span className="fa-sch-resize" data-resize data-axis="x" data-edge="start" aria-hidden onPointerDown={resize("start")} /> : null}
      {resizable && !segment.continuesAfter ? <span className="fa-sch-resize" data-resize data-axis="x" data-edge="end" aria-hidden onPointerDown={resize("end")} /> : null}
    </div>
  )
}
