import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type FocusEvent, type KeyboardEvent, type PointerEvent } from "react"
import { flushSync } from "react-dom"
import { readingKey } from "../../lib/direction.js"
import { dateTimeFormat } from "../../lib/locale/intl.js"
import { addDays, fromIsoDate, type IsoDate } from "../date-picker/calendar-date.js"
import { formatDay, formatHour, formatMinutesRange, useScheduler } from "./context.js"
import { moveEventTo, resizeEventTo } from "./edit.js"
import { EventButton } from "./event.js"
import { fromPortal, trackPointer, type Point } from "./gesture.js"
import { barSegments, daySegments, type BarSegment, type DaySegment, type PlacedEvent } from "./layout.js"
import { startOfWeek } from "./range.js"
import { DAY_MINUTES, wallPosition, zonedInstant } from "./zone.js"

const HOURS = Array.from({ length: 23 }, (_, index) => index + 1)

interface TimeGridProps {
  events: PlacedEvent[]
  days: IsoDate[]
  scrollToTime: string
}

interface Cursor {
  day: number
  start: number
  end: number
}

/** Which of `rects` holds `x`, clamped to the first and last. */
function indexAt(rects: DOMRect[], x: number): number {
  const found = rects.findIndex((rect) => x >= rect.left && x < rect.right)
  if (found !== -1) return found
  return x < (rects[0]?.left ?? 0) ? 0 : rects.length - 1
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/** The week and day views: a band of all-day bars over a scrolling grid of hours, one column per day. */
export function TimeGrid({ events, days, scrollToTime }: TimeGridProps) {
  const context = useScheduler()
  const { t, locale, timeZone, today, nowMs, compact, loading, snapMinutes, slotMinutes, view } = context
  const scroller = useRef<HTMLDivElement>(null)
  const columns = useRef<HTMLDivElement>(null)
  const band = useRef<HTMLDivElement>(null)
  const selection = useRef<HTMLDivElement>(null)
  const bandSelection = useRef<HTMLDivElement>(null)
  const { selectable } = context

  const bars = useMemo(() => barSegments(events, days), [events, days])
  const segments = useMemo(() => days.map((day) => daySegments(events, day)), [events, days])
  const now = wallPosition(nowMs, timeZone)

  // Open at the chosen time of day; later navigation keeps the scroll position.
  useLayoutEffect(() => {
    const element = scroller.current
    const grid = columns.current
    if (!element || !grid) return
    const [hours, minutes] = scrollToTime.split(":").map(Number)
    // A quarter of an hour above the time, so its hour label shows whole.
    element.scrollTop = (((hours ?? 0) * 60 + (minutes ?? 0) - 15) / DAY_MINUTES) * grid.offsetHeight
  }, []) // oxlint-disable-line react-hooks/exhaustive-deps -- only when the grid opens

  // A selection belongs to the days it was made in.
  const dayKey = days.join()
  useLayoutEffect(() => {
    selection.current?.removeAttribute("data-show")
    bandSelection.current?.removeAttribute("data-show")
  }, [dayKey])

  const minutesPerPixel = () => DAY_MINUTES / (columns.current?.offsetHeight || DAY_MINUTES)

  /* ── Selecting empty time ─────────────────────────────────────────────────────── */

  const showSelection = (day: number, start: number, end: number) => {
    const element = selection.current
    if (!element) return
    element.style.setProperty("--_day", String(day))
    element.style.setProperty("--_top", String(start))
    element.style.setProperty("--_len", String(end - start))
    element.textContent = formatMinutesRange(start, end, locale)
    element.setAttribute("data-show", "")
  }

  const selectTime = (dayIndex: number) => (event: PointerEvent<HTMLDivElement>) => {
    if (!isSelectable(event) || fromPortal(event) || (event.target as Element).closest(".fa-sch-ev")) return
    bandSelection.current?.removeAttribute("data-show")
    const column = event.currentTarget
    const minuteAt = (point: Point) => clamp((point.y - column.getBoundingClientRect().top) * minutesPerPixel(), 0, DAY_MINUTES - 1)
    const anchor = Math.floor(minuteAt({ x: event.clientX, y: event.clientY }) / slotMinutes) * slotMinutes
    let range = { start: anchor, end: anchor + slotMinutes }
    const day = days[dayIndex]!
    trackPointer(
      event,
      {
        move: (point) => {
          const at = minuteAt(point)
          range = at >= anchor ? { start: anchor, end: Math.min(DAY_MINUTES, Math.ceil((at + 1) / slotMinutes) * slotMinutes) } : { start: Math.floor(at / slotMinutes) * slotMinutes, end: anchor + slotMinutes }
          showSelection(dayIndex, range.start, range.end)
        },
        end: () => {
          showSelection(dayIndex, range.start, range.end)
          context.selectSlot({ start: new Date(zonedInstant(day, range.start, timeZone)), end: new Date(zonedInstant(day, range.end, timeZone)), allDay: false, input: "pointer" }, selection.current)
        },
        cancel: () => selection.current?.removeAttribute("data-show"),
      },
      { touch: "tap", scroller: scroller.current },
    )
  }

  const selectDays = (event: PointerEvent<HTMLDivElement>) => {
    if (!isSelectable(event) || fromPortal(event) || (event.target as Element).closest(".fa-sch-ev")) return
    selection.current?.removeAttribute("data-show")
    const cells = [...(band.current?.querySelectorAll<HTMLElement>(".fa-sch-band-cell") ?? [])].map((cell) => cell.getBoundingClientRect())
    const dayIndex = indexAt(cells, event.clientX)
    let range = { first: dayIndex, last: dayIndex }
    const show = () => {
      const element = bandSelection.current
      if (!element) return
      element.style.setProperty("--_first", String(range.first + 1))
      element.style.setProperty("--_length", String(range.last - range.first + 1))
      element.setAttribute("data-show", "")
    }
    trackPointer(
      event,
      {
        move: (point) => {
          const at = indexAt(cells, point.x)
          range = { first: Math.min(dayIndex, at), last: Math.max(dayIndex, at) }
          show()
        },
        end: () => {
          show()
          const start = days[range.first]!
          const end = addDays(days[range.last]!, 1)
          context.selectSlot({ start: new Date(zonedInstant(start, 0, timeZone)), end: new Date(zonedInstant(end, 0, timeZone)), allDay: true, days: { start, end }, input: "pointer" }, bandSelection.current)
        },
        cancel: () => bandSelection.current?.removeAttribute("data-show"),
      },
      { touch: "tap" },
    )
  }

  /* ── Moving and resizing events ───────────────────────────────────────────────── */

  const dragTimed = (segment: DaySegment, dayIndex: number) => (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return
    const element = event.currentTarget
    const resize = Boolean((event.target as Element).closest("[data-resize]"))
    const placed = segment.placed
    const rects = [...(columns.current?.querySelectorAll<HTMLElement>(".fa-sch-col") ?? [])].map((column) => column.getBoundingClientRect())
    const scrollStart = scroller.current?.scrollTop ?? 0
    const start = { x: event.clientX, y: event.clientY }
    const length = segment.end - segment.start
    const time = element.querySelector<HTMLElement>("[data-event-time]")
    const text = time?.textContent ?? ""
    let target = { day: dayIndex, delta: 0 }
    const reset = () => {
      element.removeAttribute("data-dragging")
      for (const name of ["--_drag-top", "--_drag-len"]) element.style.removeProperty(name)
      element.style.removeProperty("translate")
      if (time) time.textContent = text
    }
    trackPointer(
      event,
      {
        begin: () => element.setAttribute("data-dragging", resize ? "resize" : "move"),
        move: (point) => {
          const dy = point.y - start.y + ((scroller.current?.scrollTop ?? 0) - scrollStart)
          const delta = Math.round((dy * minutesPerPixel()) / snapMinutes) * snapMinutes
          if (resize) {
            const end = clamp(segment.end + delta, segment.start + snapMinutes, DAY_MINUTES)
            target = { day: dayIndex, delta: end - segment.end }
            element.style.setProperty("--_drag-len", String(end - segment.start))
            if (time) time.textContent = formatMinutesRange(placed.startDay === days[dayIndex] ? placed.startMinutes : 0, end, locale)
            return
          }
          const top = clamp(segment.start + delta, 0, DAY_MINUTES - Math.min(length, snapMinutes))
          const day = indexAt(rects, point.x)
          target = { day, delta: top - segment.start }
          element.style.setProperty("--_drag-top", String(top))
          element.style.translate = `${(rects[day]?.left ?? 0) - (rects[dayIndex]?.left ?? 0)}px 0`
          const begins = placed.startMinutes + target.delta
          if (time) time.textContent = formatMinutesRange(begins, begins + (placed.endMs - placed.startMs) / 60_000, locale)
        },
        end: (_point, began) => {
          if (!began) return reset()
          context.swallowClick()
          const change = resize
            ? resizeEventTo(placed, days[dayIndex]!, segment.end + target.delta, timeZone, "pointer", snapMinutes)
            : moveEventTo(placed, addDays(placed.startDay, target.day - dayIndex), placed.startMinutes + target.delta, timeZone, "pointer")
          if (change) flushSync(() => context.commit(change))
          reset()
        },
        cancel: reset,
      },
      { touch: "hold", scroller: scroller.current },
    )
  }

  const dragBar = (bar: BarSegment) => (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return
    const element = event.currentTarget
    const resize = Boolean((event.target as Element).closest("[data-resize]"))
    const cells = [...(band.current?.querySelectorAll<HTMLElement>(".fa-sch-band-cell") ?? [])].map((cell) => cell.getBoundingClientRect())
    const grabbed = indexAt(cells, event.clientX)
    let delta = 0
    const reset = () => {
      element.removeAttribute("data-dragging")
      element.style.removeProperty("--_drag-length")
      element.style.removeProperty("translate")
    }
    trackPointer(
      event,
      {
        begin: () => element.setAttribute("data-dragging", resize ? "resize" : "move"),
        move: (point) => {
          const at = indexAt(cells, point.x)
          if (resize) {
            delta = Math.max(at, bar.first) - (bar.first + bar.length - 1)
            element.style.setProperty("--_drag-length", String(bar.length + delta))
            return
          }
          delta = at - grabbed
          element.style.translate = `${(cells[at]?.left ?? 0) - (cells[grabbed]?.left ?? 0)}px 0`
        },
        end: (_point, began) => {
          if (!began) return reset()
          context.swallowClick()
          const placed = bar.placed
          const change = resize ? resizeEventTo(placed, addDays(placed.endDay, delta), placed.allDay ? null : placed.endMinutes, timeZone, "pointer") : moveEventTo(placed, addDays(placed.startDay, delta), null, timeZone, "pointer")
          if (change) flushSync(() => context.commit(change))
          reset()
        },
        cancel: reset,
      },
      { touch: "hold" },
    )
  }

  /* ── Choosing time with the keyboard ──────────────────────────────────────────── */

  const [cursor, setCursor] = useState<Cursor | null>(null)
  const describe = (next: Cursor) => `${formatDay(days[next.day]!, locale)}, ${t.timeRange(formatMinutesRange(next.start, next.start, locale), formatMinutesRange(next.end, next.end, locale))}`
  const placeCursor = (next: Cursor) => {
    setCursor(next)
    context.announce(t.slotFocused(describe(next)))
    // Keep it in view.
    const element = scroller.current
    if (!element || !columns.current) return
    const scale = columns.current.offsetHeight / DAY_MINUTES
    const top = next.start * scale
    const bottom = next.end * scale
    if (top < element.scrollTop) element.scrollTop = top
    else if (bottom > element.scrollTop + element.clientHeight) element.scrollTop = bottom - element.clientHeight
  }
  const onScrollerFocus = (event: FocusEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || !selectable || cursor) return
    const element = scroller.current!
    const first = Math.ceil(((element.scrollTop / (columns.current?.offsetHeight || 1)) * DAY_MINUTES) / slotMinutes) * slotMinutes
    const day = Math.max(0, days.indexOf(today))
    placeCursor({ day, start: Math.min(first, DAY_MINUTES - slotMinutes), end: Math.min(first, DAY_MINUTES - slotMinutes) + slotMinutes })
  }
  const onScrollerKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || !selectable || !cursor) return
    const slot = slotMinutes
    let next: Cursor | null = null
    if (event.key === "ArrowDown") next = event.shiftKey ? { ...cursor, end: Math.min(DAY_MINUTES, cursor.end + slot) } : { ...cursor, start: Math.min(DAY_MINUTES - slot, cursor.start + slot), end: Math.min(DAY_MINUTES - slot, cursor.start + slot) + slot }
    else if (event.key === "ArrowUp") next = event.shiftKey ? { ...cursor, end: Math.max(cursor.start + slot, cursor.end - slot) } : { ...cursor, start: Math.max(0, cursor.start - slot), end: Math.max(0, cursor.start - slot) + slot }
    else if (event.key === "ArrowLeft" || event.key === "ArrowRight") next = { ...cursor, day: clamp(cursor.day + (readingKey(event.key, event.currentTarget) === "ArrowLeft" ? -1 : 1), 0, days.length - 1) }
    else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      const day = days[cursor.day]!
      showSelection(cursor.day, cursor.start, cursor.end)
      context.selectSlot({ start: new Date(zonedInstant(day, cursor.start, timeZone)), end: new Date(zonedInstant(day, cursor.end, timeZone)), allDay: false, input: "keyboard" }, selection.current)
      return
    }
    if (!next) return
    event.preventDefault()
    placeCursor(next)
  }

  /* ── Rendering ────────────────────────────────────────────────────────────────── */

  const weekday = dateTimeFormat(locale, { weekday: "short" })
  const dayNumber = dateTimeFormat(locale, { day: "numeric" })
  const single = days.length === 1
  const opensDay = view === "week" && !single
  const bandRows = loading ? 1 : Math.max(1, bars.rows)
  const editKeys = "time" as const

  return (
    <div className="fa-sch-time" style={{ "--_days": days.length } as CSSProperties}>
      {compact && view === "week" ? <DayStrip /> : null}
      {compact && view === "week" ? null : (
      <div className="fa-sch-colheads" aria-hidden={single || undefined}>
        <span className="fa-sch-gutter" />
        {days.map((day) => {
          const Tag = opensDay ? "button" : "span"
          return (
            <Tag
              key={day}
              {...(opensDay ? { type: "button" as const, onClick: () => (context.setDate(day), context.setView("day")), "aria-label": formatDay(day, locale) } : {})}
              className="fa-sch-colhead"
              data-today={day === today ? "" : undefined}
              aria-current={day === today ? "date" : undefined}
            >
              <span className="fa-sch-colhead-weekday">{weekday.format(fromIsoDate(day))}</span>
              <span className="fa-sch-colhead-day">{dayNumber.format(fromIsoDate(day))}</span>
            </Tag>
          )
        })}
      </div>
      )}
      <div className="fa-sch-band" style={{ "--_rows": bandRows } as CSSProperties}>
        <span className="fa-sch-gutter fa-sch-band-label">{t.allDay}</span>
        <div className="fa-sch-band-days" ref={band} onPointerDown={selectDays}>
          {days.map((day, index) => (
            <div key={day} className="fa-sch-band-cell" data-day={day} data-today={day === today ? "" : undefined} style={{ "--_first": index + 1 } as CSSProperties} />
          ))}
          <div ref={bandSelection} className="fa-sch-band-selection" aria-hidden />
          {loading ? (
            <span className="fa-sch-ev fa-skel fa-shimmer" data-variant="bar" data-skeleton style={{ "--_first": 1, "--_length": Math.min(2, days.length), "--_row": 1 } as CSSProperties} />
          ) : (
            bars.bars.map((bar) => (
              <EventButton
                key={bar.placed.id}
                placed={bar.placed}
                variant="bar"
                editKeys="days"
                style={{ "--_first": bar.first + 1, "--_length": bar.length, "--_row": bar.row + 1 } as CSSProperties}
                onPointerDown={dragBar(bar)}
                data={{ "data-continues-before": bar.continuesBefore ? "" : undefined, "data-continues-after": bar.continuesAfter ? "" : undefined }}
              >
                <span className="fa-sch-ev-title">{bar.placed.event.title}</span>
                {context.canResize(bar.placed) && !bar.continuesAfter ? <span className="fa-sch-resize" data-resize data-axis="x" aria-hidden /> : null}
              </EventButton>
            ))
          )}
        </div>
      </div>
      <div
        ref={scroller}
        className="fa-sch-scroll"
        tabIndex={0}
        role="group"
        aria-label={t.slots(rangeLabel(days, locale))}
        aria-description={selectable ? t.slotsHint : undefined}
        onFocus={onScrollerFocus}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setCursor(null)
        }}
        onKeyDown={onScrollerKey}
      >
        <div className="fa-sch-hours">
          <div className="fa-sch-gutter fa-sch-hour-labels" aria-hidden>
            {HOURS.map((hour) => (
              <span key={hour} className="fa-sch-hour" style={{ "--_top": hour * 60 } as CSSProperties}>
                {formatHour(hour, locale)}
              </span>
            ))}
          </div>
          <div className="fa-sch-cols" ref={columns}>
            {days.map((day, dayIndex) => (
              <div key={day} className="fa-sch-col" data-day={day} data-today={day === today ? "" : undefined} onPointerDown={selectTime(dayIndex)}>
                {loading
                  ? skeletons(dayIndex).map(([top, len]) => <span key={top} className="fa-sch-ev fa-skel fa-shimmer" data-variant="block" data-skeleton style={{ "--_top": top, "--_len": len, "--_col": 0, "--_span": 1, "--_cols": 1 } as CSSProperties} />)
                  : segments[dayIndex]!.map((segment) => {
                      const short = segment.end - segment.start < 45
                      return (
                        <EventButton
                          key={segment.placed.id}
                          placed={segment.placed}
                          variant="block"
                          editKeys={editKeys}
                          style={{ "--_top": segment.start, "--_len": segment.end - segment.start, "--_col": segment.column, "--_span": segment.span, "--_cols": segment.columns } as CSSProperties}
                          onPointerDown={dragTimed(segment, dayIndex)}
                          data={{
                            "data-short": short ? "" : undefined,
                            "data-continues-before": segment.continuesBefore ? "" : undefined,
                            "data-continues-after": segment.continuesAfter ? "" : undefined,
                          }}
                        >
                          <span className="fa-sch-ev-title">{segment.placed.event.title}</span>
                          <span className="fa-sch-ev-time" data-event-time>
                            {formatMinutesRange(segment.placed.startDay === day ? segment.placed.startMinutes : 0, segment.placed.endDay === day ? segment.placed.endMinutes : DAY_MINUTES, locale)}
                          </span>
                          {context.canResize(segment.placed) && !segment.continuesAfter ? <span className="fa-sch-resize" data-resize data-axis="y" aria-hidden /> : null}
                        </EventButton>
                      )
                    })}
                {day === now.day ? <span className="fa-sch-now" style={{ "--_top": now.minutes } as CSSProperties} role="img" aria-label={t.now(formatMinutesRange(now.minutes, now.minutes, locale))} /> : null}
              </div>
            ))}
            <div ref={selection} className="fa-sch-selection" aria-hidden />
            {cursor ? <span className="fa-sch-cursor" aria-hidden style={{ "--_day": cursor.day, "--_top": cursor.start, "--_len": cursor.end - cursor.start } as CSSProperties} /> : null}
          </div>
        </div>
      </div>
    </div>
  )

  function isSelectable(event: PointerEvent<HTMLElement>) {
    return selectable && event.button === 0
  }
}

/** Placeholder events while loading: two per day, in the same places every time (R9.3). */
function skeletons(day: number): Array<[number, number]> {
  const first = 540 + ((day * 97) % 240)
  return [
    [first, 60 + ((day * 37) % 3) * 30],
    [first + 240, 90],
  ]
}

function rangeLabel(days: IsoDate[], locale: string) {
  if (days.length === 1) return formatDay(days[0]!, locale)
  return dateTimeFormat(locale, { day: "numeric", month: "long" }).formatRange(fromIsoDate(days[0]!), fromIsoDate(days.at(-1)!))
}

/** A compact week's days: pick the one the column shows. */
function DayStrip() {
  const { date, firstDay, locale, today, t, setDate } = useScheduler()
  const first = startOfWeek(date, firstDay)
  const narrow = dateTimeFormat(locale, { weekday: "narrow" })
  const number = dateTimeFormat(locale, { day: "numeric" })
  return (
    <div className="fa-sch-strip" role="group" aria-label={t.weekDays}>
      {Array.from({ length: 7 }, (_, index) => {
        const day = addDays(first, index)
        return (
          <button
            key={day}
            type="button"
            className="fa-sch-strip-day fa-pressable"
            aria-pressed={day === date}
            aria-label={formatDay(day, locale)}
            aria-current={day === today ? "date" : undefined}
            data-today={day === today ? "" : undefined}
            onClick={() => setDate(day)}
          >
            <span className="fa-sch-strip-weekday">{narrow.format(fromIsoDate(day))}</span>
            <span className="fa-sch-strip-number">{number.format(fromIsoDate(day))}</span>
          </button>
        )
      })}
    </div>
  )
}
