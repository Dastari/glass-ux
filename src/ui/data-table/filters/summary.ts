import {
  dataTableMessages,
  resolveDataTableMessages,
  type DataTableMessages,
} from "../messages.js";
/**
 * The words for filters: operator labels for editors and one-line summaries for chips,
 * the column menu and the Filters list (R2: plain, specific, no filler).
 *
 *   "OS: Windows 11 Pro, macOS 15"  "Memory > 50%"  "Last seen: last 7 days"
 *   "Serial contains "8CC""  "Online"  "Site is empty"
 */
import {
  formatDateLong,
  formatDateRange,
} from "../../date-picker/calendar-date.js";
import { getLocale } from "../../../lib/locale/locale.js";
import { formatAbsolute, formatWithUnit } from "../format.js";
import { isInstantText } from "./semantics.js";
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
} from "./types.js";

/** List summaries name this many values, then "+N". */
const LIST_SHOWN = 2;

/** Operator labels in the table's resolved language. */
export function operatorLabels(m: DataTableMessages) {
  const TEXT_OP_LABELS: Record<TextOp, string> = {
    contains: m.contains,
    eq: m.is,
    ne: m.isNot,
    startsWith: m.startsWith,
    endsWith: m.endsWith,
    in: m.isOneOf,
    notIn: m.isNoneOf,
    isEmpty: m.isEmpty,
    isNotEmpty: m.isNotEmpty,
  };

  const NUMBER_OP_LABELS: Record<NumberOp, string> = {
    gt: m.greaterThan,
    gte: m.atLeast,
    lt: m.lessThan,
    lte: m.atMost,
    eq: m.equals,
    ne: m.notEqual,
    between: m.between,
    isEmpty: m.isEmpty,
    isNotEmpty: m.isNotEmpty,
  };

  const OPTIONS_OP_LABELS: Record<OptionsOp, string> = {
    in: m.isAnyOf,
    notIn: m.isNoneOf,
    isEmpty: m.isEmpty,
    isNotEmpty: m.isNotEmpty,
  };

  const UUID_OP_LABELS: Record<UuidOp, string> = {
    eq: m.is,
    ne: m.isNot,
    in: m.isOneOf,
    notIn: m.isNoneOf,
    isEmpty: m.isEmpty,
    isNotEmpty: m.isNotEmpty,
  };

  const DATE_OP_LABELS: Record<
    Exclude<DateOp, DatePresetValue["op"]>,
    string
  > = {
    before: m.before,
    after: m.onOrAfter,
    between: m.between,
    isEmpty: m.isEmpty,
    isNotEmpty: m.isNotEmpty,
  };

  return {
    text: TEXT_OP_LABELS,
    number: NUMBER_OP_LABELS,
    options: OPTIONS_OP_LABELS,
    uuid: UUID_OP_LABELS,
    date: DATE_OP_LABELS,
  };
}
const englishOperators = operatorLabels(dataTableMessages.defaults);
export const TEXT_OP_LABELS = englishOperators.text;
export const NUMBER_OP_LABELS = englishOperators.number;
export const OPTIONS_OP_LABELS = englishOperators.options;
export const UUID_OP_LABELS = englishOperators.uuid;
export const DATE_OP_LABELS = englishOperators.date;
const NUMBER_SYMBOLS: Record<
  Exclude<NumberOp, "between" | "isEmpty" | "isNotEmpty">,
  string
> = {
  gt: ">",
  gte: "≥",
  lt: "<",
  lte: "≤",
  eq: "=",
  ne: "≠",
};

/** m.today, "Last 7 days", "More than 30 days ago". */
export function presetLabel(
  preset: DatePresetValue,
  m = resolveDataTableMessages(getLocale()),
): string {
  switch (preset.op) {
    case "today":
      return m.today;
    case "last24h":
      return m.lastDay;
    case "future":
      return m.future;
    case "recent":
      return preset.days === 1 ? m.today : m.recentDays(preset.days);
    case "olderThan":
      return preset.days === 1 ? m.beforeYesterday : m.olderDays(preset.days);
  }
}

function list(
  values: readonly string[],
  labelOf: (value: string) => string = (value) => value,
) {
  const shown = values.slice(0, LIST_SHOWN).map(labelOf).join(", ");
  return values.length > LIST_SHOWN
    ? `${shown} +${values.length - LIST_SHOWN}`
    : shown;
}

function textSummary(
  label: string,
  value: TextFilterValue | UuidFilterValue,
  labelOf: ((value: string) => string) | undefined,
  m: DataTableMessages,
) {
  const name = labelOf ?? ((text: string) => text);
  switch (value.op) {
    case "contains":
      return m.summaryContains(label, value.value);
    case "startsWith":
      return m.summaryStartsWith(label, value.value);
    case "endsWith":
      return m.summaryEndsWith(label, value.value);
    case "eq":
      return m.summaryIs(label, name(value.value));
    case "ne":
      return m.summaryIsNot(label, name(value.value));
    case "in":
      return `${label}: ${list(value.values, name)}`;
    case "notIn":
      return m.summaryNotIn(label, list(value.values, name));
    case "isEmpty":
      return m.summaryEmpty(label);
    case "isNotEmpty":
      return m.summaryNotEmpty(label);
  }
}

/** Decimals as entered (at most 2), or the column's fixed digits. */
function digits(value: number, spec: NumberFilterSpec) {
  if (spec.fractionDigits !== undefined) return spec.fractionDigits;
  const decimals = String(value).split(".")[1]?.length ?? 0;
  return Math.min(decimals, 2);
}

/** A filter bound with the column's unit and fraction digits, in `locale` (default `getLocale()`). */
export const formatFilterNumber = (
  value: number,
  spec: NumberFilterSpec,
  locale = getLocale(),
) => formatWithUnit(value, spec.unit, digits(value, spec), locale);

function numberSummary(
  label: string,
  value: NumberFilterValue,
  spec: NumberFilterSpec,
  locale: string,
  m: DataTableMessages,
) {
  switch (value.op) {
    case "isEmpty":
      return m.summaryEmpty(label);
    case "isNotEmpty":
      return m.summaryNotEmpty(label);
    case "between": {
      const min = formatWithUnit(
        value.min,
        undefined,
        digits(value.min, spec),
        locale,
      );
      return `${label} ${min}–${formatFilterNumber(value.max, spec, locale)}`;
    }
    default:
      return `${label} ${NUMBER_SYMBOLS[value.op]} ${formatFilterNumber(value.value, spec, locale)}`;
  }
}

/** A day ("1 Oct 2026") or an instant ("1 Oct 2026, 2:00 pm"), in `locale` (default `getLocale()`). */
export const formatPoint = (text: string, locale = getLocale()) =>
  isInstantText(text)
    ? formatAbsolute(text, locale)
    : formatDateLong(text, locale);

function dateSummary(
  label: string,
  value: DateFilterValue,
  locale: string,
  m: DataTableMessages,
) {
  switch (value.op) {
    case "isEmpty":
      return m.summaryEmpty(label);
    case "isNotEmpty":
      return m.summaryNotEmpty(label);
    case "before":
      return m.summaryBefore(label, formatPoint(value.at, locale));
    case "after":
      return m.summaryAfter(label, formatPoint(value.at, locale));
    case "between":
      return isInstantText(value.start)
        ? `${label}: ${formatPoint(value.start, locale)} – ${formatPoint(value.end, locale)}`
        : `${label}: ${formatDateRange(value.start, value.end, locale)}`;
    default:
      return `${label}: ${presetLabel(value, m).toLowerCase()}`;
  }
}

function booleanSummary(
  label: string,
  value: BooleanFilterValue,
  labels: { true: string; false: string; empty?: string },
  m: DataTableMessages,
) {
  switch (value.op) {
    case "eq":
      return value.value ? labels.true : labels.false;
    case "isEmpty":
      return labels.empty ?? m.summaryEmpty(label);
    case "isNotEmpty":
      return m.summaryNotEmpty(label);
  }
}

function optionsSummary(
  label: string,
  value: OptionsFilterValue,
  labelOf: (value: string) => string,
  m: DataTableMessages,
) {
  switch (value.op) {
    case "in":
      return `${label}: ${list(value.values, labelOf)}`;
    case "notIn":
      return m.summaryNotIn(label, list(value.values, labelOf));
    case "isEmpty":
      return m.summaryEmpty(label);
    case "isNotEmpty":
      return m.summaryNotEmpty(label);
  }
}

/** Name an option value: the static option's label, the column's labelOf, or the value. */
export function optionLabel(
  spec: OptionsFilterSpec | UuidFilterSpec,
  value: string,
  loaded?: ReadonlyMap<string, string>,
): string {
  if (spec.kind === "options") {
    const option = spec.options?.find((entry) => entry.value === value);
    if (option) return option.label;
  }
  return loaded?.get(value) ?? spec.labelOf?.(value) ?? value;
}

/** One line for a chip: what the filter selects, in the column's words. Numbers and dates use `locale` (default `getLocale()`). */
export function summarize(
  spec: FilterSpec,
  label: string,
  value: unknown,
  loaded?: ReadonlyMap<string, string>,
  locale = getLocale(),
  m = resolveDataTableMessages(locale),
): string {
  switch (spec.kind) {
    case "text":
      return textSummary(label, value as TextFilterValue, undefined, m);
    case "number":
      return numberSummary(label, value as NumberFilterValue, spec, locale, m);
    case "date":
      return dateSummary(label, value as DateFilterValue, locale, m);
    case "boolean":
      return booleanSummary(label, value as BooleanFilterValue, spec.labels, m);
    case "options":
      return optionsSummary(
        label,
        value as OptionsFilterValue,
        (entry) => optionLabel(spec, entry, loaded),
        m,
      );
    case "uuid":
      return textSummary(
        label,
        value as UuidFilterValue,
        (entry) => optionLabel(spec, entry, loaded),
        m,
      );
    case "custom":
      return spec.summary(value, label);
  }
}
