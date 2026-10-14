import type { ComponentProps, ReactNode } from "react"
import { cx } from "../../lib/cx.js"
import { Skeleton } from "../skeleton/index.js"

export interface DetailTileProps extends Omit<ComponentProps<"div">, "children"> {
  /** What the value is: "Manufacturer", "Serial number". */
  label: string
  value: ReactNode
  /** A second value line in muted text: the OS build under the OS name. */
  detail?: ReactNode
  /** Leading icon in the soft tile box. Pass it without a size. Dropped in narrow tiles. */
  icon?: ReactNode
  /** Keep the value on one line with an ellipsis (identifiers). Default: wrap up to two lines. */
  truncate?: boolean
  /** Tabular figures for serials, IPs, versions and sizes. */
  numeric?: boolean
}

/**
 * One fact about an entity: icon, caption label, value and an optional second line. Values
 * wrap to two lines then end with an ellipsis; the full value is in the title. In tiles
 * narrower than 13rem the icon box steps aside so the value keeps its room.
 */
export function DetailTile({ label, value, detail, icon, truncate = false, numeric = false, className, ...rest }: DetailTileProps) {
  const title = typeof value === "string" ? value : undefined
  const detailTitle = typeof detail === "string" ? detail : undefined
  return (
    <div {...rest} className={cx("glass-control fa-detail-tile", className)}>
      <div className="fa-detail-tile-inner">
        {icon ? (
          <span className="fa-tile-icon fa-detail-tile-icon" aria-hidden>
            {icon}
          </span>
        ) : null}
        <dl className="fa-detail-tile-text">
          <dt className="fa-detail-tile-label">{label}</dt>
          <dd
            className="fa-detail-tile-value"
            title={title}
            data-truncate={truncate ? "" : undefined}
            data-numeric={numeric ? "" : undefined}
          >
            {value}
          </dd>
          {detail ? (
            <dd className="fa-detail-tile-detail" title={detailTitle} data-numeric={numeric ? "" : undefined}>
              {detail}
            </dd>
          ) : null}
        </dl>
      </div>
    </div>
  )
}

export interface DetailTileSkeletonProps {
  icon?: boolean
  /** Additional detail for this value or request. */
  detail?: boolean
  className?: string
}

/** The exact box of a one-line DetailTile (plus its detail line when `detail`). */
export function DetailTileSkeleton({ icon = true, detail = false, className }: DetailTileSkeletonProps) {
  return (
    <div className={cx("glass-control fa-detail-tile", className)} aria-hidden data-skeleton="">
      <div className="fa-detail-tile-inner">
        {icon ? <Skeleton.Block className="fa-detail-tile-icon fa-detail-tile-skel-icon" radius="control" /> : null}
        <div className="fa-detail-tile-text">
          <Skeleton.Text type="caption" width="45%" />
          <Skeleton.Text type="body" width="70%" />
          {detail ? <Skeleton.Text type="body" width="40%" /> : null}
        </div>
      </div>
    </div>
  )
}

export interface DetailGridProps extends ComponentProps<"div"> {
  /** Smallest tile width before the grid drops a column. */
  min?: "sm" | "md" | "lg"
}

/**
 * Tiles in an auto-fill grid that reflows with its container (R5.5): as many columns as fit
 * at the minimum tile width, never a fixed count.
 */
export function DetailGrid({ min = "md", className, ...rest }: DetailGridProps) {
  return <div {...rest} className={cx("fa-detail-grid", className)} data-min={min} />
}
