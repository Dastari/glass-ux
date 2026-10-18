/**
 * Formatting for table cells and the status bar (R2.6, R2.7): Australian English, tabular
 * numbers, a thin space before units, relative times when recent.
 */

/** U+2009 THIN SPACE, between a number and its unit (`7.8 GB`). */
export const THIN_SPACE = "\u2009";

const integer = new Intl.NumberFormat("en-AU", { maximumFractionDigits: 0 });
const decimals = new Map<number, Intl.NumberFormat>();

/** Formats a number in Australian English with exactly `fractionDigits` decimals (default 0, which rounds to a whole number). */
export function formatNumber(value: number, fractionDigits = 0) {
  if (fractionDigits === 0) return integer.format(value);
  let format = decimals.get(fractionDigits);
  if (!format) {
    format = new Intl.NumberFormat("en-AU", {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
    decimals.set(fractionDigits, format);
  }
  return format.format(value);
}

/** Formats a number with its unit after a thin space (`7.8 GB`), or directly after it for `%`; without a unit, the number alone. */
export function formatWithUnit(
  value: number,
  unit?: string,
  fractionDigits = 0,
) {
  const number = formatNumber(value, fractionDigits);
  if (!unit) return number;
  return unit === "%" ? `${number}%` : `${number}${THIN_SPACE}${unit}`;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const dayMonth = new Intl.DateTimeFormat("en-AU", {
  day: "numeric",
  month: "short",
});
const dayMonthYear = new Intl.DateTimeFormat("en-AU", {
  day: "numeric",
  month: "short",
  year: "numeric",
});
const absolute = new Intl.DateTimeFormat("en-AU", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function toTime(value: Date | number | string) {
  return value instanceof Date
    ? value.getTime()
    : typeof value === "number"
      ? value
      : Date.parse(value);
}

/** "just now", "2 min ago", "3 h ago", "2 days ago", then a date. */
export function formatRelative(value: Date | number | string, now: number) {
  const time = toTime(value);
  const delta = now - time;
  if (Number.isNaN(time)) return "—";
  if (delta < 0) {
    const ahead = -delta;
    if (ahead < MINUTE) return "in less than a minute";
    if (ahead < HOUR) return `in ${Math.ceil(ahead / MINUTE)} min`;
    if (ahead < DAY) return `in ${Math.ceil(ahead / HOUR)} h`;
    const days = Math.ceil(ahead / DAY);
    return `in ${days} ${days === 1 ? "day" : "days"}`;
  }
  if (delta < MINUTE) return "just now";
  if (delta < HOUR) return `${Math.floor(delta / MINUTE)} min ago`;
  if (delta < DAY) return `${Math.floor(delta / HOUR)} h ago`;
  const days = Math.floor(delta / DAY);
  if (days < 7) return days === 1 ? "yesterday" : `${days} days ago`;
  const date = new Date(time);
  return date.getFullYear() === new Date(now).getFullYear()
    ? dayMonth.format(date)
    : dayMonthYear.format(date);
}

/** Full timestamp for hover titles: "13 Oct 2026, 11:24 am". */
export function formatAbsolute(value: Date | number | string) {
  const time = toTime(value);
  return Number.isNaN(time) ? "" : absolute.format(new Date(time));
}

/** "1,284 endpoints" / "1 endpoint". */
export function formatCount(
  count: number,
  noun: { one: string; other: string },
) {
  return `${formatNumber(count)} ${count === 1 ? noun.one : noun.other}`;
}
