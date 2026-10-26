import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for map. */
export const mapMessages = defineMessages("map", {
  critical: "Critical",
  warning: "Warning",
  healthy: "Healthy",
  offline: "Offline",
  viewAsList: "View as list",
  viewAsMap: "View as map",
  mapDataAndLicences: "Map data and licences",
  mapData: "Map data",
  showAll: (count: string, noun: string) => `Show all ${count} ${noun}`,
  resetTo: (name: string) => `Reset to ${name}`,
  resetView: "Reset view",
  theMapCouldNotStart: "The map could not start",
  theMapIsLoading: "The map is loading",
  markerInstructions: ({ count, noun, status }: { count: string; noun: string; status: string }) => `${count} ${noun}${status ? `: ${status}` : ""}. Arrow keys move between markers; Enter opens one.`,
  mapControls: "Map controls",
  zoomIn: "Zoom in",
  zoomOut: "Zoom out",
  outsideThisView: (count: string, noun: string) => `${count} ${noun} outside this view`,
  close: "Close",
  more: (count: number) => `${count} more`,
  theMapCouldNotLoad: "The map could not load.",
  pinAtDragItOrUseThe: (coordinates: string) => `Pin at ${coordinates}. Drag it or use the arrow keys to move it.`,
  pinAt: (coordinates: string) => `Pin at ${coordinates}`,
  site: 'site',
  sites: 'sites',
  webglError: "The map could not start: this browser has WebGL turned off.",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    map: typeof mapMessages.defaults
  }
}

/** Resolve map wording outside React; pass the component's locale. */
export function getMapMessages(locale = getLocale()): typeof mapMessages.defaults {
  return resolveMessages(mapMessages.namespace, mapMessages.defaults, locale)
}
