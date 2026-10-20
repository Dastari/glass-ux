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
  formatRelative as sharedRelative,
} from "../ui/data-table/format.js";

/** U+2009 THIN SPACE between a number and its unit (`2.3 s`). */
export const THIN_SPACE = "\u2009";

/** "1,284", "2.3" in `locale`, from the shared pure formatter without importing table components. */
export function formatNumber(value: number, fractionDigits = 0, locale = getLocale()) {
  return sharedNumber(value, fractionDigits, locale);
}

/** Shared relative time, including future instants; older dates are written in `locale`. */
export function formatRelative(time: number, now: number, locale = getLocale()) {
  return sharedRelative(time, now, locale);
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
  if (ms < 10_000) return `${formatNumber(ms / 1000, 1, locale)}${THIN_SPACE}s`;
  if (ms < 60_000) return `${Math.round(ms / 1000)}${THIN_SPACE}s`;
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.round((ms % 60_000) / 1000);
  return seconds
    ? `${minutes}${THIN_SPACE}min ${seconds}${THIN_SPACE}s`
    : `${minutes}${THIN_SPACE}min`;
}

/** A future time, relative: "in 40 min", "in 9 h", "in 3 days". */
export function formatIn(time: number, now: number) {
  const delta = time - now;
  if (delta <= 60_000) return "in a minute";
  if (delta < 3_600_000)
    return `in ${Math.round(delta / 60_000)}${THIN_SPACE}min`;
  if (delta < 86_400_000)
    return `in ${Math.round(delta / 3_600_000)}${THIN_SPACE}h`;
  const days = Math.round(delta / 86_400_000);
  return days === 1 ? "tomorrow" : `in ${days} days`;
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
