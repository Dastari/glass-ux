import type {} from "./messages.js"
/**
 * GeoMap — a themed map over MapLibre GL (loaded on demand). Points with a status, clustered
 * with a segmented status ring; a home region outlined as a glow in the data hue; a vector
 * basemap in the OpenMapTiles schema from a configurable source (TileJSON or a z/x/y
 * template), styled entirely from Glass UX tokens (style.ts). See map.tsx.
 *
 * Tiles and privacy: the default source is OpenFreeMap (no key, no account). Its servers see
 * each visitor's tile requests (IP address and the area viewed). A deployment that must not
 * send those to a third party self-hosts OpenFreeMap or any OpenMapTiles-compatible server and
 * points `MapConfig.basemap` at it; nothing else changes. Region outlines and the loading
 * silhouette are always self-hosted (public/geo/admin1). The data sources, the attribution rule
 * (OSMF Attribution Guidelines: full line on load, folded to ⓘ after 5 s or the first
 * interaction) and the region build are documented in docs/map.md.
 */
export {
  ATTRIBUTION_COLLAPSE_MS,
  DEFAULT_STATUS_LABELS,
  DefaultClusterPopup,
  GeoMap,
  GeoMapSkeleton,
  MAP_DETAIL_ZOOM,
  MapSilhouette,
  MapStatusSummary,
  MapViewToggle,
  type GeoMapProps,
  type MapClusterPopupContext,
  type MapInsets,
  type MapNoun,
  type MapPopupContext,
  type MapSilhouetteProps,
} from "./map.js"
export {
  countStatuses,
  countsOf,
  describeCounts,
  EMPTY_COUNTS,
  MAP_STATUSES,
  ringSegments,
  statusClusterProperties,
  sumCounts,
  totalOf,
  worstOf,
  type RingSegment,
  type StatusCounts,
} from "./cluster.js"
export { PinMap, type PinMapProps, type PinPoint } from "./pin-map.js"
export type { SelectionChangeDetails, SelectionChangeReason } from "../../lib/use-selected-id.js"
export { boxContains, boxOfPoints, projectBox, projectX, projectY, ringsOf, ringsToPath, viewBoxOf } from "./projection.js"
export { loadRegion, regionUrl, useMapRegion, useMapRegions } from "./regions.js"
export { createMapStyle, pointsToGeoJSON, type MapStyleInput, type MapTheme } from "./style.js"
export { MAP_THEME_TOKENS } from "./theme.js"
export type { LngLatBox, MapAttribution, MapBasemap, MapCluster, MapConfig, MapFrame, MapPoint, MapRegion, MapStatus, MapTileSource } from "./types.js"
