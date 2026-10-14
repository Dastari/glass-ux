import { useCallback, useLayoutEffect, useState } from "react"
import type { DataTableDensity } from "./types.js"

/**
 * Per-user table preferences (R16.3): column widths, hidden columns, pins and density,
 * stored per table id. Widths are rem.
 */
export interface TablePreferences {
  widths: Record<string, number>
  /** Keeps the item out of the visible layout. */
  hidden: string[]
  /** Pinned column ids, or null for the column definitions' defaults. */
  pinned: string[] | null
  density: DataTableDensity | null
}

export const EMPTY_PREFERENCES: TablePreferences = { widths: {}, hidden: [], pinned: null, density: null }

let storageKeyPrefix = "glass-ux.table"

/** Configure the application's table preference namespace before rendering tables. */
export function configureDataTables(options: { storageKeyPrefix?: string }) {
  storageKeyPrefix = options.storageKeyPrefix ?? "glass-ux.table"
}

const storageKey = (id: string) => `${storageKeyPrefix}.${id}.v1`
const useIsomorphicLayoutEffect = typeof window === "undefined" ? () => {} : useLayoutEffect

function sanitise(value: unknown): TablePreferences {
  if (!value || typeof value !== "object") return EMPTY_PREFERENCES
  const raw = value as Partial<Record<keyof TablePreferences, unknown>>
  const widths: Record<string, number> = {}
  if (raw.widths && typeof raw.widths === "object") {
    for (const [key, width] of Object.entries(raw.widths)) {
      if (typeof width === "number" && Number.isFinite(width) && width > 0) widths[key] = width
    }
  }
  const strings = (list: unknown) => (Array.isArray(list) ? list.filter((item): item is string => typeof item === "string") : [])
  return {
    widths,
    hidden: strings(raw.hidden),
    pinned: Array.isArray(raw.pinned) ? strings(raw.pinned) : null,
    density: raw.density === "compact" || raw.density === "comfortable" ? raw.density : null,
  }
}

export function readPreferences(id: string): TablePreferences {
  try {
    return sanitise(JSON.parse(localStorage.getItem(storageKey(id)) ?? "null"))
  } catch {
    return EMPTY_PREFERENCES
  }
}

function writePreferences(id: string, preferences: TablePreferences) {
  try {
    const empty =
      !Object.keys(preferences.widths).length && !preferences.hidden.length && preferences.pinned === null && preferences.density === null
    if (empty) localStorage.removeItem(storageKey(id))
    else localStorage.setItem(storageKey(id), JSON.stringify(preferences))
  } catch {
    // Storage full or blocked: preferences last for this session only.
  }
}

/**
 * Preferences for a table id. Loads before the first paint (a layout effect, so server
 * rendering and hydration see the defaults) and writes through on every change.
 */
export function useTablePreferences(id: string) {
  const [preferences, setPreferences] = useState<TablePreferences>(EMPTY_PREFERENCES)

  useIsomorphicLayoutEffect(() => {
    setPreferences(readPreferences(id))
  }, [id])

  const update = useCallback(
    (updater: (current: TablePreferences) => TablePreferences) => {
      setPreferences((current) => {
        const next = updater(current)
        writePreferences(id, next)
        return next
      })
    },
    [id]
  )

  return [preferences, update] as const
}
