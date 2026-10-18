import { IconGauge } from "../../icons/generated/icons.js"
import { Metric, formatMetric } from "../../ui/metric/index.js"
import type { AiResult } from "../types.js"
import { ResultFrame } from "./frame.js"

type MetricsResult = Extract<AiResult, { type: "metrics" }>

/**
 * Key figures from a tool: Metric tiles (src/ui/metric) in an auto-fill grid. Each tile has
 * a definite height, so Metric picks its own tier (value + delta + sparkline) and the grid
 * reflows by the card's width, never a fixed column count (R5.5).
 */
export function ResultMetrics({ result }: {
  /** The metrics result: each of its `metrics` becomes a Metric tile (label, value, unit, delta and optional sparkline data). */
  result: MetricsResult
}) {
  const copy = result.metrics.map((metric) => `${metric.label}: ${metric.value === null ? "—" : formatMetric(metric.value, metric.unit)}`).join("\n")
  return (
    <ResultFrame result={result} icon={<IconGauge />} copyText={copy}>
      <div className="fa-ai-metrics">
        {result.metrics.map((metric) => (
          <div key={metric.label} className="glass-inset fa-ai-metric-tile">
            <Metric
              label={metric.label}
              value={metric.value}
              unit={metric.unit}
              delta={metric.delta}
              better={metric.better}
              data={metric.data}
              times={metric.times}
              domain={metric.domain}
              tone={metric.tone}
            />
          </div>
        ))}
      </div>
    </ResultFrame>
  )
}
