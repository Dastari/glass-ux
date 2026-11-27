/**
 * PinMap's MapLibre side, loaded on demand with the map chunk (pin-map.tsx imports it
 * dynamically): one map, one marker. The marker's element is a host the React side renders
 * the pin into through a portal, so the pin is an ordinary focusable button.
 *
 * With a radius, a circle of that many metres follows the pin (the areas layer, style.ts), and
 * an editable map adds a second marker on the circle's east edge: the radius handle, a host
 * the React side renders a slider into. Dragging it reports the distance from the pin.
 */
import { Map as MapLibreMap, Marker } from "maplibre-gl"
import { circlePolygon, destination, distanceMetres, NO_AREAS } from "./area.js"
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
  /** Add the radius handle (PinMap's `onRadiusChange`). */
  radiusEditable?: boolean
  /** Called once with no arguments when the map has loaded its style. */
  onLoad: () => void
  /** The pin was dropped (drag end) or placed by a click. */
  onPlace: (point: { lng: number; lat: number }) => void
  /** Receives a failed operation so the application can explain it, normally with a toast. */
  onError: (message: string) => void
  /** The map started (true) or stopped (false) being dragged, by its canvas or by the pin. */
  onDragging?: (dragging: boolean) => void
  /** The radius handle moved to this many metres from the pin (each drag frame). */
  onRadiusDrag?: (metres: number) => void
}

/** Below this many screen pixels the circle is too small to hold its handle beside the pin. */
const HANDLE_MIN_PX = 20

const EMPTY = { type: "FeatureCollection" as const, features: [] }
const EXPECTED_ERRORS = /AbortError|aborted/i

export class PinEngine {
  readonly map: MapLibreMap
  readonly host: HTMLElement
  private readonly marker: Marker
  private config: MapConfig
  private placed = false
  /** The click a drag ends in: the browser sends one to the canvas under the released pin. */
  private ignoreClick = false
  /** The circle around the pin, in metres, or null for none. */
  private radius: number | null = null
  private handle: Marker | null = null
  private handleShown = false
  private handleDragging = false
  /** Where the React side renders the radius handle, when the map is editable. */
  readonly radiusHost: HTMLElement

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
    // The wheel zooms at the cursor. PinMap holds it back while a scroll that began elsewhere is
    // still going, so a form scrolling past the map does not get caught on it (wheel-gate.ts).
    this.map.touchZoomRotate.disableRotation()
    this.map.keyboard.disable()
    this.map.getCanvas().setAttribute("aria-hidden", "true")
    this.map.getCanvas().tabIndex = -1

    this.host = document.createElement("div")
    this.host.className = "fa-pin-map-host"
    this.marker = new Marker({ element: this.host, anchor: "bottom", draggable: options.draggable })
    if (center) this.setPin(center)
    this.marker.on("dragstart", () => {
      this.ignoreClick = true
      options.onDragging?.(true)
    })
    // The circle and its handle follow the pin while it is dragged.
    this.marker.on("drag", () => this.drawArea())
    this.marker.on("dragend", () => {
      const point = this.marker.getLngLat()
      options.onDragging?.(false)
      options.onPlace({ lng: point.lng, lat: point.lat })
    })
    this.map.on("dragstart", () => options.onDragging?.(true))
    this.map.on("dragend", () => options.onDragging?.(false))
    if (options.draggable) {
      // A press starts over: a drag that ended without a click leaves nothing to ignore.
      const pressed = () => {
        this.ignoreClick = false
      }
      this.map.on("mousedown", pressed)
      this.map.on("touchstart", pressed)
      this.map.on("click", (event) => {
        if (this.ignoreClick) {
          // The pin was released here: the drop is the point, not the cursor over its body.
          this.ignoreClick = false
          return
        }
        if ((event.originalEvent.target as Element | null)?.closest(".fa-pin-map-host")) return
        options.onPlace({ lng: event.lngLat.lng, lat: event.lngLat.lat })
      })
    }
    this.radiusHost = document.createElement("div")
    this.radiusHost.className = "fa-pin-map-radius-host"
    if (options.radiusEditable) {
      this.handle = new Marker({ element: this.radiusHost, anchor: "center", draggable: true })
      this.handle.on("dragstart", () => {
        this.handleDragging = true
        this.ignoreClick = true
        options.onDragging?.(true)
      })
      this.handle.on("drag", () => {
        const handle = this.handle!.getLngLat()
        options.onRadiusDrag?.(distanceMetres(this.marker.getLngLat(), handle))
      })
      this.handle.on("dragend", () => {
        this.handleDragging = false
        options.onDragging?.(false)
        // Back onto the circle's east edge, at the radius the host settled on.
        this.drawArea()
      })
    }
    // A small circle hides its handle (it would cover the pin) until a zoom makes room.
    this.map.on("zoom", () => this.placeHandle())

    this.map.on("load", () => {
      // A radius set before the style loaded had no source to draw into.
      this.drawArea()
      options.onLoad()
    })
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
      areas: this.areaData(),
    })
  }

  private areaData() {
    if (!this.placed || this.radius === null) return NO_AREAS
    const center = this.marker.getLngLat()
    return { type: "FeatureCollection" as const, features: [circlePolygon(center, this.radius)] }
  }

  /** Redraw the circle at the pin and put the handle on its east edge. */
  private drawArea() {
    const source = this.map.getSource("areas") as { setData?: (data: unknown) => void } | undefined
    source?.setData?.(this.areaData())
    this.placeHandle()
  }

  private placeHandle() {
    const handle = this.handle
    if (!handle) return
    const show = this.placed && this.radius !== null
    if (!show) {
      if (this.handleShown) handle.remove()
      this.handleShown = false
      return
    }
    if (!this.handleDragging) handle.setLngLat(destination(this.marker.getLngLat(), this.radius!, 90))
    if (!this.handleShown) {
      handle.addTo(this.map)
      this.handleShown = true
    }
    const center = this.map.project(this.marker.getLngLat())
    const edge = this.map.project(handle.getLngLat())
    this.radiusHost.toggleAttribute("data-small", Math.hypot(edge.x - center.x, edge.y - center.y) < HANDLE_MIN_PX)
  }

  /** The circle's radius in metres, or null for none. Redraws it at the pin. */
  setRadius(metres: number | null) {
    this.radius = metres !== null && Number.isFinite(metres) && metres > 0 ? metres : null
    this.drawArea()
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
    this.drawArea()
  }

  clearPin() {
    if (!this.placed) return
    this.marker.remove()
    this.placed = false
    this.drawArea()
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
    this.handle?.remove()
    this.marker.remove()
    this.map.remove()
  }
}

/** Configure MapLibre's worker, then build the engine. */
export async function createPinEngine(options: PinEngineOptions): Promise<PinEngine> {
  await configureEngine()
  return new PinEngine(options)
}
