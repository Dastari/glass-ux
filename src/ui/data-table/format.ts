import { resolveDataTableCellMessages } from "./messages.js";
/**
 * Formatting for table cells and the status bar (R2.6, R2.7): the resolved locale's
 * numbers and dates, tabular numbers, a thin space before units, relative times when recent.
 * Each helper takes an optional `locale`; without one it uses `getLocale()` (the configured
 * locale, then `<html lang>`, then en-US). Components pass `useLocale()`.
 */
import { dateTimeFormat, numberFormat } from "../../lib/locale/intl.js";
import { getLocale } from "../../lib/locale/locale.js";

/** U+2009 THIN SPACE, between a number and its unit (`7.8 GB`). */
export const THIN_SPACE = " ";

/** Formats a number in `locale` with exactly `fractionDigits` decimals (default 0, which rounds to a whole number). */
export function formatNumber(
  value: number,
  fractionDigits = 0,
  locale = getLocale(),
) {
  return numberFormat(
    locale,
    fractionDigits === 0
      ? { maximumFractionDigits: 0 }
      : {
          minimumFractionDigits: fractionDigits,
          maximumFractionDigits: fractionDigits,
        },
  ).format(value);
}

/** Formats a number with its unit after a thin space (`7.8 GB`), or directly after it for `%`; without a unit, the number alone. */
export function formatWithUnit(
  value: number,
  unit?: string,
  fractionDigits = 0,
  locale = getLocale(),
) {
  const number = formatNumber(value, fractionDigits, locale);
  if (!unit) return number;
  return unit === "%" ? `${number}%` : `${number}${THIN_SPACE}${unit}`;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const DAY_MONTH: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
};
const DAY_MONTH_YEAR: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric",
};
const ABSOLUTE: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
};

export function toTime(value: Date | number | string) {
  return value instanceof Date
    ? value.getTime()
    : typeof value === "number"
      ? value
      : Date.parse(value);
}

/** m.justNow, "2 min ago", "3 h ago", "2 days ago", then a date in `locale`. */
export function formatRelative(
  value: Date | number | string,
  now: number,
  locale = getLocale(),
  m = resolveDataTableCellMessages(locale),
) {
  const time = toTime(value);
  const delta = now - time;
  if (Number.isNaN(time)) return "—";
  if (delta < 0) {
    const ahead = -delta;
    if (ahead < MINUTE) return m.lessThanMinute;
    if (ahead < HOUR) return m.minutesAhead(Math.ceil(ahead / MINUTE));
    if (ahead < DAY) return m.hoursAhead(Math.ceil(ahead / HOUR));
    const days = Math.ceil(ahead / DAY);
    return m.daysAhead(days);
  }
  if (delta < MINUTE) return m.justNow;
  if (delta < HOUR) return m.minutesAgo(Math.floor(delta / MINUTE));
  if (delta < DAY) return m.hoursAgo(Math.floor(delta / HOUR));
  const days = Math.floor(delta / DAY);
  if (days < 7) return days === 1 ? m.yesterday : m.daysAgo(days);
  const date = new Date(time);
  return date.getFullYear() === new Date(now).getFullYear()
    ? dateTimeFormat(locale, DAY_MONTH).format(date)
    : dateTimeFormat(locale, DAY_MONTH_YEAR).format(date);
}

/** Full timestamp for hover titles: "13 Oct 2026, 11:24 am" in en-AU. */
export function formatAbsolute(
  value: Date | number | string,
  locale = getLocale(),
) {
  const time = toTime(value);
  return Number.isNaN(time)
    ? ""
    : dateTimeFormat(locale, ABSOLUTE).format(new Date(time));
}

/** "1,284 endpoints" / "1 endpoint". */
export function formatCount(
  count: number,
  noun: { one: string; other: string },
  locale = getLocale(),
) {
  return `${formatNumber(count, 0, locale)} ${count === 1 ? noun.one : noun.other}`;
}
