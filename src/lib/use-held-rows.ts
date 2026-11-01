import { useState } from "react"

export interface HeldRowsOptions {
  /** Hold new rows. Off, every row shows and counts as seen: use it while a whole list is being replaced. Default true. */
  enabled?: boolean
  /** Rows after the last one shown: `show` for a list that pages at its end, `hold` where the end is what arrives. Default `show`. */
  appended?: "show" | "hold"
  /** Rows that show at once all the same, such as the person's own comment. */
  passes?: (id: string) => boolean
}

export interface HeldRows {
  /** The rows waiting, in list order. */
  held: ReadonlySet<string>
  /** Show every waiting row. */
  reveal: () => void
}

/**
 * New rows wait behind a count instead of moving the rows under the pointer (R17.3). A row is
 * held when it would land before a row already shown. Rows arriving in a list with nothing
 * shown have nothing to displace, so they show at once. `ids` is the whole list, in order.
 */
export function useHeldRows(ids: readonly string[], { enabled = true, appended = "show", passes }: HeldRowsOptions = {}): HeldRows {
  const [seen, setSeen] = useState<ReadonlySet<string>>(() => new Set(ids))
  const last = ids.findLastIndex((id) => seen.has(id))
  const held = new Set<string>()
  const fresh: string[] = []
  ids.forEach((id, index) => {
    if (seen.has(id)) return
    if (enabled && last >= 0 && (index < last || appended === "hold") && !passes?.(id)) held.add(id)
    else fresh.push(id)
  })
  // Adjusting state while rendering: the rows above were decided against what was already seen.
  if (fresh.length) setSeen(new Set([...seen, ...fresh]))
  return { held, reveal: () => setSeen(new Set([...seen, ...ids])) }
}
