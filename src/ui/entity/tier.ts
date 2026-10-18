/**
 * Which tier an entity identity takes in a box (R7.2): the box decides on both axes.
 *
 *   icon     narrower than 7rem, or shorter than 1.25rem: the tile and its corner badge
 *   chip     shorter than 2.25rem: one inline line
 *   row      shorter than 3rem: a list row (one line under 2.75rem, two lines above)
 *   compact  narrower than 30rem, or shorter than 4.5rem: a small header with one ⋯
 *   header   otherwise: the page header
 *
 * A flowing box has no height of its own (`height` null), so only the width decides:
 * icon, compact or header. Rows and chips in a flowing list or a paragraph are asked for
 * explicitly.
 */
export const ENTITY_TIERS = ["header", "compact", "row", "chip", "icon"] as const
export type EntityTier = (typeof ENTITY_TIERS)[number]

/** Tier boundaries, in rem. */
export const ENTITY_TIER_LIMITS = {
  iconWidth: 7,
  iconHeight: 1.25,
  chipHeight: 2.25,
  rowHeight: 3,
  compactWidth: 30,
  compactHeight: 4.5,
} as const

/** Picks the tier for a box `widthRem` × `heightRem` in rem using `ENTITY_TIER_LIMITS`; pass `null` height for a flowing box, which yields only icon, compact or header. */
export function selectEntityTier(widthRem: number, heightRem: number | null): EntityTier {
  const limits = ENTITY_TIER_LIMITS
  if (widthRem < limits.iconWidth) return "icon"
  if (heightRem !== null) {
    if (heightRem < limits.iconHeight) return "icon"
    if (heightRem < limits.chipHeight) return "chip"
    if (heightRem < limits.rowHeight) return "row"
    if (heightRem < limits.compactHeight) return "compact"
  }
  return widthRem < limits.compactWidth ? "compact" : "header"
}
