import { Meter as BaseMeter } from "@base-ui/react/meter"
import type { CSSProperties, ReactNode } from "react"
import { cx } from "../../lib/cx.js"
import { formatPercent } from "../../lib/locale/intl.js"
import { useLocale } from "../../lib/locale/use-locale.js"
import { Skeleton } from "../skeleton/index.js"

export type MeterLevel = "normal" | "warning" | "danger"

/** Which band a fill ratio falls in. Thresholds are fractions of max (0–1). */
export function meterLevel(ratio: number, warningAt = 0.75, dangerAt = 0.9): MeterLevel {
  if (ratio >= dangerAt) return "danger"
  if (ratio >= warningAt) return "warning"
  return "normal"
}

export interface MeterProps {
  value: number
  /** Upper value or visible-item limit, as specified by the type. */
  max?: number
  /** What is measured: "C: · Local disk", "Memory". */
  label?: ReactNode
  /** The reading, with units: "212 GB of 256 GB". Defaults to the percentage. */
  valueText?: string
  /** Fraction of max where the bar turns warning (default 0.75) and danger (0.9). */
  warningAt?: number
  /** Threshold at which the value enters the danger state. */
  dangerAt?: number
  /** `stacked`: label and reading above the bar. `inline`: bar then reading on one line —
   *  for table cells and dense lists. */
  layout?: "stacked" | "inline"
  /** The bar's colour below the warning threshold. `neutral` (default) keeps a healthy level
   *  calm; `data` uses the first data colour (`--chart-1`) where the level is itself the data
   *  being compared, such as disk use in a table. Warning and danger apply past their
   *  thresholds either way. */
  tone?: "neutral" | "data"
  /** Accessible name when there is no visible label. */
  "aria-label"?: string
  className?: string
}

/**
 * A level within a known range: disk, memory, licence seats. Neutral while healthy (or the
 * data colour with `tone="data"`); the bar turns warning and danger as it crosses its
 * thresholds, and the threshold is marked on the track so the reader sees how close it is.
 */
export function Meter({
  value,
  max = 100,
  label,
  valueText,
  warningAt = 0.75,
  dangerAt = 0.9,
  layout = "stacked",
  tone = "neutral",
  className,
  "aria-label": ariaLabel,
}: MeterProps) {
  const locale = useLocale()
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0
  const level = meterLevel(ratio, warningAt, dangerAt)
  const reading = valueText ?? formatPercent(locale, Math.round(ratio * 100))
  return (
    <BaseMeter.Root
      value={value}
      max={max}
      aria-label={label ? undefined : ariaLabel}
      aria-valuetext={reading}
      className={cx("fa-meter", className)}
      data-level={level}
      data-layout={layout}
      data-tone={tone === "data" ? tone : undefined}
      style={{ "--_warn-at": `${warningAt * 100}%` } as CSSProperties}
    >
      {layout === "stacked" ? (
        <div className="fa-meter-head">
          {label ? <BaseMeter.Label className="fa-meter-label">{label}</BaseMeter.Label> : null}
          <span className="fa-meter-value" data-numeric>
            {reading}
          </span>
        </div>
      ) : null}
      <BaseMeter.Track className="fa-meter-track">
        <BaseMeter.Indicator className="fa-meter-indicator" />
        <span className="fa-meter-mark" aria-hidden />
      </BaseMeter.Track>
      {layout === "inline" ? (
        <span className="fa-meter-value" data-numeric>
          {reading}
        </span>
      ) : null}
    </BaseMeter.Root>
  )
}

/** Same rows and heights as a loaded Meter. */
export function MeterSkeleton({ layout = "stacked", className }: {
  /** The layout of the Meter it stands in for (default `stacked`). */
  layout?: "stacked" | "inline"
  className?: string
}) {
  return (
    <div className={cx("fa-meter", className)} data-layout={layout} aria-hidden data-skeleton="">
      {layout === "stacked" ? (
        <div className="fa-meter-head">
          <Skeleton.Text type="label" width="45%" className="fa-meter-skel-text" />
        </div>
      ) : null}
      <span className="fa-meter-track" />
      {layout === "inline" ? <Skeleton.Text type="caption" className="fa-meter-skel-value" /> : null}
    </div>
  )
}
