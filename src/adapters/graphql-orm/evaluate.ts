/**
 * Evaluate a graphql-orm `Where` input against a plain record, in memory, with the
 * server's semantics: a mock server for the gallery and tests, and the reference the
 * filter parity tests check `matches` against.
 *
 * - Every operator set on one field must hold; `And`, `Or` and `Not` combine entries.
 * - SQL NULL: a null or missing value fails every comparison (including `Ne` and
 *   `NotIn`); only `IsNull: true` selects it.
 * - `Contains`, `StartsWith`, `EndsWith` and `Similar` ignore case; `Eq`, `Ne`, `InList`
 *   and `NotIn` are exact.
 * - Date text compares as text (as the database does); calendar predicates (`IsToday`,
 *   `RecentDays`, `*Relative`, `InPast`, `InFuture`) use `today`.
 */
import { addDays, toIsoDate } from "../../ui/date-picker/calendar-date.js"
import type { WhereInput } from "./where.js"

export interface EvaluateOptions {
  /** The database's calendar day for calendar predicates (`2026-10-13`). Default: the local day. */
  today?: string
}

type Scalar = string | number | boolean
const isNull = (value: unknown) => value === null || value === undefined

/** Compare a stored value with a filter value: numbers numerically (a Decimal may arrive as text), text as text. */
function order(stored: unknown, operand: unknown): number | null {
  if (typeof stored === "number") {
    const number = typeof operand === "number" ? operand : Number(operand)
    if (Number.isNaN(number)) return null
    return stored === number ? 0 : stored < number ? -1 : 1
  }
  if (typeof stored === "string" && typeof operand === "string") return stored === operand ? 0 : stored < operand ? -1 : 1
  if (typeof stored === "boolean" && typeof operand === "boolean") return stored === operand ? 0 : stored ? 1 : -1
  return null
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Equal as the database compares: UUIDs are values, so their letter case does not matter. */
function equal(stored: unknown, operand: unknown) {
  if (typeof stored === "string" && typeof operand === "string" && UUID.test(stored) && UUID.test(operand)) return stored.toLowerCase() === operand.toLowerCase()
  return order(stored, operand) === 0
}

const lower = (value: unknown) => String(value).toLowerCase()

function calendarDay(value: unknown): string | null {
  if (value instanceof Date) return toIsoDate(value)
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10)
  return null
}

function fieldMatches(stored: unknown, filter: Record<string, unknown>, today: string): boolean {
  // A list column (a mailbox's licences): InList holds when any element is listed, NotIn when
  // none is, IsNull when it is empty (the overlap semantics a backend list filter needs).
  if (Array.isArray(stored)) {
    const listed = (entries: unknown) => stored.some((value) => (entries as Scalar[]).some((entry) => equal(value, entry)))
    for (const [op, operand] of Object.entries(filter)) {
      if (operand === undefined) continue
      if (op === "IsNull" && Boolean(operand) !== (stored.length === 0)) return false
      if (op === "InList" && !listed(operand)) return false
      if (op === "NotIn" && listed(operand)) return false
      if (op === "Eq" && !listed([operand])) return false
      if (op === "Ne" && listed([operand])) return false
    }
    return true
  }
  for (const [op, operand] of Object.entries(filter)) {
    if (operand === undefined) continue
    if (op === "IsNull") {
      if (Boolean(operand) !== isNull(stored)) return false
      continue
    }
    if (isNull(stored)) return false
    switch (op) {
      case "Eq":
        if (!equal(stored, operand)) return false
        break
      case "Ne":
        if (equal(stored, operand)) return false
        break
      case "Gt":
      case "Gte":
      case "Lt":
      case "Lte": {
        const result = order(stored, operand)
        if (result === null) return false
        if (op === "Gt" && !(result > 0)) return false
        if (op === "Gte" && !(result >= 0)) return false
        if (op === "Lt" && !(result < 0)) return false
        if (op === "Lte" && !(result <= 0)) return false
        break
      }
      case "Contains":
        if (!lower(stored).includes(lower(operand))) return false
        break
      case "StartsWith":
        if (!lower(stored).startsWith(lower(operand))) return false
        break
      case "EndsWith":
        if (!lower(stored).endsWith(lower(operand))) return false
        break
      case "Similar":
        if (!lower(stored).includes(lower((operand as { Value?: string }).Value ?? ""))) return false
        break
      case "InList":
        if (!(operand as Scalar[]).some((entry) => equal(stored, entry))) return false
        break
      case "NotIn":
        if ((operand as Scalar[]).some((entry) => equal(stored, entry))) return false
        break
      case "Between": {
        const { Start, End } = operand as { Start: string; End: string }
        const low = order(stored, Start)
        const high = order(stored, End)
        if (low === null || high === null || low < 0 || high > 0) return false
        break
      }
      default: {
        const day = calendarDay(stored)
        if (day === null) return false
        const tomorrow = addDays(today, 1)
        if (op === "IsToday" && operand && !(day >= today && day < tomorrow)) return false
        if (op === "InPast" && operand && !(day < today)) return false
        if (op === "InFuture" && operand && !(day >= tomorrow)) return false
        if (op === "RecentDays" && !(day >= addDays(today, -((operand as number) - 1)) && day < tomorrow)) return false
        if (op === "WithinDays" && !(day >= today && day < addDays(today, operand as number))) return false
        if (op === "GteRelative" && !(day >= addDays(today, (operand as { Days: number }).Days))) return false
        if (op === "LteRelative" && !(day < addDays(today, (operand as { Days: number }).Days + 1))) return false
      }
    }
  }
  return true
}

/** Does `record` (keyed by Where field names) satisfy `where`? An empty or missing Where matches. */
export function evaluateWhere(where: WhereInput | undefined | null, record: Record<string, unknown>, options: EvaluateOptions = {}): boolean {
  if (!where) return true
  const today = options.today ?? toIsoDate(new Date())
  for (const [key, operand] of Object.entries(where)) {
    if (operand === undefined || operand === null) continue
    if (key === "And") {
      if (!(operand as WhereInput[]).every((entry) => evaluateWhere(entry, record, { today }))) return false
    } else if (key === "Or") {
      if (!(operand as WhereInput[]).some((entry) => evaluateWhere(entry, record, { today }))) return false
    } else if (key === "Not") {
      if (evaluateWhere(operand as WhereInput, record, { today })) return false
    } else if (!fieldMatches(record[key], operand as Record<string, unknown>, today)) {
      return false
    }
  }
  return true
}
