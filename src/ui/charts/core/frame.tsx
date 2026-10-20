import { useRef, useState, type ComponentProps, type ReactNode } from "react"
import { IconChartLine, IconError, IconTable } from "../../../icons/generated/icons.js"
import { cx } from "../../../lib/cx.js"
import { LocaleProvider, useLocale } from "../../../lib/locale/use-locale.js"
import { useElementSize } from "../../../lib/use-element-size.js"
import { Button } from "../../button/index.js"
import { CopyButton } from "../../copy-button/index.js"
import { EmptyState } from "../../empty-state/index.js"
import { Skeleton } from "../../skeleton/index.js"
import { ChartTable, chartTableToCsv, type ChartTableModel } from "./table.js"
import { chartTier, DEFAULT_TIERS, remPx, type ChartTier, type TierRule } from "./tier.js"

export type ChartState = "ready" | "loading" | "empty" | "error"

/** The plot's shape family: decides the skeleton and a few frame defaults. */
export type ChartKind = "line" | "column" | "bar" | "pie" | "gauge" | "heatmap" | "scatter" | "treemap" | "sunburst"

/** The box a chart draws into, in px. */
export interface PlotBox {
  /** Available width or named width tier. */
  width: number
  /** Available height used for the component’s size tier. */
  height: number
  /** Named size tier or automatic container-based tier selection. */
  tier: ChartTier
  /** px per rem, for turning token sizes into geometry. */
  rem: number
}

/** Everything a chart type passes through to its frame (and its callers pass to the chart). */
export interface ChartCommonProps extends Omit<ComponentProps<"figure">, "children" | "title"> {
  /** Accessible name: what is plotted, for what, over when ("CPU · NST-C106 · last hour"). */
  label: string
  /** A visible label in Metric's label role. Omit inside a panel whose header already names it. */
  title?: string
  /** Controlled view state, including loading, empty and error states. */
  state?: ChartState
  /** One factual line for the empty state (R2.5): "No samples in the last hour". */
  emptyText?: ReactNode
  /** What failed and what to do (R2.4): "Agent offline — retry when NST-C106 reconnects". */
  errorText?: ReactNode
  /** Called with no arguments when the person presses Retry in the error state. The button appears only when this is set, `state` is "error" and the tier is not micro. */
  onRetry?: () => void
  /**
   * BCP 47 locale for this chart's numbers, dates and table. Default: the nearest
   * `LocaleProvider`, then `configureLocale()`, then `<html lang>`, then en-US.
   */
  locale?: string
}

export interface ChartFrameProps extends ChartCommonProps {
  /** Semantic entity or content kind, used to choose labels and rendering. */
  kind: ChartKind
  /**
   * The data as a table: visually hidden for screen readers, shown with "View as table", and
   * copied by "Copy as CSV" (raw `values` where the model has them).
   */
  table?: ChartTableModel
  /** Legend or readout for the head row (compact and full tiers). */
  head?: (tier: ChartTier) => ReactNode
  /** Whether the head row exists in the compact tier (it always does in full). Fixed per chart
   *  type so the skeleton and the loaded chart share one geometry. */
  compactHead?: boolean
  /** Content after the plot in the micro tier (the latest value, a share). */
  trail?: ReactNode
  /** The trail is a nicety: it hides in narrow rows so the marks keep their room. */
  trailOptional?: boolean
  /** The trail's reserved width, so loading and loaded share one geometry: a bare `value`
   *  ("44.4%") or a `figure` (label and value, about a third of the row). */
  trailSize?: "value" | "figure"
  /** The typed disclosure or validation rule applied to this value. */
  rule?: TierRule
  children: (box: PlotBox) => ReactNode
}

/**
 * The shell every chart renders in. It is a size container (R7.3) that fills its parent; the
 * box picks the tier on both axes (see tier.ts). It owns the head row (title, legend or
 * readout, and in the full tier the "View as table" toggle and "Copy as CSV"), the in-place
 * loading, empty and error states (R9.1), and the table fallback. The tools are present,
 * disabled, while the chart loads, so the head does not move when the data arrives (R9).
 * The parent must give it a definite height.
 */
export function ChartFrame({
  kind,
  label,
  title,
  state = "ready",
  emptyText = "No data",
  errorText = "Couldn’t load this chart",
  onRetry,
  table,
  head,
  compactHead = false,
  trail,
  trailOptional = false,
  trailSize = "figure",
  rule = DEFAULT_TIERS,
  children,
  className,
  locale: localeProp,
  ...rest
}: ChartFrameProps) {
  const locale = useLocale(localeProp)
  const rootRef = useRef<HTMLElement>(null)
  const plotRef = useRef<HTMLDivElement>(null)
  const size = useElementSize(rootRef)
  const plot = useElementSize(plotRef)
  const [view, setView] = useState<"chart" | "table">("chart")
  // Read per render: the ui-scale knob can change the root size at runtime.
  const rem = remPx()
  const tier = chartTier(size.width, size.height, rem, rule)
  const measured = size.width > 0 && size.height > 0
  const showHead = tier === "full" || (tier === "compact" && (compactHead || Boolean(title)))
  const tableView = tier === "full" && view === "table" && state === "ready" && Boolean(table)

  let body: ReactNode = null
  if (!measured) body = null
  else if (state === "loading") body = <PlotSkeleton kind={kind} tier={tier} />
  else if (state === "error" || state === "empty") {
    const tone = state === "error" ? "danger" : "neutral"
    const icon = state === "error" ? <IconError /> : <IconChartLine />
    const text = state === "error" ? errorText : emptyText
    body =
      tier === "micro" ? (
        <span className="fa-chart-note" data-tone={tone} role={state === "error" ? "alert" : "status"}>
          {icon}
          <span className="fa-chart-note-text">{text}</span>
        </span>
      ) : (
        <EmptyState
          icon={icon}
          tone={tone}
          action={
            state === "error" && onRetry ? (
              <Button size="sm" variant="secondary" onClick={onRetry}>
                Retry
              </Button>
            ) : undefined
          }
        >
          {text}
        </EmptyState>
      )
  } else if (tableView && table) body = <ChartTable model={table} caption={label} visible />
  else if (plot.width > 0 && plot.height > 0) body = children({ width: plot.width, height: plot.height, tier, rem })

  return (
    // The legend, readouts and data table inside read the chart's locale.
    <LocaleProvider locale={locale}>
    <figure
      {...rest}
      ref={rootRef}
      className={cx("fa-chart", className)}
      data-kind={kind}
      data-tier={measured ? tier : undefined}
      data-state={state}
      aria-label={label}
      aria-busy={state === "loading" || undefined}
    >
      <div className="fa-chart-body">
        {tier === "micro" && title ? <span className="fa-chart-title" data-micro="">{title}</span> : null}
        {showHead ? (
          <div className="fa-chart-head">
            {title ? <span className="fa-chart-title">{title}</span> : null}
            <div className="fa-chart-head-main">
              {state === "loading" ? <HeadSkeleton tier={tier} /> : state === "ready" ? head?.(tier) : null}
            </div>
            {tier === "full" && table ? (
              <div className="fa-chart-tools">
                <Button
                  className="fa-chart-view"
                  size="xs"
                  variant="ghost"
                  icon={<IconTable />}
                  aria-label={view === "table" ? "View as chart" : "View as table"}
                  aria-pressed={view === "table"}
                  disabled={state !== "ready"}
                  onClick={() => setView((current) => (current === "table" ? "chart" : "table"))}
                />
                <CopyButton
                  className="fa-chart-copy"
                  size="xs"
                  variant="ghost"
                  label="Copy as CSV"
                  value={() => chartTableToCsv(table)}
                  disabledReason={state === "ready" ? undefined : COPY_UNAVAILABLE[state]}
                />
              </div>
            ) : null}
          </div>
        ) : null}
        <div ref={plotRef} className="fa-chart-plot" data-view={tableView ? "table" : "chart"}>
          {body}
        </div>
        {tier === "micro" && trail !== undefined && (state === "ready" || state === "loading") ? (
          <div className="fa-chart-trail" data-size={trailSize} data-optional={trailOptional ? "" : undefined}>
            {state === "loading" ? <Skeleton.Text type="caption" className="fa-chart-skel-text" data-part="trail" /> : trail}
          </div>
        ) : null}
      </div>
      {table && state === "ready" && !tableView ? <ChartTable model={table} caption={label} /> : null}
    </figure>
    </LocaleProvider>
  )
}

/** Why "Copy as CSV" is unavailable in each state but ready (R11.3). */
const COPY_UNAVAILABLE: Record<Exclude<ChartState, "ready">, string> = {
  loading: "The data is still loading",
  empty: "There is no data to copy",
  error: "The data didn’t load",
}

function HeadSkeleton({ tier }: { tier: ChartTier }) {
  return (
    <span className="fa-chart-head-skel" aria-hidden>
      <Skeleton.Text type="caption" className="fa-chart-skel-text" data-part="legend" />
      {tier === "full" ? <Skeleton.Text type="caption" className="fa-chart-skel-text" data-part="legend" /> : null}
    </span>
  )
}

/**
 * The plot's placeholder: the chart's own shape in the plot's exact box (R9.3), so swapping
 * in the data moves nothing. Built from Skeleton parts; the shimmer is the page's one beat.
 */
export function PlotSkeleton({ kind, tier }: {
  /** Chart shape family; picks the placeholder marks. */
  kind: ChartKind
  /** Size tier of the box; axes placeholders show only in `full` for line, column, scatter and heatmap charts. */
  tier: ChartTier
}) {
  const axes = tier === "full" && (kind === "line" || kind === "column" || kind === "scatter" || kind === "heatmap")
  let marks: ReactNode
  switch (kind) {
    case "column":
      marks = (
        <span className="fa-chart-skel-columns">
          {[46, 72, 58, 88, 64, 40, 76, 54].map((h, index) => (
            <span key={index} className="fa-skel" style={{ blockSize: `${h}%` }} />
          ))}
        </span>
      )
      break
    case "bar":
      marks = (
        <span className="fa-chart-skel-bars">
          {[92, 74, 61, 48, 36, 28].map((w, index) => (
            <span key={index} className="fa-chart-skel-bar-row">
              {tier !== "micro" ? <Skeleton.Text type="caption" className="fa-chart-skel-text" data-part="bar-label" /> : null}
              <span className="fa-skel" style={{ inlineSize: `${w}%` }} />
            </span>
          ))}
        </span>
      )
      break
    case "pie":
    case "gauge":
    case "sunburst":
      marks =
        tier === "micro" ? (
          <span className="fa-skel fa-chart-skel-strip" />
        ) : (
          <span className="fa-chart-skel-radial">
            <span className="fa-skel fa-chart-skel-ring" data-kind={kind} />
          </span>
        )
      break
    case "treemap":
      marks =
        tier === "micro" ? (
          <span className="fa-skel fa-chart-skel-strip" />
        ) : (
          <span className="fa-chart-skel-tiles">
            {Array.from({ length: 5 }, (_, index) => (
              <span key={index} className="fa-skel" />
            ))}
          </span>
        )
      break
    default:
      marks = <span className="fa-skel fa-chart-skel-area" />
  }
  return (
    <div className="fa-chart-skel" data-kind={kind} data-axes={axes ? "" : undefined} aria-hidden>
      {axes ? (
        <span className="fa-chart-skel-y">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton.Text key={index} type="caption" className="fa-chart-skel-text" data-part="tick" />
          ))}
        </span>
      ) : null}
      <span className="fa-chart-skel-marks">{marks}</span>
      {axes ? (
        <span className="fa-chart-skel-x">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton.Text key={index} type="caption" className="fa-chart-skel-text" data-part="tick" />
          ))}
        </span>
      ) : null}
    </div>
  )
}
