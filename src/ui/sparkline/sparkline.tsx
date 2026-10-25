import { useId, useMemo, type ComponentProps, type CSSProperties, type PointerEvent } from "react"
import { cx } from "../../lib/cx.js"
import { areaPath, indexAt, monotonePath, resolveDomain, toPoints, type Domain } from "./geometry.js"

/**
 * `data` (the default) is the data colour, --chart-1: calm and never the brand accent, so a
 * line at 44% never reads as an alarm. `accent` is kept as an alias of `data` for existing
 * callers. Status tones only when the series is in that state (R3.3).
 */
export type SparklineTone = "data" | "accent" | "success" | "warning" | "danger" | "info" | "neutral"

/** A line across a sparkline at a value: a limit or a target. */
export interface SparklineThreshold {
  /** Where the line sits, in the data's units. */
  value: number
  /** A status tone when values past the line are in that state; `neutral` (the default) otherwise. */
  tone?: "neutral" | "success" | "warning" | "danger" | "info"
  /** Dashed: a soft reference (an average, a target) rather than a limit. */
  dashed?: boolean
}

export interface SparklineProps extends Omit<ComponentProps<"div">, "children" | "onPointerMove" | "onPointerLeave"> {
  /** Typed records rendered by the component. */
  data: readonly number[]
  /** Fixed value range (e.g. [0, 100] for percentages). Defaults to the data's range. */
  domain?: Domain
  /** Line colour: the data colour, or a status tone only when the series is in that state. */
  tone?: SparklineTone
  /** The ~10% wash under the line. */
  area?: boolean
  /** The ringed dot on the latest point. */
  dot?: boolean
  /** Index under the crosshair; null hides it. Controlled by the parent (Metric). */
  hover?: number | null
  /** Turn on pointer hit-testing; called with the nearest index, or null on leave. */
  onHover?: (index: number | null) => void
  /** A horizontal hairline at this value (e.g. the average). */
  reference?: number
  /**
   * Hairlines at values in their tone (a warning limit, a target). Without a fixed `domain`
   * the range grows to include them, so a line is never pinned to an edge. They carry no
   * label: name what they mean in `label` or beside the sparkline.
   */
  thresholds?: readonly SparklineThreshold[]
  /** Accessible summary. Omit when a parent already describes the chart. */
  label?: string
}

const pct = (value: number) => `${value}%`

/**
 * A single-series line that fills its box: smooth (monotone, no overshoot), 2px whatever
 * the size, a wash of the data colour beneath and a ringed dot on the latest point. Pure SVG + CSS; the
 * plot is inset by the dot's radius so nothing is ever cut off at the edges.
 */
export function Sparkline({
  data,
  domain,
  tone = "data",
  area = true,
  dot = true,
  hover = null,
  onHover,
  reference,
  thresholds,
  label,
  className,
  ...rest
}: SparklineProps) {
  const gradientId = useId()
  const resolved = useMemo(() => resolveDomain(thresholds?.length && !domain ? [...data, ...thresholds.map((item) => item.value)] : data, domain), [data, domain, thresholds])
  const points = useMemo(() => toPoints(data, resolved), [data, resolved])
  const line = useMemo(() => monotonePath(points), [points])
  const fill = useMemo(() => (area ? areaPath(line, points) : ""), [area, line, points])
  const width = Math.max(1, points.length - 1)
  const last = points[points.length - 1]
  const hovered = hover !== null ? points[hover] : undefined
  const at = (x: number) => pct((x / width) * 100)
  const referenceY =
    reference !== undefined ? toPoints([reference], resolved)[0]?.y : undefined

  const handleMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!onHover) return
    const box = event.currentTarget.getBoundingClientRect()
    onHover(indexAt((event.clientX - box.left) / Math.max(1, box.width), points.length))
  }

  return (
    <div
      {...rest}
      className={cx("fa-spark", className)}
      data-tone={tone}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <div
        className="fa-spark-plot"
        onPointerMove={onHover ? handleMove : undefined}
        onPointerLeave={onHover ? () => onHover(null) : undefined}
        data-interactive={onHover ? "" : undefined}
      >
        {points.length > 1 ? (
          <svg className="fa-spark-svg" viewBox={`0 0 ${width} 100`} preserveAspectRatio="none" aria-hidden>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" className="fa-spark-stop-top" />
                <stop offset="1" className="fa-spark-stop-bottom" />
              </linearGradient>
            </defs>
            {fill ? <path className="fa-spark-area" d={fill} fill={`url(#${gradientId})`} /> : null}
            {referenceY !== undefined ? (
              <line className="fa-spark-reference" x1="0" x2={width} y1={referenceY} y2={referenceY} />
            ) : null}
            {thresholds?.map((item, index) => {
              const y = toPoints([item.value], resolved)[0]!.y
              return <line key={`${index}-${item.value}`} className="fa-spark-threshold" data-tone={item.tone ?? "neutral"} data-dashed={item.dashed ? "" : undefined} x1="0" x2={width} y1={y} y2={y} />
            })}
            <path className="fa-spark-line" d={line} />
          </svg>
        ) : null}
        {hovered ? (
          <>
            <span className="fa-spark-crosshair" style={{ insetInlineStart: at(hovered.x) } as CSSProperties} />
            <span className="fa-spark-dot" data-hover="" style={{ insetInlineStart: at(hovered.x), insetBlockStart: pct(hovered.y) }} />
          </>
        ) : null}
        {dot && last && !hovered ? (
          <span className="fa-spark-dot" style={{ insetInlineStart: at(last.x), insetBlockStart: pct(last.y) }} />
        ) : null}
      </div>
    </div>
  )
}

/** Placeholder for a sparkline's box. */
export function SparklineSkeleton({ className }: { className?: string }) {
  return (
    <div className={cx("fa-spark", className)} aria-hidden data-skeleton="">
      <span className="fa-skel fa-spark-skel" />
    </div>
  )
}
