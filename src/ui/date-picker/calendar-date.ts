/**
 * Calendar dates as ISO strings (`2026-10-13`): a day with no time and no time zone. The
 * date picker, date fields and date filters all speak this one type, so a value never
 * drifts by a day when it crosses a time zone. Local helpers convert to and from the
 * user's own day boundaries.
 */

/** `YYYY-MM-DD`. */
export type IsoDate = string

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

const pad = (value: number, length = 2) => String(value).padStart(length, "0")

/** Parts of a valid ISO date, or null (rejects 2026-02-30). */
export function isoParts(text: string): { year: number; month: number; day: number } | null {
  const match = ISO_DATE.exec(text)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null
  return { year, month, day }
}

/** Whether a value is a `YYYY-MM-DD` string naming a real calendar day (rejects 2026-02-30). */
export const isIsoDate = (text: unknown): boolean => typeof text === "string" && isoParts(text) !== null

export function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

/** The local calendar day of a moment. */
export function toIsoDate(date: Date): IsoDate {
  return `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Local midnight at the start of a calendar day. */
export function fromIsoDate(iso: IsoDate): Date {
  const parts = isoParts(iso)
  if (!parts) return new Date(Number.NaN)
  return new Date(parts.year, parts.month - 1, parts.day)
}

/** Shift a day by whole days (calendar arithmetic: daylight saving never moves it). */
export function addDays(iso: IsoDate, days: number): IsoDate {
  const parts = isoParts(iso)
  if (!parts) return iso
  return toIsoDate(new Date(parts.year, parts.month - 1, parts.day + days))
}

/** Shift by whole months, keeping the day where the month allows (31 Jan + 1 → 28 Feb). */
export function addMonths(iso: IsoDate, months: number): IsoDate {
  const parts = isoParts(iso)
  if (!parts) return iso
  const index = parts.year * 12 + (parts.month - 1) + months
  const year = Math.floor(index / 12)
  const month = (index % 12) + 1
  return `${pad(year, 4)}-${pad(month)}-${pad(Math.min(parts.day, daysInMonth(year, month)))}`
}

/** Orders two ISO dates for sorting: -1 when `a` is earlier, 1 when later, 0 when the same day. */
export const compareIso = (a: IsoDate, b: IsoDate) => (a < b ? -1 : a > b ? 1 : 0)

/** The local calendar day of `now` (default: the current moment) as an ISO date. */
export const todayIso = (now: Date = new Date()) => toIsoDate(now)

/** Clamp a day into [min, max] (either bound optional). */
export function clampIso(iso: IsoDate, min?: IsoDate, max?: IsoDate): IsoDate {
  if (min && iso < min) return min
  if (max && iso > max) return max
  return iso
}

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export function isoWeekday(iso: IsoDate) {
  const day = fromIsoDate(iso).getDay()
  return day === 0 ? 7 : day
}

/** The locale's first day of the week (1 = Monday … 7 = Sunday). */
export function firstDayOfWeek(locale: string): number {
  try {
    const info = new Intl.Locale(locale) as Intl.Locale & { getWeekInfo?: () => { firstDay: number }; weekInfo?: { firstDay: number } }
    const week = info.getWeekInfo?.() ?? info.weekInfo
    if (week?.firstDay) return week.firstDay
  } catch {
    // Fall through to the regional default.
  }
  return /-(US|CA|JP|IL|BR|MX|PH|KR|TW|HK|IN)\b/i.test(locale) ? 7 : 1
}

/** The first day shown in a month grid that starts on `firstDay`. */
export function gridStart(year: number, month: number, firstDay: number): IsoDate {
  const first = `${pad(year, 4)}-${pad(month)}-01`
  const offset = (isoWeekday(first) - firstDay + 7) % 7
  return addDays(first, -offset)
}

/* ── Text entry ─────────────────────────────────────────────────────────────── */

type Part = "day" | "month" | "year"

/** The locale's numeric date order and separator: en-AU → day/month/year with "/". */
export function dateOrder(locale: string): { order: Part[]; separator: string } {
  const parts = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", year: "numeric" }).formatToParts(new Date(2026, 9, 13))
  const order = parts.filter((part): part is Intl.DateTimeFormatPart & { type: Part } => part.type === "day" || part.type === "month" || part.type === "year").map((part) => part.type)
  const separator = parts.find((part) => part.type === "literal")?.value.trim() || "/"
  return { order: order.length === 3 ? order : ["day", "month", "year"], separator }
}

/** "13/10/2026" in en-AU. Empty for an invalid date. */
export function formatDateText(iso: IsoDate, locale: string): string {
  const parts = isoParts(iso)
  if (!parts) return ""
  const { order, separator } = dateOrder(locale)
  const value: Record<Part, string> = { day: pad(parts.day), month: pad(parts.month), year: pad(parts.year, 4) }
  return order.map((part) => value[part]).join(separator)
}

/** A placeholder in the locale's order: "dd/mm/yyyy". */
export function datePlaceholder(locale: string): string {
  const { order, separator } = dateOrder(locale)
  const value: Record<Part, string> = { day: "dd", month: "mm", year: "yyyy" }
  return order.map((part) => value[part]).join(separator)
}

/**
 * Read a typed date in the locale's numeric order. Accepts any separator ("13.10.2026",
 * "13-10-26"), two-digit years (as 20xx) and ISO input. Null when it is not a real date.
 */
export function parseDateText(text: string, locale: string): IsoDate | null {
  const trimmed = text.trim()
  if (!trimmed) return null
  if (isIsoDate(trimmed)) return trimmed
  const numbers = trimmed.split(/[^\d]+/).filter(Boolean)
  if (numbers.length !== 3) return null
  const { order } = dateOrder(locale)
  const value: Partial<Record<Part, number>> = {}
  order.forEach((part, index) => {
    value[part] = Number(numbers[index])
  })
  let year = value.year ?? Number.NaN
  if (String(numbers[order.indexOf("year")]).length <= 2) year += 2000
  const iso = `${pad(year, 4)}-${pad(value.month ?? 0)}-${pad(value.day ?? 0)}`
  return isIsoDate(iso) ? iso : null
}

/** "13 Oct 2026". */
export function formatDateLong(iso: IsoDate, locale: string): string {
  const date = fromIsoDate(iso)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(date)
}

/** "1–13 Oct 2026", "28 Sep – 13 Oct 2026". */
export function formatDateRange(start: IsoDate, end: IsoDate, locale: string): string {
  const a = fromIsoDate(start)
  const b = fromIsoDate(end)
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return ""
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).formatRange(a, b)
}
