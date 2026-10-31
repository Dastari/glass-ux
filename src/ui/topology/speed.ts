import { numberFormat } from "../../lib/locale/intl.js"
import { getLocale } from "../../lib/locale/locale.js"

/** Link speeds as the map labels them (R2.7: a thin space before the unit). */

/** A whole number, or one decimal when it has a fraction. `toFixed` rounds first so the digit is the one the label always showed. */
const speedNumber = (locale: string, value: number) =>
  Number.isInteger(value)
    ? numberFormat(locale, { maximumFractionDigits: 0, useGrouping: false }).format(value)
    : numberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1, useGrouping: false }).format(Number(value.toFixed(1)))

/**
 * "100 Mbps", "1 Gbps", "2.5 Gbps". The unit abbreviations are the same in every language;
 * the number is written in `locale` (default `getLocale()`): "2,5 Gbps" in de.
 */
export function formatLinkSpeed(mbps: number, locale = getLocale()): string {
  if (mbps >= 1000) {
    const gbps = mbps / 1000
    return `${speedNumber(locale, gbps)} Gbps`
  }
  return `${speedNumber(locale, Math.round(mbps))} Mbps`
}

/** One label for several links: "1 Gbps", or the range "100 Mbps–1 Gbps". */
export function speedRange(speeds: readonly number[], locale = getLocale()): string | undefined {
  if (!speeds.length) return undefined
  const low = Math.min(...speeds)
  const high = Math.max(...speeds)
  return low === high ? formatLinkSpeed(low, locale) : `${formatLinkSpeed(low, locale)}–${formatLinkSpeed(high, locale)}`
}
