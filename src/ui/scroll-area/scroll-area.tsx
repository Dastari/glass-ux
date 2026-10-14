import { ScrollArea as BaseScrollArea } from "@base-ui/react/scroll-area"
import { useRef, type ReactNode } from "react"
import { cx } from "../../lib/cx.js"
import { useScrollEdges } from "../../lib/use-scroll-edges.js"

export interface ScrollAreaProps {
  children: ReactNode
  /** Which axes scroll. */
  orientation?: "vertical" | "horizontal" | "both"
  /**
   * What marks an edge with content beyond it (R5.8):
   *   hairline  a 1px line at the scrolled edge (lists under a header, above a footer)
   *   fade      a soft mask (strips of chips, previews)
   *   none
   */
  edges?: "hairline" | "fade" | "none"
  /** Names the scrolling region when it holds more than a list (makes it a landmark-free
   *  focusable region for keyboard scrolling). */
  "aria-label"?: string
  className?: string
}

/**
 * A scrolling region with thin glass scrollbars that appear while you hover or scroll, and
 * `data-scrolled-top|bottom|left|right` on the root for edge treatments. Fills its box; give
 * the parent a height.
 */
export function ScrollArea({ children, orientation = "vertical", edges = "hairline", className, "aria-label": label }: ScrollAreaProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const scrolled = useScrollEdges(viewportRef)
  const vertical = orientation !== "horizontal"
  const horizontal = orientation !== "vertical"
  return (
    <BaseScrollArea.Root
      className={cx("fa-scroll", className)}
      data-edges={edges}
      data-orientation={orientation}
      data-scrolled-top={scrolled.top ? "" : undefined}
      data-scrolled-bottom={scrolled.bottom ? "" : undefined}
      data-scrolled-left={scrolled.left ? "" : undefined}
      data-scrolled-right={scrolled.right ? "" : undefined}
    >
      {/* Focusable so the keyboard can scroll it (WCAG 2.1.1); named when it is a region. */}
      <BaseScrollArea.Viewport
        ref={viewportRef}
        className="fa-scroll-viewport"
        tabIndex={0}
        aria-label={label}
        role={label ? "region" : undefined}
        data-scroll-container
      >
        <BaseScrollArea.Content className="fa-scroll-content">{children}</BaseScrollArea.Content>
      </BaseScrollArea.Viewport>
      {vertical ? (
        <BaseScrollArea.Scrollbar orientation="vertical" className="fa-scroll-bar">
          <BaseScrollArea.Thumb className="fa-scroll-thumb" />
        </BaseScrollArea.Scrollbar>
      ) : null}
      {horizontal ? (
        <BaseScrollArea.Scrollbar orientation="horizontal" className="fa-scroll-bar">
          <BaseScrollArea.Thumb className="fa-scroll-thumb" />
        </BaseScrollArea.Scrollbar>
      ) : null}
      {vertical && horizontal ? <BaseScrollArea.Corner className="fa-scroll-corner" /> : null}
    </BaseScrollArea.Root>
  )
}
