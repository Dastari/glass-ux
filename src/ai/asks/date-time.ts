import { isWallClock, resolveWallClock } from "../../ui/date-picker/zoned-time.js";

/**
 * Resolve an ISO instant or wall-clock minute in an IANA zone without using the browser's zone.
 * Unlike the date-time field, an ask refuses a wall-clock time that a daylight-saving change
 * skips or repeats: the answer must name one instant without guessing.
 */
export function resolveDateTime(
  value: string,
  timezone: string,
): { time: number; error?: never } | { time?: never; error: string } {
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: timezone });
  } catch {
    return { error: "The supplied time zone is invalid" };
  }
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(value)) {
    const time = Date.parse(value);
    return Number.isFinite(time)
      ? { time }
      : { error: "Choose a valid date and time" };
  }
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))
    return { error: "Choose both a date and time" };
  const resolved = isWallClock(value) ? resolveWallClock(value, timezone) : null;
  if (!resolved) return { error: "Choose a valid date and time" };
  if (resolved.kind === "gap")
    return {
      error:
        "This time does not exist during the daylight-saving change; choose another time",
    };
  if (resolved.kind === "overlap")
    return {
      error:
        "This time occurs twice during the daylight-saving change; choose an unambiguous time",
    };
  return { time: resolved.epochMs };
}

/** Calendar day for the date control, in the ask's zone. */
export function dateInTimezone(
  time: number,
  timezone: string,
): string | undefined {
  try {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
        .formatToParts(time)
        .map((part) => [part.type, part.value]),
    );
    return `${parts.year}-${parts.month}-${parts.day}`;
  } catch {
    return undefined;
  }
}
