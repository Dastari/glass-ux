import { useMessages } from "../../lib/i18n/index.js"
import { datePickerMessages } from "./messages.js"
import { Input as BaseInput } from "@base-ui/react/input"
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type FocusEvent, type KeyboardEvent, type Ref } from "react"
import { IconCalendar } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { useLocale } from "../../lib/locale/use-locale.js"
import { Button } from "../button/index.js"
import { widthAttr, type FieldWidth } from "../field/index.js"
import { Popover } from "../popover/index.js"
import { describeTimeZone } from "../time-zone-select/time-zones.js"
import { Calendar } from "./calendar.js"
import { datePlaceholder, formatDateText, parseDateText, todayIso, type IsoDate } from "./calendar-date.js"
import type { DateFieldSize } from "./date-field.js"
import { formatTimeText, isTimeValue, parseTimeText, timePlaceholder, type HourCycle, type TimeValue } from "./time.js"
import { listTimes, localNow, startTime, timeKeyStep, usePartSelection } from "./time-input.js"
import { TimeList } from "./time-list.js"
import { instantToWallClock, isWallClock, joinWallClock, resolveWallClock, splitWallClock, zoneOffsetMinutes, type WallClock } from "./zoned-time.js"

/** Whether a wall-clock value is outside [min, max] (same-length strings compare in order). */
export const wallClockOutOfRange = (value: WallClock, min?: WallClock, max?: WallClock) => {
  const at = value.slice(0, 16)
  return Boolean((min && at < min.slice(0, 16)) || (max && at > max.slice(0, 16)))
}

/** The current wall clock, in a zone when one is given. */
export function wallClockNow(timeZone?: string): WallClock {
  if (timeZone) {
    const now = instantToWallClock(Date.now(), timeZone)
    if (now) return now
  }
  return joinWallClock(todayIso(), localNow())
}

/** Times on `date` that a daylight-saving change skips in `timeZone`. */
function skippedOn(date: IsoDate, times: readonly TimeValue[], timeZone: string): Set<TimeValue> {
  const skipped = new Set<TimeValue>()
  const start = resolveWallClock(`${date}T00:00`, timeZone)
  if (!start) return skipped
  // No change of offset across the day, no gap.
  if (zoneOffsetMinutes(start.epochMs, timeZone) === zoneOffsetMinutes(start.epochMs + 86_400_000, timeZone)) return skipped
  for (const time of times) if (resolveWallClock(joinWallClock(date, time), timeZone)?.kind === "gap") skipped.add(time)
  return skipped
}

/** The zone as shown in the box (its abbreviation, else its offset) and as described to assistive technology. */
export function zoneLabel(timeZone: string, at: number, locale: string): { short: string; long: string } | null {
  try {
    const info = describeTimeZone(timeZone, { at: new Date(at), locale })
    // Many locales name only their own zones; US names (EDT, PST) are widely read, so en-US is
    // a deliberate fallback for the abbreviation, not the formatting locale.
    const short = info.abbreviation ?? describeTimeZone(timeZone, { at: new Date(at), locale: "en-US" }).abbreviation ?? info.offset
    return {
      short,
      long: new Intl.ListFormat(locale, { type: "unit" }).format([timeZone.replace(/_/g, " "), short === info.offset ? undefined : short, info.offset].filter((part): part is string => Boolean(part))),
    }
  } catch {
    return null
  }
}

export interface DateTimeInputProps {
  /** A wall-clock date and time (`2026-10-21T09:30`) with no offset, or null when empty. */
  value?: WallClock | null
  /** The initial date and time when uncontrolled. */
  defaultValue?: WallClock | null
  /**
   * Called with a complete date and time, or null when both parts are emptied. Typing commits
   * when focus leaves the field or on Enter; the calendar, the list and arrow keys commit at once.
   */
  onValueChange?: (value: WallClock | null) => void
  /**
   * Called instead of `onValueChange` when the field is left incomplete, unreadable or outside
   * min/max: with the wall-clock value when both parts read (so a schema can name the range),
   * else with `date` + "T" + `time`, each part as read or as typed. The box is marked invalid.
   */
  onReject?: (value: string) => void
  /**
   * IANA zone the wall clock is read in ("Australia/Sydney"). Shown in the box as its
   * abbreviation or offset on that date; the list leaves out times a daylight-saving change
   * skips. The value never converts: use `resolveWallClock` for the instant.
   */
  timeZone?: string
  /** BCP 47 locale: the date order, the clock and names. Default: the nearest `LocaleProvider`, then `configureLocale()`, then `<html lang>`, then en-US. */
  locale?: string
  /** Override the locale's clock: 12 (am/pm) or 24. */
  hourCycle?: HourCycle
  /** Earliest allowed wall-clock date and time. */
  min?: WallClock
  /** Latest allowed wall-clock date and time. */
  max?: WallClock
  /** Minutes between suggested times, and between arrow-key steps on the minutes (default 15). */
  step?: number
  /** Explicit times to offer in the list instead of every `step` minutes. */
  suggestions?: readonly TimeValue[]
  /** The time filled in when a day is entered or picked before any time ("09:00"). */
  defaultTime?: TimeValue
  /** The box height, matching DateField. */
  size?: DateFieldSize
  /** Content width (R15.6). Default medium. */
  width?: FieldWidth
  disabled?: boolean
  readOnly?: boolean
  /** Invalid outside a Field. Text that cannot be read marks the field invalid by itself. */
  invalid?: boolean
  /** Marks both parts required for assistive technology; pair it with `dateTimeSchema({ required: true })`. */
  required?: boolean
  /** Form field name of the date input (the time input takes `name` + "-time"). */
  name?: string
  /** The date input's id; a Field label points at it. */
  id?: string
  /** Called when focus leaves the field, after the typed value has been committed. */
  onBlur?: (event: FocusEvent<HTMLElement>) => void
  /** Layout only. Applied to the control box. */
  className?: string
  /** Accessible name of the group when no Field label names it. */
  "aria-label"?: string
  /** IDs of elements that name the group. */
  "aria-labelledby"?: string
  /** Accessible names of the two parts (default "Date", "Time"). */
  dateLabel?: string
  /** Accessible name of the time part (default "Time"). */
  timeLabel?: string
  /** Receives the date input, for focus. */
  ref?: Ref<HTMLInputElement>
}

/**
 * A date and a time in one box: a day typed in the locale's order and a time typed as people
 * write it, with one button that opens a calendar beside a list of times (stacked when
 * narrow). The value is a wall clock with no offset; with `timeZone` the zone shows in the box.
 * Each part is one tab stop; the time part steps with the arrow keys like TimeInput.
 */
export function DateTimeInput({
  value,
  defaultValue = null,
  onValueChange,
  onReject,
  timeZone,
  locale: localeProp,
  hourCycle,
  min,
  max,
  step = 15,
  suggestions,
  defaultTime,
  size = "md",
  width = "medium",
  disabled,
  readOnly,
  invalid,
  required,
  name,
  id,
  onBlur,
  className,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  dateLabel: dateLabelProp,
  timeLabel: timeLabelProp,
  ref,
}: DateTimeInputProps) {
  const messages = useMessages(datePickerMessages, { locale: localeProp })
  const dateLabel = dateLabelProp ?? messages.date
  const timeLabel = timeLabelProp ?? messages.time

  const locale = useLocale(localeProp)
  const [inner, setInner] = useState<WallClock | null>(defaultValue)
  const current = value === undefined ? inner : value
  const textOptions = { locale, hourCycle }

  /** The texts a value shows: formatted parts, or the parts of a rejected value as they were. */
  const texts = (next: string | null) => {
    if (next === null) return { date: "", time: "" }
    const cut = next.lastIndexOf("T")
    const date = cut < 0 ? next : next.slice(0, cut)
    const time = cut < 0 ? "" : next.slice(cut + 1)
    return {
      date: parseDateText(date, locale) ? formatDateText(date, locale) || date : date,
      time: isTimeValue(time) ? formatTimeText(time, textOptions) : time,
    }
  }
  const badOf = (next: string | null) => next !== null && (!isWallClock(next) || wallClockOutOfRange(next, min, max))

  const [dateText, setDateText] = useState(() => texts(current).date)
  const [timeText, setTimeText] = useState(() => texts(current).time)
  const [bad, setBad] = useState(() => badOf(current))
  const shown = useRef({ value: current, format: `${locale}|${hourCycle}` })
  const [open, setOpen] = useState(false)
  const groupRef = useRef<HTMLDivElement>(null)
  const dateRef = useRef<HTMLInputElement | null>(null)
  const timeRef = useRef<HTMLInputElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const selectPart = usePartSelection(timeRef)
  const zoneId = useId()
  const timeId = useId()
  const dateNameId = useId()

  useEffect(() => {
    const format = `${locale}|${hourCycle}`
    if (shown.current.value === current && shown.current.format === format) return
    shown.current = { value: current, format }
    const next = texts(current)
    setDateText(next.date)
    setTimeText(next.time)
    setBad(badOf(current))
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- texts and badOf follow these inputs
  }, [current, locale, hourCycle])

  const set = (next: WallClock | null) => {
    shown.current = { ...shown.current, value: next }
    const shownTexts = texts(next)
    setDateText(shownTexts.date)
    setTimeText(shownTexts.time)
    setBad(false)
    if (value === undefined) setInner(next)
    if (next !== current) onValueChange?.(next)
  }

  /** Read both parts and commit them, or mark the box invalid and report what was read. */
  const commit = (date = dateText, time = timeText) => {
    const typedDate = date.trim()
    let typedTime = time.trim()
    if (!typedDate && !typedTime) return set(null)
    const day = typedDate ? parseDateText(typedDate, locale) : null
    if (day && !typedTime && defaultTime) typedTime = defaultTime
    const clock = typedTime ? parseTimeText(typedTime, textOptions) : null
    if (day) setDateText(formatDateText(day, locale))
    if (clock) setTimeText(formatTimeText(clock, textOptions))
    if (day && clock) {
      const wall = joinWallClock(day, clock)
      if (!wallClockOutOfRange(wall, min, max)) return set(wall)
      setBad(true)
      onReject?.(wall)
      return
    }
    setBad(true)
    onReject?.(`${day ?? typedDate}T${clock ?? typedTime}`)
  }

  // The day the list is for: the typed day, else the value's.
  const day = parseDateText(dateText, locale) ?? (current && isWallClock(current) ? current.slice(0, 10) : null)
  const minParts = min && isWallClock(min) ? splitWallClock(min) : null
  const maxParts = max && isWallClock(max) ? splitWallClock(max) : null
  const bounds = {
    min: day && minParts && day === minParts.date ? minParts.time : undefined,
    max: day && maxParts && day === maxParts.date ? maxParts.time : undefined,
    step,
  }
  const times = useMemo(() => {
    const all = listTimes(bounds, suggestions)
    if (!timeZone || !day) return all
    const skipped = skippedOn(day, all, timeZone)
    return skipped.size ? all.filter((time) => !skipped.has(time)) : all
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- identity follows the values
  }, [bounds.min, bounds.max, step, suggestions?.join(), timeZone, day])

  // The zone as it is on the chosen day (AEST or AEDT), or now.
  const zoneAt = useMemo(() => {
    if (!timeZone) return null
    const wall = current && isWallClock(current) ? current : day ? joinWallClock(day, "12:00") : null
    const at = (wall && resolveWallClock(wall, timeZone)?.epochMs) || Date.now()
    return zoneLabel(timeZone, at, locale)
  }, [timeZone, current, day, locale])

  // A Field's label and message reach both parts: the date input is the Field's control;
  // the group and the time input borrow its label and description.
  const [borrowed, setBorrowed] = useState<{
    label?: string
    describedBy?: string
    invalid?: boolean
  }>({})
  useLayoutEffect(() => {
    const input = dateRef.current
    if (!input) return
    const label = input.labels?.[0]?.id || undefined
    const describedBy =
      input
        .getAttribute("aria-describedby")
        ?.split(" ")
        .filter((part) => part && part !== zoneId)
        .join(" ") || undefined
    const fieldInvalid = Boolean(input.closest(".fa-field")?.hasAttribute("data-invalid"))
    if (label !== borrowed.label || describedBy !== borrowed.describedBy || fieldInvalid !== borrowed.invalid) setBorrowed({ label, describedBy, invalid: fieldInvalid })
  })

  const groupName = ariaLabelledBy ?? borrowed.label
  const describe = [borrowed.describedBy, timeZone && zoneAt ? zoneId : undefined].filter(Boolean).join(" ") || undefined
  const isInvalid = invalid || bad || borrowed.invalid || undefined

  const setRefs = (node: HTMLInputElement | null) => {
    dateRef.current = node
    if (typeof ref === "function") ref(node)
    else if (ref) ref.current = node
  }

  const openKeys = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") commit()
    if (event.key === "ArrowDown" && event.altKey) {
      event.preventDefault()
      if (!readOnly && !disabled) setOpen(true)
      return true
    }
    return false
  }

  // Stepping an empty time, and the list without one, start from now on today and from the
  // default time (else the first time) on another day.
  const now = wallClockNow(timeZone)
  const near = !day || day === now.slice(0, 10) ? now.slice(11, 16) : (defaultTime ?? bounds.min ?? "09:00")
  const timeNow = () => startTime(bounds, near)

  return (
    <div
      ref={groupRef}
      role="group"
      aria-label={groupName ? undefined : ariaLabel}
      aria-labelledby={groupName}
      className={cx("fa-control fa-input fa-date-field fa-date-time-field", className)}
      data-size={size}
      data-width={widthAttr(width)}
      data-zone={timeZone ? "" : undefined}
      data-readonly={readOnly ? "" : undefined}
      data-disabled={disabled ? "" : undefined}
      data-invalid={isInvalid ? "" : undefined}
      onBlur={(event) => {
        if (groupRef.current?.contains(event.relatedTarget as Node | null)) {
          // Moving between the parts: tidy what reads, and commit once both parts do. An
          // empty part is not an error until focus leaves the field.
          const day = dateText.trim() ? parseDateText(dateText, locale) : null
          const clock = timeText.trim() ? parseTimeText(timeText, textOptions) : null
          if (day && clock) return commit()
          if (day) setDateText(formatDateText(day, locale))
          if (clock) setTimeText(formatTimeText(clock, textOptions))
          return
        }
        commit()
        onBlur?.(event)
      }}
    >
      {/* The typed parts and the zone; the zone gives way first in a narrow box. */}
      <div className="fa-date-time-parts">
        {/* Base UI's Input, so a surrounding Field labels and describes the date part. */}
        <BaseInput
          ref={setRefs}
          id={id}
          name={name}
          className="fa-control-input fa-date-input fa-date-time-date"
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          placeholder={datePlaceholder(locale)}
          value={dateText}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          aria-label={dateLabel}
          aria-labelledby={groupName ? `${groupName} ${dateNameId}` : undefined}
          aria-describedby={describe}
          aria-invalid={isInvalid}
          onChange={(event) => {
            setDateText(event.currentTarget.value)
            setBad(false)
          }}
          onKeyDown={openKeys}
        />
        <span id={dateNameId} hidden>
          {dateLabel}
        </span>
        <input
          ref={timeRef}
          name={name ? `${name}-time` : undefined}
          className="fa-control-input fa-time-input fa-date-time-time"
          autoComplete="off"
          spellCheck={false}
          placeholder={timePlaceholder(textOptions)}
          value={timeText}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          aria-label={timeLabel}
          aria-labelledby={groupName ? `${groupName} ${timeId}` : undefined}
          aria-describedby={describe}
          aria-invalid={isInvalid}
          onChange={(event) => {
            setTimeText(event.currentTarget.value)
            setBad(false)
          }}
          onKeyDown={(event) => {
            if (openKeys(event) || readOnly || disabled) return
            const stepped = timeKeyStep(event, timeText, {
              ...textOptions,
              ...bounds,
              start: timeNow,
            })
            if (!stepped) return
            event.preventDefault()
            const next = formatTimeText(stepped.time, textOptions)
            setTimeText(next)
            setBad(false)
            if (day) commit(dateText, stepped.time)
            selectPart(stepped.part)
          }}
        />
        <span id={timeId} hidden>
          {timeLabel}
        </span>
        {timeZone && zoneAt ? (
          <span className="fa-input-unit fa-date-time-zone">
            <span aria-hidden>{zoneAt.short}</span>
            <span id={zoneId} className="sr-only">
              {messages.timeZone(zoneAt.long)}
            </span>
          </span>
        ) : null}
      </div>
      {readOnly || disabled ? null : (
        <Popover.Root open={open} onOpenChange={setOpen}>
          <Popover.Trigger render={<Button variant="ghost" size="sm" className="fa-input-btn" icon={<IconCalendar />} aria-label={messages.chooseADateAndTime} />} />
          <Popover.Popup size="sm" align="end" className="fa-date-popover fa-date-time-popover" finalFocus={dateRef} aria-label={messages.chooseADateAndTime}>
            <div className="fa-date-time-picker">
              <Calendar
                locale={locale}
                min={minParts?.date}
                max={maxParts?.date}
                value={day}
                autoFocus
                onValueChange={(next) => {
                  const nextText = formatDateText(next, locale)
                  setDateText(nextText)
                  const time = timeText.trim() || defaultTime || ""
                  if (time) commit(nextText, time)
                  else setBad(false)
                  // In a stacked (narrow) popup the times sit below the calendar: bring them into view.
                  listRef.current?.parentElement?.scrollIntoView({
                    block: "nearest",
                  })
                  listRef.current?.focus({ preventScroll: true })
                }}
              />
              <div className="fa-date-time-times">
                <TimeList
                  aria-label={messages.times}
                  listRef={listRef}
                  times={times}
                  value={parseTimeText(timeText, textOptions)}
                  near={near}
                  format={(time) => formatTimeText(time, textOptions)}
                  onPick={(time) => {
                    const nextText = formatTimeText(time, textOptions)
                    setTimeText(nextText)
                    if (day) {
                      commit(dateText, time)
                      setOpen(false)
                    }
                  }}
                />
              </div>
            </div>
          </Popover.Popup>
        </Popover.Root>
      )}
    </div>
  )
}
