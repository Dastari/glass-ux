import { numberFormat } from "../../lib/locale/intl.js"
import { getLocale } from "../../lib/locale/locale.js"

/** A cluster block's label line, as the canvas draws it and the layout sizes it: "Storage and power · 1". The count is in `locale` (default `getLocale()`). */
export function clusterLabel(label: string, count: number, locale = getLocale()) {
  return `${label} · ${numberFormat(locale).format(count)}`
}
