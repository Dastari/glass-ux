import { useCallback, useEffect, useRef, useState } from "react"
import type { FileChange, FileEntry, FileProvider, FileStat, FileUri } from "../../file-provider/index.js"

/** Entries asked for at a time. */
const PAGE_SIZE = 100

/** One folder as far as it has loaded. */
export interface Directory {
  /** The first page: `loading` until it arrives, `error` when it failed. */
  status: "loading" | "ready" | "error"
  /** What the first page failed with. */
  error: unknown
  /** Loaded entries, in the provider's order. Late pages append, so rows never move. */
  entries: readonly FileEntry[]
  /** More entries exist than have loaded. */
  hasMore: boolean
  /** The folder's size, when the provider says. */
  total: number | undefined
  /** The state of the next page. */
  more: "idle" | "loading" | "error"
  /** The folder itself, for its `denied`. */
  folder: FileStat | null
  /** A reload is under way behind the rows on screen. */
  refreshing: boolean
}

interface Stored extends Directory {
  key: string
}

const LOADING: Directory = { status: "loading", error: null, entries: [], hasMore: false, total: undefined, more: "idle", folder: null, refreshing: false }

function unique(entries: readonly FileEntry[]) {
  const seen = new Set<string>()
  return entries.filter((entry) => !seen.has(entry.uri) && Boolean(seen.add(entry.uri)))
}

/**
 * One folder's listing. Changing folder aborts everything in flight (AbortSignal on `stat`,
 * `readDirectory` and `watch`), and a late answer for the old folder is dropped. Refresh keeps the
 * rows until the new first page replaces them (R17.1). With `watch`, changes patch rows in place.
 */
export function useDirectory(provider: FileProvider | null, uri: FileUri | null) {
  const listable = provider?.readDirectory ? provider : null
  const key = listable && uri !== null ? `${listable.scheme}\n${uri}` : ""
  const [stored, setStored] = useState<Stored>({ ...LOADING, key: "" })
  const [generation, setGeneration] = useState(0)
  const cursor = useRef<string | null>(null)
  const task = useRef<AbortController | null>(null)
  const fetching = useRef(false)

  useEffect(() => {
    if (!listable || uri === null) return
    const controller = new AbortController()
    const { signal } = controller
    task.current = controller
    fetching.current = false
    const update = (change: (state: Stored) => Stored) => {
      if (!signal.aborted) setStored((state) => (state.key === key ? change(state) : state))
    }
    // Rows stay on screen through a refresh; a failure, or another folder, starts from the skeleton.
    setStored((state) => (state.key === key && state.status !== "error" ? { ...state, refreshing: true, more: "idle" } : { ...LOADING, key }))
    void listable.stat(uri, { signal }).then(
      (folder) => update((state) => ({ ...state, folder })),
      () => undefined
    )
    listable.readDirectory!(uri, { signal, limit: PAGE_SIZE }).then(
      (page) => {
        if (signal.aborted) return
        cursor.current = page.cursor
        update((state) => ({ ...state, status: "ready", error: null, entries: unique(page.entries), hasMore: page.cursor !== null, total: page.total, refreshing: false }))
      },
      (error: unknown) => update((state) => ({ ...state, status: "error", error, entries: [], hasMore: false, refreshing: false }))
    )
    listable.watch?.(
      uri,
      (change: FileChange) => {
        if (change.type === "deleted") {
          update((state) => ({ ...state, entries: state.entries.filter((entry) => entry.uri !== change.uri), total: state.total === undefined ? undefined : Math.max(0, state.total - 1) }))
          return
        }
        void listable.stat(change.uri, { signal }).then(
          (stat) =>
            update((state) => {
              const at = state.entries.findIndex((entry) => entry.uri === stat.uri)
              if (at >= 0) return { ...state, entries: state.entries.with(at, stat) }
              // A new entry joins the end, and waits for its page while more are to come (R17.3).
              if (state.hasMore) return state
              return { ...state, entries: [...state.entries, stat], total: state.total === undefined ? undefined : state.total + 1 }
            }),
          () => undefined
        )
      },
      { signal }
    )
    return () => controller.abort()
  }, [listable, uri, key, generation])

  const loadMore = useCallback(() => {
    const controller = task.current
    if (!listable || uri === null || !controller || fetching.current || cursor.current === null) return
    const { signal } = controller
    fetching.current = true
    setStored((state) => ({ ...state, more: "loading" }))
    listable.readDirectory!(uri, { signal, cursor: cursor.current, limit: PAGE_SIZE }).then(
      (page) => {
        if (signal.aborted) return
        fetching.current = false
        cursor.current = page.cursor
        setStored((state) => (state.key === key ? { ...state, entries: unique([...state.entries, ...page.entries]), hasMore: page.cursor !== null, total: page.total ?? state.total, more: "idle" } : state))
      },
      () => {
        if (signal.aborted) return
        fetching.current = false
        setStored((state) => (state.key === key ? { ...state, more: "error" } : state))
      }
    )
  }, [listable, uri, key])

  const refresh = useCallback(() => setGeneration((value) => value + 1), [])
  const patch = useCallback(
    (change: (entries: readonly FileEntry[]) => readonly FileEntry[]) =>
      setStored((state) => {
        const entries = change(state.entries)
        return { ...state, entries, total: state.total === undefined ? undefined : state.total + entries.length - state.entries.length }
      }),
    []
  )

  const directory: Directory = stored.key === key ? stored : LOADING
  return { directory, loadMore, refresh, patch }
}
