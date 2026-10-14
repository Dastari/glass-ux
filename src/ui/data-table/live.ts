import type { RowData } from "@tanstack/react-table"
import { useCallback, useState } from "react"

/**
 * Live rows (R9.4, R17). Rows that change in place are patched (and flash, see row.tsx).
 * Rows that arrive while the reader is scrolled away are held back: the table keeps its
 * current order and shows an "N new" pill that applies them. A new query (sort, page,
 * filter) always replaces the rows outright.
 */
interface Snapshot<T extends RowData> {
  /** The typed source adapter or asset definition consumed by this component. */
  source: readonly T[]
  key: string
  shown: readonly T[]
  latest: readonly T[] | null
  pending: number
}

export interface LiveRows<T extends RowData> {
  /** Records or matrix rows in display order. */
  rows: readonly T[]
  /** Rows waiting behind the pill. */
  pending: number
  /** Show the held rows (and scroll to them). */
  apply: () => void
}

export function useLiveRows<T extends RowData>({
  rows,
  getRowId,
  queryKey,
  live,
  isScrolledAway,
}: {
  /** Records or matrix rows in display order. */
  rows: readonly T[]
  /** Returns a stable row identifier for selection, live updates and preferences. */
  getRowId: (row: T) => string
  queryKey: string
  live: boolean
  isScrolledAway: () => boolean
}): LiveRows<T> {
  const [snapshot, setSnapshot] = useState<Snapshot<T>>(() => ({ source: rows, key: queryKey, shown: rows, latest: null, pending: 0 }))

  let current = snapshot
  if (snapshot.source !== rows || snapshot.key !== queryKey) {
    current = advance(snapshot, rows, queryKey, live, getRowId, isScrolledAway)
    setSnapshot(current)
  }

  const apply = useCallback(() => {
    setSnapshot((value) => (value.latest ? { ...value, shown: value.latest, latest: null, pending: 0 } : value))
  }, [])

  return { rows: current.shown, pending: current.pending, apply }
}

function advance<T extends RowData>(
  previous: Snapshot<T>,
  rows: readonly T[],
  key: string,
  live: boolean,
  getRowId: (row: T) => string,
  isScrolledAway: () => boolean
): Snapshot<T> {
  const fresh = { source: rows, key, shown: rows, latest: null, pending: 0 }
  if (!live || previous.key !== key || previous.shown.length === 0 || rows.length === 0) return fresh

  const shownIds = new Set(previous.shown.map(getRowId))
  let added = 0
  for (const row of rows) if (!shownIds.has(getRowId(row))) added++
  if (added === 0 || !isScrolledAway()) return fresh

  // Keep what the reader is looking at: same order, fresh values, nothing inserted.
  const byId = new Map(rows.map((row) => [getRowId(row), row]))
  const shown = previous.shown.flatMap((row) => {
    const next = byId.get(getRowId(row))
    return next ? [next] : []
  })
  return { source: rows, key, shown, latest: rows, pending: added }
}
