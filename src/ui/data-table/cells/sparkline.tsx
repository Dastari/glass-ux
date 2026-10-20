import { seriesStats, Sparkline, type Domain, type SparklineTone } from "../../sparkline/index.js"
import { useLocale } from "../../../lib/locale/use-locale.js"
import { formatWithUnit } from "../format.js"

export interface SparklineCellProps {
  /** Values rendered by the chart or multi-value control. */
  values: readonly number[]
  /** Fixed value range ([0, 100] for percentages). Defaults to the data's range. */
  domain?: Domain
  /**
   * Line colour. Neutral by default so a column of trends reads as texture; use a status
   * tone only while the value is in that state (R3.3), so problems stand out.
   */
  tone?: SparklineTone
  /** What the series is, e.g. "CPU over the last 20 minutes". */
  label: string
  /** Unit after a thin space: "%", "ms". */
  unit?: string
  /** The value printed beside the line (defaults to the last point). */
  value?: number
}

/**
 * The shared Sparkline at row size plus its current value, right-aligned in tabular
 * figures. The line's accessible name summarises it: now, low and high.
 */
export function SparklineCell({ values, domain, tone = "neutral", label, unit, value }: SparklineCellProps) {
  const locale = useLocale()
  const stats = seriesStats(values)
  const current = value ?? stats?.last
  const summary = stats
    ? `${label}: now ${formatWithUnit(current ?? stats.last, unit, 0, locale)}, low ${formatWithUnit(stats.min, unit, 0, locale)}, high ${formatWithUnit(stats.max, unit, 0, locale)}`
    : `${label}: no data`
  return (
    <span className="fa-dt-spark-cell">
      <span className="fa-dt-spark">
        <Sparkline data={values} domain={domain} tone={tone} label={summary} />
      </span>
      <data className="fa-dt-spark-value" value={current ?? ""}>
        {current === undefined ? "—" : formatWithUnit(current, unit, 0, locale)}
      </data>
    </span>
  )
}
