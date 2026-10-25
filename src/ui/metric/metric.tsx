import { useMessages } from "../../lib/i18n/index.js"
import { metricMessages } from "./messages.js"
import { useState, type ComponentProps, type ReactNode } from "react"
import { IconMinus, IconTrendDown, IconTrendUp } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { numberFormat } from "../../lib/locale/intl.js"
import { getLocale } from "../../lib/locale/locale.js"
import { useLocale } from "../../lib/locale/use-locale.js"
import { Skeleton } from "../skeleton/index.js"
import { Sparkline, SparklineSkeleton, seriesStats, type Domain, type SparklineTone } from "../sparkline/index.js"

const ONE_DECIMAL: Intl.NumberFormatOptions = { maximumFractionDigits: 1 }

/**
 * "34%" sticks to its unit; every other unit takes a thin space ("7.4 GB", "28 ms"). Without
 * `format`, the number has up to one decimal in `locale` (default `getLocale()`).
 */
export function formatMetric(value: number, unit = "", format?: (value: number) => string, locale = getLocale()): string {
  const text = format ? format(value) : numberFormat(locale, ONE_DECIMAL).format(value)
  if (!unit) return text
  return unit.startsWith("%") ? `${text}${unit}` : `${text} ${unit.trim()}`
}

export interface MetricProps extends Omit<ComponentProps<"div">, "children"> {
  /** What is measured: "CPU", "Memory", "Latency". */
  label: string
  /** The current value; null while unknown. */
  value: number | null
  /** Unit displayed with a numeric value. */
  unit?: string
  /** Value formatter or formatting options. */
  format?: (value: number) => string
  /** Change against the comparison period, in `deltaUnit`. */
  delta?: number
  /** Unit displayed with the change. */
  deltaUnit?: string
  /** The comparison, shown where there is room: "vs previous hour". */
  deltaLabel?: string
  /** Which direction is good. CPU and latency: "down"; uptime: "up"; "none" for neutral. */
  better?: "up" | "down" | "none"
  /** The recent series, oldest first. */
  data?: readonly number[]
  /** A label per data point for the hover readout ("10:32"). */
  times?: readonly string[]
  /** The period the series covers: "Last hour". */
  range?: string
  /** Fixed value range, e.g. [0, 100] for percentages. */
  domain?: Domain
  /** The series' state, when it has one (warning when a threshold is crossed). */
  tone?: SparklineTone
  /**
   * BCP 47 locale for the value, delta and statistics. Default: the nearest
   * `LocaleProvider`, then `configureLocale()`, then `<html lang>`, then en-US.
   */
  locale?: string
}

function Delta({ delta, unit = "", better = "up", label, locale }: { delta: number; unit?: string; better?: "up" | "down" | "none"; label?: string; locale: string }) {
  const messages = useMessages(metricMessages, { locale })

  const trend = delta > 0 ? "up" : delta < 0 ? "down" : "flat"
  const good = better === "none" || trend === "flat" ? undefined : (trend === better) === true
  const Icon = trend === "up" ? IconTrendUp : trend === "down" ? IconTrendDown : IconMinus
  const words = trend === "up" ? messages.up : trend === "down" ? messages.down : messages.noChange
  return (
    <span className="fa-metric-delta" data-good={good === undefined ? undefined : String(good)}>
      <Icon className="fa-metric-delta-icon" label={words} />
      <span data-numeric>{formatMetric(Math.abs(delta), unit, undefined, locale)}</span>
      {label ? <span className="fa-metric-delta-label"> {label}</span> : null}
    </span>
  )
}

/**
 * A number with its trend — the R7.2 container showcase. One component, three tiers chosen by
 * the box it is given (width AND height), so it fits a table cell, a header, a tile and a pane:
 *
 *   micro    height < 5rem or width < 10rem: label, value, delta and an inline sparkline in one row
 *   compact  a tile: label, value, delta, and a small chart without axes when height allows
 *   full     ≥ 20rem × 12rem: value, delta and comparison, min/avg/max, the chart with a time
 *            axis and a hover crosshair whose readout replaces the value
 *
 * It fills its box (container-type: size), so the parent must give it a definite height.
 */
export function Metric({
  label,
  value,
  unit = "",
  format,
  delta,
  deltaUnit = unit,
  deltaLabel,
  better = "up",
  data = [],
  times,
  range,
  domain,
  tone = "data",
  locale: localeProp,
  className,
  ...rest
}: MetricProps) {
  const messages = useMessages(metricMessages, { locale: localeProp })

  const [hover, setHover] = useState<number | null>(null)
  const locale = useLocale(localeProp)
  const stats = seriesStats(data)
  const fmt = (n: number) => formatMetric(n, unit, format, locale)
  const shown = hover !== null ? data[hover] : value
  const summary = stats
    ? messages.minimumAverageMaximum(label, range ? `, ${range.toLowerCase()}` : "", fmt(stats.min), fmt(stats.avg), fmt(stats.max), fmt(stats.last))
    : undefined

  return (
    <div {...rest} className={cx("fa-metric", className)} role="group" aria-label={label}>
      <div className="fa-metric-body" data-hovering={hover !== null ? "" : undefined}>
        <div className="fa-metric-head">
          <span className="fa-metric-label">{label}</span>
          {range ? <span className="fa-metric-range">{range}</span> : null}
        </div>
        <div className="fa-metric-figure">
          <data className="fa-metric-value" value={shown ?? undefined}>
            {shown === null || shown === undefined ? "—" : fmt(shown)}
          </data>
          {hover !== null ? (
            <span className="fa-metric-readout">{times?.[hover] ?? messages.samplesAgo(data.length - 1 - hover)}</span>
          ) : delta !== undefined ? (
            <Delta delta={delta} unit={deltaUnit} better={better} label={deltaLabel} locale={locale} />
          ) : null}
        </div>
        {stats ? (
          <div className="fa-metric-stats" data-numeric>
            <span>{messages.min} {fmt(stats.min)}</span>
            <span aria-hidden>·</span>
            <span>{messages.avg} {fmt(stats.avg)}</span>
            <span aria-hidden>·</span>
            <span>{messages.max} {fmt(stats.max)}</span>
          </div>
        ) : null}
        {data.length > 1 ? (
          <Sparkline
            className="fa-metric-chart"
            data={data}
            domain={domain}
            tone={tone}
            hover={hover}
            onHover={setHover}
            reference={stats?.avg}
            label={summary}
          />
        ) : (
          <span className="fa-metric-chart" />
        )}
        {times && times.length > 1 ? (
          <div className="fa-metric-axis" aria-hidden>
            <span>{times[0]}</span>
            <span>{times[times.length - 1]}</span>
          </div>
        ) : null}
      </div>
      {/* Always mounted: the hovered reading is announced when it replaces the value. */}
      <span className="sr-only" aria-live="polite">
        {hover !== null && shown !== null && shown !== undefined
          ? `${fmt(shown)}, ${times?.[hover] ?? messages.samplesAgo(data.length - 1 - hover)}`
          : ""}
      </span>
    </div>
  )
}

export interface MetricSkeletonProps {
  /** Visible range or selected value interval. */
  range?: boolean
  /** Change from the comparison value. */
  delta?: boolean
  /** Summary statistics displayed with the content. */
  stats?: boolean
  /** Axis extent, labels and formatting specification. */
  axis?: boolean
  className?: string
}

/** Every row of the Metric in the same tier geometry, so loading never shifts a pixel. */
export function MetricSkeleton({ range = false, delta = true, stats = true, axis = false, className }: MetricSkeletonProps): ReactNode {
  return (
    <div className={cx("fa-metric", className)} aria-hidden data-skeleton="">
      <div className="fa-metric-body">
        <div className="fa-metric-head">
          <Skeleton.Text type="label" className="fa-metric-label fa-metric-skel" data-part="label" />
          {range ? <Skeleton.Text type="caption" className="fa-metric-range fa-metric-skel" data-part="range" /> : null}
        </div>
        <div className="fa-metric-figure">
          <Skeleton.Text type="headline" className="fa-metric-value fa-metric-skel" data-part="value" />
          {delta ? <Skeleton.Text type="caption" className="fa-metric-delta fa-metric-skel" data-part="delta" /> : null}
        </div>
        {stats ? (
          <div className="fa-metric-stats">
            <Skeleton.Text type="caption" className="fa-metric-skel" data-part="stats" />
          </div>
        ) : null}
        <SparklineSkeleton className="fa-metric-chart" />
        {axis ? (
          <div className="fa-metric-axis">
            <Skeleton.Text type="caption" className="fa-metric-skel" data-part="axis" />
            <Skeleton.Text type="caption" className="fa-metric-skel" data-part="axis" />
          </div>
        ) : null}
      </div>
    </div>
  )
}
