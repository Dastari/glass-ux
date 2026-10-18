import type { ComponentProps, CSSProperties } from "react"
import { cx } from "../../lib/cx.js"

/** The text roles a skeleton line can stand in for (matches the type-* utilities). */
export type SkeletonTextRole =
  | "display"
  | "headline"
  | "title"
  | "subtitle"
  | "body"
  | "label"
  | "caption"
  | "overline"
  | "mono"

type Length = number | string
const len = (value: Length | undefined) => (typeof value === "number" ? `${value}px` : value)

export interface SkeletonTextProps extends Omit<ComponentProps<"span">, "children"> {
  /** The type role being replaced (`type-*`); the skeleton takes exactly its line box. */
  type?: SkeletonTextRole
  /** Number of text or skeleton lines. */
  lines?: number
  /** Width of the (last) line. Earlier lines of a multi-line block are full width. */
  width?: Length
}

/**
 * A line (or paragraph) of placeholder text that occupies the same box as the real text
 * so replacing it causes zero layout shift. Use the same `type` the content will use.
 */
function SkeletonText({ type = "body", lines = 1, width, className, style, ...rest }: SkeletonTextProps) {
  return (
    <span
      aria-hidden
      {...rest}
      className={cx("fa-skel-text", className)}
      data-type={type}
      style={{ ...style, "--_w": len(width) } as CSSProperties}
    >
      {Array.from({ length: lines }, (_, index) => (
        <span key={index} className="fa-skel-line" data-last={index === lines - 1 ? "" : undefined}>
          <span className="fa-skel fa-shimmer fa-skel-bar" />
        </span>
      ))}
    </span>
  )
}

export interface SkeletonBlockProps extends Omit<ComponentProps<"span">, "children"> {
  /** Available width or named width tier. */
  width?: Length
  /** Available height used for the component’s size tier. */
  height?: Length
  /** A radius role so the placeholder matches the thing it replaces. */
  radius?: "check" | "item" | "control" | "tile" | "surface" | "full"
}

/** A placeholder box for media, controls, tiles or icons. */
function SkeletonBlock({ width, height, radius = "control", className, style, ...rest }: SkeletonBlockProps) {
  return (
    <span
      aria-hidden
      {...rest}
      className={cx("fa-skel fa-shimmer fa-skel-block", className)}
      data-radius={radius}
      style={{ ...style, width: len(width), height: len(height) }}
    />
  )
}

function SkeletonCircle({ size = 32, className, style, ...rest }: Omit<SkeletonBlockProps, "radius" | "width" | "height"> & { size?: Length }) {
  return (
    <span
      aria-hidden
      {...rest}
      className={cx("fa-skel fa-shimmer fa-skel-block", className)}
      data-radius="full"
      style={{ ...style, width: len(size), height: len(size) }}
    />
  )
}

/** Loading placeholders for text, blocks, avatars and compound content that preserve the loaded layout. */
export const Skeleton = {
  Text: SkeletonText,
  Block: SkeletonBlock,
  Circle: SkeletonCircle,
}
