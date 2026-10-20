import { Input as BaseInput } from "@base-ui/react/input"
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FocusEvent, type KeyboardEvent, type Ref } from "react"
import { IconClock } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { useLocale } from "../../lib/locale/use-locale.js"
import { Button } from "../button/index.js"
import { widthAttr, type FieldWidth } from "../field/index.js"
import { Popover } from "../popover/index.js"
import type { DateFieldSize } from "./date-field.js"
import { TimeList } from "./time-list.js"
import {
  formatTimeText,
  isTimeValue,
  nearestTimeIndex,
  parseTimeText,
  secondsToTime,
  stepTime,
  timePartAt,
  timePartRange,
  timePlaceholder,
  timeSlots,
  timeToSeconds,
  type HourCycle,
  type TimeBounds,
  type TimePart,
  type TimeTextOptions,
  type TimeValue,
} from "./time.js"

/** Whether a time is outside [min, max]. */
export const timeOutOfRange = (time: TimeValue, min?: TimeValue, max?: TimeValue) =>
  Boolean((min && timeToSeconds(time) < timeToSeconds(min)) || (max && timeToSeconds(time) > timeToSeconds(max)))

/** The current local time of day. */
export function localNow(seconds = false): TimeValue {
  const now = new Date()
  return secondsToTime(now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds(), seconds)
}

/** The times a list offers: explicit suggestions within the bounds, or every `step` minutes. */
export function listTimes(bounds: TimeBounds, suggestions?: readonly TimeValue[]): TimeValue[] {
  if (!suggestions) return timeSlots(bounds)
  return suggestions
    .filter((time) => isTimeValue(time) && !timeOutOfRange(time, bounds.min, bounds.max))
    .map((time) => (bounds.seconds ? (time.length === 5 ? `${time}:00` : time) : time.slice(0, 5)))
    .toSorted((a, b) => timeToSeconds(a) - timeToSeconds(b))
}

/**
 * What an arrow, Page or Home/End key does to typed time text: the stepped time and the part
 * to select afterwards, or null when the key does not step (unreadable text, or Home/End
 * without that bound, which then move the caret as usual).
 */
export function timeKeyStep(
  event: KeyboardEvent<HTMLInputElement>,
  text: string,
  options: TimeTextOptions & TimeBounds & { start: () => TimeValue }
): { time: TimeValue; part: TimePart } | null {
  if (event.altKey || event.metaKey || event.ctrlKey) return null
  const caret = event.currentTarget.selectionStart ?? text.length
  const part = text.trim() ? timePartAt(text, caret) : "minute"
  if (event.key === "Home" || event.key === "End") {
    const bound = event.key === "Home" ? options.min : options.max
    return bound ? { time: bound, part } : null
  }
  const direction = event.key === "ArrowUp" || event.key === "PageUp" ? 1 : event.key === "ArrowDown" || event.key === "PageDown" ? -1 : 0
  if (!direction) return null
  if (!text.trim()) return { time: options.start(), part }
  const current = parseTimeText(text, options)
  if (!current) return null
  return { time: stepTime(current, part, direction, { ...options, large: event.key.startsWith("Page") }), part }
}

/** Selects a part of the input's text after the render that writes it (a stepped time). */
export function usePartSelection(input: { current: HTMLInputElement | null }) {
  const pending = useRef<TimePart | null>(null)
  useLayoutEffect(() => {
    const part = pending.current
    const node = input.current
    if (!part || !node || document.activeElement !== node) return
    pending.current = null
    const range = timePartRange(node.value, part)
    if (range) node.setSelectionRange(range[0], range[1])
  })
  return (part: TimePart) => {
    pending.current = part
  }
}

/** The starting point for stepping an empty field: now, on the step grid, within the bounds. */
export function startTime(bounds: TimeBounds, now: TimeValue): TimeValue {
  const slots = timeSlots(bounds)
  return slots[Math.max(0, nearestTimeIndex(slots, now))] ?? now
}

export interface TimeInputProps {
  /** A time of day (`09:30`, or `09:30:15` with `seconds`), or null when empty. A value that is not a time is shown as it is and marked invalid. */
  value?: TimeValue | null
  /** The initial time when uncontrolled. */
  defaultValue?: TimeValue | null
  /** Called with a time, or null when the field is emptied. Typing commits on blur or Enter; arrow keys and the list commit at once. */
  onValueChange?: (value: TimeValue | null) => void
  /**
   * Called on blur or Enter instead of `onValueChange` when the text cannot be read (with the text
   * as typed) or reads as a time outside min/max (with that time). The box is marked invalid.
   * The bound TimeField passes it to the form so `timeSchema` can explain it.
   */
  onReject?: (value: string) => void
  /** BCP 47 locale: the clock and its am/pm words. Default: the nearest `LocaleProvider`, then `configureLocale()`, then `<html lang>`, then en-US. */
  locale?: string
  /** Override the locale's clock: 12 (am/pm) or 24. */
  hourCycle?: HourCycle
  /** Hold seconds (`HH:mm:ss`). Default false. */
  seconds?: boolean
  /** Earliest allowed time. */
  min?: TimeValue
  /** Latest allowed time. */
  max?: TimeValue
  /** Minutes between suggested times, and between arrow-key steps on the minutes (default 15). */
  step?: number
  /** Explicit times to offer in the list instead of every `step` minutes. */
  suggestions?: readonly TimeValue[]
  /** Show the list button (default true). Typing and arrow keys work without it. */
  popup?: boolean
  /** The box height, matching DateField. */
  size?: DateFieldSize
  /** Content width (R15.6). Default short: a time is about eight characters. */
  width?: FieldWidth
  /** The prompt while empty. Default: the format in the locale's clock ("h:mm am"). */
  placeholder?: string
  disabled?: boolean
  readOnly?: boolean
  /** Invalid outside a Field. Text that is not a time marks the field invalid by itself. */
  invalid?: boolean
  /** Marks the input required for assistive technology; pair it with `timeSchema({ required: true })`. */
  required?: boolean
  name?: string
  id?: string
  /** Called when the text input loses focus, after the typed time has been committed. */
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void
  /** Layout only. Applied to the control box. */
  className?: string
  /** Accessible name when a visible label does not name the control. */
  "aria-label"?: string
  /** IDs of elements that provide the accessible name. */
  "aria-labelledby"?: string
  ref?: Ref<HTMLInputElement>
}

/**
 * A time of day typed as people write it ("930", "9:30pm", "21:30", "noon") or picked from a
 * list, shown in the locale's clock ("9:30 am" in en-AU) and held as `HH:mm`. Arrow keys step
 * the part under the caret (minutes by `step`), Page Up and Page Down move an hour, Home and
 * End go to min and max, and Alt+↓ opens the list. Text that is not a time (or is outside
 * min/max) turns the box invalid; the text is tidied on blur.
 */
export function TimeInput({
  value,
  defaultValue = null,
  onValueChange,
  onReject,
  locale: localeProp,
  hourCycle,
  seconds = false,
  min,
  max,
  step = 15,
  suggestions,
  popup = true,
  size = "md",
  width = "short",
  placeholder,
  disabled,
  readOnly,
  invalid,
  required,
  name,
  id,
  onBlur,
  className,
  ref,
  ...aria
}: TimeInputProps) {
  const locale = useLocale(localeProp)
  const [inner, setInner] = useState<TimeValue | null>(defaultValue)
  const current = value === undefined ? inner : value
  const textOptions = { locale, hourCycle, seconds }
  const display = (next: string | null) => (next === null ? "" : isTimeValue(next) ? formatTimeText(next, textOptions) : next)
  const isBad = (next: string | null) => next !== null && (!isTimeValue(next) || timeOutOfRange(next, min, max))
  const [text, setText] = useState(() => display(current))
  const [bad, setBad] = useState(() => isBad(current))
  const shown = useRef({ value: current, format: `${locale}|${hourCycle}|${seconds}` })
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const selectPart = usePartSelection(inputRef)

  // Follow a value (or clock) changed from outside.
  useEffect(() => {
    const format = `${locale}|${hourCycle}|${seconds}`
    if (shown.current.value === current && shown.current.format === format) return
    shown.current = { value: current, format }
    setText(display(current))
    setBad(isBad(current))
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- display and isBad follow these inputs
  }, [current, locale, hourCycle, seconds])

  const set = (next: TimeValue | null) => {
    shown.current = { ...shown.current, value: next }
    setText(display(next))
    setBad(false)
    if (value === undefined) setInner(next)
    if (next !== current) onValueChange?.(next)
  }

  const commitText = () => {
    const typed = text.trim()
    if (!typed) return set(null)
    const parsed = parseTimeText(typed, textOptions)
    if (!parsed) {
      setBad(true)
      onReject?.(typed)
      return
    }
    if (timeOutOfRange(parsed, min, max)) {
      setText(display(parsed))
      setBad(true)
      onReject?.(parsed)
      return
    }
    set(parsed)
  }

  const bounds = { min, max, step, seconds }
  const times = useMemo(
    () => listTimes(bounds, suggestions),
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- identity follows the values
    [min, max, step, seconds, suggestions?.join()]
  )

  const setRefs = (node: HTMLInputElement | null) => {
    inputRef.current = node
    if (typeof ref === "function") ref(node)
    else if (ref) ref.current = node
  }

  return (
    <div
      ref={boxRef}
      className={cx("fa-control fa-input fa-time-field", className)}
      data-size={size}
      data-width={widthAttr(width)}
      data-seconds={seconds ? "" : undefined}
      data-readonly={readOnly ? "" : undefined}
      data-disabled={disabled ? "" : undefined}
      data-invalid={invalid || bad ? "" : undefined}
    >
      {/* Base UI's Input, so a surrounding Field labels and describes it. */}
      <BaseInput
        {...aria}
        ref={setRefs}
        id={id}
        name={name}
        className="fa-control-input fa-time-input"
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholder ?? timePlaceholder(textOptions)}
        value={text}
        disabled={disabled}
        readOnly={readOnly}
        required={required}
        aria-invalid={invalid || bad || undefined}
        onChange={(event) => {
          setText(event.currentTarget.value)
          setBad(false)
        }}
        onBlur={(event) => {
          commitText()
          onBlur?.(event)
        }}
        onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
          if (event.key === "Enter") commitText()
          if (event.key === "ArrowDown" && event.altKey) {
            event.preventDefault()
            if (popup && !readOnly && !disabled) setOpen(true)
            return
          }
          if (readOnly || disabled) return
          const stepped = timeKeyStep(event, text, { ...textOptions, ...bounds, start: () => startTime(bounds, localNow(seconds)) })
          if (!stepped) return
          event.preventDefault()
          set(stepped.time)
          selectPart(stepped.part)
        }}
      />
      {readOnly || disabled || !popup ? null : (
        <Popover.Root open={open} onOpenChange={setOpen}>
          <Popover.Trigger render={<Button variant="ghost" size="sm" className="fa-input-btn" icon={<IconClock />} aria-label="Choose a time" />} />
          <Popover.Popup size="sm" align="start" anchor={boxRef} className="fa-time-popover" finalFocus={inputRef} aria-label="Choose a time">
            <TimeList
              times={times}
              value={current && isTimeValue(current) ? current : null}
              near={localNow(seconds)}
              format={(time) => formatTimeText(time, textOptions)}
              autoFocus
              onPick={(time) => {
                set(time)
                setOpen(false)
              }}
            />
          </Popover.Popup>
        </Popover.Root>
      )}
    </div>
  )
}
