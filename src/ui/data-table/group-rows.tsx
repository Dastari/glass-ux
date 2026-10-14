import type { RowData } from "@tanstack/react-table"
import { memo, type ReactElement } from "react"
import { IconChevronRight } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { Button } from "../button/index.js"
import { formatCount, formatNumber } from "./format.js"
import type { GroupedItem } from "./grouping.js"
import type { RowController } from "./row.js"
import type { DataTableNoun } from "./types.js"

type HeaderItem = Extract<GroupedItem<unknown>, { kind: "group" }>
type MoreItem = Extract<GroupedItem<unknown>, { kind: "more" }>

interface Placement {
  /** Index of the current item. */
  index: number
  ariaRowIndex: number
  /** Offset from the top of the body (px); undefined in the card list, where items flow. */
  top?: number
  /** The roving tab stop. */
  active: boolean
  /** Cells the header spans (aria-colspan). */
  colSpan: number
  /** Singular and plural names used in counts and accessible labels. */
  noun: DataTableNoun
  controller: RowController
}

/**
 * A group's header row: chevron, glyph, name and the server's count ("Phones · 8"), then its
 * detail ("Yealink ×8"). The whole row toggles the group: click, Enter or Space, ← to collapse
 * and → to expand; Alt-click (Alt+Enter) sets every group the same way.
 */
function GroupHeaderView({ item, index, ariaRowIndex, top, active, colSpan, noun, controller }: Placement & { item: HeaderItem }) {
  const { group, collapsed } = item
  const tabIndex = active ? 0 : -1
  return (
    <div
      role="row"
      className={cx("fa-dt-row", "fa-dt-group-row")}
      aria-rowindex={ariaRowIndex}
      tabIndex={tabIndex}
      data-index={index}
      data-item="group"
      data-group-id={group.id}
      data-collapsed={collapsed ? "" : undefined}
      style={top === undefined ? undefined : { transform: `translateY(${top}px)` }}
    >
      <div role="gridcell" className="fa-dt-group-cell" aria-colspan={colSpan}>
        <button
          type="button"
          className="fa-dt-group-toggle"
          aria-expanded={!collapsed}
          aria-label={`${group.label}, ${formatCount(group.count, noun)}`}
          tabIndex={tabIndex}
          data-dt-interactive=""
          onClick={(event) => controller.toggleGroup(group.id, event.altKey)}
        >
          <span className="fa-dt-group-chevron" aria-hidden>
            <IconChevronRight />
          </span>
          {group.icon ? <span className="fa-dt-group-icon">{group.icon}</span> : null}
          <span className="fa-dt-group-label">{group.label}</span>
          <span className="fa-dt-group-count" data-numeric aria-hidden>
            {formatNumber(group.count)}
          </span>
          {group.detail ? (
            <span className="fa-dt-group-detail" aria-hidden>
              {group.detail}
            </span>
          ) : null}
        </button>
      </div>
    </div>
  )
}

export const GroupHeaderRow = memo(GroupHeaderView) as (props: Placement & { item: HeaderItem }) => ReactElement

/** "Show 25 more" under a group the server has more rows for, with how many are shown. */
function GroupMoreView({ item, index, ariaRowIndex, top, active, colSpan, controller }: Placement & { item: MoreItem }) {
  const { group, loaded, next, pending } = item
  const tabIndex = active ? 0 : -1
  return (
    <div
      role="row"
      className={cx("fa-dt-row", "fa-dt-more-row")}
      aria-rowindex={ariaRowIndex}
      tabIndex={tabIndex}
      data-index={index}
      data-item="more"
      data-group-id={group.id}
      style={top === undefined ? undefined : { transform: `translateY(${top}px)` }}
    >
      <div role="gridcell" className="fa-dt-more-cell" aria-colspan={colSpan}>
        <Button
          size="sm"
          variant="ghost"
          className="fa-dt-more-button"
          status={pending ? "pending" : "idle"}
          tabIndex={tabIndex}
          data-dt-interactive=""
          aria-label={`Show ${formatNumber(next)} more in ${group.label}`}
          onClick={() => controller.showMore(group.id)}
        >
          {`Show ${formatNumber(next)} more`}
        </Button>
        <span className="fa-dt-more-meta" data-numeric>
          {`${formatNumber(loaded)} of ${formatNumber(group.count)}`}
        </span>
      </div>
    </div>
  )
}

export const GroupMoreRow = memo(GroupMoreView) as (props: Placement & { item: MoreItem }) => ReactElement

/** A header or "Show more" line, placed (virtual rows) or flowing (cards). */
export function GroupLine<T extends RowData>({ item, ...placement }: Placement & { item: Exclude<GroupedItem<T>, { kind: "row" }> }) {
  return item.kind === "group" ? <GroupHeaderRow item={item} {...placement} /> : <GroupMoreRow item={item} {...placement} />
}
