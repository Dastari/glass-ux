import type { CSSProperties, ElementType, ReactNode } from "react"
import { cx } from "../../lib/cx.js"

/** The type roles from tokens.css: size, line height, weight and tracking together. */
export type TextVariant = "display" | "headline" | "title" | "subtitle" | "body" | "label" | "caption" | "overline"

/**
 * Text colour roles: `default` (--fg), `muted` (secondary), `subtle` (metadata), `accent`,
 * and the status text roles. Status colours carry meaning only.
 */
export type TextTone = "default" | "muted" | "subtle" | "accent" | "success" | "warning" | "danger" | "info"

export interface TextProps {
  /** The element: `p` (default), `span`, `div`, `label`, `time`… */
  as?: ElementType
  /** The type role. Default `body`. */
  variant?: TextVariant
  tone?: TextTone
  /** `medium` or `semibold` over the role's own weight. */
  weight?: "regular" | "medium" | "semibold"
  /** Tabular, aligned figures for numbers that change or line up. */
  numeric?: boolean
  /** The code face. */
  mono?: boolean
  /** Cut to one line with an ellipsis (`true`), or to a number of lines. Pair with a tooltip or the full text nearby. */
  truncate?: boolean | number
  /** Text alignment, in the reading direction. */
  align?: "start" | "center" | "end"
  className?: string
  id?: string
  title?: string
  children?: ReactNode
  [attribute: `data-${string}` | `aria-${string}`]: unknown
}

/**
 * Text in one of the type roles, with a colour role. It sets type, not layout: margins
 * belong to the container (Stack's gap).
 */
export function Text({ as: Element = "p", variant = "body", tone, weight, numeric, mono, truncate, align, className, children, ...rest }: TextProps) {
  const lines = typeof truncate === "number" && truncate > 1 ? truncate : undefined
  return (
    <Element
      {...rest}
      className={cx("fa-text", className)}
      data-variant={variant}
      data-tone={tone && tone !== "default" ? tone : undefined}
      data-weight={weight && weight !== "regular" ? weight : undefined}
      data-numeric={numeric ? "" : undefined}
      data-mono={mono ? "" : undefined}
      data-truncate={truncate ? (lines ? "lines" : "line") : undefined}
      data-align={align}
      style={lines ? ({ "--_lines": String(lines) } as CSSProperties) : undefined}
    >
      {children}
    </Element>
  )
}

export interface HeadingProps extends Omit<TextProps, "as" | "variant"> {
  /** The heading level: the element (h1–h6) and the document outline. */
  level: 1 | 2 | 3 | 4 | 5 | 6
  /** The look, independent of the level. Default by level: 1 display, 2 headline, 3 title, 4 subtitle, 5–6 label. */
  variant?: TextVariant
}

const HEADING_VARIANT: Record<HeadingProps["level"], TextVariant> = { 1: "display", 2: "headline", 3: "title", 4: "subtitle", 5: "label", 6: "label" }

/** A heading whose level (the outline) and look (the type role) are set separately. */
export function Heading({ level, variant, ...rest }: HeadingProps) {
  return <Text {...rest} as={`h${level}`} variant={variant ?? HEADING_VARIANT[level]} />
}
