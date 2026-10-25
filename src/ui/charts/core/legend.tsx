import { useMessages } from "../../../lib/i18n/index.js"
import { chartCoreMessages } from "./messages.js"
import { useId, useRef, useState, type KeyboardEvent } from "react"
import { cx } from "../../../lib/cx.js"
import { Tooltip } from "../../tooltip/index.js"
import { seriesAttrs } from "./series.js"

export type SwatchShape = "line" | "box" | "dot"

export interface LegendItem {
  key: string
  label: string
  /** Categorical slot 1–8. */
  slot?: number
  /** Status tone, only when the series means that state. */
  tone?: string
  /** The swatch mirrors the mark: a line key for lines, a box for bars and areas. */
  shape?: SwatchShape
  /** A value shown after the label (pie and donut lists, the micro tier). */
  value?: string
  /** A second, quieter value (a share: "34%"). */
  detail?: string
}

export interface ChartLegendProps {
  items: readonly LegendItem[]
  /** Keys currently hidden. */
  hidden?: ReadonlySet<string>
  /** Makes the legend a toolbar of toggles (full tier). Omit for a passive key. */
  onToggle?: (key: string) => void
  /** `row`: one line in the head, truncating; `list`: a column with values (pie, donut). */
  layout?: "row" | "list"
  /** Highlight one item (the hovered segment). */
  active?: string | null
  /** Called with an item's key when the pointer enters it or it takes keyboard focus, and with `null` when the pointer leaves or focus moves away. Pair with `active` to control the highlight. */
  onActive?: (key: string | null) => void
  className?: string
}

function getLOCK_REASON(messages: typeof chartCoreMessages.defaults) { return messages.atLeastOneSeriesStaysVisible }


/** The swatch alone: identity is a coloured mark beside text, never coloured text. */
export function Swatch({ slot, tone, shape = "box", hidden = false }: {
  /** Categorical slot 1–8; defaults to 1. Ignored when `tone` is set. */
  slot?: number
  tone?: string
  /** Mark shape to mirror; defaults to "box". */
  shape?: SwatchShape
  /** Shows the swatch as switched off (its series is hidden); defaults to false. */
  hidden?: boolean
}) {
  return <span className="fa-chart-swatch" data-shape={shape} data-off={hidden ? "" : undefined} {...seriesAttrs(slot, tone)} aria-hidden />
}

/**
 * Series identity for two or more series (a single series needs no legend: the title names
 * it). Interactive at the full tier: each item toggles its series (aria-pressed); the legend
 * is one tab stop and the arrow keys move between items (R11.5). Keyboard focus emphasises
 * a series the same way hover does. The last visible series cannot be hidden, so the chart
 * is never empty by accident; its tooltip and description say why.
 */
export function ChartLegend({ items, hidden, onToggle, layout = "row", active, onActive, className }: ChartLegendProps) {
  const messages = useMessages(chartCoreMessages)

  const ref = useRef<HTMLDivElement>(null)
  const lockId = useId()
  // The roving tab stop: the item that last held focus, clamped when items shrink.
  const [focusIndex, setFocusIndex] = useState(0)
  const tabStop = Math.min(focusIndex, Math.max(0, items.length - 1))
  const visibleCount = items.filter((item) => !hidden?.has(item.key)).length

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"]
    if (!keys.includes(event.key)) return
    const buttons = [...(ref.current?.querySelectorAll<HTMLButtonElement>("button[data-legend-item]") ?? [])]
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement)
    if (current < 0) return
    event.preventDefault()
    const last = buttons.length - 1
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? last
          : event.key === "ArrowRight" || event.key === "ArrowDown"
            ? Math.min(last, current + 1)
            : Math.max(0, current - 1)
    setFocusIndex(next)
    buttons[next]?.focus()
  }

  if (!onToggle) {
    return (
      <ul className={cx("fa-chart-legend", className)} data-layout={layout} aria-label={messages.legend}>
        {items.map((item) => (
          <li
            key={item.key}
            className="fa-chart-legend-item"
            data-active={active === item.key ? "" : undefined}
            data-dim={active && active !== item.key ? "" : undefined}
            onPointerEnter={onActive ? () => onActive(item.key) : undefined}
            onPointerLeave={onActive ? () => onActive(null) : undefined}
          >
            <Swatch slot={item.slot} tone={item.tone} shape={item.shape} />
            <span className="fa-chart-legend-label" title={item.label}>
              {item.label}
            </span>
            {item.value ? <span className="fa-chart-legend-value">{item.value}</span> : null}
            {item.detail ? <span className="fa-chart-legend-detail">{item.detail}</span> : null}
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div ref={ref} className={cx("fa-chart-legend", className)} data-layout={layout} role="toolbar" aria-label={messages.series} tabIndex={-1} onKeyDown={onKeyDown}>
      {items.map((item, index) => {
        const off = hidden?.has(item.key) ?? false
        const locked = !off && visibleCount <= 1
        return (
          <Tooltip key={item.key} content={getLOCK_REASON(messages)} enabled={locked} describe={false}>
            <button
              type="button"
              className="fa-chart-legend-item fa-pressable"
              data-legend-item=""
              data-off={off ? "" : undefined}
              data-active={active === item.key ? "" : undefined}
              aria-pressed={!off}
              aria-disabled={locked || undefined}
              aria-describedby={locked ? lockId : undefined}
              tabIndex={index === tabStop ? 0 : -1}
              onClick={() => {
                if (!locked) onToggle(item.key)
              }}
              onFocus={() => {
                setFocusIndex(index)
                onActive?.(item.key)
              }}
              onBlur={onActive ? () => onActive(null) : undefined}
              onPointerEnter={onActive ? () => onActive(item.key) : undefined}
              onPointerLeave={onActive ? () => onActive(null) : undefined}
            >
              <Swatch slot={item.slot} tone={item.tone} shape={item.shape} hidden={off} />
              <span className="fa-chart-legend-label">{item.label}</span>
              {item.value ? <span className="fa-chart-legend-value">{item.value}</span> : null}
              {item.detail ? <span className="fa-chart-legend-detail">{item.detail}</span> : null}
            </button>
          </Tooltip>
        )
      })}
      <span id={lockId} hidden>
        {getLOCK_REASON(messages)}
      </span>
    </div>
  )
}
