import { useLocale } from "../../../lib/locale/use-locale.js"
import { formatWithUnit } from "../format.js"

export interface NumericCellProps {
  value: number | null | undefined
  /** Unit after a thin space: "GB", "ms", "%". */
  unit?: string
  /** Number of fractional digits displayed. */
  fractionDigits?: number
  /** Text for a missing value. */
  fallback?: string
}

/** A number in tabular figures with its unit. Pair with `align: "end"` on the column. */
export function NumericCell({ value, unit, fractionDigits = 0, fallback = "—" }: NumericCellProps) {
  const locale = useLocale()
  if (value === null || value === undefined || Number.isNaN(value)) return <span className="fa-dt-text fa-dt-muted">{fallback}</span>
  return (
    <data className="fa-dt-text fa-dt-num" value={value}>
      {formatWithUnit(value, unit, fractionDigits, locale)}
    </data>
  )
}
