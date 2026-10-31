import { defineMessages } from "../../../lib/i18n/catalog.js"
import { listFormat } from "../../../lib/locale/intl.js"

/**
 * The English wording of chart references (thresholds, bands, markers), x zoom and the
 * overview brush. Lists join with the locale's conjunction (Intl.ListFormat).
 */
export const chartViewMessages = defineMessages("chartView", {
  /** A threshold in the description: "Warning at 80%". */
  threshold: (label: string, value: string) => (label ? `${label} at ${value}` : value),
  thresholds: (list: string) => `Reference lines: ${list}.`,
  /** A band in the description: "Normal range, 20% to 60%". */
  band: ({ label, from, to }: { label: string; from: string; to: string }) => (label ? `${label}, ${from} to ${to}` : `${from} to ${to}`),
  bands: (list: string) => `Shaded ranges: ${list}.`,
  /** A marker in the description: "Agent restarted at 10:23". */
  marker: (label: string, at: string) => `${label} at ${at}`,
  markers: (list: string) => `Events: ${list}.`,
  /** The table column that names the event at a row. */
  eventColumn: "Event",
  resetZoom: "Reset zoom",
  /** Added to the plot's accessible name when it zooms. */
  zoomKeys: "+ and − zoom, Shift and arrows pan",
  /** Announced when the window changes. */
  showing: (from: string, to: string) => `Showing ${from} to ${to}`,
  showingAll: "Showing the whole range",
  brush: "Overview",
  /** The brush's window, a slider that pans. */
  brushWindow: "Visible range",
  brushStart: "Start of the visible range",
  brushEnd: "End of the visible range",
})

declare module "../../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    chartView: typeof chartViewMessages.defaults
  }
}

/** Join a list with the locale's "and". */
export function joinList(items: readonly string[], locale: string): string {
  try {
    return listFormat(locale, { type: "conjunction" }).format(items)
  } catch {
    return items.join(", ")
  }
}
