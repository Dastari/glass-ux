import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react"
import {
  APPEARANCE_STORAGE_KEY,
  defaultAppearance,
  applyAppearance,
  normalizeAppearance,
  resolveMode,
  type Appearance,
} from "./appearance.js"

interface AppearanceContextValue {
  appearance: Appearance
  update: (patch: Partial<Appearance>) => void
  reset: () => void
  resolvedMode: "light" | "dark"
}

const AppearanceContext = createContext<AppearanceContextValue | null>(null)

/* ── Stored preferences: a tiny external store over localStorage ─────────────── */
const listeners = new Set<() => void>()
let cachedRaw: string | null | undefined
let cached: Appearance | undefined

function readAppearance(): Appearance {
  const raw = localStorage.getItem(APPEARANCE_STORAGE_KEY)
  if (raw !== cachedRaw || !cached) {
    cachedRaw = raw
    try {
      cached = normalizeAppearance(JSON.parse(raw ?? "null"))
    } catch {
      cached = defaultAppearance()
    }
  }
  return cached
}

// The server (and hydration) snapshot must be a stable object.
let serverCached: Appearance | undefined
const serverAppearance = () => (serverCached ??= defaultAppearance())

function subscribeAppearance(notify: () => void) {
  listeners.add(notify)
  const onStorage = (event: StorageEvent) => {
    if (event.key === APPEARANCE_STORAGE_KEY) notify()
  }
  window.addEventListener("storage", onStorage)
  return () => {
    listeners.delete(notify)
    window.removeEventListener("storage", onStorage)
  }
}

function writeAppearance(next: Appearance | null) {
  if (next) localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(next))
  else localStorage.removeItem(APPEARANCE_STORAGE_KEY)
  for (const notify of listeners) notify()
}

/* ── OS colour scheme ─────────────────────────────────────────────────────────── */
const DARK_QUERY = "(prefers-color-scheme: dark)"
function subscribeScheme(notify: () => void) {
  const query = matchMedia(DARK_QUERY)
  query.addEventListener("change", notify)
  return () => query.removeEventListener("change", notify)
}

/** Provide persisted appearance preferences and synchronize theme, palette, density, motion and typography with the document. */
export function AppearanceProvider({ children }: { children: ReactNode }) {
  const appearance = useSyncExternalStore(subscribeAppearance, readAppearance, serverAppearance)
  const prefersDark = useSyncExternalStore(
    subscribeScheme,
    () => matchMedia(DARK_QUERY).matches,
    () => false
  )

  // Keep <html> in step after the boot script's first paint.
  useEffect(() => {
    applyAppearance(document.documentElement, appearance, prefersDark)
  }, [appearance, prefersDark])

  // Mark the document interactive once React has hydrated (tests wait on this).
  useEffect(() => {
    document.documentElement.dataset.hydrated = ""
  }, [])

  const update = useCallback((patch: Partial<Appearance>) => {
    writeAppearance(normalizeAppearance({ ...readAppearance(), ...patch }))
  }, [])
  const reset = useCallback(() => writeAppearance(null), [])

  const value = useMemo<AppearanceContextValue>(
    () => ({ appearance, update, reset, resolvedMode: resolveMode(appearance.mode, prefersDark) }),
    [appearance, update, reset, prefersDark]
  )

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>
}

export function useAppearance() {
  const context = useContext(AppearanceContext)
  if (!context) throw new Error("useAppearance must be used inside AppearanceProvider")
  return context
}
