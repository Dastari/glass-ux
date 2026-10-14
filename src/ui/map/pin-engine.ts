/**
 * PinMap's MapLibre side, loaded on demand with the map chunk (pin-map.tsx imports it
 * dynamically): one map, one marker. The marker's element is a host the React side renders
 * the pin into through a portal, so the pin is an ordinary focusable button.
 */
import { Map as MapLibreMap, Marker } from "maplibre-gl"
import { configureEngine } from "./engine.js"
import { createMapStyle, type MapTheme } from "./style.js"
import type { MapConfig } from "./types.js"

export interface PinEngineOptions {
  container: HTMLElement
  /** Typed component configuration and external provider definitions. */
  config: MapConfig
  theme: MapTheme
  /** The first view: the pin at `zoom`, or a box with no pin. */
  center: { lng: number; lat: number } | null
  box: readonly [number, number, number, number]
  zoom: number
  /** Label fade in ms (0 under the motion switch). */
  fadeDuration: number
  draggable: boolean
  /** Called when load occurs. The callback type specifies its arguments. */
  onLoad: () => void
  /** The pin was dropped (drag end) or placed by a click. */
  onPlace: (point: { lng: number; lat: number }) => void
  /** Receives a failed operation so the application can explain it, normally with a toast. */
  onError: (message: string) => void
}

const EMPTY = { type: "FeatureCollection" as const, features: [] }
const EXPECTED_ERRORS = /AbortError|aborted/i

export class PinEngine {
  readonly map: MapLibreMap
  readonly host: HTMLElement
  private readonly marker: Marker
  private config: MapConfig
  private placed = false

  constructor(private readonly options: PinEngineOptions) {
    const { config, center, zoom } = options
    this.config = config
    this.map = new MapLibreMap({
      container: options.container,
      style: this.style(options.theme),
      ...(center ? { center: [center.lng, center.lat], zoom } : { bounds: [options.box[0], options.box[1], options.box[2], options.box[3]] as [number, number, number, number], fitBoundsOptions: { padding: 16 } }),
      minZoom: config.minZoom,
      maxZoom: config.maxZoom,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      renderWorldCopies: false,
      fadeDuration: options.fadeDuration,
    })
    // A form scrolls past a small map: the wheel never zooms it (the + and − buttons, a
    // double-click and a pinch do).
    this.map.scrollZoom.disable()
    this.map.touchZoomRotate.disableRotation()
    this.map.keyboard.disable()
    this.map.getCanvas().setAttribute("aria-hidden", "true")
    this.map.getCanvas().tabIndex = -1

    this.host = document.createElement("div")
    this.host.className = "fa-pin-map-host"
    this.marker = new Marker({ element: this.host, anchor: "bottom", draggable: options.draggable })
    if (center) this.setPin(center)
    this.marker.on("dragend", () => {
      const point = this.marker.getLngLat()
      options.onPlace({ lng: point.lng, lat: point.lat })
    })
    if (options.draggable) {
      this.map.on("click", (event) => {
        if ((event.originalEvent.target as Element | null)?.closest(".fa-pin-map-host")) return
        options.onPlace({ lng: event.lngLat.lng, lat: event.lngLat.lat })
      })
    }
    this.map.on("load", () => options.onLoad())
    this.map.on("error", (event) => {
      const message = event.error?.message ?? String(event.error)
      if (!EXPECTED_ERRORS.test(message)) options.onError(message)
    })
  }

  private style(theme: MapTheme) {
    return createMapStyle({
      theme,
      basemap: this.config.basemap,
      origin: typeof window === "undefined" ? undefined : window.location.href,
      home: null,
      regions: [],
      points: EMPTY,
    })
  }

  setTheme(theme: MapTheme) {
    this.map.setStyle(this.style(theme), { diff: true })
  }

  /** Move the pin (adding it the first time) without moving the camera. */
  setPin(point: { lng: number; lat: number }) {
    this.marker.setLngLat([point.lng, point.lat])
    if (!this.placed) {
      this.marker.addTo(this.map)
      this.placed = true
    }
  }

  clearPin() {
    if (!this.placed) return
    this.marker.remove()
    this.placed = false
  }

  /** Bring the pin into view: centre on it at `zoom` (or keep the zoom when already close). */
  show(point: { lng: number; lat: number }, zoom: number, move: { animate: boolean; duration: number }) {
    const target = Math.max(this.map.getZoom(), zoom)
    if (move.animate) this.map.easeTo({ center: [point.lng, point.lat], zoom: target, duration: move.duration, essential: true })
    else this.map.jumpTo({ center: [point.lng, point.lat], zoom: target })
  }

  /** The point `dx`, `dy` screen pixels from the pin (keyboard nudges). */
  nudge(dx: number, dy: number): { lng: number; lat: number } | null {
    if (!this.placed) return null
    const at = this.map.project(this.marker.getLngLat())
    const point = this.map.unproject([at.x + dx, at.y + dy])
    return { lng: point.lng, lat: point.lat }
  }

  zoomBy(delta: number) {
    this.map.zoomTo(this.map.getZoom() + delta, { duration: 0 })
  }

  resize() {
    this.map.resize()
  }

  destroy() {
    this.marker.remove()
    this.map.remove()
  }
}

/** Configure MapLibre's worker, then build the engine. */
export async function createPinEngine(options: PinEngineOptions): Promise<PinEngine> {
  await configureEngine()
  return new PinEngine(options)
}
