/**
 * Formatting for AI chrome (R2.6, R2.7): tabular figures, a thin space before units,
 * relative times when recent and the absolute time on hover. Helpers that write numbers or
 * dates take an optional BCP 47 `locale`; without one they use `getLocale()`
 * (`configureLocale()`, then `<html lang>`, then en-US). Components pass `useLocale()`.
 */
import { useEffect, useState } from "react";
import { dateTimeFormat } from "../lib/locale/intl.js";
import { getLocale } from "../lib/locale/locale.js";
import {
  formatAbsolute as sharedAbsolute,
  formatCount,
  formatNumber as sharedNumber,
} from "../ui/data-table/format.js";

/** U+2009 THIN SPACE between a number and its unit (`2.3 s`). */
export const THIN_SPACE = "\u2009";

/** "1,284", "2.3" in `locale`, from the shared pure formatter without importing table components. */
export function formatNumber(value: number, fractionDigits = 0, locale = getLocale()) {
  return sharedNumber(value, fractionDigits, locale);
}

/** Shared relative time, including future instants; older dates are written in `locale`. */
export function formatRelative(time: number, now: number, locale = getLocale()) {
  const delta = time - now
  if (!Number.isFinite(delta)) return "—"
  const format = new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "short" })
  const absolute = Math.abs(delta)
  if (absolute < 60_000) return format.format(0, "second")
  if (absolute < 3_600_000) return format.format(Math.trunc(delta / 60_000), "minute")
  if (absolute < 86_400_000) return format.format(Math.trunc(delta / 3_600_000), "hour")
  if (absolute < 7 * 86_400_000 || delta > 0) return format.format(Math.trunc(delta / 86_400_000), "day")
  return dateTimeFormat(locale, { day: "numeric", month: "short", ...(new Date(time).getFullYear() === new Date(now).getFullYear() ? {} : { year: "numeric" }) }).format(time)
}

/** Full timestamp for hover tooltips, in `locale`. */
export function formatAbsolute(time: number, locale = getLocale()) {
  return sharedAbsolute(time, locale);
}

const CLOCK: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };

/** "10:42 am" in en-AU, "10:42 AM" in en-US: the time of day in `locale`'s clock. */
export function formatClock(time: number, locale = getLocale()) {
  return dateTimeFormat(locale, CLOCK).format(new Date(time));
}

/** "0.4 s", "2.3 s", "48 s", "1 min 4 s"; the decimal mark is `locale`'s. */
export function formatElapsed(ms: number, locale = getLocale()) {
  const unit = (value: number, name: "second" | "minute", decimals = 0) => {
    const suffix = new Intl.NumberFormat(locale, { style: "unit", unit: name, unitDisplay: "narrow" }).formatToParts(value).find((part) => part.type === "unit")?.value ?? ""
    return `${formatNumber(value, decimals, locale)}${THIN_SPACE}${suffix}`
  }
  if (ms < 10_000) return unit(ms / 1000, "second", 1)
  if (ms < 60_000) return unit(Math.round(ms / 1000), "second")
  const minutes = Math.floor(ms / 60_000)
  const seconds = Math.round((ms % 60_000) / 1000)
  return [unit(minutes, "minute"), seconds ? unit(seconds, "second") : ""].filter(Boolean).join(" ")
}

/** A future time in the resolved locale. */
export function formatIn(time: number, now: number, locale = getLocale()) {
  const delta = time - now
  const format = new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "short" })
  if (delta <= 60_000) return format.format(1, "minute")
  if (delta < 3_600_000) return format.format(Math.round(delta / 60_000), "minute")
  if (delta < 86_400_000) return format.format(Math.round(delta / 3_600_000), "hour")
  return format.format(Math.round(delta / 86_400_000), "day")
}

/** "4:32" for a countdown. */
export function formatCountdown(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/** A clock that ticks every `interval` ms while `active`; returns Date.now(). */
export function useNow(active = true, interval = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(timer);
  }, [active, interval]);
  return now;
}

/** "1 tool", "4 tools"; the count is written in `locale`. */
export function plural(count: number, one: string, other = `${one}s`, locale = getLocale()) {
  return formatCount(count, { one, other }, locale);
}
