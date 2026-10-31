import { numberFormat } from "./intl.js"

const tables = new Map<string, ReadonlyMap<string, string>>()

/** The locale's digits for 0 to 9, as `Intl` writes them: "٠" to "٩" in ar-EG, "0" to "9" in en. */
function digitTable(locale: string): ReadonlyMap<string, string> {
  let table = tables.get(locale)
  if (!table) {
    const format = numberFormat(locale, { useGrouping: false })
    const native = new Map<string, string>()
    for (let digit = 0; digit <= 9; digit++) {
      const written = format.format(digit)
      if (written !== String(digit)) native.set(written, String(digit))
    }
    tables.set(locale, native)
    table = native
  }
  return table
}

/**
 * Text with the locale's own digits replaced by ASCII ones, so JavaScript can read what
 * `Intl` wrote. The separators stay for `delocalizeNumber`: ar-EG's Arabic-Indic digits become
 * "0" to "9" and its group and decimal marks are untouched. A locale that writes ASCII digits
 * returns the text as it is.
 */
export function asciiDigits(text: string, locale: string): string {
  const native = digitTable(locale)
  if (native.size === 0) return text
  let out = ""
  for (const char of text) out += native.get(char) ?? char
  return out
}
