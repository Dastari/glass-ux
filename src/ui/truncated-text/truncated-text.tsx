import { useCallback, useLayoutEffect, useRef, useState, type ComponentProps } from "react"
import { cx } from "../../lib/cx.js"
import { Tooltip } from "../tooltip/index.js"
import { splitMiddle } from "./split.js"

const useIsomorphicLayoutEffect = typeof window === "undefined" ? () => {} : useLayoutEffect

export interface TruncatedTextProps extends Omit<ComponentProps<"span">, "children"> {
  children: string
  /**
   * Truncate in the middle so both ends stay visible (hostnames, serials, paths):
   * `true` cuts before the last segment, a number keeps that many trailing characters.
   */
  middle?: boolean | number
  /** Tabular figures for identifiers and numbers (implied by `middle`). */
  numeric?: boolean
  /** Preferred side for the tooltip. */
  tooltipSide?: "top" | "bottom"
}

/**
 * One line of text that ends in an ellipsis when it does not fit, and shows the full text
 * in a tooltip only when it was actually cut (R8.1). It lays out as a block that fills its
 * box, so the parent decides the width; flex parents need `min-width: 0` on the slot.
 */
export function TruncatedText({ children, middle, numeric, tooltipSide = "top", className, ...rest }: TruncatedTextProps) {
  const rootRef = useRef<HTMLSpanElement>(null)
  const headRef = useRef<HTMLSpanElement>(null)
  const [truncated, setTruncated] = useState(false)

  const measure = useCallback(() => {
    const element = headRef.current ?? rootRef.current
    if (!element) return
    setTruncated(element.scrollWidth > element.clientWidth + 0.5)
  }, [])

  useIsomorphicLayoutEffect(() => {
    measure()
    const element = rootRef.current
    if (!element) return
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [measure, children, middle])

  const parts = middle ? splitMiddle(children, typeof middle === "number" ? middle : undefined) : null

  return (
    <Tooltip content={children} enabled={truncated} side={tooltipSide} arrow={false} describe={false}>
      <span
        {...rest}
        ref={rootRef}
        className={cx("fa-truncate", className)}
        data-middle={parts ? "" : undefined}
        data-numeric={numeric || parts ? "" : undefined}
        data-truncated={truncated ? "" : undefined}
        onPointerEnter={measure}
      >
        {parts ? (
          <>
            <span ref={headRef} className="fa-truncate-head">
              {parts.head}
            </span>
            <span className="fa-truncate-tail">{parts.tail}</span>
          </>
        ) : (
          children
        )}
      </span>
    </Tooltip>
  )
}
