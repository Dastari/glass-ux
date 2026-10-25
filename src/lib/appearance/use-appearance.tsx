import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react"
import {
  APPEARANCE_STORAGE_KEY,
  appearanceConfig,
  defaultAppearance,
  applyAppearance,
  normalizeAppearance,
  resolveMode,
  type Appearance,
} from "./appearance.js"
import { installShimmerSync } from "../motion.js"
import { installPointerLight } from "./optics.js"
import { installBakedFrost } from "./frost.js"

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
let cachedConfig: ReturnType<typeof appearanceConfig> | undefined
let cached: Appearance | undefined

/**
 * The defaults as one object per configuration. The server (and hydration) snapshot is this
 * object, and so is the client's while nothing different is stored, so hydrating sees an
 * unchanged store and does not re-render every consumer synchronously afterwards.
 */
let defaultsCache: { config: ReturnType<typeof appearanceConfig>; value: Appearance } | undefined
function defaults(): Appearance {
  const config = appearanceConfig()
  if (defaultsCache?.config !== config) defaultsCache = { config, value: defaultAppearance() }
  return defaultsCache.value
}

const sameAppearance = (a: Appearance, b: Appearance) => {
  const keys = Object.keys(a) as (keyof Appearance)[]
  return keys.length === Object.keys(b).length && keys.every((key) => Object.is(a[key], b[key]))
}

function readAppearance(): Appearance {
  const raw = localStorage.getItem(APPEARANCE_STORAGE_KEY)
  const config = appearanceConfig()
  if (raw !== cachedRaw || config !== cachedConfig || !cached) {
    cachedRaw = raw
    cachedConfig = config
    let next: Appearance
    try {
      next = normalizeAppearance(JSON.parse(raw ?? "null"))
    } catch {
      next = defaults()
    }
    cached = sameAppearance(next, defaults()) ? defaults() : next
  }
  return cached
}

const serverAppearance = defaults

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
  if (next) {
    try {
      localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(next))
    } catch (error) {
      // Storage is full, usually from a large picture: keep the previous preferences.
      console.warn("glass-ux: appearance not saved; use prepareBackgroundImage for pictures", error)
      return
    }
  } else localStorage.removeItem(APPEARANCE_STORAGE_KEY)
  for (const notify of listeners) notify()
}

/* ── OS colour scheme ─────────────────────────────────────────────────────────── */
const DARK_QUERY = "(prefers-color-scheme: dark)"
function subscribeScheme(notify: () => void) {
  const query = matchMedia(DARK_QUERY)
  query.addEventListener("change", notify)
  return () => query.removeEventListener("change", notify)
}

/** Provide persisted appearance preferences and synchronize theme, palette, density, motion and typography with the document. Also installs the pointer light for lit glass (`installPointerLight`), the shared shimmer beat (`installShimmerSync`) and, when the application selects baked glass rendering, the baked frost (`installBakedFrost`). */
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

  // Lit glass follows a fine pointer; it checks the motion and material switches itself.
  useEffect(() => installPointerLight(), [])
  // Skeleton shimmers sweep in one beat.
  useEffect(() => installShimmerSync(), [])
  // Baked glass rendering bakes the canvas; it does nothing while the rendering is live.
  useEffect(() => installBakedFrost(), [])

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

/**
 * The current appearance from AppearanceProvider: `appearance`, `update(patch)` (normalised
 * and stored), `reset()` (clears stored preferences) and `resolvedMode` (`light` or `dark`).
 * Throws outside an AppearanceProvider.
 */
export function useAppearance() {
  const context = useContext(AppearanceContext)
  if (!context) throw new Error("useAppearance must be used inside AppearanceProvider")
  return context
}
