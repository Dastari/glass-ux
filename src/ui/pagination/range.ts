import { numberFormat } from "../../lib/locale/intl.js"
import { getLocale } from "../../lib/locale/locale.js"

/** U+2013 EN DASH, for ranges (`1–25`). */
const EN_DASH = "\u2013"
const WHOLE: Intl.NumberFormatOptions = { maximumFractionDigits: 0 }

/** Number of pages for `rowCount` rows at `pageSize` per page; at least 1, even for no rows. */
export function pageCountOf(rowCount: number, pageSize: number) {
  return Math.max(1, Math.ceil(rowCount / Math.max(1, pageSize)))
}

/** "1–25 of 1,284" for offset pages, "26–50" when the total is unknown. Numbers in `locale` (default `getLocale()`). */
export function formatRange(pageIndex: number, pageSize: number, pageRows: number, total?: number, locale = getLocale()) {
  const number = numberFormat(locale, WHOLE)
  if (total === 0 || pageRows === 0) return total === undefined ? "No rows" : `0 of ${number.format(total)}`
  const first = pageIndex * pageSize + 1
  const last = first + pageRows - 1
  const range = `${number.format(first)}${EN_DASH}${number.format(last)}`
  return total === undefined ? range : `${range} of ${number.format(total)}`
}
