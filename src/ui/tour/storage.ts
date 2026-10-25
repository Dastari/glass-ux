/**
 * Remembering that a person finished (or skipped) a tour. The key is the application's:
 * include the user and the tour's version ("onboarding:v2:user-42") so each person sees it
 * once per version. Stored in localStorage under `glass-ux.tour.<key>`; storage that is
 * unavailable (private mode, a server render) reads as not completed.
 */
import { useCallback, useSyncExternalStore } from "react"

const PREFIX = "glass-ux.tour."
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((listener) => listener())

/** Whether the tour stored under `key` was completed or skipped. */
export function tourCompleted(key: string): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage.getItem(PREFIX + key) !== null
  } catch {
    return false
  }
}

/** Record that the tour stored under `key` was completed (or skipped). */
export function markTourCompleted(key: string): void {
  try {
    localStorage.setItem(PREFIX + key, new Date().toISOString())
  } catch {
    // Storage unavailable: the tour shows again next time.
  }
  notify()
}

/** Forget the tour stored under `key`, so it shows again. */
export function resetTour(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key)
  } catch {
    // Nothing stored.
  }
  notify()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  const onStorage = (event: StorageEvent) => event.key?.startsWith(PREFIX) && listener()
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage)
  return () => {
    listeners.delete(listener)
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage)
  }
}

/** What `useTourCompletion` returns. */
export interface TourCompletion {
  /** The tour was completed or skipped. */
  completed: boolean
  /** Record it as completed. */
  markCompleted: () => void
  /** Forget it, so the tour shows again (a "Show the tour again" setting). */
  reset: () => void
}

/**
 * Whether the tour stored under `key` was completed, kept current across components and
 * tabs, with functions to record and forget it. Pass the same key to Tour's `storageKey`.
 */
export function useTourCompletion(key: string): TourCompletion {
  const completed = useSyncExternalStore(
    subscribe,
    () => tourCompleted(key),
    () => false,
  )
  const markCompleted = useCallback(() => markTourCompleted(key), [key])
  const reset = useCallback(() => resetTour(key), [key])
  return { completed, markCompleted, reset }
}
