import { useCallback, useSyncExternalStore } from "react"
import { pushRecent } from "./model.js"

/**
 * Recently chosen organisations, most recent first, kept per browser under `storageKey`
 * (namespace it per user) and shared by every tab. The current scope itself lives in the
 * URL, never here: this is only the switcher's Recent group.
 */
export function useRecentOrganisations(storageKey: string, limit = 6) {
  const subscribe = useCallback(
    (notify: () => void) => {
      const onStorage = (event: StorageEvent) => {
        if (event.key === storageKey) notify()
      }
      const onLocal = (event: Event) => {
        if ((event as CustomEvent<string>).detail === storageKey) notify()
      }
      window.addEventListener("storage", onStorage)
      window.addEventListener(LOCAL_EVENT, onLocal)
      return () => {
        window.removeEventListener("storage", onStorage)
        window.removeEventListener(LOCAL_EVENT, onLocal)
      }
    },
    [storageKey]
  )
  const raw = useSyncExternalStore(subscribe, () => read(storageKey), () => null)
  const recent = parse(raw)
  const remember = useCallback(
    (id: string | null) => {
      if (!id) return
      try {
        localStorage.setItem(storageKey, JSON.stringify(pushRecent(parse(read(storageKey)), id, limit)))
        window.dispatchEvent(new CustomEvent(LOCAL_EVENT, { detail: storageKey }))
      } catch {
        // Recents are a convenience; a blocked storage loses nothing else.
      }
    },
    [storageKey, limit]
  )
  return { recent, remember }
}

const LOCAL_EVENT = "fa-recent-organisations"

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

const cache = new Map<string, string[]>()
const EMPTY: string[] = []

/** Parsed once per stored string, so the snapshot is stable between renders. */
function parse(raw: string | null): string[] {
  if (!raw) return EMPTY
  const hit = cache.get(raw)
  if (hit) return hit
  let value: string[] = EMPTY
  try {
    const parsed: unknown = JSON.parse(raw)
    if (Array.isArray(parsed)) value = parsed.filter((item): item is string => typeof item === "string")
  } catch {
    value = EMPTY
  }
  cache.set(raw, value)
  return value
}
