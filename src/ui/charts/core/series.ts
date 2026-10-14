/**
 * Series identity. A series wears a categorical slot (--chart-1 … --chart-8) assigned in
 * order and kept when others hide (colour follows the entity, never its rank), or a status
 * tone when its data means that state.
 */
export type ChartTone = "success" | "warning" | "danger" | "info" | "neutral"

/** Slots available before series fold into "Other". */
export const SLOT_COUNT = 8

/** CSS hooks for a series' colour: a categorical slot (1–8) or a status tone. */
export function seriesAttrs(slot: number | undefined, tone?: string) {
  return { "data-slot": tone ? undefined : String(slot ?? 1), "data-tone": tone }
}

/** The slot for the series at `index`, unless it pins its own. Never cycles past 8. */
export function slotFor(index: number, pinned?: number): number {
  return pinned ?? Math.min(SLOT_COUNT, index + 1)
}
