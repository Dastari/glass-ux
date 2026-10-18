import type { ReactNode } from "react"

/**
 * The empty state's line while searching or filtering (R2.5, R16.8), built from the table's
 * noun: `No rows match "q3" and 2 filters`, `No rows match "q3"`, `No rows match these
 * filters`, or the table's own line when neither is applied.
 */
export function emptyText(noun: { other: string }, query: string, filterCount: number, fallback: ReactNode): ReactNode {
  const filtersText = `${filterCount} ${filterCount === 1 ? "filter" : "filters"}`
  if (query && filterCount) return `No ${noun.other} match "${query}" and ${filtersText}`
  if (query) return `No ${noun.other} match "${query}"`
  if (filterCount) return `No ${noun.other} match these filters`
  return fallback
}
