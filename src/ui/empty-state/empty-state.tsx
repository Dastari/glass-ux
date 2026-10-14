import type { ComponentProps, ReactNode } from "react"
import { cx } from "../../lib/cx.js"

export interface EmptyStateProps extends Omit<ComponentProps<"div">, "children"> {
  /** The thing that is missing (search, endpoint, inbox…). Pass it without a size. */
  icon: ReactNode
  /** One factual line (R2.5): `No endpoints match "orb-7"`. */
  children: ReactNode
  /** The primary way forward, if there is one: a small Button ("Clear search"). */
  action?: ReactNode
  /** `danger` for an error that occupies the same box (couldn't load). */
  tone?: "neutral" | "danger"
}

/**
 * What a list, table or pane shows when it has nothing — or failed to load — in the same box
 * the content would have used (R9.1, R16.4). It fills its box and lays out against it:
 *
 *   row     height < 10rem: icon, line and action in one row (a table body, a short list)
 *   block   10–16rem: centred, icon in a soft tile
 *   large   ≥ 16rem: centred, the 2xl icon in a larger tile
 */
export function EmptyState({ icon, children, action, tone = "neutral", className, ...rest }: EmptyStateProps) {
  return (
    <div {...rest} className={cx("fa-empty", className)} data-tone={tone} role={tone === "danger" ? "alert" : "status"}>
      <div className="fa-empty-body">
        <span className="fa-tile-icon fa-empty-tile" data-tone={tone === "danger" ? "danger" : undefined} aria-hidden>
          {icon}
        </span>
        <span className="fa-empty-glyph" aria-hidden>
          {icon}
        </span>
        <p className="fa-empty-text">{children}</p>
        {action ? <div className="fa-empty-action">{action}</div> : null}
      </div>
    </div>
  )
}
