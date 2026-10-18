/**
 * The MapLibre side of the map, loaded on demand (map.tsx imports this module dynamically),
 * so MapLibre and its worker download only with a map on screen.
 *
 * The engine owns the GL map, the style and the HTML markers. Markers are plain elements
 * MapLibre positions; React renders into them through portals (map.tsx), so a cluster ring,
 * a focus ring and a pulse are ordinary components with ordinary CSS. The engine reports the
 * marker set only when it changes (a cluster splits, a point scrolls into the loaded area),
 * never per frame.
 */
import type * as GeoJSON from "geojson"
import { Map as MapLibreMap, Marker, Popup, setWorkerUrl, type GeoJSONSource, type MapGeoJSONFeature } from "maplibre-gl"
import { countsOf, type StatusCounts } from "./cluster.js"
import type { LngLatBox } from "./projection.js"
import { createMapStyle, MARKER_ANCHOR_IMAGE, MARKER_ANCHOR_SIZE, POINTS_LAYER, SOURCE, type MapStyleInput } from "./style.js"
import type { MapConfig } from "./types.js"

let configured: Promise<void> | null = null

/**
 * Where MapLibre's worker comes from. MapLibre's default (a URL beside its own module) breaks
 * once Vite pre-bundles the module, so the build ships the worker as its own asset. In
 * development the dev server would rewrite that file and import its HMR client into the
 * worker, so the worker runs from a blob of the untouched source instead.
 */
export function configureEngine(): Promise<void> {
  configured ??= (async () => {
    if (import.meta.env.DEV) {
      const { default: source } = await import("maplibre-gl/dist/maplibre-gl-worker.mjs?raw")
      setWorkerUrl(URL.createObjectURL(new Blob([source], { type: "text/javascript" })))
    } else {
      const { default: url } = await import("maplibre-gl/dist/maplibre-gl-worker.mjs?url")
      setWorkerUrl(url)
    }
  })()
  return configured
}

export interface MarkerSlot {
  /** "p:<point id>" or "c:<cluster id>". */
  key: string
  element: HTMLElement
  /** Semantic entity or content kind, used to choose labels and rendering. */
  kind: "point" | "cluster"
  /** The point id, or the cluster id as a string. */
  id: string
  lng: number
  lat: number
  /** Counts grouped by category or status. */
  counts: StatusCounts
  /** Points in the cluster (1 for a point). */
  size: number
}

export interface EngineCallbacks {
  /** Called once with no arguments when the map has loaded its style, after the first marker sync. */
  onLoad: () => void
  /** The user started moving the camera (drag, wheel, pinch, keyboard). */
  onUserMove: () => void
  /** The camera moved (every frame while moving). */
  onMove: () => void
  /** The camera came to rest. */
  onMoveEnd: () => void
  /** Called with every visible marker slot (points and clusters, each with its host element) when the set, sizes or counts change; not called when they are unchanged. */
  onMarkers: (markers: MarkerSlot[]) => void
  /** A click on the map, off every marker. */
  onBackgroundClick: () => void
  /** Receives a failed operation so the application can explain it, normally with a toast. */
  onError: (message: string) => void
}

export interface EngineOptions {
  container: HTMLElement
  /** Typed component configuration and external provider definitions. */
  config: MapConfig
  style: MapStyleInput
  /** The first view, fitted like the skeleton silhouette. */
  box: LngLatBox
  /** Semantic padding role. */
  padding: FitPadding
  /** Zoom cap when fitting (a lone point should not land at street level). */
  fitMaxZoom: number
  /** Label fade in milliseconds (0 under the motion switch). */
  fadeDuration: number
  callbacks: EngineCallbacks
}

/** Room around a framed box, in CSS pixels, per side. */
export interface FitPadding {
  top: number
  right: number
  bottom: number
  left: number
}

export interface CameraMove {
  animate: boolean
  /** Milliseconds, already multiplied by the motion scale. */
  duration: number
}

/** Cancelled tile requests (panning past them) are not failures. */
const EXPECTED_ERRORS = /AbortError|aborted/i

export class MapEngine {
  readonly map: MapLibreMap
  private input: MapStyleInput
  private readonly markers = new Map<string, { slot: MarkerSlot; marker: Marker }>()
  private signature = ""
  private loaded = false
  private destroyed = false
  private frame = 0

  /** Call configureEngine() (and await it) before the first engine. */
  constructor(private readonly options: EngineOptions) {
    this.input = options.style
    const { config } = options
    this.map = new MapLibreMap({
      container: options.container,
      style: createMapStyle(this.input),
      bounds: [options.box[0], options.box[1], options.box[2], options.box[3]],
      fitBoundsOptions: { padding: options.padding, maxZoom: options.fitMaxZoom },
      minZoom: config.minZoom,
      maxZoom: config.maxZoom,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      renderWorldCopies: false,
      fadeDuration: options.fadeDuration,
      // The canvas sits on the Glass UX canvas: no background, so the ambient fields show through.
      canvasContextAttributes: { antialias: true },
    })
    this.map.touchZoomRotate.disableRotation()
    this.map.keyboard.disableRotation()
    // The markers' invisible footprint (style.ts markerAnchorLayer): a transparent square,
    // resolved whenever a style asks for it, so the first placement already has it (a diffed
    // setStyle keeps it, a full one does not).
    this.map.setMissingStyleImageResolver((id) => {
      if (id !== MARKER_ANCHOR_IMAGE || this.map.hasImage(MARKER_ANCHOR_IMAGE)) return
      const side = MARKER_ANCHOR_SIZE
      this.map.addImage(MARKER_ANCHOR_IMAGE, { width: side, height: side, data: new Uint8Array(side * side * 4) })
    })
    this.map.getCanvas().setAttribute("aria-hidden", "true")
    this.map.getCanvas().tabIndex = -1

    const { callbacks } = options
    this.map.on("load", () => {
      this.loaded = true
      this.syncMarkers()
      callbacks.onLoad()
    })
    this.map.on("movestart", (event) => {
      // Only gestures carry the input event; our own fits and flights do not.
      if ((event as { originalEvent?: Event }).originalEvent) callbacks.onUserMove()
    })
    this.map.on("move", () => callbacks.onMove())
    this.map.on("moveend", () => {
      this.syncMarkers()
      callbacks.onMoveEnd()
    })
    this.map.on("sourcedata", (event) => {
      if (event.sourceId === SOURCE.points && event.isSourceLoaded) this.scheduleSync()
    })
    this.map.on("click", (event) => {
      const target = event.originalEvent.target as Element | null
      if (!target?.closest(".fa-map-marker-host, .fa-map-popup-host")) callbacks.onBackgroundClick()
    })
    this.map.on("error", (event) => {
      const message = event.error?.message ?? String(event.error)
      if (!EXPECTED_ERRORS.test(message)) callbacks.onError(message)
    })
  }

  /* ── Data and theme ──────────────────────────────────────────────────────── */

  setStyleInput(next: MapStyleInput) {
    const previous = this.input
    this.input = next
    if (!this.loaded) {
      this.map.setStyle(createMapStyle(next), { diff: true })
      return
    }
    // Data goes through setData (cheap, keeps clusters warm); the theme through a diffed style.
    const source = <T extends GeoJSONSource>(id: string) => this.map.getSource<T>(id)
    if (next.points !== previous.points) source(SOURCE.points)?.setData(next.points)
    if (next.home !== previous.home) source(SOURCE.home)?.setData((next.home ?? { type: "FeatureCollection", features: [] }) as GeoJSON.GeoJSON)
    if (next.regions !== previous.regions) source(SOURCE.regions)?.setData({ type: "FeatureCollection", features: next.regions as unknown as GeoJSON.Feature[] })
    if (next.theme !== previous.theme || next.basemap !== previous.basemap) this.map.setStyle(createMapStyle(next), { diff: true })
  }

  /* ── Camera ──────────────────────────────────────────────────────────────── */

  fit(box: LngLatBox, padding: FitPadding, maxZoom: number, move: CameraMove) {
    this.map.fitBounds([box[0], box[1], box[2], box[3]], { padding, maxZoom, animate: move.animate, duration: move.duration, essential: true })
  }

  flyTo(lng: number, lat: number, zoom: number, move: CameraMove) {
    if (!move.animate) this.map.jumpTo({ center: [lng, lat], zoom })
    else this.map.flyTo({ center: [lng, lat], zoom, duration: move.duration, essential: true })
  }

  zoomBy(delta: number, move: CameraMove) {
    this.map.zoomTo(this.map.getZoom() + delta, { animate: move.animate, duration: move.duration })
  }

  zoom() {
    return this.map.getZoom()
  }

  bounds(): LngLatBox {
    const bounds = this.map.getBounds()
    return [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()]
  }

  project(lng: number, lat: number) {
    return this.map.project([lng, lat])
  }

  resize() {
    this.map.resize()
  }

  async clusterZoom(clusterId: number): Promise<number> {
    const source = this.map.getSource<GeoJSONSource>(SOURCE.points)
    if (!source) return this.map.getZoom() + 2
    return source.getClusterExpansionZoom(clusterId)
  }

  /** Every point id in a cluster. */
  async clusterLeaves(clusterId: number): Promise<string[]> {
    const source = this.map.getSource<GeoJSONSource>(SOURCE.points)
    if (!source) return []
    const leaves = await source.getClusterLeaves(clusterId, Infinity, 0)
    return leaves.map((leaf: GeoJSON.Feature) => String(leaf.properties?.id ?? ""))
  }

  /* ── Markers ─────────────────────────────────────────────────────────────── */

  private scheduleSync() {
    if (this.frame) return
    this.frame = requestAnimationFrame(() => {
      this.frame = 0
      this.syncMarkers()
    })
  }

  /** Rebuild the marker set from the clustered source at the current zoom. */
  syncMarkers() {
    if (this.destroyed || !this.loaded || !this.map.getLayer(POINTS_LAYER)) return
    const features = this.map.querySourceFeatures(SOURCE.points) as MapGeoJSONFeature[]
    const next = new Map<string, MarkerSlot>()
    for (const feature of features) {
      const properties = feature.properties ?? {}
      const [lng = 0, lat = 0] = (feature.geometry as GeoJSON.Point).coordinates
      const cluster = Boolean(properties.cluster)
      const id = cluster ? String(properties.cluster_id) : String(properties.id)
      const key = `${cluster ? "c" : "p"}:${id}`
      if (next.has(key)) continue
      const counts = countsOf(properties)
      next.set(key, { key, element: null as unknown as HTMLElement, kind: cluster ? "cluster" : "point", id, lng, lat, counts, size: cluster ? Number(properties.point_count) : 1 })
    }
    for (const [key, entry] of this.markers) {
      if (!next.has(key)) {
        entry.marker.remove()
        this.markers.delete(key)
      }
    }
    for (const [key, slot] of next) {
      const existing = this.markers.get(key)
      if (existing) {
        slot.element = existing.slot.element
        if (existing.slot.lng !== slot.lng || existing.slot.lat !== slot.lat) existing.marker.setLngLat([slot.lng, slot.lat])
        existing.slot = slot
        continue
      }
      const element = document.createElement("div")
      element.className = "fa-map-marker-host"
      element.dataset.key = key
      slot.element = element
      const marker = new Marker({ element, anchor: "center" }).setLngLat([slot.lng, slot.lat]).addTo(this.map)
      this.markers.set(key, { slot, marker })
    }
    const slots = [...this.markers.values()].map((entry) => entry.slot)
    const signature = slots
      .map((slot) => `${slot.key}:${slot.size}:${slot.counts.danger}.${slot.counts.warning}.${slot.counts.healthy}.${slot.counts.unknown}`)
      .toSorted()
      .join("|")
    if (signature !== this.signature) {
      this.signature = signature
      this.options.callbacks.onMarkers(slots)
    }
  }

  destroy() {
    this.destroyed = true
    if (this.frame) cancelAnimationFrame(this.frame)
    for (const { marker } of this.markers.values()) marker.remove()
    this.markers.clear()
    this.map.remove()
  }
}

/** Popups ride in a MapLibre Popup (it follows the camera and picks the side with room). */
export function createPopupHost(map: MapLibreMap) {
  const element = document.createElement("div")
  element.className = "fa-map-popup-content"
  const popup = new Popup({
    closeButton: false,
    closeOnClick: false,
    closeOnMove: false,
    focusAfterOpen: false,
    maxWidth: "none",
    className: "fa-map-popup-host",
    offset: 18,
  }).setDOMContent(element)
  return {
    element,
    open(lng: number, lat: number) {
      popup.setLngLat([lng, lat])
      if (!popup.isOpen()) popup.addTo(map)
    },
    close() {
      popup.remove()
    },
    destroy() {
      popup.remove()
    },
  }
}
