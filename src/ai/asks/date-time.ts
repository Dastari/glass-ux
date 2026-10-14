/** Resolve an ISO instant or wall-clock minute in an IANA zone without using the browser's zone. */
export function resolveDateTime(
  value: string,
  timezone: string,
): { time: number; error?: never } | { time?: never; error: string } {
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
  } catch {
    return { error: "The supplied time zone is invalid" };
  }
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(value)) {
    const time = Date.parse(value);
    return Number.isFinite(time)
      ? { time }
      : { error: "Choose a valid date and time" };
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return { error: "Choose both a date and time" };
  const [, year, month, day, hour, minute] = match.map(Number);
  const wall = Date.UTC(year!, month! - 1, day!, hour!, minute!);
  const date = new Date(wall);
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day ||
    date.getUTCHours() !== hour ||
    date.getUTCMinutes() !== minute
  )
    return { error: "Choose a valid date and time" };
  const wallAt = (time: number) => {
    const parts = Object.fromEntries(
      formatter.formatToParts(time).map((part) => [part.type, part.value]),
    );
    return Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
    );
  };
  // Adjacent days supply both offsets around DST changes, including half-hour transitions.
  const offsets = new Set(
    [-2, -1, 0, 1, 2].map((dayOffset) => {
      const instant = wall + dayOffset * 86_400_000;
      return wallAt(instant) - instant;
    }),
  );
  const matches = [...offsets]
    .map((offset) => wall - offset)
    .filter((time) => wallAt(time) === wall);
  if (matches.length === 0)
    return {
      error:
        "This time does not exist during the daylight-saving change; choose another time",
    };
  if (matches.length > 1)
    return {
      error:
        "This time occurs twice during the daylight-saving change; choose an unambiguous time",
    };
  return { time: matches[0]! };
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
