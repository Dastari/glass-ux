import { readingKey } from "../../lib/direction.js"
import { useMessages } from "../../lib/i18n/index.js"
import { datePickerMessages } from "./messages.js"
import { useMemo, useRef, useState, type KeyboardEvent } from "react"
import { IconChevronLeft, IconChevronRight } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { useLocale } from "../../lib/locale/use-locale.js"
import { Button } from "../button/index.js"
import {
  addDays,
  addMonths,
  clampIso,
  firstDayOfWeek,
  fromIsoDate,
  gridStart,
  isoParts,
  isoWeekday,
  todayIso,
  type IsoDate,
} from "./calendar-date.js"

export interface DateRange {
  start: IsoDate
  end: IsoDate
}

interface CalendarCommon {
  /** BCP 47 locale for names and the first day of the week. Default: the nearest `LocaleProvider`, then `configureLocale()`, then `<html lang>`, then en-US. */
  locale?: string
  /** Earliest and latest selectable days. */
  min?: IsoDate
  /** Upper value or visible-item limit, as specified by the type. */
  max?: IsoDate
  /** The day marked as today (default: the user's local day). */
  today?: IsoDate
  /** Any day in the month to show first (default: the value, else today). */
  defaultMonth?: IsoDate
  /** Focus the active day on mount (popovers). */
  autoFocus?: boolean
  className?: string
  /** Accessible name when a visible label does not name the control. */
  "aria-label"?: string
}

export interface CalendarSingleProps extends CalendarCommon {
  /** Active display or interaction mode. */
  mode?: "single"
  value?: IsoDate | null
  /** Called with the ISO date when an enabled day is chosen by click or keyboard. */
  onValueChange?: (value: IsoDate) => void
}

export interface CalendarRangeProps extends CalendarCommon {
  /** Active display or interaction mode. */
  mode: "range"
  value?: DateRange | null
  /** Called with the ordered range once the second day is chosen; choosing the first day only anchors it. */
  onValueChange?: (value: DateRange) => void
}

export type CalendarProps = CalendarSingleProps | CalendarRangeProps

const WEEKS = 6

function monthStart(iso: IsoDate) {
  const parts = isoParts(iso)
  return parts ? `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-01` : iso
}

/**
 * A month grid for picking a day or a range. Arrow keys move by day and week, Home and
 * End go to the week's ends, Page Up and Page Down change month (with Shift, year), and
 * Enter or Space picks. In range mode the first pick sets the start and the second the
 * end; the days between show as a band while you choose. Names and the first day of the
 * week come from the locale.
 */
export function Calendar(props: CalendarProps) {
  const messages = useMessages(datePickerMessages, { locale: props.locale })

  const { min, max, today = todayIso(), defaultMonth, autoFocus, className } = props
  const locale = useLocale(props.locale)
  const range = props.mode === "range" ? (props.value ?? null) : null
  const single = props.mode !== "range" ? (props.value ?? null) : null
  const initial = clampIso(defaultMonth ?? range?.start ?? single ?? today, min, max)

  const [month, setMonth] = useState(() => monthStart(initial))
  const [focused, setFocused] = useState<IsoDate>(initial)
  const [anchor, setAnchor] = useState<IsoDate | null>(null)
  const [hovered, setHovered] = useState<IsoDate | null>(null)
  const shouldFocus = useRef(Boolean(autoFocus))

  const firstDay = useMemo(() => firstDayOfWeek(locale), [locale])
  const parts = isoParts(month) ?? { year: 2026, month: 1, day: 1 }
  const start = gridStart(parts.year, parts.month, firstDay)
  const days = Array.from({ length: WEEKS * 7 }, (_, index) => addDays(start, index))

  const title = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(fromIsoDate(month))
  const weekdayShort = new Intl.DateTimeFormat(locale, { weekday: "short" })
  const weekdayLong = new Intl.DateTimeFormat(locale, { weekday: "long" })
  const dayLabel = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" })
  const weekdays = days.slice(0, 7)

  const disabled = (iso: IsoDate) => Boolean((min && iso < min) || (max && iso > max))

  // The pending band while choosing the end of a range.
  const band: DateRange | null = anchor
    ? hovered
      ? hovered < anchor
        ? { start: hovered, end: anchor }
        : { start: anchor, end: hovered }
      : { start: anchor, end: anchor }
    : range

  const moveFocus = (next: IsoDate) => {
    const target = clampIso(next, min, max)
    setFocused(target)
    if (monthStart(target) !== month) setMonth(monthStart(target))
    shouldFocus.current = true
  }

  const pick = (iso: IsoDate) => {
    if (disabled(iso)) return
    setFocused(iso)
    if (props.mode === "range") {
      if (!anchor) {
        setAnchor(iso)
        return
      }
      const next = iso < anchor ? { start: iso, end: anchor } : { start: anchor, end: iso }
      setAnchor(null)
      setHovered(null)
      props.onValueChange?.(next)
      return
    }
    props.onValueChange?.(iso)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const weekday = (isoWeekday(focused) - firstDay + 7) % 7
    const moves: Record<string, () => IsoDate> = {
      ArrowLeft: () => addDays(focused, -1),
      ArrowRight: () => addDays(focused, 1),
      ArrowUp: () => addDays(focused, -7),
      ArrowDown: () => addDays(focused, 7),
      Home: () => addDays(focused, -weekday),
      End: () => addDays(focused, 6 - weekday),
      PageUp: () => addMonths(focused, event.shiftKey ? -12 : -1),
      PageDown: () => addMonths(focused, event.shiftKey ? 12 : 1),
    }
    const move = moves[readingKey(event.key, event.currentTarget)]
    if (!move) {
      if (event.key === "Escape" && anchor) {
        event.preventDefault()
        event.stopPropagation()
        setAnchor(null)
        setHovered(null)
      }
      return
    }
    event.preventDefault()
    const next = move()
    moveFocus(next)
    if (anchor) setHovered(next)
  }

  const focusRef = (node: HTMLButtonElement | null) => {
    if (node && shouldFocus.current) {
      shouldFocus.current = false
      node.focus({ preventScroll: true })
    }
  }

  const showMonth = (delta: number) => {
    const next = addMonths(month, delta)
    setMonth(next)
    setFocused(clampIso(addMonths(focused, delta), min, max))
  }
  const prevDisabled = Boolean(min && addDays(month, -1) < min)
  const nextDisabled = Boolean(max && addMonths(month, 1) > max)

  return (
    <div className={cx("fa-calendar", className)} data-mode={props.mode ?? "single"} data-picking={anchor ? "" : undefined}>
      <div className="fa-calendar-head">
        <Button variant="ghost" size="sm" icon={<IconChevronLeft />} aria-label={messages.previousMonth} disabledReason={prevDisabled ? messages.noEarlierDatesCanBeChosen : undefined} onClick={() => showMonth(-1)} />
        <div className="fa-calendar-title" aria-live="polite">
          {title}
        </div>
        <Button variant="ghost" size="sm" icon={<IconChevronRight />} aria-label={messages.nextMonth} disabledReason={nextDisabled ? messages.noLaterDatesCanBeChosen : undefined} onClick={() => showMonth(1)} />
      </div>
      <div
        role="grid"
        tabIndex={-1}
        className="fa-calendar-grid"
        aria-label={props["aria-label"] ?? title}
        aria-multiselectable={props.mode === "range" || undefined}
        onKeyDown={onKeyDown}
        onPointerLeave={() => setHovered(null)}
      >
        <div role="row" className="fa-calendar-row fa-calendar-weekdays">
          {weekdays.map((iso) => (
            <span key={iso} role="columnheader" className="fa-calendar-weekday" aria-label={weekdayLong.format(fromIsoDate(iso))}>
              {weekdayShort.format(fromIsoDate(iso))}
            </span>
          ))}
        </div>
        {Array.from({ length: WEEKS }, (_, week) => (
          <div key={week} role="row" className="fa-calendar-row">
            {days.slice(week * 7, week * 7 + 7).map((iso) => {
              const outside = monthStart(iso) !== month
              const selected = single ? iso === single : band ? iso >= band.start && iso <= band.end : false
              const isFocused = iso === focused
              return (
                <div
                  key={iso}
                  role="gridcell"
                  className="fa-calendar-cell"
                  aria-selected={selected}
                  data-outside={outside ? "" : undefined}
                  data-in-range={band && iso >= band.start && iso <= band.end ? "" : undefined}
                  data-range-start={band && iso === band.start ? "" : undefined}
                  data-range-end={band && iso === band.end ? "" : undefined}
                >
                  <button
                    ref={isFocused ? focusRef : undefined}
                    type="button"
                    className="fa-calendar-day fa-pressable"
                    tabIndex={isFocused ? 0 : -1}
                    disabled={disabled(iso)}
                    aria-label={dayLabel.format(fromIsoDate(iso))}
                    aria-current={iso === today ? "date" : undefined}
                    data-selected={selected ? "" : undefined}
                    data-today={iso === today ? "" : undefined}
                    onClick={() => pick(iso)}
                    onFocus={() => setFocused(iso)}
                    onPointerEnter={() => anchor && setHovered(iso)}
                  >
                    {Number(iso.slice(8))}
                  </button>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
