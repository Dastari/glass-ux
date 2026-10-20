/**
 * Cached `Intl` formatters keyed by locale and options. Building a formatter is far slower
 * than using one, and table cells, chart ticks and badges format thousands of values with a
 * handful of option sets, so each (locale, options) pair is built once.
 */
const numbers = new Map<string, Intl.NumberFormat>()
const dates = new Map<string, Intl.DateTimeFormat>()
const collators = new Map<string, Intl.Collator>()

const keyOf = (locale: string, options: object | undefined) => (options ? `${locale}|${JSON.stringify(options)}` : locale)

/** A cached `Intl.NumberFormat` for `locale` and `options`. */
export function numberFormat(locale: string, options?: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = keyOf(locale, options)
  let format = numbers.get(key)
  if (!format) numbers.set(key, (format = new Intl.NumberFormat(locale, options)))
  return format
}

/** A cached `Intl.DateTimeFormat` for `locale` and `options`. */
export function dateTimeFormat(locale: string, options?: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = keyOf(locale, options)
  let format = dates.get(key)
  if (!format) dates.set(key, (format = new Intl.DateTimeFormat(locale, options)))
  return format
}

const separators = new Map<string, { decimal: string; group: string }>()

/** The locale's decimal mark and grouping character: "." and "," in en, "," and "." in de. */
export function numberSeparators(locale: string): { decimal: string; group: string } {
  let known = separators.get(locale)
  if (!known) {
    const parts = numberFormat(locale).formatToParts(12345.6)
    known = {
      decimal: parts.find((part) => part.type === "decimal")?.value ?? ".",
      group: parts.find((part) => part.type === "group")?.value ?? ",",
    }
    separators.set(locale, known)
  }
  return known
}

/**
 * Number text written in `locale` as JavaScript reads it: grouping removed (spaces and
 * apostrophes always count as grouping) and the decimal mark as ".". "1.234,5" in de and
 * "1,234.5" in en both become "1234.5". The rest of the text is left as it is.
 */
export function delocalizeNumber(text: string, locale: string): string {
  const { decimal, group } = numberSeparators(locale)
  let out = text.replace(/[\s  '’]/g, "")
  if (group.trim() && group !== decimal) out = out.split(group).join("")
  if (decimal !== ".") out = out.split(decimal).join(".")
  return out
}

/** A cached `Intl.Collator` for `locale` and `options`. */
export function collator(locale: string, options?: Intl.CollatorOptions): Intl.Collator {
  const key = keyOf(locale, options)
  let compare = collators.get(key)
  if (!compare) collators.set(key, (compare = new Intl.Collator(locale, options)))
  return compare
}
