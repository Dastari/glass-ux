import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react"
import { flushSync } from "react-dom"
import { dateTimeFormat } from "../../lib/locale/intl.js"
import { useElementSize } from "../../lib/use-element-size.js"
import { addDays, fromIsoDate, type IsoDate } from "../date-picker/calendar-date.js"
import { Popover } from "../popover/index.js"
import { AgendaDay } from "./agenda-view.js"
import { formatDay, formatHour, formatMinutes, toneAttribute, useScheduler } from "./context.js"
import { moveEventTo } from "./edit.js"
import { EventButton } from "./event.js"
import { trackPointer } from "./gesture.js"
import { barSegments, fitBars, type BarSegment, type PlacedEvent } from "./layout.js"
import { monthBounds } from "./range.js"
import { zonedInstant } from "./zone.js"

interface MonthViewProps {
  events: PlacedEvent[]
  days: IsoDate[]
}

const DOTS = 3

/** The month: a grid of weeks with bars across days, timed events in time order, and "+N more" for what does not fit. */
export function MonthView({ events, days }: MonthViewProps) {
  const context = useScheduler()
  const { t, locale, today, date, compact, loading, timeZone, selectable } = context
  const weeks = useMemo(() => Array.from({ length: days.length / 7 }, (_, index) => days.slice(index * 7, index * 7 + 7)), [days])
  const month = monthBounds(date)
  const grid = useRef<HTMLDivElement>(null)
  const firstWeek = useRef<HTMLDivElement>(null)
  const probeHead = useRef<HTMLSpanElement>(null)
  const probePitch = useRef<HTMLSpanElement>(null)
  const { height } = useElementSize(firstWeek)
  const [capacity, setCapacity] = useState(2)
  useLayoutEffect(() => {
    const head = probeHead.current?.offsetHeight ?? 0
    const pitch = probePitch.current?.offsetHeight || 1
    setCapacity(Math.max(1, Math.floor((height - head) / pitch)))
  }, [height])

  const layouts = useMemo(() => weeks.map((week) => barSegments(events, week, true)), [weeks, events])
  const perDay = useMemo(() => {
    const map = new Map<IsoDate, PlacedEvent[]>()
    for (const placed of events)
      for (let day = placed.startDay < days[0]! ? days[0]! : placed.startDay; day <= placed.endDay && day <= days.at(-1)!; day = addDays(day, 1)) {
        const list = map.get(day) ?? []
        list.push(placed)
        map.set(day, list)
      }
    return map
  }, [events, days])

  // Roving focus over the days.
  const [focused, setFocused] = useState<IsoDate>(date)
  const focusDay = focused >= days[0]! && focused <= days.at(-1)! ? focused : date
  const moveFocus = useRef(false)
  useLayoutEffect(() => {
    if (!moveFocus.current) return
    moveFocus.current = false
    grid.current?.querySelector<HTMLElement>(`[data-day="${focusDay}"] .fa-sch-cell-day`)?.focus()
  })

  const onGridKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement
    if (!target.classList.contains("fa-sch-cell-day")) return
    const steps: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
    if (event.key === "Enter" && selectable && !compact) {
      event.preventDefault()
      context.selectSlot({ start: new Date(zonedInstant(focusDay, 0, timeZone)), end: new Date(zonedInstant(addDays(focusDay, 1), 0, timeZone)), allDay: true, days: { start: focusDay, end: addDays(focusDay, 1) }, input: "keyboard" })
      return
    }
    const step = steps[event.key]
    if (step === undefined) return
    event.preventDefault()
    const next = addDays(focusDay, step)
    setFocused(next)
    moveFocus.current = true
    if (next < days[0]! || next > days.at(-1)!) context.setDate(next)
    else if (compact) context.setDate(next)
  }

  /* ── Selecting days ───────────────────────────────────────────────────────────── */

  const marked = useRef<HTMLElement[]>([])
  const mark = (first: number, last: number) => {
    const cells = [...(grid.current?.querySelectorAll<HTMLElement>(".fa-sch-cell") ?? [])]
    for (const cell of marked.current) cell.removeAttribute("data-selecting")
    marked.current = cells.slice(first, last + 1)
    for (const cell of marked.current) cell.setAttribute("data-selecting", "")
  }
  const dayKey = days.join()
  useLayoutEffect(() => mark(0, -1), [dayKey]) // oxlint-disable-line react-hooks/exhaustive-deps -- a selection belongs to the days it was made in

  const cellRects = () => [...(grid.current?.querySelectorAll<HTMLElement>(".fa-sch-cell") ?? [])].map((cell) => cell.getBoundingClientRect())
  const cellAt = (rects: DOMRect[], x: number, y: number) => {
    let best = 0
    let distance = Infinity
    rects.forEach((rect, index) => {
      const dx = Math.max(rect.left - x, 0, x - rect.right)
      const dy = Math.max(rect.top - y, 0, y - rect.bottom)
      const d = dx + dy
      if (d < distance) {
        distance = d
        best = index
      }
    })
    return best
  }

  const selectDays = (index: number) => (event: PointerEvent<HTMLDivElement>) => {
    if (compact || !selectable || event.button !== 0 || (event.target as Element).closest("button")) return
    const rects = cellRects()
    let range = { first: index, last: index }
    trackPointer(
      event,
      {
        move: (point) => {
          const at = cellAt(rects, point.x, point.y)
          range = { first: Math.min(index, at), last: Math.max(index, at) }
          mark(range.first, range.last)
        },
        end: () => {
          mark(range.first, range.last)
          const start = days[range.first]!
          const end = addDays(days[range.last]!, 1)
          context.selectSlot({ start: new Date(zonedInstant(start, 0, timeZone)), end: new Date(zonedInstant(end, 0, timeZone)), allDay: true, days: { start, end }, input: "pointer" })
        },
        cancel: () => mark(0, -1),
      },
      { touch: "tap" },
    )
  }

  /* ── Moving events between days ───────────────────────────────────────────────── */

  const drag = (bar: BarSegment) => (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return
    const element = event.currentTarget
    const rects = cellRects()
    const grabbed = cellAt(rects, event.clientX, event.clientY)
    let delta = 0
    const reset = () => {
      element.removeAttribute("data-dragging")
      element.style.removeProperty("translate")
    }
    trackPointer(
      event,
      {
        begin: () => element.setAttribute("data-dragging", "move"),
        move: (point) => {
          const at = cellAt(rects, point.x, point.y)
          delta = at - grabbed
          element.style.translate = `${rects[at]!.left - rects[grabbed]!.left}px ${rects[at]!.top - rects[grabbed]!.top}px`
        },
        end: (_point, began) => {
          if (!began) return reset()
          context.swallowClick()
          const change = moveEventTo(bar.placed, addDays(bar.placed.startDay, delta), null, timeZone, "pointer")
          if (change) flushSync(() => context.commit(change))
          reset()
        },
        cancel: reset,
      },
      { touch: "hold" },
    )
  }

  /* ── Rendering ────────────────────────────────────────────────────────────────── */

  const weekday = dateTimeFormat(locale, { weekday: compact ? "narrow" : "short" })
  const weekdayLong = dateTimeFormat(locale, { weekday: "long" })
  const dayNumber = dateTimeFormat(locale, { day: "numeric" })
  const dayLong = dateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" })
  const title = dateTimeFormat(locale, { month: "long", year: "numeric" }).format(fromIsoDate(date))

  return (
    <div className="fa-sch-month" style={{ "--_weeks": weeks.length } as CSSProperties}>
      <div ref={grid} role="grid" className="fa-sch-month-grid" aria-label={title} onKeyDown={onGridKey}>
        <div role="row" className="fa-sch-weekdays">
          {weeks[0]?.map((day) => (
            <span key={day} role="columnheader" className="fa-sch-weekday" aria-label={weekdayLong.format(fromIsoDate(day))}>
              {weekday.format(fromIsoDate(day))}
            </span>
          ))}
        </div>
        {weeks.map((week, weekIndex) => {
          const { visible, hidden, shown } = fitBars(layouts[weekIndex]!.bars, 7, capacity)
          return (
            <div key={week[0]} ref={weekIndex === 0 ? firstWeek : undefined} role="row" className="fa-sch-week">
              {weekIndex === 0 ? (
                <>
                  <span ref={probeHead} className="fa-sch-probe" data-probe="head" aria-hidden />
                  <span ref={probePitch} className="fa-sch-probe" data-probe="pitch" aria-hidden />
                </>
              ) : null}
              {week.map((day, index) => {
                const list = perDay.get(day) ?? []
                const outside = day < month.first || day > month.last
                return (
                  <div
                    key={day}
                    role="gridcell"
                    className="fa-sch-cell"
                    data-day={day}
                    data-outside={outside ? "" : undefined}
                    data-today={day === today ? "" : undefined}
                    aria-selected={compact ? day === date : undefined}
                    onPointerDown={selectDays(index)}
                  >
                    <button
                      type="button"
                      className="fa-sch-cell-day"
                      tabIndex={day === focusDay ? 0 : -1}
                      aria-label={t.dayLabel(dayLong.format(fromIsoDate(day)), loading ? 0 : list.length)}
                      aria-current={day === today ? "date" : undefined}
                      aria-pressed={compact ? day === date : undefined}
                      onFocus={() => setFocused(day)}
                      onClick={() => {
                        if (compact) return context.setDate(day)
                        context.setDate(day)
                        context.setView("day")
                      }}
                    >
                      <span className="fa-sch-cell-number">{dayNumber.format(fromIsoDate(day))}</span>
                      {compact && !loading && list.length ? (
                        <span className="fa-sch-dots" aria-hidden>
                          {list.slice(0, DOTS).map((placed) => (
                            <span key={placed.id} className="fa-sch-dot" data-tone={toneAttribute(placed)} />
                          ))}
                        </span>
                      ) : null}
                    </button>
                    {compact || loading
                      ? null
                      : visible
                          .filter((bar) => bar.first === index)
                          .map((bar) => <MonthEvent key={bar.placed.id} bar={bar} focusable={day === focusDay || bar.continuesBefore} onPointerDown={drag(bar)} />)}
                    {!compact && loading && (weekIndex + index) % 3 === 0 ? <span className="fa-sch-ev fa-skel fa-shimmer" data-variant="bar" data-skeleton style={{ "--_first": index + 1, "--_length": 1, "--_row": 1 } as CSSProperties} /> : null}
                    {!compact && !loading && hidden[index] ? <MoreEvents day={day} count={hidden[index]!} events={list} column={index + 1} row={shown + 1} focusable={day === focusDay} /> : null}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
      {compact ? <AgendaDay day={date} events={perDay.get(date) ?? eventsOn(events, date)} standalone /> : null}
    </div>
  )
}

function eventsOn(events: PlacedEvent[], day: IsoDate) {
  return events.filter((placed) => placed.startDay <= day && placed.endDay >= day)
}

function MonthEvent({ bar, focusable, onPointerDown }: { bar: BarSegment; focusable: boolean; onPointerDown: (event: PointerEvent<HTMLButtonElement>) => void }) {
  const { locale } = useScheduler()
  const placed = bar.placed
  const style = { "--_first": bar.first + 1, "--_length": bar.length, "--_row": bar.row + 1 } as CSSProperties
  const data = { "data-continues-before": bar.continuesBefore ? "" : undefined, "data-continues-after": bar.continuesAfter ? "" : undefined }
  if (placed.band)
    return (
      <EventButton placed={placed} variant="bar" editKeys="month" style={style} tabIndex={focusable ? 0 : -1} onPointerDown={onPointerDown} data={data}>
        <span className="fa-sch-ev-title">{placed.event.title}</span>
      </EventButton>
    )
  return (
    <EventButton placed={placed} variant="item" editKeys="month" style={style} tabIndex={focusable ? 0 : -1} onPointerDown={onPointerDown} data={data}>
      <span className="fa-sch-dot" aria-hidden />
      <span className="fa-sch-ev-time">{placed.startMinutes % 60 ? formatMinutes(placed.startMinutes, locale) : formatHour(placed.startMinutes / 60, locale)}</span>
      <span className="fa-sch-ev-title">{placed.event.title}</span>
    </EventButton>
  )
}

/** "+N more": the day's events in a popover. */
function MoreEvents({ day, count, events, column, row, focusable }: { day: IsoDate; count: number; events: PlacedEvent[]; column: number; row: number; focusable: boolean }) {
  const { t, locale } = useScheduler()
  const label = formatDay(day, locale)
  return (
    <Popover.Root>
      <Popover.Trigger
        className="fa-sch-more fa-pressable"
        tabIndex={focusable ? 0 : -1}
        aria-label={t.moreLabel(count, label)}
        style={{ "--_first": column, "--_row": row } as CSSProperties}
      >
        {t.more(count)}
      </Popover.Trigger>
      <Popover.Popup title={label} size="sm" side="bottom" align="start">
        <AgendaDay day={day} events={events} />
      </Popover.Popup>
    </Popover.Root>
  )
}
