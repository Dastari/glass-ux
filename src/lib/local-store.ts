/**
 * A small keyed store over localStorage for remembered component state (a sidebar's width,
 * open state and groups). Values are JSON, normalised on read, cached by their raw text so a
 * read in render is cheap, and shared across tabs through `storage` events. Storage is best
 * effort: private modes and full quotas fall back to the normalised default.
 */
const cache = new Map<string, { raw: string | null; value: unknown }>()
const listeners = new Map<string, Set<() => void>>()

function rawItem(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

/** The stored value for `key`, normalised (`normalise` receives the parsed JSON, or null). */
export function readStored<T>(key: string, normalise: (raw: unknown) => T): T {
  const raw = rawItem(key)
  const hit = cache.get(key)
  if (hit && hit.raw === raw) return hit.value as T
  let parsed: unknown = null
  try {
    parsed = JSON.parse(raw ?? "null")
  } catch {
    parsed = null
  }
  const value = normalise(parsed)
  cache.set(key, { raw, value })
  return value
}

/** Saves `value` as JSON under `key` and notifies this tab's subscribers. */
export function writeStored(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Remembered state is best effort.
  }
  for (const notify of listeners.get(key) ?? []) notify()
}

/** Calls `notify` when `key` changes in this tab (writeStored) or another (storage event). */
export function subscribeStored(key: string, notify: () => void): () => void {
  let set = listeners.get(key)
  if (!set) listeners.set(key, (set = new Set()))
  set.add(notify)
  const onStorage = (event: StorageEvent) => {
    if (event.key === key || event.key === null) notify()
  }
  window.addEventListener("storage", onStorage)
  return () => {
    set.delete(notify)
    if (!set.size) listeners.delete(key)
    window.removeEventListener("storage", onStorage)
  }
}
