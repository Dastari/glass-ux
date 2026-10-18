import { Progress as BaseProgress } from "@base-ui/react/progress"
import { useId, type ReactNode } from "react"
import { cx } from "../../lib/cx.js"
import { Skeleton } from "../skeleton/index.js"

export type ProgressTone = "accent" | "success" | "danger"
export type ProgressSize = "sm" | "md"

export interface ProgressProps {
  /** 0–max, or null while the amount of work is unknown (indeterminate). */
  value: number | null
  /** Upper value or visible-item limit, as specified by the type. */
  max?: number
  /** What is happening: "Installing Google Chrome 129.0". */
  label?: ReactNode
  /** Data under the bar: "1 of 3 devices completed". */
  meta?: ReactNode
  /** A trailing control on the meta line, normally a small Cancel button. */
  action?: ReactNode
  /** Show the percentage at the end of the label line (default when determinate). */
  showValue?: boolean
  tone?: ProgressTone
  size?: ProgressSize
  /** Accessible name when there is no visible label. */
  "aria-label"?: string
  className?: string
}

const percent = (value: number, max: number) => Math.round(Math.min(100, Math.max(0, (value / max) * 100)))

/**
 * A task's progress in place: label and percentage, the bar, then a data line with an
 * optional action. Indeterminate work shows a soft accent bar with the page's shimmer
 * sweeping through it (still under reduced motion).
 */
export function Progress({
  value,
  max = 100,
  label,
  meta,
  action,
  showValue = value !== null,
  tone = "accent",
  size = "md",
  className,
  "aria-label": ariaLabel,
}: ProgressProps) {
  const metaId = useId()
  const pct = value === null ? null : percent(value, max)
  return (
    <div
      className={cx("fa-progress", className)}
      data-tone={tone}
      data-size={size}
      data-indeterminate={value === null ? "" : undefined}
      data-complete={value !== null && value >= max ? "" : undefined}
    >
      {/* The progressbar holds only its name, value and track: its children are
          presentational, so the data line and the action sit beside it. */}
      <BaseProgress.Root
        value={value}
        max={max}
        className="fa-progress-bar"
        aria-label={label ? undefined : ariaLabel}
        aria-describedby={meta ? metaId : undefined}
        getAriaValueText={(_, current) => (current === null ? "In progress" : `${percent(current, max)}%`)}
      >
        {label || showValue ? (
          <div className="fa-progress-head">
            {label ? <BaseProgress.Label className="fa-progress-label">{label}</BaseProgress.Label> : <span />}
            {showValue && pct !== null ? (
              <span className="fa-progress-value" data-numeric>
                {pct}%
              </span>
            ) : null}
          </div>
        ) : null}
        <BaseProgress.Track className="fa-progress-track">
          <BaseProgress.Indicator className={cx("fa-progress-indicator", value === null && "fa-shimmer")} />
        </BaseProgress.Track>
      </BaseProgress.Root>
      {meta || action ? (
        <div className="fa-progress-foot">
          <span className="fa-progress-meta" id={metaId}>
            {meta}
          </span>
          {action ? <span className="fa-progress-action">{action}</span> : null}
        </div>
      ) : null}
    </div>
  )
}

export interface ProgressSkeletonProps {
  label?: boolean
  /** Supporting data displayed with the item. */
  meta?: boolean
  /** Trailing action for a notice or result. */
  action?: boolean
  size?: ProgressSize
  className?: string
}

/** Same rows and heights as a loaded Progress. */
export function ProgressSkeleton({ label = true, meta = false, action = false, size = "md", className }: ProgressSkeletonProps) {
  return (
    <div className={cx("fa-progress", className)} data-size={size} aria-hidden data-skeleton="">
      <div className="fa-progress-bar">
        {label ? (
          <div className="fa-progress-head">
            <Skeleton.Text type="label" width="55%" className="fa-progress-skel-text" />
          </div>
        ) : null}
        <span className="fa-progress-track" />
      </div>
      {meta || action ? (
        <div className="fa-progress-foot">
          <Skeleton.Text type="caption" width="40%" className="fa-progress-skel-text" />
          {action ? <Skeleton.Block className="fa-progress-skel-action" /> : null}
        </div>
      ) : null}
    </div>
  )
}

// ── Ring ────────────────────────────────────────────────────────────────────

export type ProgressRingSize = "sm" | "md" | "lg"

export interface ProgressRingProps {
  value: number | null
  /** Upper value or visible-item limit, as specified by the type. */
  max?: number
  size?: ProgressRingSize
  tone?: ProgressTone
  /** Accessible name, e.g. "Uploading install.log". */
  "aria-label": string
  className?: string
}

const RING_R = 15.5 // on a 36-unit box, leaving room for the stroke

/** A compact circular progress for inline and icon-sized spots. `lg` prints the percentage. */
export function ProgressRing({ value, max = 100, size = "md", tone = "accent", className, ...rest }: ProgressRingProps) {
  const pct = value === null ? null : percent(value, max)
  return (
    <BaseProgress.Root
      value={value}
      max={max}
      aria-label={rest["aria-label"]}
      className={cx("fa-ring", className)}
      data-size={size}
      data-tone={tone}
      getAriaValueText={(_, current) => (current === null ? "In progress" : `${percent(current, max)}%`)}
    >
      <svg viewBox="0 0 36 36" className="fa-ring-svg" aria-hidden>
        <circle className="fa-ring-track" cx="18" cy="18" r={RING_R} pathLength={100} />
        <circle
          className="fa-ring-arc"
          cx="18"
          cy="18"
          r={RING_R}
          pathLength={100}
          strokeDasharray={pct === null ? "28 72" : `${pct} 100`}
        />
      </svg>
      {size === "lg" && pct !== null ? (
        <span className="fa-ring-value" data-numeric>
          {pct}%
        </span>
      ) : null}
    </BaseProgress.Root>
  )
}
