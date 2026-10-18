import { useRef, type ComponentProps } from "react"
import { cx } from "../../lib/cx.js"
import { useScrollEdges } from "../../lib/use-scroll-edges.js"

/** Plain numbers, percentages, sizes and durations align to the end in tabular figures. */
const NUMERIC = /^[-+]?[\d.,  ]+\s?(%|[kMGT]?B|ms|s|min|h|days?|GB|MB|°C)?$/

/** Whether cell text reads as a number (optionally with %, a byte size, a duration or °C), so it aligns to the end in tabular figures. */
export function looksNumeric(text: string) {
  const value = text.trim()
  return value.length > 0 && value.length < 24 && NUMERIC.test(value)
}

export interface TableScrollProps extends ComponentProps<"div"> {
  /** Accessible name of the scrolling region. */
  label: string
  /** Cap the height so long tables scroll inside themselves with a sticky header. */
  maxRows?: number
}

/**
 * The scroll box around an AI table: horizontal scroll for wide tables, vertical scroll past
 * `maxRows` with the header stuck, and the scrolled-edge hairlines (R5.8). Keyboard
 * scrollable (R20.6).
 */
export function TableScroll({ label, maxRows, className, style, children, ...rest }: TableScrollProps) {
  const ref = useRef<HTMLDivElement>(null)
  const edges = useScrollEdges(ref)
  return (
    <div
      {...rest}
      ref={ref}
      className={cx("fa-ai-table-scroll", className)}
      role="region"
      aria-label={label}
      // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scroll region must be keyboard scrollable (R20.6)
      tabIndex={0}
      data-scrolled-top={edges.top ? "" : undefined}
      data-scrolled-left={edges.left ? "" : undefined}
      data-scrolled-right={edges.right ? "" : undefined}
      data-capped={maxRows ? "" : undefined}
      style={maxRows ? { ...style, ["--_rows" as string]: maxRows } : style}
    >
      {children}
    </div>
  )
}
