import type { CSSProperties, ElementType, ReactNode } from "react"
import { cx } from "../../lib/cx.js"

/** A gap role (tokens.css) or a step on the space scale. Roles follow density. */
export type LayoutGap =
  | "none"
  | "inline"
  | "controls"
  | "fields"
  | "tiles"
  | "panels"
  | "section"
  | "half"
  | 1
  | 1.5
  | 2
  | 2.5
  | 3
  | 4
  | 5
  | 6
  | 8
  | 10
  | 12
  | 16

const gapValue = (gap: LayoutGap) =>
  gap === "none" ? "0" : typeof gap === "number" ? `var(--space-${String(gap).replace(".", "-")})` : gap === "half" ? "var(--space-half)" : `var(--gap-${gap})`

interface LayoutBaseProps {
  /** The element. Default `div`. */
  as?: ElementType
  className?: string
  id?: string
  style?: CSSProperties
  children?: ReactNode
  [attribute: `data-${string}` | `aria-${string}`]: unknown
  role?: string
}

export interface StackProps extends LayoutBaseProps {
  /** `column` (default) or `row`, in the reading direction. */
  direction?: "column" | "row"
  /** Space between children. Default `controls` in a row and `fields` in a column. */
  gap?: LayoutGap
  align?: "start" | "center" | "end" | "stretch" | "baseline"
  justify?: "start" | "center" | "end" | "between"
  /** Let a row wrap onto more lines. */
  wrap?: boolean
}

/**
 * Children one after another with an even gap from the spacing roles: fields in a form,
 * buttons in a row, panels on a page. It owns spacing so children need no margins.
 */
export function Stack({ as: Element = "div", direction = "column", gap, align, justify, wrap, className, style, children, ...rest }: StackProps) {
  return (
    <Element
      {...rest}
      className={cx("fa-stack", className)}
      data-direction={direction}
      data-align={align}
      data-justify={justify}
      data-wrap={wrap ? "" : undefined}
      style={{ "--_gap": gapValue(gap ?? (direction === "row" ? "controls" : "fields")), ...style } as CSSProperties}
    >
      {children}
    </Element>
  )
}

export interface GridProps extends LayoutBaseProps {
  /**
   * Columns: a fixed count, or `{ min }` for as many columns as fit at least `min` wide
   * (a CSS length or variable), filling the container. Default: at least 14rem.
   */
  columns?: number | { min: string }
  /** Space between cells. Default `tiles`. */
  gap?: LayoutGap
  /** Row gap when it differs from the column gap. */
  rowGap?: LayoutGap
  align?: "start" | "center" | "end" | "stretch"
}

/** The default columns: as many as fit at a tile's width. */
const DEFAULT_COLUMNS = { min: "var(--tile-min, 14rem)" } // tokens:allow a fallback for hosts without the role

/** Cells in columns: a fixed count, or as many as fit the container at a minimum width. */
export function Grid({ as: Element = "div", columns = DEFAULT_COLUMNS, gap = "tiles", rowGap, align, className, style, children, ...rest }: GridProps) {
  const template = typeof columns === "number" ? `repeat(${columns}, minmax(0, 1fr))` : `repeat(auto-fill, minmax(min(100%, ${columns.min}), 1fr))`
  return (
    <Element
      {...rest}
      className={cx("fa-grid", className)}
      data-align={align}
      style={
        {
          "--_columns": template,
          "--_gap": gapValue(gap),
          "--_row-gap": gapValue(rowGap ?? gap),
          ...style,
        } as CSSProperties
      }
    >
      {children}
    </Element>
  )
}
