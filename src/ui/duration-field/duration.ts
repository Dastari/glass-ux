/**
 * Durations as people write them, to and from whole seconds.
 *
 *   parseDuration("1h 30m")      → 5400
 *   parseDuration("1:30")        → 5400 (hours:minutes; "1:30:15" adds seconds)
 *   parseDuration("1.5h")        → 5400
 *   parseDuration("90")          → 5400 with defaultUnit "m"
 *   parseDuration("2 days 4 hrs")→ 187200
 *   formatDuration(5400)         → "1h 30m"
 */

export type DurationUnit = "w" | "d" | "h" | "m" | "s"

export const UNIT_SECONDS: Readonly<Record<DurationUnit, number>> = { w: 604800, d: 86400, h: 3600, m: 60, s: 1 }
const ORDER: DurationUnit[] = ["w", "d", "h", "m", "s"]

const ALIASES: ReadonlyArray<[RegExp, DurationUnit]> = [
  [/^(w|wk|wks|week|weeks)$/, "w"],
  [/^(d|day|days)$/, "d"],
  [/^(h|hr|hrs|hour|hours)$/, "h"],
  [/^(m|min|mins|minute|minutes)$/, "m"],
  [/^(s|sec|secs|second|seconds)$/, "s"],
]

const unitOf = (word: string): DurationUnit | null => {
  const lower = word.toLowerCase()
  return ALIASES.find(([pattern]) => pattern.test(lower))?.[1] ?? null
}

export interface DurationParseOptions {
  /** The unit of a bare number ("90" → 90 minutes). Default "m". */
  defaultUnit?: DurationUnit
}

/** Seconds, or null when the text is not a duration. Fractions round to the nearest second. */
export function parseDuration(text: string, options: DurationParseOptions = {}): number | null {
  const source = text.trim().toLowerCase().replace(/,/g, " ").replace(/\band\b/g, " ")
  if (!source) return null
  // h:mm or h:mm:ss
  const clock = /^(\d+):([0-5]?\d)(?::([0-5]?\d))?$/.exec(source)
  if (clock) return Number(clock[1]) * 3600 + Number(clock[2]) * 60 + Number(clock[3] ?? 0)
  // A bare number in the default unit.
  if (/^\d+(\.\d+)?$/.test(source)) return Math.round(Number(source) * UNIT_SECONDS[options.defaultUnit ?? "m"])
  // Number–unit pairs: "1h30m", "1 h 30 m", "1.5 hours", "2d 4h".
  const pair = /(\d+(?:\.\d+)?)\s*([a-z]+)/g
  let total = 0
  let consumed = ""
  const seen = new Set<DurationUnit>()
  for (let match = pair.exec(source); match; match = pair.exec(source)) {
    const unit = unitOf(match[2] ?? "")
    if (!unit || seen.has(unit)) return null
    seen.add(unit)
    total += Number(match[1]) * UNIT_SECONDS[unit]
    consumed += match[0]
  }
  // Every character must belong to a pair ("1h foo" is not a duration).
  if (!seen.size || consumed.replace(/\s/g, "") !== source.replace(/\s/g, "")) return null
  return Math.round(total)
}

export interface DurationFormatOptions {
  /** Units to write, largest first. Default: weeks are not used; d, h, m and s are. */
  units?: readonly DurationUnit[]
  /** "short" (default) "1h 30m"; "long" "1 hour 30 minutes". */
  style?: "short" | "long"
}

const LONG: Readonly<Record<DurationUnit, [string, string]>> = {
  w: ["week", "weeks"],
  d: ["day", "days"],
  h: ["hour", "hours"],
  m: ["minute", "minutes"],
  s: ["second", "seconds"],
}

/** "1h 30m"; 0 → "0m" (the smallest unit allowed). Seconds below the smallest unit round. */
export function formatDuration(seconds: number, options: DurationFormatOptions = {}): string {
  const units = ORDER.filter((unit) => (options.units ?? ["d", "h", "m", "s"]).includes(unit))
  const smallest = units.at(-1) ?? "s"
  let rest = Math.round(Math.abs(seconds) / UNIT_SECONDS[smallest]) * UNIT_SECONDS[smallest]
  const parts: string[] = []
  for (const unit of units) {
    const amount = Math.floor(rest / UNIT_SECONDS[unit])
    rest -= amount * UNIT_SECONDS[unit]
    if (amount) parts.push(options.style === "long" ? `${amount} ${LONG[unit][amount === 1 ? 0 : 1]}` : `${amount}${unit}`)
  }
  if (!parts.length) parts.push(options.style === "long" ? `0 ${LONG[smallest][1]}` : `0${smallest}`)
  return (seconds < 0 ? "−" : "") + parts.join(" ")
}
