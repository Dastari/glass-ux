/**
 * IANA time zones from the platform (Intl.supportedValuesOf), with their offset and
 * abbreviation now — so "Australia/Hobart" shows "UTC+11:00 · AEDT" in summer and
 * "UTC+10:00 · AEST" in winter. No table to keep up to date.
 */

export interface TimeZoneInfo {
  /** IANA name: "Australia/Hobart". */
  id: string
  /** The city part, readable: "Hobart", "Port Moresby", "Argentina/Buenos Aires" → "Buenos Aires". */
  city: string
  /** The area: "Australia", "Pacific", "America". "UTC" for UTC. */
  area: string
  /** Minutes east of UTC at `at`. */
  offsetMinutes: number
  /** "UTC+11:00" */
  offset: string
  /** The locale's short name when it has a real one ("AEDT"), else undefined. */
  abbreviation?: string
}

/** Every IANA zone the platform knows, plus UTC. */
export function timeZoneIds(): string[] {
  let ids: string[] = []
  try {
    ids = (Intl as unknown as { supportedValuesOf(key: string): string[] }).supportedValuesOf("timeZone")
  } catch {
    ids = []
  }
  return ids.includes("UTC") ? ids : ["UTC", ...ids]
}

/** "UTC+11:00", "UTC−03:30", "UTC" for zero. */
export function formatOffset(minutes: number): string {
  if (minutes === 0) return "UTC"
  const sign = minutes > 0 ? "+" : "−"
  const absolute = Math.abs(minutes)
  return `UTC${sign}${String(Math.floor(absolute / 60)).padStart(2, "0")}:${String(absolute % 60).padStart(2, "0")}`
}

/** Minutes east of UTC for a zone at an instant. */
export function offsetMinutes(id: string, at: Date = new Date()): number {
  try {
    const part = new Intl.DateTimeFormat("en-US", { timeZone: id, timeZoneName: "longOffset" })
      .formatToParts(at)
      .find((entry) => entry.type === "timeZoneName")?.value
    const match = /GMT([+-−])(\d{1,2})(?::(\d{2}))?/.exec(part ?? "")
    if (!match) return 0
    const sign = match[1] === "+" ? 1 : -1
    return sign * (Number(match[2]) * 60 + Number(match[3] ?? 0))
  } catch {
    return 0
  }
}

function abbreviationOf(id: string, at: Date, locale: string): string | undefined {
  try {
    const name = new Intl.DateTimeFormat(locale, { timeZone: id, timeZoneName: "short" })
      .formatToParts(at)
      .find((entry) => entry.type === "timeZoneName")?.value
    // "GMT+11" is the fallback when the locale has no name; it says nothing the offset does not.
    return name && !/^(GMT|UTC)([+-−]|$)/.test(name) ? name : undefined
  } catch {
    return undefined
  }
}

export function describeTimeZone(id: string, options: { at?: Date; locale?: string } = {}): TimeZoneInfo {
  const at = options.at ?? new Date()
  const parts = id.split("/")
  const area = parts.length > 1 ? (parts[0] ?? id) : id
  const city = (parts.at(-1) ?? id).replace(/_/g, " ")
  const minutes = offsetMinutes(id, at)
  return { id, city, area, offsetMinutes: minutes, offset: formatOffset(minutes), abbreviation: abbreviationOf(id, at, options.locale ?? "en-AU") }
}

/** The browser's own zone ("Australia/Hobart"), or UTC. */
export function localTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
  } catch {
    return "UTC"
  }
}

/** True for a zone the platform knows. */
export function isTimeZone(id: string): boolean {
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: id }).resolvedOptions().timeZone !== ""
  } catch {
    return false
  }
}
