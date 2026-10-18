/**
 * Column filter builders. Pick the kind from what the value means (docs/data-filters.md §1):
 *
 *   col.accessor("os", { header: "OS", filter: filters.options({ field: "Os", options }) })
 *   col.accessor("cpu", { header: "CPU", filter: { none: "Sparkline of the last 20 minutes" } })
 */
import type {
  BooleanFilterSpec,
  BooleanFilterValue,
  DateFilterValue,
  NumberFilterValue,
  OptionsFilterValue,
  TextFilterValue,
  UuidFilterValue,
  CustomFilterSpec,
  DateFilterSpec,
  DatePresetValue,
  DateRangeOp,
  DateStorage,
  EmptyOp,
  FilterOption,
  NumberFilterSpec,
  NumberOp,
  OptionsFilterSpec,
  OptionsOp,
  TextFilterSpec,
  TextOp,
  UuidFilterSpec,
  UuidOp,
  FilterConditionFn,
  CustomFilterOptions,
} from "./types.js"
import type { OptionSource } from "../../combobox/index.js"

interface Common<V> {
  field: string
  label?: string
  nullable?: boolean
  /** Returns this column's hand-written server condition, or null to send nothing. */
  toCondition?: FilterConditionFn<V>
}

const EMPTY: readonly EmptyOp[] = ["isEmpty", "isNotEmpty"]
const withEmpty = <O extends string>(ops: readonly O[], nullable: boolean) =>
  (nullable ? ops : ops.filter((op) => !(EMPTY as readonly string[]).includes(op))) as O[]

/** Identifiers (serial, hostname, MAC): every StringFilter operator. */
export const TEXT_IDENTIFIER_OPS: readonly TextOp[] = ["contains", "eq", "ne", "startsWith", "endsWith", "in", "notIn", "isEmpty", "isNotEmpty"]
/** Free text (title, notes): contains and emptiness only. */
export const TEXT_FREE_OPS: readonly TextOp[] = ["contains", "isEmpty", "isNotEmpty"]
const NUMBER_OPS: readonly NumberOp[] = ["gt", "gte", "lt", "lte", "eq", "ne", "between", "isEmpty", "isNotEmpty"]
const OPTIONS_OPS: readonly OptionsOp[] = ["in", "notIn", "isEmpty", "isNotEmpty"]
const UUID_OPS: readonly UuidOp[] = ["eq", "ne", "in", "notIn", "isEmpty", "isNotEmpty"]
const DATE_RANGES: readonly (DateRangeOp | EmptyOp)[] = ["before", "after", "between", "isEmpty", "isNotEmpty"]

/** The presets the date editor offers by default (data-filters.md §1). */
export const DEFAULT_DATE_PRESETS: readonly DatePresetValue[] = [
  { op: "today" },
  { op: "last24h" },
  { op: "recent", days: 7 },
  { op: "recent", days: 30 },
  { op: "olderThan", days: 30 },
  { op: "olderThan", days: 90 },
  { op: "future" },
]

/** Builders for column filter specs (`filters.text`, `options`, `number`, `date`, `boolean`, `uuid`, `custom`); each fills defaults such as `nullable: true` and the kind's operators. */
export const filters = {
  /** An identifier or free text, through a StringFilter. */
  text(options: Common<TextFilterValue> & { operators?: readonly TextOp[]; placeholder?: string }): TextFilterSpec {
    const nullable = options.nullable ?? true
    return { kind: "text", ...options, nullable, operators: withEmpty(options.operators ?? TEXT_IDENTIFIER_OPS, nullable) }
  },

  /** A small known set (OS, status, site), static or loaded from the server. */
  options(
    options: Common<OptionsFilterValue> & {
      options?: readonly FilterOption[]
      /** The typed source adapter or asset definition consumed by this component. */
      source?: OptionSource
      server?: OptionsFilterSpec["server"]
      labelOf?: (value: string) => string
      operators?: readonly OptionsOp[]
    }
  ): OptionsFilterSpec {
    const nullable = options.nullable ?? true
    return { kind: "options", ...options, server: options.server ?? "string", nullable, operators: withEmpty(options.operators ?? OPTIONS_OPS, nullable) }
  },

  /** A count, size, duration or percentage, entered in the unit the cell shows. */
  number(
    options: Common<NumberFilterValue> & {
      server: NumberFilterSpec["server"]
      /** Unit displayed with a numeric value. */
      unit?: string
      scale?: number
      /** Lower allowed value. */
      min?: number
      /** Upper value or visible-item limit, as specified by the type. */
      max?: number
      /** Increment used by keyboard and stepper interaction. */
      step?: number
      /** Number of fractional digits displayed. */
      fractionDigits?: number
      operators?: readonly NumberOp[]
    }
  ): NumberFilterSpec {
    const nullable = options.nullable ?? true
    return { kind: "number", ...options, scale: options.scale ?? 1, nullable, operators: withEmpty(options.operators ?? NUMBER_OPS, nullable) }
  },

  /** A point in time: presets first, then before, after and between. */
  date(
    options: Common<DateFilterValue> & {
      storage: DateStorage
      presets?: readonly DatePresetValue[]
      operators?: readonly (DateRangeOp | EmptyOp)[]
    }
  ): DateFilterSpec {
    const nullable = options.nullable ?? true
    const presets = (options.presets ?? DEFAULT_DATE_PRESETS).filter((preset) => options.storage !== "calendar-date" || preset.op !== "last24h")
    return { kind: "date", ...options, presets, nullable, operators: withEmpty(options.operators ?? DATE_RANGES, nullable) }
  },

  /** Yes or no, in the column's own words. */
  boolean(
    options: Common<BooleanFilterValue> & {
      /** Display and accessibility labels supplied by the application. */
      labels: BooleanFilterSpec["labels"]
    }
  ): BooleanFilterSpec {
    return { kind: "boolean", ...options, nullable: options.nullable ?? Boolean(options.labels.empty) }
  },

  /** A UUID reference. Prefer an options filter over an entity list where you can. */
  uuid(
    options: Common<UuidFilterValue> & {
      operators?: readonly UuidOp[]
      labelOf?: (value: string) => string
      placeholder?: string
    }
  ): UuidFilterSpec {
    const nullable = options.nullable ?? true
    return { kind: "uuid", ...options, nullable, operators: withEmpty(options.operators ?? UUID_OPS, nullable) }
  },

  /** Anything else: the column supplies the editor, summary, URL codec and server mapping. */
  custom<V>(spec: CustomFilterOptions<V>): CustomFilterSpec<V> {
    return { kind: "custom", ...spec }
  },
}
