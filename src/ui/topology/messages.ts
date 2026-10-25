import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for topology. */
export const topologyMessages = defineMessages("topology", {
  viewAsList: "View as list",
  viewAsMap: "View as map",
  loadingTheMap: "Loading the map",
  nothingToDraw: "Nothing to draw",
  theMapIsLoading: "The map is loading",
  actionsFor: (label: string) => `Actions for ${label}`,
  actions: "Actions",
  mapControls: "Map controls",
  zoomIn: "Zoom in",
  zoomOut: "Zoom out",
  fitToView: "Fit to view",
  minimap: "Minimap",
  minimapVisible: "Minimap: shown while part of the map is out of view",
  minimapOff: "Minimap: off",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    topology: typeof topologyMessages.defaults
  }
}

/** Resolve topology wording outside React; pass the component's locale. */
export function getTopologyMessages(locale = getLocale()): typeof topologyMessages.defaults {
  return resolveMessages(topologyMessages.namespace, topologyMessages.defaults, locale)
}
