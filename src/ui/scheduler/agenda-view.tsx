import { useMemo } from "react"
import { dateTimeFormat } from "../../lib/locale/intl.js"
import { addDays, fromIsoDate, type IsoDate } from "../date-picker/calendar-date.js"
import { formatDay, formatMinutesRange, useScheduler } from "./context.js"
import { EventButton } from "./event.js"
import type { PlacedEvent } from "./layout.js"
import { DAY_MINUTES } from "./zone.js"

interface AgendaViewProps {
  events: PlacedEvent[]
  days: IsoDate[]
  title: string
}

const SKELETON_ROWS = [3, 2, 1]

/** The agenda: every day of the month that has events, with its events in time order. */
export function AgendaView({ events, days, title }: AgendaViewProps) {
  const { t, locale, today, loading } = useScheduler()
  const groups = useMemo(() => {
    const first = days[0]
    const last = days.at(-1)
    if (!first || !last) return []
    const byDay = new Map<IsoDate, PlacedEvent[]>()
    for (const placed of events)
      for (let day = placed.startDay < first ? first : placed.startDay; day <= placed.endDay && day <= last; day = addDays(day, 1)) byDay.set(day, [...(byDay.get(day) ?? []), placed])
    return [...byDay.entries()].toSorted(([a], [b]) => (a < b ? -1 : 1))
  }, [events, days])
  const weekday = dateTimeFormat(locale, { weekday: "short" })
  const number = dateTimeFormat(locale, { day: "numeric" })

  if (loading)
    return (
      <div className="fa-sch-agenda" aria-label={t.loading}>
        {SKELETON_ROWS.map((rows, index) => (
          <div key={index} className="fa-sch-agenda-day" data-skeleton>
            <span className="fa-sch-agenda-date">
              <span className="fa-skel fa-shimmer fa-sch-skel-line" />
            </span>
            <span className="fa-sch-agenda-list">
              {Array.from({ length: rows }, (_, row) => (
                <span key={row} className="fa-sch-ev fa-skel fa-shimmer" data-variant="row" data-skeleton />
              ))}
            </span>
          </div>
        ))}
      </div>
    )

  if (!groups.length)
    return (
      <div className="fa-sch-agenda" data-empty>
        <p className="fa-sch-empty">{t.noEventsIn(title)}</p>
      </div>
    )

  return (
    <div className="fa-sch-agenda" tabIndex={0} role="group" aria-label={t.agendaLabel(title)}>
      <ol className="fa-sch-agenda-days" aria-label={t.agendaLabel(title)}>
        {groups.map(([day, list]) => (
          <li key={day} className="fa-sch-agenda-day" data-today={day === today ? "" : undefined}>
            <span className="fa-sch-agenda-date" aria-hidden>
              <span className="fa-sch-agenda-number">{number.format(fromIsoDate(day))}</span>
              <span className="fa-sch-agenda-weekday">{weekday.format(fromIsoDate(day))}</span>
            </span>
            <AgendaDay day={day} events={list} />
          </li>
        ))}
      </ol>
    </div>
  )
}

/** One day's events as a labelled list: in the agenda, under a compact month and in a month cell's overflow. */
export function AgendaDay({ day, events, standalone = false }: { day: IsoDate; events: PlacedEvent[]; standalone?: boolean }) {
  const context = useScheduler()
  const { t, locale, loading } = context
  const label = formatDay(day, locale)
  const sorted = events.toSorted((a, b) => Number(b.band) - Number(a.band) || a.startMs - b.startMs)
  const list = (
    <ul className="fa-sch-agenda-list" aria-label={label}>
      {sorted.map((placed) => {
        const start = placed.startDay === day ? placed.startMinutes : 0
        const end = placed.endDay === day ? placed.endMinutes : DAY_MINUTES
        const meta = [placed.event.description, context.resourceTitle(placed.event.resourceId)].filter(Boolean).join(" · ")
        return (
          <li key={placed.id}>
            <EventButton placed={placed} variant="row">
              <span className="fa-sch-ev-time">{placed.allDay || (start === 0 && end === DAY_MINUTES) ? t.allDay : formatMinutesRange(start, end, locale)}</span>
              <span className="fa-sch-dot" aria-hidden />
              <span className="fa-sch-ev-text">
                <span className="fa-sch-ev-title">{placed.event.title}</span>
                {meta ? <span className="fa-sch-ev-meta">{meta}</span> : null}
              </span>
            </EventButton>
          </li>
        )
      })}
    </ul>
  )
  if (!standalone) return list
  return (
    <section className="fa-sch-day-list" aria-label={label}>
      <h3 className="fa-sch-day-list-title">{label}</h3>
      {loading ? (
        <span className="fa-sch-agenda-list">
          <span className="fa-sch-ev fa-skel fa-shimmer" data-variant="row" data-skeleton />
        </span>
      ) : sorted.length ? (
        list
      ) : (
        <p className="fa-sch-empty">{t.noEvents}</p>
      )}
    </section>
  )
}
