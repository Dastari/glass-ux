import { getAsksMessages } from "./messages.js"
import { isWallClock, resolveWallClock } from "../../ui/date-picker/zoned-time.js";

/**
 * Resolve an ISO instant or wall-clock minute in an IANA zone without using the browser's zone.
 * Unlike the date-time field, an ask refuses a wall-clock time that a daylight-saving change
 * skips or repeats: the answer must name one instant without guessing.
 */
export function resolveDateTime(
  value: string,
  timezone: string,
  messages: ReturnType<typeof getAsksMessages> = getAsksMessages(),
): { time: number; error?: never } | { time?: never; error: string } {
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: timezone });
  } catch {
    return { error: messages.theSuppliedTimeZoneIsInvalid };
  }
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(value)) {
    const time = Date.parse(value);
    return Number.isFinite(time)
      ? { time }
      : { error: messages.chooseAValidDateAndTime };
  }
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))
    return { error: messages.chooseBothADateAndTime };
  const resolved = isWallClock(value) ? resolveWallClock(value, timezone) : null;
  if (!resolved) return { error: messages.chooseAValidDateAndTime };
  if (resolved.kind === "gap")
    return {
      error:
        messages.thisTimeDoesNotExistDuringTheDaylightSaving,
    };
  if (resolved.kind === "overlap")
    return {
      error:
        messages.thisTimeOccursTwiceDuringTheDaylightSavingChange,
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
