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
  /** Called when active occurs. The callback type specifies its arguments. */
  onActive?: (key: string | null) => void
  className?: string
}

const LOCK_REASON = "At least one series stays visible"

/** The swatch alone: identity is a coloured mark beside text, never coloured text. */
export function Swatch({ slot, tone, shape = "box", hidden = false }: { slot?: number; tone?: string; shape?: SwatchShape; hidden?: boolean }) {
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
      <ul className={cx("fa-chart-legend", className)} data-layout={layout} aria-label="Legend">
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
    <div ref={ref} className={cx("fa-chart-legend", className)} data-layout={layout} role="toolbar" aria-label="Series" tabIndex={-1} onKeyDown={onKeyDown}>
      {items.map((item, index) => {
        const off = hidden?.has(item.key) ?? false
        const locked = !off && visibleCount <= 1
        return (
          <Tooltip key={item.key} content={LOCK_REASON} enabled={locked} describe={false}>
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
        {LOCK_REASON}
      </span>
    </div>
  )
}
