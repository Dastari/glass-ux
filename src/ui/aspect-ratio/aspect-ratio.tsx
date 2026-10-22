import type { ComponentProps, CSSProperties } from "react"
import { cx } from "../../lib/cx.js"
import type { SurfaceRadius } from "../surface/index.js"

/** A width:height ratio: a number (`16 / 9`) or a `"w / h"` string such as a display's `"2560 / 1440"`. */
export type AspectRatioValue = number | string

/** Corner role: a Surface radius, or `media` for images and screens inside content. */
export type AspectRatioRadius = SurfaceRadius | "media"

export interface AspectRatioProps extends ComponentProps<"div"> {
  /** Width divided by height, or a `"w / h"` string. Zero, negative or unreadable ratios fall back to 1. Default 1. */
  ratio?: AspectRatioValue
  /** `object-fit` for an img, video or canvas child. Unset, the child stretches to the box. */
  fit?: "contain" | "cover"
  /** The tallest the box may be. When it applies, the box narrows to keep its ratio and centres in its row. */
  maxHeight?: CSSProperties["maxHeight"]
  /** Corner role, clipped through to the children. Default `media`. */
  radius?: AspectRatioRadius
}

/**
 * Reads a ratio. Accepts a positive finite number, or `"w / h"`, `"w/h"` or a single number as a
 * string; anything else returns 1.
 */
export function parseAspectRatio(ratio: AspectRatioValue | undefined): number {
  if (typeof ratio === "number") return Number.isFinite(ratio) && ratio > 0 ? ratio : 1
  if (typeof ratio !== "string") return 1
  const [w, h, extra] = ratio.split("/").map((part) => part.trim())
  if (extra !== undefined || !w) return 1
  const value = h === undefined ? Number(w) : Number(w) / Number(h)
  return Number.isFinite(value) && value > 0 ? value : 1
}

/**
 * A box that keeps a width:height ratio at any width and fills it with its children: each
 * direct child is placed at inset 0. Use it for screen previews, video and images whose shape
 * is known before they load, so nothing moves when they arrive. It has no glass of its own:
 * put it in a Panel or tile.
 */
export function AspectRatio({ ratio, fit, maxHeight, radius = "media", className, style, ...rest }: AspectRatioProps) {
  const value = parseAspectRatio(ratio)
  return (
    <div
      {...rest}
      className={cx("fa-aspect-ratio", className)}
      data-radius={radius}
      data-fit={fit}
      data-max-height={maxHeight === undefined ? undefined : ""}
      style={{
        ...style,
        "--fa-aspect-ratio": value,
        ...(maxHeight === undefined ? null : { "--fa-aspect-max-height": typeof maxHeight === "number" ? `${maxHeight}px` : maxHeight }),
      } as CSSProperties}
    />
  )
}
