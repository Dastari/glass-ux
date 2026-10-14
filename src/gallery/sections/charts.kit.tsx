/**
 * Layout helpers shared by the chart sections: skeleton swaps in the tier boxes (TierBox and
 * TierRow live in gallery/kit, shared with Metric) and a dashboard tile grid.
 */
import type { ReactNode } from "react"
import { SwapSlot, tierBoxClass } from "../kit.js"

/** Loading → loaded in place, at compact, full and micro, for the skeleton test (R9.3). */
export function SkeletonSwaps({ id, render }: { id: string; render: (state: "loading" | "ready") => ReactNode }) {
  return (
    <div className="gallery-tiers">
      <SwapSlot id={`${id}-compact`} className={tierBoxClass("compact")} skeleton={render("loading")} loaded={render("ready")} />
      <SwapSlot id={`${id}-full`} className={tierBoxClass("full")} skeleton={render("loading")} loaded={render("ready")} />
      <SwapSlot id={`${id}-micro`} className={tierBoxClass("micro")} skeleton={render("loading")} loaded={render("ready")} />
    </div>
  )
}

/** Dashboard tiles: compact charts in an auto-fill grid. */
export function TileGrid({ children }: { children: ReactNode }) {
  return <div className="charts-tiles">{children}</div>
}

export function Tile({ children }: { children: ReactNode }) {
  return <div className="glass-control charts-tile rounded-tile p-tile">{children}</div>
}
