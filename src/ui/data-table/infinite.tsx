import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from "react"
import { IconAlert } from "../../icons/generated/icons.js"
import { RetryButton, SkeletonRow } from "./body.js"
import { SkeletonCards, type CardLayout } from "./cards.js"
import type { ColumnInfo } from "./row.js"
import type { DataTableInfinite } from "./types.js"

/**
 * Infinite loading (DataTableInfinite): when to ask the host for the next batch. One request
 * per batch — keyed by the result and the number of rows loaded, so a batch that adds nothing
 * is never requested in a loop — and none while one is in flight, loading or failed.
 */
export interface LoadMore {
  /** The list has an end line: the server has more rows. */
  active: boolean
  /** Why the last batch failed (the host's `error`, or a rejected `onLoadMore`). */
  error: ReactNode
  /** Automatic requests wait: a batch is loading, in flight or failed, or the rows are being replaced. */
  waiting: boolean
  /** Changes whenever another automatic request may be due (the end line re-checks its place). */
  revision: string
  /** Near the end of the loaded rows: request the next batch unless it was requested already. */
  request: () => void
  /** Retry after a failure. */
  retry: () => void
}

export function useLoadMore({
  infinite,
  resultKey,
  loaded,
  refetching,
  failedMessage,
}: {
  infinite: DataTableInfinite | undefined
  /** Identity of the result (sort, filters, search, query): a new one starts a new list. */
  resultKey: string
  /** Rows loaded so far. */
  loaded: number
  /** A new result is on its way: the rows shown are the last one's, so ask for no more of them. */
  refetching: boolean
  /** Shown when `onLoadMore` rejects and the host gives no `error`. */
  failedMessage: string
}): LoadMore {
  const batch = `${resultKey}\u0000${loaded}`
  const latest = useRef({ infinite, batch, refetching })
  latest.current = { infinite, batch, refetching }
  const inFlight = useRef(false)
  const requested = useRef<string | null>(null)
  const [busy, setBusy] = useState(false)
  // A rejected batch, until the rows or the result change.
  const [failed, setFailed] = useState<string | null>(null)

  const run = useCallback(() => {
    const { infinite: current, batch: key } = latest.current
    if (!current || inFlight.current) return
    inFlight.current = true
    setFailed(null)
    const settle = (ok: boolean) => {
      inFlight.current = false
      setBusy(false)
      if (!ok) setFailed(key)
    }
    let result: unknown
    try {
      result = current.onLoadMore()
    } catch {
      settle(false)
      return
    }
    if (result && typeof (result as PromiseLike<unknown>).then === "function") {
      setBusy(true)
      ;(result as PromiseLike<unknown>).then(
        () => settle(true),
        () => settle(false)
      )
    } else {
      inFlight.current = false
    }
  }, [])

  const hostError = infinite?.error
  const error = hostError ?? (failed === batch ? failedMessage : null)
  const active = Boolean(infinite?.hasMore)
  const waiting = !active || refetching || Boolean(infinite?.loadingMore) || busy || Boolean(error)

  const request = useCallback(() => {
    const { infinite: current, batch: key, refetching: replacing } = latest.current
    if (!current?.hasMore || current.loadingMore || current.error || replacing || inFlight.current) return
    if (requested.current === key) return
    requested.current = key
    run()
  }, [run])

  return { active, error, waiting, revision: `${batch}\u0000${waiting}`, request, retry: run }
}

/** The element whose box decides when the end line is near: the table's scroller, else the nearest scrolling ancestor (null: the viewport). */
function scrollRoot(element: HTMLElement, scroller: HTMLElement | null): Element | null {
  if (scroller && scroller.contains(element) && scroller.scrollHeight > scroller.clientHeight) return scroller
  for (let node = element.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node)
    if ((overflowY === "auto" || overflowY === "scroll") && node.scrollHeight > node.clientHeight) return node
  }
  return null
}

/**
 * Calls `load.request()` while the element is within one screen of its scroll box's end. The
 * observer is renewed with each batch, so a short batch that leaves the end in view asks again.
 */
export function useNearEnd(ref: RefObject<HTMLElement | null>, load: LoadMore, scrollRef: RefObject<HTMLElement | null>) {
  const { revision, waiting, request } = load
  useEffect(() => {
    const element = ref.current
    if (!element || waiting || typeof IntersectionObserver === "undefined") return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) request()
      },
      { root: scrollRoot(element, scrollRef.current), rootMargin: "0px 0px 100% 0px" }
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref, scrollRef, revision, waiting, request])
}

/** The end line's failure: what failed, and Retry. */
function LoadMoreError({ error, onRetry }: { error: ReactNode; onRetry: () => void }) {
  return (
    <>
      <IconAlert className="fa-dt-message-icon" />
      <span className="fa-dt-load-text">{error}</span>
      <RetryButton onRetry={onRetry} />
    </>
  )
}

/**
 * The line after the last row while the server has more: a placeholder row in the row box,
 * or the failure with Retry. It holds its place either way, so nothing moves when it changes.
 */
export function LoadMoreRow({
  load,
  scrollRef,
  top,
  ariaRowIndex,
  colSpan,
  columns,
  selectable,
  grip,
}: {
  load: LoadMore
  scrollRef: RefObject<HTMLElement | null>
  /** Offset from the top of the body (px). */
  top: number
  ariaRowIndex: number
  /** Cells the failure line spans. */
  colSpan: number
  /** The visible columns, for the placeholder's cells. */
  columns: readonly ColumnInfo[]
  selectable: boolean
  /** Reserve the reorder grip column. */
  grip: boolean
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  useNearEnd(ref, load, scrollRef)
  if (load.error) {
    return (
      <div
        ref={ref}
        role="row"
        className="fa-dt-row fa-dt-load-row"
        aria-rowindex={ariaRowIndex}
        data-state="error"
        style={{ transform: `translateY(${top}px)` }}
      >
        <div role="gridcell" className="fa-dt-load-cell" aria-colspan={colSpan}>
          <LoadMoreError error={load.error} onRetry={load.retry} />
        </div>
      </div>
    )
  }
  return (
    <SkeletonRow
      ref={ref}
      seed={0}
      top={`${top}px`}
      columns={columns}
      selectable={selectable}
      grip={grip}
      className="fa-dt-load-row"
    />
  )
}

/** The card list's end line: a placeholder card, or the failure with Retry. */
export function LoadMoreCard({
  load,
  scrollRef,
  layout,
  selectable,
  actions,
  grip,
}: {
  load: LoadMore
  scrollRef: RefObject<HTMLElement | null>
  /** The card layout, for the placeholder's slots. */
  layout: CardLayout
  selectable: boolean
  /** Reserve the row-action controls. */
  actions: boolean
  /** Reserve the reorder grip. */
  grip: boolean
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  useNearEnd(ref, load, scrollRef)
  if (load.error) {
    return (
      <div ref={ref} role="row" className="fa-dt-load-row" data-state="error">
        <div role="gridcell" className="fa-dt-load-cell">
          <LoadMoreError error={load.error} onRetry={load.retry} />
        </div>
      </div>
    )
  }
  return (
    <div ref={ref} className="fa-dt-load-card" aria-hidden>
      <SkeletonCards count={1} layout={layout} selectable={selectable} actions={actions} grip={grip} />
    </div>
  )
}
