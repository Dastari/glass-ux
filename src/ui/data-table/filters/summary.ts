/**
 * The words for filters: operator labels for editors and one-line summaries for chips,
 * the column menu and the Filters list (R2: plain, specific, no filler).
 *
 *   "OS: Windows 11 Pro, macOS 15"  "Memory > 50%"  "Last seen: last 7 days"
 *   "Serial contains "8CC""  "Online"  "Site is empty"
 */
import { formatDateLong, formatDateRange } from "../../date-picker/calendar-date.js"
import { getLocale } from "../../../lib/locale/locale.js"
import { formatAbsolute, formatWithUnit } from "../format.js"
import { isInstantText } from "./semantics.js"
import type {
  BooleanFilterValue,
  DateFilterValue,
  DateOp,
  DatePresetValue,
  FilterSpec,
  NumberFilterSpec,
  NumberFilterValue,
  NumberOp,
  OptionsFilterSpec,
  OptionsFilterValue,
  OptionsOp,
  TextFilterValue,
  TextOp,
  UuidFilterSpec,
  UuidFilterValue,
  UuidOp,
} from "./types.js"

/** List summaries name this many values, then "+N". */
const LIST_SHOWN = 2

export const TEXT_OP_LABELS: Record<TextOp, string> = {
  contains: "Contains",
  eq: "Is",
  ne: "Is not",
  startsWith: "Starts with",
  endsWith: "Ends with",
  in: "Is one of",
  notIn: "Is none of",
  isEmpty: "Is empty",
  isNotEmpty: "Is not empty",
}

export const NUMBER_OP_LABELS: Record<NumberOp, string> = {
  gt: "Greater than",
  gte: "At least",
  lt: "Less than",
  lte: "At most",
  eq: "Equals",
  ne: "Does not equal",
  between: "Between",
  isEmpty: "Is empty",
  isNotEmpty: "Is not empty",
}

const NUMBER_SYMBOLS: Record<Exclude<NumberOp, "between" | "isEmpty" | "isNotEmpty">, string> = {
  gt: ">",
  gte: "≥",
  lt: "<",
  lte: "≤",
  eq: "=",
  ne: "≠",
}

export const OPTIONS_OP_LABELS: Record<OptionsOp, string> = {
  in: "Is any of",
  notIn: "Is none of",
  isEmpty: "Is empty",
  isNotEmpty: "Is not empty",
}

export const UUID_OP_LABELS: Record<UuidOp, string> = {
  eq: "Is",
  ne: "Is not",
  in: "Is one of",
  notIn: "Is none of",
  isEmpty: "Is empty",
  isNotEmpty: "Is not empty",
}

export const DATE_OP_LABELS: Record<Exclude<DateOp, DatePresetValue["op"]>, string> = {
  before: "Before",
  after: "On or after",
  between: "Between",
  isEmpty: "Is empty",
  isNotEmpty: "Is not empty",
}

/** "Today", "Last 7 days", "More than 30 days ago". */
export function presetLabel(preset: DatePresetValue): string {
  switch (preset.op) {
    case "today":
      return "Today"
    case "last24h":
      return "Last 24 hours"
    case "future":
      return "In the future"
    case "recent":
      return preset.days === 1 ? "Today" : `Last ${preset.days} days`
    case "olderThan":
      return preset.days === 1 ? "Before yesterday" : `More than ${preset.days} days ago`
  }
}

function list(values: readonly string[], labelOf: (value: string) => string = (value) => value) {
  const shown = values.slice(0, LIST_SHOWN).map(labelOf).join(", ")
  return values.length > LIST_SHOWN ? `${shown} +${values.length - LIST_SHOWN}` : shown
}

function textSummary(label: string, value: TextFilterValue | UuidFilterValue, labelOf?: (value: string) => string) {
  const name = labelOf ?? ((text: string) => text)
  switch (value.op) {
    case "contains":
      return `${label} contains "${value.value}"`
    case "startsWith":
      return `${label} starts with "${value.value}"`
    case "endsWith":
      return `${label} ends with "${value.value}"`
    case "eq":
      return `${label} is ${name(value.value)}`
    case "ne":
      return `${label} is not ${name(value.value)}`
    case "in":
      return `${label}: ${list(value.values, name)}`
    case "notIn":
      return `${label}: not ${list(value.values, name)}`
    case "isEmpty":
      return `${label} is empty`
    case "isNotEmpty":
      return `${label} is not empty`
  }
}

/** Decimals as entered (at most 2), or the column's fixed digits. */
function digits(value: number, spec: NumberFilterSpec) {
  if (spec.fractionDigits !== undefined) return spec.fractionDigits
  const decimals = String(value).split(".")[1]?.length ?? 0
  return Math.min(decimals, 2)
}

/** A filter bound with the column's unit and fraction digits, in `locale` (default `getLocale()`). */
export const formatFilterNumber = (value: number, spec: NumberFilterSpec, locale = getLocale()) => formatWithUnit(value, spec.unit, digits(value, spec), locale)

function numberSummary(label: string, value: NumberFilterValue, spec: NumberFilterSpec, locale: string) {
  switch (value.op) {
    case "isEmpty":
      return `${label} is empty`
    case "isNotEmpty":
      return `${label} is not empty`
    case "between": {
      const min = formatWithUnit(value.min, undefined, digits(value.min, spec), locale)
      return `${label} ${min}–${formatFilterNumber(value.max, spec, locale)}`
    }
    default:
      return `${label} ${NUMBER_SYMBOLS[value.op]} ${formatFilterNumber(value.value, spec, locale)}`
  }
}

/** A day ("1 Oct 2026") or an instant ("1 Oct 2026, 2:00 pm"), in `locale` (default `getLocale()`). */
export const formatPoint = (text: string, locale = getLocale()) => (isInstantText(text) ? formatAbsolute(text, locale) : formatDateLong(text, locale))

function dateSummary(label: string, value: DateFilterValue, locale: string) {
  switch (value.op) {
    case "isEmpty":
      return `${label} is empty`
    case "isNotEmpty":
      return `${label} is not empty`
    case "before":
      return `${label} before ${formatPoint(value.at, locale)}`
    case "after":
      return `${label} on or after ${formatPoint(value.at, locale)}`
    case "between":
      return isInstantText(value.start)
        ? `${label}: ${formatPoint(value.start, locale)} – ${formatPoint(value.end, locale)}`
        : `${label}: ${formatDateRange(value.start, value.end, locale)}`
    default:
      return `${label}: ${presetLabel(value).toLowerCase()}`
  }
}

function booleanSummary(label: string, value: BooleanFilterValue, labels: { true: string; false: string; empty?: string }) {
  switch (value.op) {
    case "eq":
      return value.value ? labels.true : labels.false
    case "isEmpty":
      return labels.empty ?? `${label} is empty`
    case "isNotEmpty":
      return `${label} is not empty`
  }
}

function optionsSummary(label: string, value: OptionsFilterValue, labelOf: (value: string) => string) {
  switch (value.op) {
    case "in":
      return `${label}: ${list(value.values, labelOf)}`
    case "notIn":
      return `${label}: not ${list(value.values, labelOf)}`
    case "isEmpty":
      return `${label} is empty`
    case "isNotEmpty":
      return `${label} is not empty`
  }
}

/** Name an option value: the static option's label, the column's labelOf, or the value. */
export function optionLabel(spec: OptionsFilterSpec | UuidFilterSpec, value: string, loaded?: ReadonlyMap<string, string>): string {
  if (spec.kind === "options") {
    const option = spec.options?.find((entry) => entry.value === value)
    if (option) return option.label
  }
  return loaded?.get(value) ?? spec.labelOf?.(value) ?? value
}

/** One line for a chip: what the filter selects, in the column's words. Numbers and dates use `locale` (default `getLocale()`). */
export function summarize(spec: FilterSpec, label: string, value: unknown, loaded?: ReadonlyMap<string, string>, locale = getLocale()): string {
  switch (spec.kind) {
    case "text":
      return textSummary(label, value as TextFilterValue)
    case "number":
      return numberSummary(label, value as NumberFilterValue, spec, locale)
    case "date":
      return dateSummary(label, value as DateFilterValue, locale)
    case "boolean":
      return booleanSummary(label, value as BooleanFilterValue, spec.labels)
    case "options":
      return optionsSummary(label, value as OptionsFilterValue, (entry) => optionLabel(spec, entry, loaded))
    case "uuid":
      return textSummary(label, value as UuidFilterValue, (entry) => optionLabel(spec, entry, loaded))
    case "custom":
      return spec.summary(value, label)
  }
}
