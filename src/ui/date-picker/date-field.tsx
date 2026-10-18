import { Input as BaseInput } from "@base-ui/react/input"
import { useEffect, useId, useRef, useState, type FocusEvent, type KeyboardEvent, type Ref } from "react"
import { IconCalendar } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { Button } from "../button/index.js"
import { widthAttr, type FieldWidth } from "../field/index.js"
import { Popover } from "../popover/index.js"
import { Calendar, type DateRange } from "./calendar.js"
import { datePlaceholder, formatDateText, parseDateText, type IsoDate } from "./calendar-date.js"

export type DateFieldSize = "sm" | "md" | "lg"

interface DateFieldCommon {
  /** BCP 47 locale: the typed order ("dd/mm/yyyy" in en-AU), names, first weekday. */
  locale?: string
  /** Lower allowed value. */
  min?: IsoDate
  /** Upper value or visible-item limit, as specified by the type. */
  max?: IsoDate
  size?: DateFieldSize
  /** Content width (R15.6). A date fits `short`… almost: the default is medium. */
  width?: FieldWidth
  disabled?: boolean
  readOnly?: boolean
  /** Invalid outside a Field. Text that is not a date marks the field invalid by itself. */
  invalid?: boolean
  id?: string
  /** Layout only. Applied to the control box. */
  className?: string
  /** Accessible name when a visible label does not name the control. */
  "aria-label"?: string
  /** IDs of elements that provide the accessible name. */
  "aria-labelledby"?: string
}

export interface DateFieldProps extends DateFieldCommon {
  /** A calendar day (`2026-10-13`), or null when empty. */
  value?: IsoDate | null
  defaultValue?: IsoDate | null
  /** Called with a valid day, or null when the field is emptied. Typing commits on blur or Enter. */
  onValueChange?: (value: IsoDate | null) => void
  placeholder?: string
  name?: string
  /** Called when the text input loses focus, after the typed date has been committed. */
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void
  ref?: Ref<HTMLInputElement>
}

const outOfRange = (iso: IsoDate, min?: IsoDate, max?: IsoDate) => Boolean((min && iso < min) || (max && iso > max))

/** Text that tracks a committed value and is re-read on blur or Enter. */
function useDateText(value: IsoDate | null, locale: string) {
  const [text, setText] = useState(() => (value ? formatDateText(value, locale) : ""))
  const [bad, setBad] = useState(false)
  const shown = useRef(value)
  useEffect(() => {
    if (shown.current === value) return
    shown.current = value
    setText(value ? formatDateText(value, locale) : "")
    setBad(false)
  }, [value, locale])
  /** Show a committed day (or nothing) and remember it as the shown value. */
  const show = (next: IsoDate | null) => {
    shown.current = next
    setText(next ? formatDateText(next, locale) : "")
    setBad(false)
  }
  return { text, setText, bad, setBad, show }
}

/**
 * A calendar day typed in the locale's order ("13/10/2026") or picked from a calendar. Any
 * separator works and two-digit years mean 20xx; the text is tidied on blur. Text that is
 * not a day (or is outside min/max) turns the box invalid and keeps what was typed.
 */
export function DateField({
  value,
  defaultValue = null,
  onValueChange,
  locale = "en-AU",
  min,
  max,
  size = "md",
  width = "medium",
  placeholder,
  disabled,
  readOnly,
  invalid,
  name,
  id,
  onBlur,
  className,
  ref,
  ...aria
}: DateFieldProps) {
  const [inner, setInner] = useState<IsoDate | null>(defaultValue)
  const current = value === undefined ? inner : value
  const { text, setText, bad, setBad, show } = useDateText(current, locale)
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const set = (next: IsoDate | null) => {
    show(next)
    if (value === undefined) setInner(next)
    if (next !== current) onValueChange?.(next)
  }

  const commitText = () => {
    if (!text.trim()) return set(null)
    const parsed = parseDateText(text, locale)
    if (!parsed || outOfRange(parsed, min, max)) return setBad(true)
    set(parsed)
  }

  const setRefs = (node: HTMLInputElement | null) => {
    inputRef.current = node
    if (typeof ref === "function") ref(node)
    else if (ref) ref.current = node
  }

  return (
    <div
      className={cx("fa-control fa-input fa-date-field", className)}
      data-size={size}
      data-width={widthAttr(width)}
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
        className="fa-control-input fa-date-input"
        inputMode="numeric"
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholder ?? datePlaceholder(locale)}
        value={text}
        disabled={disabled}
        readOnly={readOnly}
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
            setOpen(true)
          }
        }}
      />
      {readOnly || disabled ? null : (
        <Popover.Root open={open} onOpenChange={setOpen}>
          <Popover.Trigger render={<Button variant="ghost" size="sm" className="fa-input-btn" icon={<IconCalendar />} aria-label="Choose a date" />} />
          <Popover.Popup size="sm" align="end" className="fa-date-popover" finalFocus={inputRef} aria-label="Choose a date">
            <Calendar
              locale={locale}
              min={min}
              max={max}
              value={current}
              autoFocus
              onValueChange={(next) => {
                set(next)
                setOpen(false)
              }}
            />
          </Popover.Popup>
        </Popover.Root>
      )}
    </div>
  )
}

export interface DateRangeFieldProps extends DateFieldCommon {
  value?: DateRange | null
  defaultValue?: DateRange | null
  /** Called with a complete, ordered range, or null when either end is emptied. */
  onValueChange?: (value: DateRange | null) => void
  /** Accessible names of the two ends (default "Start date", "End date"). */
  startLabel?: string
  /** Label at the end of the scale or track. */
  endLabel?: string
}

/**
 * A range of calendar days in one box: two typed ends ("1/10/2026 – 13/10/2026") and a
 * range calendar. The range is reported only when both ends are days and in order; a
 * reversed range marks the box invalid.
 */
export function DateRangeField({
  value,
  defaultValue = null,
  onValueChange,
  locale = "en-AU",
  min,
  max,
  size = "md",
  width,
  disabled,
  readOnly,
  invalid,
  id,
  className,
  startLabel = "Start date",
  endLabel = "End date",
  ...aria
}: DateRangeFieldProps) {
  const [inner, setInner] = useState<DateRange | null>(defaultValue)
  const current = value === undefined ? inner : value
  const start = useDateText(current?.start ?? null, locale)
  const end = useDateText(current?.end ?? null, locale)
  const [reversed, setReversed] = useState(false)
  const [open, setOpen] = useState(false)
  const startRef = useRef<HTMLInputElement>(null)
  const groupId = useId()

  const report = (next: DateRange | null) => {
    if (value === undefined) setInner(next)
    if (next?.start !== current?.start || next?.end !== current?.end) onValueChange?.(next)
  }

  const commit = () => {
    const a = start.text.trim() ? parseDateText(start.text, locale) : null
    const b = end.text.trim() ? parseDateText(end.text, locale) : null
    const badA = Boolean(start.text.trim()) && (!a || outOfRange(a, min, max))
    const badB = Boolean(end.text.trim()) && (!b || outOfRange(b, min, max))
    start.setBad(badA)
    end.setBad(badB)
    if (badA || badB) return
    if (a) start.show(a)
    if (b) end.show(b)
    if (!a || !b) {
      setReversed(false)
      return report(null)
    }
    setReversed(a > b)
    if (a > b) return
    report({ start: a, end: b })
  }

  const input = (side: typeof start, label: string, ref?: Ref<HTMLInputElement>) => (
    <input
      ref={ref}
      className="fa-control-input fa-date-input"
      inputMode="numeric"
      autoComplete="off"
      spellCheck={false}
      placeholder={datePlaceholder(locale)}
      aria-label={label}
      value={side.text}
      disabled={disabled}
      readOnly={readOnly}
      aria-invalid={invalid || side.bad || reversed || undefined}
      onChange={(event) => {
        side.setText(event.currentTarget.value)
        side.setBad(false)
      }}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") commit()
        if (event.key === "ArrowDown" && event.altKey) {
          event.preventDefault()
          setOpen(true)
        }
      }}
    />
  )

  return (
    <div
      {...aria}
      role="group"
      id={id ?? groupId}
      className={cx("fa-control fa-input fa-date-field fa-date-range", className)}
      data-size={size}
      data-width={widthAttr(width)}
      data-readonly={readOnly ? "" : undefined}
      data-disabled={disabled ? "" : undefined}
      data-invalid={invalid || start.bad || end.bad || reversed ? "" : undefined}
    >
      {input(start, startLabel, startRef)}
      <span className="fa-date-range-dash" aria-hidden>
        –
      </span>
      {input(end, endLabel)}
      {readOnly || disabled ? null : (
        <Popover.Root open={open} onOpenChange={setOpen}>
          <Popover.Trigger render={<Button variant="ghost" size="sm" className="fa-input-btn" icon={<IconCalendar />} aria-label="Choose dates" />} />
          <Popover.Popup size="sm" align="end" className="fa-date-popover" finalFocus={startRef} aria-label="Choose dates">
            <Calendar
              mode="range"
              locale={locale}
              min={min}
              max={max}
              value={current}
              autoFocus
              onValueChange={(next) => {
                start.show(next.start)
                end.show(next.end)
                setReversed(false)
                report(next)
                setOpen(false)
              }}
            />
          </Popover.Popup>
        </Popover.Root>
      )}
    </div>
  )
}
