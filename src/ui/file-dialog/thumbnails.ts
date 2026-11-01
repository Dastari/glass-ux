import { useEffect, useRef, useState } from "react"
import type { FileEntry, FileProvider } from "../../file-provider/index.js"

/** At most this many requests run at once. */
const MAX_REQUESTS = 4
/** Thumbnails kept for one open dialog. */
const MAX_CACHED = 400

interface Job {
  run: () => Promise<void>
  signal: AbortSignal
}

/** Thumbnails for one open dialog: capped requests, cached by uri and version. */
export interface ThumbnailStore {
  /** A cached source: a string, null when the file has none, undefined when not asked yet. */
  peek: (entry: FileEntry) => string | null | undefined
  /** Asks the provider, in turn. Aborting takes a waiting request out of the queue. */
  request: (provider: FileProvider, entry: FileEntry, width: number, height: number, signal: AbortSignal) => Promise<string | null>
  /** Frees every object URL. */
  dispose: () => void
}

const cacheKey = (entry: FileEntry) => `${entry.uri}\n${entry.version ?? entry.modified ?? ""}`

/** The thumbnail store. A store outlives rows, so a row that scrolls back finds its picture. */
export function createThumbnailStore(): ThumbnailStore {
  const cache = new Map<string, string | null>()
  const queue: Job[] = []
  let active = 0

  const remember = (key: string, source: string | null) => {
    cache.delete(key)
    cache.set(key, source)
    if (cache.size <= MAX_CACHED) return
    const [oldest, url] = cache.entries().next().value as [string, string | null]
    cache.delete(oldest)
    if (url?.startsWith("blob:")) URL.revokeObjectURL(url)
  }
  const pump = () => {
    while (active < MAX_REQUESTS) {
      const job = queue.shift()
      if (!job) return
      if (job.signal.aborted) continue
      active += 1
      void job.run().finally(() => {
        active -= 1
        pump()
      })
    }
  }

  return {
    peek: (entry) => cache.get(cacheKey(entry)),
    request: (provider, entry, width, height, signal) =>
      new Promise<string | null>((resolve, reject) => {
        const run = async () => {
          try {
            signal.throwIfAborted()
            const found = await provider.thumbnail!(entry.uri, { signal, width, height, ...(entry.version ? { version: entry.version } : null) })
            signal.throwIfAborted()
            const source = !found ? null : "url" in found ? found.url : URL.createObjectURL(new Blob([found.bytes as BlobPart], { type: found.mime }))
            remember(cacheKey(entry), source)
            resolve(source)
          } catch (error) {
            reject(error)
          }
        }
        queue.push({ run, signal })
        signal.addEventListener("abort", () => reject(signal.reason), { once: true })
        pump()
      }),
    dispose: () => {
      for (const url of cache.values()) if (url?.startsWith("blob:")) URL.revokeObjectURL(url)
      cache.clear()
      queue.length = 0
    },
  }
}

/**
 * A row's thumbnail source. The request stops when the row leaves the virtual window, and a
 * failed one leaves the row's icon in place.
 */
export function useThumbnail(store: ThumbnailStore, provider: FileProvider, entry: FileEntry) {
  const frame = useRef<HTMLSpanElement>(null)
  const available = entry.kind === "file" && Boolean(provider.thumbnail)
  const key = cacheKey(entry)
  const [loaded, setLoaded] = useState<{ key: string; source: string | null } | null>(null)
  const cached = available ? store.peek(entry) : null
  useEffect(() => {
    if (!available || cached !== undefined) return
    const controller = new AbortController()
    const scale = window.devicePixelRatio || 1
    const box = frame.current?.getBoundingClientRect()
    const width = Math.ceil((box?.width || 64) * scale)
    const height = Math.ceil((box?.height || 64) * scale)
    store.request(provider, entry, width, height, controller.signal).then(
      (source) => setLoaded({ key, source }),
      () => undefined
    )
    return () => controller.abort()
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- the key stands for the entry
  }, [store, provider, key, available, cached])
  return { frame, source: (cached ?? (loaded?.key === key ? loaded.source : null)) as string | null }
}
