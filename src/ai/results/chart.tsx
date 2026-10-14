import { useId, useState, type CSSProperties, type PointerEvent } from "react"
import { IconChartLine, IconReporting } from "../../icons/generated/icons.js"
import { formatNumber, THIN_SPACE } from "../format.js"
import type { AiResult, ChartSeries } from "../types.js"
import { ResultFrame } from "./frame.js"

type ChartResult = Extract<AiResult, { type: "chart" }>

/** Series slots in fixed order (never cycled, never by rank). Past four, fold into a table. */
const SLOTS = 4

/** A clean tick step near `rough`: 1, 2, 2.5 or 5 × a power of ten. */
function niceStep(rough: number) {
  if (rough <= 0) return 1
  const exponent = 10 ** Math.floor(Math.log10(rough))
  const fraction = rough / exponent
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10
  return nice * exponent
}

/** Four or five clean ticks from 0 that cover `max`. */
function ticksFor(max: number, domain?: [number, number]) {
  if (domain) return [0, 0.25, 0.5, 0.75, 1].map((fraction) => domain[0] + (domain[1] - domain[0]) * fraction)
  const step = Math.max(1, niceStep(max / 4))
  const top = Math.max(step, Math.ceil(max / step) * step)
  return Array.from({ length: Math.round(top / step) + 1 }, (_, index) => index * step)
}

function formatValue(value: number, unit?: string) {
  const text = formatNumber(value, Number.isInteger(value) ? 0 : 1)
  if (!unit) return text
  return unit === "%" ? `${text}%` : `${text}${THIN_SPACE}${unit}`
}

function linePath(values: number[], max: number, min: number) {
  const span = max - min || 1
  const step = values.length > 1 ? 100 / (values.length - 1) : 0
  return values.map((value, index) => `${index === 0 ? "M" : "L"}${(index * step).toFixed(3)} ${(100 - ((value - min) / span) * 100).toFixed(3)}`).join(" ")
}

/** Label every nth x tick so labels never collide; the first and last always show. */
function tickEvery(count: number) {
  if (count <= 7) return 1
  return Math.ceil(count / 6)
}

/**
 * A line or bar chart for a tool result. Thin marks (2px lines, bars at most 24px with a
 * rounded data end), hairline grid, one axis, a legend from two series, and a hover readout.
 * Container tiers: compact cards drop the value axis and thin the time labels; the chart
 * box keeps a fixed height per tier so it reserves its space before data arrives.
 */
export function ResultChart({ result }: { result: ChartResult }) {
  const series = result.series.slice(0, SLOTS)
  const id = useId()
  const [hover, setHover] = useState<number | null>(null)
  const values = series.flatMap((item) => item.values)
  const ticks = ticksFor(Math.max(0, ...values), result.domain)
  const min = ticks[0]!
  const max = ticks[ticks.length - 1]!
  const count = result.labels.length
  const every = tickEvery(count)

  const summary = series
    .map((item) => {
      const last = item.values[item.values.length - 1]
      const peak = Math.max(...item.values)
      return `${item.name}: latest ${formatValue(last ?? 0, result.unit)}, peak ${formatValue(peak, result.unit)}`
    })
    .join("; ")

  const onMove = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (event.clientX - box.left) / Math.max(1, box.width)))
    setHover(result.chart === "bar" ? Math.min(count - 1, Math.floor(ratio * count)) : Math.round(ratio * (count - 1)))
  }

  const hoverX = hover === null ? 0 : result.chart === "bar" ? ((hover + 0.5) / count) * 100 : count > 1 ? (hover / (count - 1)) * 100 : 50

  return (
    <ResultFrame
      result={result}
      icon={result.chart === "bar" ? <IconReporting /> : <IconChartLine />}
      copyText={[["", ...result.labels].join("\t"), ...series.map((item) => [item.name, ...item.values].join("\t"))].join("\n")}
      csv={[["Series", ...result.labels].join(","), ...series.map((item) => [item.name, ...item.values].join(","))].join("\n")}
    >
      <figure className="fa-ai-chart" data-chart={result.chart} aria-labelledby={`${id}-summary`}>
        {series.length > 1 ? (
          <ul className="fa-ai-chart-legend" aria-label="Series">
            {series.map((item, index) => (
              <li key={item.name} data-slot={index + 1}>
                <span className="fa-ai-chart-key" aria-hidden />
                {item.name}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="fa-ai-chart-frame">
          <div className="fa-ai-chart-yaxis" aria-hidden>
            {ticks.toReversed().map((tick) => (
              <span key={tick} data-numeric>
                {formatValue(tick, result.unit)}
              </span>
            ))}
          </div>
          <div className="fa-ai-chart-plot" onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
            <div className="fa-ai-chart-grid" aria-hidden>
              {ticks.map((tick) => (
                <span key={tick} />
              ))}
            </div>
            {result.chart === "line" ? (
              <svg className="fa-ai-chart-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
                {series.map((item, index) => (
                  <g key={item.name} data-slot={index + 1}>
                    {series.length === 1 ? <path className="fa-ai-chart-area" d={`${linePath(item.values, max, min)} L100 100 L0 100 Z`} /> : null}
                    <path className="fa-ai-chart-line" d={linePath(item.values, max, min)} vectorEffect="non-scaling-stroke" />
                  </g>
                ))}
              </svg>
            ) : (
              <div className="fa-ai-chart-bars" aria-hidden>
                {result.labels.map((label, index) => (
                  <div key={label} className="fa-ai-chart-group" data-active={hover === index ? "" : undefined}>
                    {series.map((item, slot) => (
                      <span
                        key={item.name}
                        className="fa-ai-chart-bar"
                        data-slot={slot + 1}
                        style={{ "--_h": `${(((item.values[index] ?? 0) - min) / (max - min || 1)) * 100}%` } as CSSProperties}
                      />
                    ))}
                  </div>
                ))}
              </div>
            )}
            {result.chart === "line"
              ? series.map((item, index) => {
                  const at = hover ?? count - 1
                  const value = item.values[at] ?? 0
                  return (
                    <span
                      key={item.name}
                      className="fa-ai-chart-dot"
                      data-slot={index + 1}
                      aria-hidden
                      style={{ "--_x": `${count > 1 ? (at / (count - 1)) * 100 : 50}%`, "--_y": `${100 - ((value - min) / (max - min || 1)) * 100}%` } as CSSProperties}
                    />
                  )
                })
              : null}
            {hover !== null ? (
              <>
                {result.chart === "line" ? <span className="fa-ai-chart-cross" aria-hidden style={{ "--_x": `${hoverX}%` } as CSSProperties} /> : null}
                <div className="glass-overlay fa-ai-chart-tip" data-flip={hoverX > 60 ? "" : undefined} style={{ "--_x": `${hoverX}%` } as CSSProperties} role="status">
                  <span className="fa-ai-chart-tip-label">{result.labels[hover]}</span>
                  {series.map((item, index) => (
                    <span key={item.name} className="fa-ai-chart-tip-row" data-slot={index + 1}>
                      <span className="fa-ai-chart-key" aria-hidden />
                      <span className="fa-ai-chart-tip-name">{item.name}</span>
                      <span data-numeric>{formatValue(item.values[hover] ?? 0, result.unit)}</span>
                    </span>
                  ))}
                </div>
              </>
            ) : null}
          </div>
          <div className="fa-ai-chart-xaxis" aria-hidden data-chart={result.chart}>
            {result.labels.map((label, index) => {
              const hidden = index % every !== 0 && index !== count - 1
              const x = result.chart === "bar" ? ((index + 0.5) / count) * 100 : count > 1 ? (index / (count - 1)) * 100 : 50
              const edge = result.chart === "line" && index === 0 ? "start" : result.chart === "line" && index === count - 1 ? "end" : undefined
              return hidden ? null : (
                <span key={label} data-edge={edge} style={{ "--_x": `${x}%` } as CSSProperties}>
                  {label}
                </span>
              )
            })}
          </div>
        </div>
        <figcaption id={`${id}-summary`} className="fa-ai-sr">
          {result.title}. {summary}.
        </figcaption>
      </figure>
    </ResultFrame>
  )
}

export type { ChartSeries }
