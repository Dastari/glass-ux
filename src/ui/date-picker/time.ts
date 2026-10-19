/**
 * Times of day as strings (`09:30`, or `09:30:15` with seconds): 24-hour, zero-padded, no date
 * and no time zone, so they sort as text and never shift. Text entry reads what people type
 * ("930", "9:30pm", "21.30", "noon") and writes the locale's own clock ("9:30 am" in en-AU).
 */

/** `HH:mm`, or `HH:mm:ss` when seconds are on: 24-hour and zero-padded ("09:30", "21:05:30"). */
export type TimeValue = string

/** 12 for a clock with am/pm, 24 for a 24-hour clock. */
export type HourCycle = 12 | 24

/** The editable parts of a typed time, used for keyboard stepping. */
export type TimePart = "hour" | "minute" | "second" | "period"

export interface TimeTextOptions {
  /** BCP 47 locale: the clock and its am/pm words (default en-AU). */
  locale?: string
  /** Override the locale's clock: 12 (am/pm) or 24. */
  hourCycle?: HourCycle
  /** Values carry seconds (`HH:mm:ss`). Default false. */
  seconds?: boolean
}

const TIME = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/
const DAY = 86_400

const pad = (value: number) => String(value).padStart(2, "0")

/** Whether a value is a canonical time: `HH:mm`, or `HH:mm:ss` (seconds must match the option when it is given). */
export function isTimeValue(value: unknown, options: { seconds?: boolean } = {}): boolean {
  if (typeof value !== "string") return false
  const match = TIME.exec(value)
  if (!match) return false
  if (options.seconds === undefined) return true
  return options.seconds === (match[3] !== undefined)
}

/** Seconds since midnight, or NaN when the value is not a time. */
export function timeToSeconds(value: TimeValue): number {
  const match = TIME.exec(value)
  if (!match) return Number.NaN
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3] ?? 0)
}

/** A time from seconds since midnight (wrapped into one day). */
export function secondsToTime(total: number, seconds = false): TimeValue {
  const t = ((Math.floor(total) % DAY) + DAY) % DAY
  const text = `${pad(Math.floor(t / 3600))}:${pad(Math.floor((t % 3600) / 60))}`
  return seconds ? `${text}:${pad(t % 60)}` : text
}

/** Orders two times: -1 when `a` is earlier, 1 when later, 0 when the same. */
export const compareTime = (a: TimeValue, b: TimeValue) => Math.sign(timeToSeconds(a) - timeToSeconds(b))

/** The locale's clock: 12 for en-AU and en-US, 24 for en-GB and de. */
export function hourCycleOf(locale = "en-AU"): HourCycle {
  try {
    const cycle = new Intl.DateTimeFormat(locale, { hour: "numeric" }).resolvedOptions().hourCycle
    return cycle === "h11" || cycle === "h12" ? 12 : 24
  } catch {
    return 12
  }
}

const formatters = new Map<string, Intl.DateTimeFormat>()
function formatter(locale: string, cycle: HourCycle, seconds: boolean) {
  const key = `${locale}|${cycle}|${seconds}`
  let format = formatters.get(key)
  if (!format) {
    format = new Intl.DateTimeFormat(locale, {
      hour: cycle === 12 ? "numeric" : "2-digit",
      minute: "2-digit",
      second: seconds ? "2-digit" : undefined,
      hourCycle: cycle === 12 ? "h12" : "h23",
      timeZone: "UTC",
    })
    formatters.set(key, format)
  }
  return format
}

// Intl separates the period with a narrow no-break space in some locales; people type a space.
const plainSpaces = (text: string) => text.replace(/[  ]/g, " ")

function partsOf(value: TimeValue, options: TimeTextOptions) {
  const locale = options.locale ?? "en-AU"
  const cycle = options.hourCycle ?? hourCycleOf(locale)
  const total = timeToSeconds(value)
  const seconds = options.seconds ?? value.length > 5
  return formatter(locale, cycle, seconds)
    .formatToParts(Date.UTC(2000, 0, 1, 0, 0, Number.isNaN(total) ? 0 : total))
    .map((part) => ({ type: part.type, value: plainSpaces(part.value) }))
}

/** "9:30 am" in en-AU, "09:30" with a 24-hour clock. Empty for a value that is not a time. */
export function formatTimeText(value: TimeValue, options: TimeTextOptions = {}): string {
  if (!isTimeValue(value)) return ""
  return partsOf(value, options)
    .map((part) => part.value)
    .join("")
}

/** A placeholder in the locale's clock: "h:mm am" (en-AU), "hh:mm" (24-hour), with ":ss" when seconds are on. */
export function timePlaceholder(options: TimeTextOptions = {}): string {
  const cycle = options.hourCycle ?? hourCycleOf(options.locale ?? "en-AU")
  return partsOf(options.seconds ? "09:30:00" : "09:30", { ...options, hourCycle: cycle })
    .map((part) => (part.type === "hour" ? (cycle === 12 ? "h" : "hh") : part.type === "minute" ? "mm" : part.type === "second" ? "ss" : part.value))
    .join("")
}

/** The locale's am and pm words, lower case ("am"/"pm", "vorm."/"nachm."…). */
function dayPeriods(locale: string): { am: string; pm: string } {
  const read = (hour: number) => {
    try {
      const part = formatter(locale, 12, false)
        .formatToParts(Date.UTC(2000, 0, 1, hour))
        .find((entry) => entry.type === "dayPeriod")
      return plainSpaces(part?.value ?? "").trim().toLowerCase()
    } catch {
      return ""
    }
  }
  return { am: read(9) || "am", pm: read(21) || "pm" }
}

const WORDS: Record<string, number> = { noon: 12 * 3600, midday: 12 * 3600, midnight: 0 }

/**
 * Read a typed time. Accepts "9:30", "09:30", "930", "0930", "21:30", "21.30", "9h30",
 * "9:30pm", "9.30 p.m.", "9 pm", "12am", the locale's own am/pm words, "noon", "midday" and
 * "midnight". Without am/pm the hour is read on a 24-hour clock ("9" is 09:00). Seconds are
 * read only when the option is on (":00" is always accepted). Null when it is not a time.
 */
export function parseTimeText(text: string, options: TimeTextOptions = {}): TimeValue | null {
  let source = plainSpaces(text).trim().toLowerCase()
  if (!source) return null
  if (source in WORDS) return secondsToTime(WORDS[source]!, options.seconds)

  // The period: English a/am/a.m. and p/pm/p.m., or the locale's words, before or after.
  const local = dayPeriods(options.locale ?? "en-AU")
  let period: "am" | "pm" | null = null
  const english = /\s*([ap])\.?\s?(?:m\.?)?$/.exec(source)
  if (english && /\d/.test(source.slice(0, english.index))) {
    period = english[1] === "a" ? "am" : "pm"
    source = source.slice(0, english.index)
  } else {
    for (const [key, word] of [["am", local.am], ["pm", local.pm]] as const) {
      if (!word || !/\D/.test(word)) continue
      if (source.endsWith(word)) {
        period = key
        source = source.slice(0, -word.length)
        break
      }
      if (source.startsWith(word)) {
        period = key
        source = source.slice(word.length)
        break
      }
    }
  }
  source = source.trim()

  let hour: number
  let minute = 0
  let second = 0
  const separated = /^(\d{1,2})(?:\s*[:.h ]\s*(\d{2})(?:\s*[:.]\s*(\d{2}))?)?h?$/.exec(source)
  const compact = /^\d{3,6}$/.exec(source)
  if (separated) {
    hour = Number(separated[1])
    minute = Number(separated[2] ?? 0)
    second = Number(separated[3] ?? 0)
  } else if (compact) {
    // 930 → 9:30, 0930 → 09:30, 93015 → 9:30:15, 093015 → 09:30:15
    const digits = source.length % 2 ? `0${source}` : source
    hour = Number(digits.slice(0, 2))
    minute = Number(digits.slice(2, 4))
    second = Number(digits.slice(4, 6) || 0)
  } else return null

  if (minute > 59 || second > 59) return null
  if (second && !options.seconds) return null
  if (period) {
    if (hour < 0 || hour > 12) return null
    if (hour === 12) hour = 0
    if (period === "pm") hour += 12
  } else if (hour > 23) return null
  return secondsToTime(hour * 3600 + minute * 60 + second, options.seconds)
}

/* ── Stepping ──────────────────────────────────────────────────────────────── */

export interface TimeBounds {
  /** Earliest allowed time. */
  min?: TimeValue
  /** Latest allowed time. */
  max?: TimeValue
  /** Minutes between suggested times and between arrow-key steps on the minutes (default 15). */
  step?: number
  /** Values carry seconds. */
  seconds?: boolean
}

/** The bounds in seconds since midnight: the day's first and last time when unbounded. */
function range({ min, max, seconds }: TimeBounds) {
  const low = min && isTimeValue(min) ? timeToSeconds(min) : 0
  const high = max && isTimeValue(max) ? timeToSeconds(max) : DAY - (seconds ? 1 : 60)
  return { low, high }
}

const stepSeconds = (step: number | undefined) => Math.max(1, Math.round((step ?? 15) * 60))

/**
 * Times every `step` minutes from `min` (or midnight) to `max` (or the end of the day):
 * timeSlots({ step: 30, min: "09:00", max: "11:00" }) → 09:00, 09:30 … 11:00.
 */
export function timeSlots(bounds: TimeBounds = {}): TimeValue[] {
  const { low, high } = range(bounds)
  const size = stepSeconds(bounds.step)
  const slots: TimeValue[] = []
  for (let t = low; t <= high; t += size) slots.push(secondsToTime(t, bounds.seconds))
  return slots
}

/** The index of the time in `times` closest to `value` (ties go to the earlier), or -1 when empty. */
export function nearestTimeIndex(times: readonly TimeValue[], value: TimeValue): number {
  const target = timeToSeconds(value)
  let best = -1
  let distance = Number.POSITIVE_INFINITY
  times.forEach((time, index) => {
    const gap = Math.abs(timeToSeconds(time) - target)
    if (gap < distance) {
      best = index
      distance = gap
    }
  })
  return best
}

/** Clamp a time into its bounds. */
export function clampTime(value: TimeValue, bounds: TimeBounds = {}): TimeValue {
  const { low, high } = range(bounds)
  return secondsToTime(Math.min(high, Math.max(low, timeToSeconds(value))), bounds.seconds)
}

/**
 * One keyboard step of a part. Minutes move to the next or previous multiple of `step` from
 * `min` (or midnight), so they land on the suggested times; hours move by one, seconds by
 * one, the period flips am and pm; `large` (Page Up, Page Down) moves by an hour. The result
 * stays within the bounds and the day; stepping never wraps past midnight.
 */
export function stepTime(value: TimeValue, part: TimePart, direction: 1 | -1, bounds: TimeBounds & { large?: boolean } = {}): TimeValue {
  const { low, high } = range(bounds)
  const t = timeToSeconds(value)
  let next: number
  if (bounds.large) next = t + direction * 3600
  else if (part === "hour") next = t + direction * 3600
  else if (part === "second") next = t + direction
  else if (part === "period") next = t < 12 * 3600 ? t + 12 * 3600 : t - 12 * 3600
  else {
    const size = stepSeconds(bounds.step)
    const offset = t - low
    const steps = direction > 0 ? Math.floor(offset / size) + 1 : Math.ceil(offset / size) - 1
    next = low + steps * size
  }
  return secondsToTime(Math.min(high, Math.max(low, next)), bounds.seconds)
}

/**
 * The part of a typed time at a caret position: the first number is the hour, the second the
 * minutes, the third the seconds, and letters the period. A caret on a separator belongs to the
 * part before it. Run-together digits ("930") step the minutes.
 */
export function timePartAt(text: string, caret: number): TimePart {
  const tokens = [...text.matchAll(/\d+|[^\d\s:.]+/g)].map((match) => ({ text: match[0], start: match.index, end: match.index + match[0].length }))
  const numbers = tokens.filter((token) => /^\d/.test(token.text))
  if (numbers.length === 1 && numbers[0]!.text.length > 2) return "minute"
  let index = tokens.findIndex((token) => caret >= token.start && caret <= token.end)
  if (index < 0) index = tokens.findLastIndex((token) => token.end <= caret)
  const token = tokens[Math.max(0, index)]
  if (!token) return "minute"
  if (!/^\d/.test(token.text)) return "period"
  const order: TimePart[] = ["hour", "minute", "second"]
  return order[numbers.indexOf(token)] ?? "minute"
}

/** Where a part sits in formatted text, as [start, end), so the field can select it after a step. */
export function timePartRange(text: string, part: TimePart): [number, number] | null {
  const tokens = [...text.matchAll(/\d+|[^\d\s:.]+/g)]
  const numbers = tokens.filter((match) => /^\d/.test(match[0]))
  const token = part === "period" ? tokens.find((match) => !/^\d/.test(match[0])) : numbers[["hour", "minute", "second"].indexOf(part)]
  return token ? [token.index, token.index + token[0].length] : null
}
