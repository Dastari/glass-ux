import { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { setRelativeDayLimit } from "./filters/codec.js";
import type { DataTableDensity } from "./types.js";

/**
 * Per-user table preferences (R16.3): column widths, hidden columns, pins and density,
 * stored per table id. Widths are rem.
 */
export interface TablePreferences {
  widths: Record<string, number>;
  /** Keeps the item out of the visible layout. */
  hidden: string[];
  /** Pinned column ids, or null for the column definitions' defaults. */
  pinned: string[] | null;
  density: DataTableDensity | null;
}

export const EMPTY_PREFERENCES: TablePreferences = {
  widths: {},
  hidden: [],
  pinned: null,
  density: null,
};

let storageKeyPrefix = "glass-ux.table";

/** Application-wide DataTable settings (`configureDataTables`). */
export interface DataTableConfiguration {
  /** Namespace for stored column preferences (default "glass-ux.table"). */
  storageKeyPrefix?: string;
  /**
   * The longest "last N days" / "more than N days ago" span a date filter accepts, from the
   * URL or the editor (default 36,600, about a century). Set your server's limit.
   */
  maxRelativeDays?: number;
}

/** Configure the application's table preference namespace and filter limits before rendering tables. */
export function configureDataTables(options: DataTableConfiguration) {
  storageKeyPrefix = options.storageKeyPrefix ?? "glass-ux.table";
  setRelativeDayLimit(options.maxRelativeDays);
}

const storageKey = (id: string) => `${storageKeyPrefix}.${id}.v1`;
const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? () => {} : useLayoutEffect;

function sanitise(
  value: unknown,
  defaults: TablePreferences,
): TablePreferences {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return defaults;
  const raw = value as Partial<Record<keyof TablePreferences, unknown>>;
  const widths: Record<string, number> = {};
  if (raw.widths && typeof raw.widths === "object") {
    for (const [key, width] of Object.entries(raw.widths)) {
      if (typeof width === "number" && Number.isFinite(width) && width > 0)
        widths[key] = width;
    }
  }
  const strings = (list: unknown) =>
    Array.isArray(list)
      ? list.filter((item): item is string => typeof item === "string")
      : [];
  return {
    widths,
    hidden: Array.isArray(raw.hidden) ? strings(raw.hidden) : defaults.hidden,
    pinned: Array.isArray(raw.pinned) ? strings(raw.pinned) : null,
    density:
      raw.density === "compact" || raw.density === "comfortable"
        ? raw.density
        : null,
  };
}

export function readPreferences(
  id: string,
  defaults: TablePreferences = EMPTY_PREFERENCES,
): TablePreferences {
  try {
    return sanitise(
      JSON.parse(localStorage.getItem(storageKey(id)) ?? "null"),
      defaults,
    );
  } catch {
    return defaults;
  }
}

function writePreferences(id: string, preferences: TablePreferences) {
  try {
    // An empty hidden list is an explicit opt-in to every column. Keep it even
    // when the other preferences are empty so application defaults cannot undo it.
    localStorage.setItem(storageKey(id), JSON.stringify(preferences));
  } catch {
    // Storage full or blocked: preferences last for this session only.
  }
}

/**
 * Preferences for a table id. Loads before the first paint (a layout effect, so server
 * rendering and hydration see the defaults) and writes through on every change.
 */
export function useTablePreferences(
  id: string,
  defaultHiddenColumns: readonly string[] = EMPTY_PREFERENCES.hidden,
) {
  // Callers may pass an inline array. Reload only when its contents change.
  const hiddenKey = JSON.stringify(defaultHiddenColumns);
  const defaults = useMemo<TablePreferences>(
    () => ({
      ...EMPTY_PREFERENCES,
      hidden: [...new Set<string>(JSON.parse(hiddenKey))],
    }),
    [hiddenKey],
  );
  const [preferences, setPreferences] = useState<TablePreferences>(
    () => defaults,
  );

  useIsomorphicLayoutEffect(() => {
    setPreferences(readPreferences(id, defaults));
  }, [id, defaults]);

  const update = useCallback(
    (updater: (current: TablePreferences) => TablePreferences) => {
      setPreferences((current) => {
        const next = updater(current);
        writePreferences(id, next);
        return next;
      });
    },
    [id],
  );

  return [preferences, update] as const;
}
