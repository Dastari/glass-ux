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
  showAll: (value0: unknown, value1: unknown) => `Show all ${value0} ${value1}`,
  resetTo: (value0: unknown) => `Reset to ${value0}`,
  resetView: "Reset view",
  theMapCouldNotStart: "The map could not start",
  theMapIsLoading: "The map is loading",
  arrowKeysMoveBetweenMarkersEnter: (value0: unknown, value1: unknown, value2: unknown) => `${value0} ${value1}${value2}. Arrow keys move between markers; Enter opens one.`,
  thisBrowserHasWebglTurnedOff: ": this browser has WebGL turned off",
  mapControls: "Map controls",
  zoomIn: "Zoom in",
  zoomOut: "Zoom out",
  outsideThisView: (value0: unknown, value1: unknown) => `${value0} ${value1} outside this view`,
  close: "Close",
  more: (value0: unknown) => `${value0} more`,
  theMapCouldNotLoad: "The map could not load.",
  pinAtDragItOrUseThe: (value0: unknown) => `Pin at ${value0}. Drag it or use the arrow keys to move it.`,
  pinAt: (value0: unknown) => `Pin at ${value0}`,
  site: 'site',
  sites: 'sites',
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
