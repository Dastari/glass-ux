/**
 * Formatting for AI chrome (R2.6, R2.7): tabular figures, a thin space before units,
 * relative times when recent and the absolute time on hover.
 */
import { useEffect, useState } from "react"

/*
 * The same rules as DataTable's cell formatting (src/ui/data-table/format.ts). Kept local
 * so AI output does not load the table; PROPOSAL: move both into src/lib/format.
 */

/** U+2009 THIN SPACE between a number and its unit (`2.3 s`). */
export const THIN_SPACE = "\u2009"

const integer = new Intl.NumberFormat("en-AU", { maximumFractionDigits: 0 })
const decimals = new Map<number, Intl.NumberFormat>()

/** "1,284", "2.3". */
export function formatNumber(value: number, fractionDigits = 0) {
  if (fractionDigits === 0) return integer.format(value)
  let format = decimals.get(fractionDigits)
  if (!format) {
    format = new Intl.NumberFormat("en-AU", { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits })
    decimals.set(fractionDigits, format)
  }
  return format.format(value)
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const dayMonth = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short" })
const dayMonthYear = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric" })
const absolute = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })

/** "just now", "2 min ago", "3 h ago", "yesterday", "4 days ago", then a date. */
export function formatRelative(time: number, now: number) {
  const delta = now - time
  if (Number.isNaN(time)) return "—"
  if (delta < MINUTE) return "just now"
  if (delta < HOUR) return `${Math.floor(delta / MINUTE)}${THIN_SPACE}min ago`
  if (delta < DAY) return `${Math.floor(delta / HOUR)}${THIN_SPACE}h ago`
  const days = Math.floor(delta / DAY)
  if (days < 7) return days === 1 ? "yesterday" : `${days} days ago`
  const date = new Date(time)
  return date.getFullYear() === new Date(now).getFullYear() ? dayMonth.format(date) : dayMonthYear.format(date)
}

/** "13 Oct 2026, 10:42 am" — the hover text for relative times (R2.7). */
export function formatAbsolute(time: number) {
  return absolute.format(new Date(time))
}

const clock = new Intl.DateTimeFormat("en-AU", { hour: "numeric", minute: "2-digit" })

/** "10:42 am". */
export function formatClock(time: number) {
  return clock.format(new Date(time))
}

/** "0.4 s", "2.3 s", "48 s", "1 min 4 s". */
export function formatElapsed(ms: number) {
  if (ms < 10_000) return `${formatNumber(ms / 1000, 1)}${THIN_SPACE}s`
  if (ms < 60_000) return `${Math.round(ms / 1000)}${THIN_SPACE}s`
  const minutes = Math.floor(ms / 60_000)
  const seconds = Math.round((ms % 60_000) / 1000)
  return seconds ? `${minutes}${THIN_SPACE}min ${seconds}${THIN_SPACE}s` : `${minutes}${THIN_SPACE}min`
}

/** A future time, relative: "in 40 min", "in 9 h", "in 3 days". */
export function formatIn(time: number, now: number) {
  const delta = time - now
  if (delta <= 60_000) return "in a minute"
  if (delta < 3_600_000) return `in ${Math.round(delta / 60_000)}${THIN_SPACE}min`
  if (delta < 86_400_000) return `in ${Math.round(delta / 3_600_000)}${THIN_SPACE}h`
  const days = Math.round(delta / 86_400_000)
  return days === 1 ? "tomorrow" : `in ${days} days`
}

/** "4:32" for a countdown. */
export function formatCountdown(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${String(seconds).padStart(2, "0")}`
}

/** A clock that ticks every `interval` ms while `active`; returns Date.now(). */
export function useNow(active = true, interval = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const timer = setInterval(() => setNow(Date.now()), interval)
    return () => clearInterval(timer)
  }, [active, interval])
  return now
}

/** "1 tool", "4 tools". */
export function plural(count: number, one: string, other = `${one}s`) {
  return `${formatNumber(count)} ${count === 1 ? one : other}`
}
