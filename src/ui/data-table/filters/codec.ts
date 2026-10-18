/**
 * Filters in the URL (R6.2, R16.7): one search param per column, `f.<columnId>=<value>`.
 *
 *   text      contains:8CC · eq:NST-C106 · startsWith:ORB · in:8CC0481GWV,5CG2101XYZ · isEmpty
 *   number    gt:50 · between:20..80 · isNotEmpty                (in the unit the cell shows)
 *   date      today · last24h · recent:7 · olderThan:30 · future · before:2026-10-01
 *             after:2026-10-01 · between:2026-10-01..2026-10-13
 *   boolean   true · false · isEmpty
 *   options   in:Windows 11 Pro,macOS 15 · notIn:Windows 10 Pro · isEmpty
 *   uuid      eq:<uuid> · in:<uuid>,<uuid>
 *   custom    the column's own encode / decode
 *
 * Lists separate values with commas; a comma or backslash inside a value is escaped with a
 * backslash. Relative presets stay relative, so a shared "last 7 days" keeps rolling.
 * Decoding validates against the column: an operator it does not offer, a malformed value
 * or a value outside its bounds drops the filter.
 */
import { compareIso, isIsoDate } from "../../date-picker/calendar-date.js"
import { instantOf, isInstantText } from "./semantics.js"
import type {
  BooleanFilterValue,
  DateFilterSpec,
  DateFilterValue,
  FilterSpec,
  NumberFilterSpec,
  NumberFilterValue,
  OptionsFilterSpec,
  OptionsFilterValue,
  TextFilterSpec,
  TextFilterValue,
  UuidFilterSpec,
  UuidFilterValue,
} from "./types.js"

/** Most values a list filter keeps (the rest of a giant paste is dropped). */
export const MAX_LIST_VALUES = 500
/**
 * Default longest relative-day span a filter accepts (about a century). Hosts whose server
 * allows less set `configureDataTables({ maxRelativeDays })`.
 */
export const MAX_DAYS = 36_600
let maxRelativeDays = MAX_DAYS

/** The longest relative-day span a filter accepts now (`configureDataTables`). */
export function relativeDayLimit() {
  return maxRelativeDays
}

/** Set the relative-day limit; a missing or invalid value restores the default. */
export function setRelativeDayLimit(days: number | undefined) {
  maxRelativeDays = days !== undefined && Number.isInteger(days) && days > 0 ? days : MAX_DAYS
}

export function encodeList(values: readonly string[]) {
  return values.map((value) => value.replaceAll("\\", "\\\\").replaceAll(",", "\\,")).join(",")
}

export function decodeList(text: string): string[] {
  const values: string[] = []
  let current = ""
  for (let index = 0; index < text.length; index++) {
    const char = text[index]
    if (char === "\\" && index + 1 < text.length) {
      current += text[index + 1]
      index++
    } else if (char === ",") {
      values.push(current)
      current = ""
    } else {
      current += char
    }
  }
  values.push(current)
  return [...new Set(values.filter((value) => value !== ""))].slice(0, MAX_LIST_VALUES)
}

/** Search params arrive as strings, or as numbers and booleans when the router parsed JSON. */
function asText(raw: unknown): string | null {
  if (typeof raw === "string") return raw
  if (typeof raw === "number" || typeof raw === "boolean") return String(raw)
  return null
}

function split(text: string): [string, string | null] {
  const at = text.indexOf(":")
  return at === -1 ? [text, null] : [text.slice(0, at), text.slice(at + 1)]
}

const finite = (text: string | undefined) => {
  if (text === undefined || text.trim() === "") return null
  const number = Number(text)
  return Number.isFinite(number) ? number : null
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/* ── Encode ──────────────────────────────────────────────────────────────────── */

export function encodeFilter(spec: FilterSpec, value: unknown): string {
  if (spec.kind === "custom") return spec.encode(value)
  const filter = value as { op: string; value?: unknown; values?: string[]; min?: number; max?: number; days?: number; at?: string; start?: string; end?: string }
  switch (filter.op) {
    case "isEmpty":
    case "isNotEmpty":
    case "today":
    case "last24h":
    case "future":
      return filter.op
    case "recent":
    case "olderThan":
      return `${filter.op}:${filter.days}`
    case "before":
    case "after":
      return `${filter.op}:${filter.at}`
    case "in":
    case "notIn":
      return `${filter.op}:${encodeList(filter.values ?? [])}`
  }
  if (spec.kind === "boolean") return String(filter.value)
  if (filter.op === "between") return spec.kind === "number" ? `between:${filter.min}..${filter.max}` : `between:${filter.start}..${filter.end}`
  return `${filter.op}:${String(filter.value)}`
}

/* ── Decode ──────────────────────────────────────────────────────────────────── */

function decodeText(op: string, rest: string | null, spec: TextFilterSpec): TextFilterValue | null {
  if (!(spec.operators as readonly string[]).includes(op)) return null
  if (op === "isEmpty" || op === "isNotEmpty") return rest === null ? { op } : null
  if (rest === null) return null
  if (op === "in" || op === "notIn") {
    const values = decodeList(rest)
    return values.length ? { op, values } : null
  }
  return rest.trim() === "" ? null : { op: op as "contains", value: rest }
}

function inBounds(value: number, spec: NumberFilterSpec) {
  return (spec.min === undefined || value >= spec.min) && (spec.max === undefined || value <= spec.max)
}

function decodeNumber(op: string, rest: string | null, spec: NumberFilterSpec): NumberFilterValue | null {
  if (!(spec.operators as readonly string[]).includes(op)) return null
  if (op === "isEmpty" || op === "isNotEmpty") return rest === null ? { op } : null
  if (rest === null) return null
  if (op === "between") {
    const [minText, maxText, extra] = rest.split("..")
    const min = finite(minText)
    const max = finite(maxText)
    if (extra !== undefined || min === null || max === null || min > max || !inBounds(min, spec) || !inBounds(max, spec)) return null
    return { op, min, max }
  }
  const number = finite(rest)
  return number === null || !inBounds(number, spec) ? null : { op: op as "gt", value: number }
}

/** A day, or an RFC 3339 instant where the column stores times. */
function validPoint(text: string, spec: DateFilterSpec) {
  if (isIsoDate(text)) return true
  return spec.storage !== "calendar-date" && isInstantText(text) && !Number.isNaN(instantOf(text))
}

function decodeDate(op: string, rest: string | null, spec: DateFilterSpec): DateFilterValue | null {
  switch (op) {
    case "today":
    case "future":
      return rest === null ? { op } : null
    case "last24h":
      return rest === null && spec.storage !== "calendar-date" ? { op } : null
    case "recent":
    case "olderThan": {
      const days = finite(rest ?? undefined)
      return days !== null && Number.isInteger(days) && days >= 1 && days <= maxRelativeDays ? { op, days } : null
    }
  }
  if (!(spec.operators as readonly string[]).includes(op)) return null
  if (op === "isEmpty" || op === "isNotEmpty") return rest === null ? { op } : null
  if (rest === null) return null
  if (op === "before" || op === "after") return validPoint(rest, spec) ? { op, at: rest } : null
  if (op === "between") {
    const [start, end, extra] = rest.split("..")
    if (extra !== undefined || !start || !end || !validPoint(start, spec) || !validPoint(end, spec)) return null
    if (isInstantText(start) !== isInstantText(end)) return null
    const ordered = isInstantText(start) ? instantOf(start) <= instantOf(end) : compareIso(start, end) <= 0
    return ordered ? { op, start, end } : null
  }
  return null
}

function decodeBoolean(text: string, spec: FilterSpec & { kind: "boolean" }): BooleanFilterValue | null {
  if (text === "true" || text === "false") return { op: "eq", value: text === "true" }
  if ((text === "isEmpty" || text === "isNotEmpty") && spec.nullable) return { op: text }
  return null
}

function decodeOptions(op: string, rest: string | null, spec: OptionsFilterSpec): OptionsFilterValue | null {
  if (!(spec.operators as readonly string[]).includes(op)) return null
  if (op === "isEmpty" || op === "isNotEmpty") return rest === null ? { op } : null
  if (rest === null) return null
  let values = decodeList(rest)
  // A closed set drops values it does not offer; a server-loaded set cannot tell yet.
  if (spec.options && !spec.source) {
    const known = new Set(spec.options.map((option) => option.value))
    values = values.filter((value) => known.has(value))
  }
  if (spec.server === "int") values = values.filter((value) => /^-?\d+$/.test(value))
  if (spec.server === "decimal") values = values.filter((value) => finite(value) !== null)
  if (spec.server === "uuid") values = values.filter((value) => UUID.test(value))
  return values.length ? { op: op as "in", values } : null
}

function decodeUuid(op: string, rest: string | null, spec: UuidFilterSpec): UuidFilterValue | null {
  if (!(spec.operators as readonly string[]).includes(op)) return null
  if (op === "isEmpty" || op === "isNotEmpty") return rest === null ? { op } : null
  if (rest === null) return null
  if (op === "in" || op === "notIn") {
    const values = decodeList(rest).filter((value) => UUID.test(value))
    return values.length ? { op, values } : null
  }
  return UUID.test(rest) ? { op: op as "eq", value: rest } : null
}

/** Read one column's filter from a search param. Anything invalid returns null (dropped). */
export function decodeFilter(spec: FilterSpec, raw: unknown): unknown {
  const text = asText(raw)
  if (text === null || text === "") return null
  if (spec.kind === "custom") {
    try {
      return spec.decode(text) ?? null
    } catch {
      return null
    }
  }
  if (spec.kind === "boolean") return decodeBoolean(text, spec)
  const [op, rest] = split(text)
  switch (spec.kind) {
    case "text":
      return decodeText(op, rest, spec)
    case "number":
      return decodeNumber(op, rest, spec)
    case "date":
      return decodeDate(op, rest, spec)
    case "options":
      return decodeOptions(op, rest, spec)
    case "uuid":
      return decodeUuid(op, rest, spec)
  }
}

/** Is this a complete, valid value for the column? (Round-trips through the codec.) */
export function isValidFilter(spec: FilterSpec, value: unknown): boolean {
  if (value === undefined || value === null) return false
  try {
    return decodeFilter(spec, encodeFilter(spec, value)) !== null
  } catch {
    return false
  }
}
