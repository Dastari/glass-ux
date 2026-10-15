/**
 * GeoMap — points with a status anywhere in the world, clustered, over a token-themed vector
 * basemap with the home region drawn as a glowing outline.
 *
 * Anatomy (one size container, R7.3; the parent gives it a definite height):
 *   silhouette   the loading state: the home region's outline as a static SVG, framed exactly
 *                as the map will frame it, so the map fades in over it without a shift (R9.3)
 *   canvas       MapLibre GL (loaded on demand: engine.ts), transparent over the Glass UX canvas
 *   markers      DOM buttons MapLibre positions; clusters wear a segmented status ring
 *   popup        the shared popup look (glass-overlay fa-popup): a preview on hover or focus,
 *                pinned on click or Enter, richer as you zoom in
 *   controls     zoom, reset to the home region, view as list; points outside the view;
 *                attribution — over-imagery so they read on any part of the map
 *
 * Keyboard (R11.5, R20): Tab reaches one marker (roving focus); the arrows move to the nearest
 * marker in that direction, Home and End to the first and last; Enter or Space opens a
 * point's popup and a cluster's list; Esc closes it and returns focus. "View as list" swaps
 * the map for the caller's table.
 *
 * Motion (R18.3): camera moves take --duration-slower × 2, which the motion switch reduces to
 * nothing, so "Still" jumps. Marker pulses use the shared fa-pulse-ring keyframe, which the
 * switch stops.
 */
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { IconClose, IconGlobe, IconHome, IconInfo, IconList, IconMapPin, IconZoomIn, IconZoomOut } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { Button } from "../button/index.js"
import { Menu } from "../menu/index.js"
import { Popover } from "../popover/index.js"
import { countStatuses, describeCounts, MAP_STATUSES, ringSegments, worstOf, type MapStatus, type StatusCounts } from "./cluster.js"
import type { CameraMove, FitPadding, MapEngine, MarkerSlot } from "./engine.js"
import { isNavKey, nextMarker } from "./nav.js"
import { boxContains, boxOfPoints, ringsOf, ringsToPath, viewBoxOf, type LngLatBox } from "./projection.js"
import { CLUSTER_STEPS, MARKER_LABEL_ZOOM, pointsToGeoJSON, type MapStyleInput } from "./style.js"
import { observeAppearance, readLength, readMapTheme } from "./theme.js"
import type { MapAttribution, MapCluster, MapConfig, MapFrame, MapPoint, MapRegion } from "./types.js"

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect

/** The whole world, for a map with neither a home region nor points. */
const WORLD: LngLatBox = [-170, -58, 178, 75]
/** An omitted optional collection must retain its identity across internal view updates. */
const NO_REGIONS: readonly MapRegion[] = []
/** A single point still frames an area this many degrees across. */
const MIN_POINT_SPAN = 0.25
/** Fitting never zooms closer than this (a lone point stays in context). */
const FIT_MAX_ZOOM = 12
/** Marker labels appear from this zoom (the style reserves their space from the same zoom). */
const LABEL_ZOOM = MARKER_LABEL_ZOOM
/** Popups add detail (the caller decides what) from this zoom. */
export const MAP_DETAIL_ZOOM = 10.5
/** Pointer hover → preview, leave → close; small delays stop flicker between markers. */
const HOVER_OPEN_MS = 60
const HOVER_CLOSE_MS = 220

export const DEFAULT_STATUS_LABELS: Readonly<Record<MapStatus, string>> = {
  danger: "Critical",
  warning: "Warning",
  healthy: "Healthy",
  unknown: "Offline",
}

export interface MapNoun {
  one: string
  other: string
}

export interface MapPopupContext {
  /** The current zoom: show more as it grows (see MAP_DETAIL_ZOOM). */
  zoom: number
  /** Pinned by click or Enter (it holds focus); otherwise a hover or focus preview. */
  pinned: boolean
  /** Closes the current overlay or view. */
  close: () => void
}

export interface MapClusterPopupContext extends MapPopupContext {
  /** Zoom until the cluster splits. */
  zoomIn: () => void
  /** Fly to one of its points and open that point's popup. */
  openPoint: (id: string) => void
}

export interface GeoMapProps<T> {
  /** Accessible name of the map: "Sites, All organisations". */
  label: string
  /** Typed component configuration and external provider definitions. */
  config: MapConfig
  /** The home region: undefined while it loads, null when there is none. */
  home: MapRegion | null | undefined
  /** Other regions to outline faintly (the regions that hold points). Defaults to an empty list. */
  regions?: readonly MapRegion[]
  /** Geographical or chart points. */
  points: readonly MapPoint<T>[]
  /** The points are still loading: the silhouette stays, markers wait. */
  loading?: boolean
  /** Frame the home region (default) or the points. */
  frame?: MapFrame
  /** Re-frame when this changes (a new scope, a new home region). */
  frameKey?: string
  /** Stable identifier of the selected item. */
  selectedId?: string | null
  /** Called when select occurs. The callback type specifies its arguments. */
  onSelect?: (point: MapPoint<T> | null) => void
  /** Renders details for an individual map point. */
  renderPopup: (point: MapPoint<T>, context: MapPopupContext) => ReactNode
  /** Renders details for an aggregate map cluster. */
  renderClusterPopup?: (cluster: MapCluster<T>, context: MapClusterPopupContext) => ReactNode
  /** Per point, a counter that changes when its status changes: the marker pulses once. */
  pulses?: Readonly<Record<string, number>>
  /** Display and accessible labels for the supported statuses. */
  statusLabels?: Readonly<Record<MapStatus, string>>
  /** Singular and plural names used in counts and accessible labels. */
  noun?: MapNoun
  /** "map" (default) or "list": the list replaces the map in the same box. */
  view?: "map" | "list"
  /** Called when view change occurs. The callback type specifies its arguments. */
  onViewChange?: (view: "map" | "list") => void
  /** The list view: the caller's table, with a ViewToggle in its toolbar. */
  list?: ReactNode
  /**
   * Page chrome floating over a full-bleed map, in CSS pixels (a header above, a status strip
   * below): controls, credits and every frame stay clear of it, and it re-frames when it
   * changes. `null` means "being measured": the silhouette stays transparent until the insets
   * are known, so a server-rendered frame never paints in the wrong place and then jumps (CLS).
   */
  insets?: MapInsets | null
  className?: string
}

export interface MapInsets {
  top?: number
  right?: number
  bottom?: number
  left?: number
}

/** The credit line shows in full on load and folds to ⓘ after this long (docs/map.md). */
export const ATTRIBUTION_COLLAPSE_MS = 5000

type Phase = "waiting" | "loading" | "ready" | "failed"
type PopupState = { key: string; pinned: boolean } | null

const pointKey = (id: string) => `p:${id}`

/** The camera's timing from the motion tokens (R18.3): --duration-slower × 2, nothing under Still. */
function cameraMove(root: HTMLElement | null): CameraMove {
  if (!root) return { animate: false, duration: 0 }
  const probe = document.createElement("span")
  probe.style.transitionDuration = "var(--duration-slower)"
  probe.hidden = true
  root.append(probe)
  const seconds = Number.parseFloat(getComputedStyle(probe).transitionDuration)
  probe.remove()
  const duration = Number.isFinite(seconds) ? seconds * 1000 * 2 : 0
  return { animate: duration > 40, duration }
}

/** Insets as the stage's tokens (map.css). */
function insetStyle(insets: MapInsets | null | undefined): CSSProperties | undefined {
  if (!insets) return undefined
  const style: Record<string, string> = {}
  for (const side of ["top", "right", "bottom", "left"] as const) {
    const value = insets[side]
    if (value) style[`--fa-map-inset-${side}`] = `${Math.round(value)}px`
  }
  return style as CSSProperties
}

/* ── Silhouette (loading) ───────────────────────────────────────────────────── */

export interface MapSilhouetteProps {
  /** Geographical region to display. */
  region: MapRegion | null | undefined
  /** The box the camera will frame (defaults to the region's focus). */
  box?: LngLatBox
}

/**
 * The home region as a static outline, framed exactly like the map's first view: an SVG inset
 * by the fit padding whose viewBox is the framed box (`xMidYMid meet` is fitBounds).
 */
export function MapSilhouette({ region, box }: MapSilhouetteProps) {
  const framed = box ?? region?.properties.focus
  const path = useMemo(() => {
    if (!region || !framed) return ""
    // Detail finer than about a pixel at a typical map size adds nothing to a placeholder.
    const span = Math.max(framed[2] - framed[0], 1e-6) / 360
    return ringsToPath(ringsOf(region.geometry), span / 1400)
  }, [region, framed])
  if (!framed) return null
  return (
    <svg className="fa-map-silhouette" viewBox={viewBoxOf(framed)} preserveAspectRatio="xMidYMid meet" aria-hidden focusable="false">
      {path ? <path d={path} /> : null}
    </svg>
  )
}

/** The map's box before anything is known: the same size, a silhouette when the region is. */
export function GeoMapSkeleton({ region, insets, className }: { region?: MapRegion | null; insets?: MapInsets; className?: string }) {
  return (
    <div className={cx("fa-map", className)} style={insetStyle(insets)} data-phase="waiting" aria-hidden>
      <div className="fa-map-stage">
        <MapSilhouette region={region} />
      </div>
    </div>
  )
}

/* ── Markers ────────────────────────────────────────────────────────────────── */

interface MarkerProps {
  /** Named content slot. */
  slot: MarkerSlot
  label: string
  /** Point markers: the visible label from LABEL_ZOOM. */
  text?: string
  /** Current operation or connection status. */
  status: MapStatus
  /** Counts grouped by category or status. */
  counts: StatusCounts
  /** The selected state or collection. */
  selected: boolean
  /** Marks the current destination or active choice. */
  active: boolean
  open: boolean
  pulse: number
  /** Called when key down occurs. The callback type specifies its arguments. */
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>, slot: MarkerSlot) => void
  /** Called when activate occurs. The callback type specifies its arguments. */
  onActivate: (slot: MarkerSlot) => void
  /** Called when hover occurs. The callback type specifies its arguments. */
  onHover: (slot: MarkerSlot | null) => void
  /** Called when focus occurs. The callback type specifies its arguments. */
  onFocus: (slot: MarkerSlot) => void
  /** Called when blur occurs. The callback type specifies its arguments. */
  onBlur: () => void
}

function MarkerButton({ slot, label, text, status, counts, selected, active, open, pulse, onKeyDown, onActivate, onHover, onFocus, onBlur }: MarkerProps) {
  const cluster = slot.kind === "cluster"
  const segments = useMemo(() => (cluster ? ringSegments(counts, 15) : []), [cluster, counts])
  return (
    <button
      type="button"
      className="fa-map-marker"
      data-kind={slot.kind}
      data-status={status}
      data-selected={selected ? "" : undefined}
      data-open={open ? "" : undefined}
      data-marker-key={slot.key}
      data-size={cluster ? (slot.size >= CLUSTER_STEPS.lg ? "lg" : slot.size >= CLUSTER_STEPS.md ? "md" : "sm") : undefined}
      tabIndex={active ? 0 : -1}
      aria-label={label}
      aria-pressed={cluster ? undefined : selected}
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={() => onActivate(slot)}
      onKeyDown={(event) => onKeyDown(event, slot)}
      onPointerEnter={() => onHover(slot)}
      onPointerLeave={() => onHover(null)}
      onFocus={() => onFocus(slot)}
      onBlur={onBlur}
    >
      {pulse > 0 ? <span key={pulse} className="fa-map-pulse" aria-hidden /> : null}
      {cluster ? (
        <span className="fa-map-cluster" aria-hidden>
          <svg viewBox="-18 -18 36 36" className="fa-map-ring" focusable="false">
            {segments.map((segment) => (
              <path key={segment.status} d={segment.d} data-status={segment.status} />
            ))}
          </svg>
          <span className="fa-map-cluster-count">{slot.size.toLocaleString("en-AU")}</span>
        </span>
      ) : (
        <span className="fa-map-dot" aria-hidden />
      )}
      {text ? (
        <span className="fa-map-marker-label" aria-hidden>
          {text}
        </span>
      ) : null}
    </button>
  )
}

/* ── Controls ───────────────────────────────────────────────────────────────── */

/** "View as list" / "View as map": in the map's controls, and in the list's toolbar. */
export function MapViewToggle({ view, onViewChange, size = "md" }: { view: "map" | "list"; onViewChange: (view: "map" | "list") => void; size?: "sm" | "md" }) {
  return view === "map" ? (
    <Button variant="secondary" size={size} icon={<IconList />} aria-label="View as list" data-map-control="view" onClick={() => onViewChange("list")} />
  ) : (
    <Button variant="secondary" size={size} icon={<IconMapPin />} onClick={() => onViewChange("map")} data-map-control="view">
      View as map
    </Button>
  )
}

function Attribution({ config, folded }: { config: MapConfig; folded: boolean }) {
  const credits = [...(config.basemap?.attribution ?? []), config.regionAttribution]
  const compact = credits.filter((credit) => credit.short || credit.minimal)
  const link = (credit: MapAttribution, text: string) =>
    credit.href ? (
      <a href={credit.href} target="_blank" rel="noreferrer">
        {text}
      </a>
    ) : (
      text
    )
  return (
    <div className="fa-map-attribution" data-collapsed={folded ? "" : undefined}>
      {compact.length ? (
        // The full line where there is room; in a small map only the credits that must stay
        // visible, in their shortest form ("© OpenStreetMap"). Everything is behind ⓘ.
        <span className="fa-map-attribution-text">
          {compact.map((credit, index) => (
            <span key={credit.label} className="fa-map-credit" data-minimal={credit.minimal ? "" : undefined}>
              {index > 0 && credit.short ? (
                <span className="fa-map-credit-short" aria-hidden>
                  {" · "}
                </span>
              ) : null}
              {credit.short ? <span className="fa-map-credit-short">{link(credit, credit.short)}</span> : null}
              {credit.minimal ? <span className="fa-map-credit-minimal">{link(credit, credit.minimal)}</span> : null}
            </span>
          ))}
        </span>
      ) : null}
      <Popover.Root>
        <Popover.Trigger render={<Button variant="ghost" size="xs" icon={<IconInfo />} aria-label="Map data and licences" data-map-control="attribution" />} />
        <Popover.Popup size="sm" side="top" align="end" title="Map data">
          <ul className="fa-map-credits">
            {credits.map((credit) => (
              <li key={credit.label}>
                {credit.href ? (
                  <a href={credit.href} target="_blank" rel="noreferrer">
                    {credit.label}
                  </a>
                ) : (
                  credit.label
                )}
                {credit.licence ? <span className="fa-map-credit-licence"> · {credit.licence}</span> : null}
              </li>
            ))}
          </ul>
        </Popover.Popup>
      </Popover.Root>
    </div>
  )
}

/* ── The map ────────────────────────────────────────────────────────────────── */

export function GeoMap<T>({
  label,
  config,
  home,
  regions = NO_REGIONS,
  points,
  loading = false,
  frame: frameProp = "home",
  frameKey,
  selectedId = null,
  onSelect,
  renderPopup,
  renderClusterPopup,
  pulses,
  statusLabels = DEFAULT_STATUS_LABELS,
  noun = { one: "site", other: "sites" },
  view = "map",
  onViewChange,
  list,
  insets,
  className,
}: GeoMapProps<T>) {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  /**
   * The fit padding, as the silhouette uses it: stage tokens that step down in small boxes,
   * with more on the right where the controls stand, so the frame centres in the open map.
   */
  const fitPadding = (): FitPadding => {
    const stage = stageRef.current
    const read = (side: "top" | "right" | "bottom" | "left") => (stage ? readLength(stage, `--fa-map-fit-${side}`, 48) : 48)
    return { top: read("top"), right: read("right"), bottom: read("bottom"), left: read("left") }
  }
  /**
   * The camera still shows the frame it was given (no pan, zoom or fly since): a resize
   * (Overview shown or hidden, a window dragged) re-frames it. After the user moves it, the
   * view is theirs and a resize keeps its centre.
   */
  const onFrame = useRef(true)
  const engineRef = useRef<MapEngine | null>(null)
  const popupHostRef = useRef<{ element: HTMLElement; open: (lng: number, lat: number) => void; close: () => void; destroy: () => void } | null>(null)
  const hoverTimer = useRef<number>(0)
  const focusPopupRef = useRef(false)
  const returnFocusRef = useRef<string | null>(null)
  const hintId = useId()

  const [phase, setPhase] = useState<Phase>("waiting")
  const [error, setError] = useState<string | null>(null)
  const [markers, setMarkers] = useState<MarkerSlot[]>([])
  const [zoom, setZoom] = useState(0)
  const [outside, setOutside] = useState<readonly MapPoint<T>[]>([])
  const [popup, setPopup] = useState<PopupState>(null)
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [leaves, setLeaves] = useState<Readonly<Record<string, readonly string[]>>>({})

  // Without a home region (none configured, or its outline is missing) the points frame the map.
  const frame: MapFrame = frameProp === "home" && home === null ? "points" : frameProp
  const byId = useMemo(() => new Map(points.map((point) => [point.id, point])), [points])
  const geojson = useMemo(() => pointsToGeoJSON(points), [points])
  const pointsBox = useMemo(() => boxOfPoints(points, MIN_POINT_SPAN), [points])
  const frameBox: LngLatBox = (frame === "points" && pointsBox) || home?.properties.focus || pointsBox || WORLD
  const frameBoxKey = frameBox.join(",")

  // Latest values for engine callbacks, which are bound once.
  const latest = useRef({ points, byId, onSelect, popup, frameBox })
  latest.current = { points, byId, onSelect, popup, frameBox }

  const styleInput = useRef<Omit<MapStyleInput, "theme"> | null>(null)
  styleInput.current = { basemap: config.basemap, origin: typeof window === "undefined" ? undefined : window.location.href, home: home ?? null, regions, points: geojson }

  /* Engine lifecycle: start once the frame is known (home settled; points loaded when framing points). */
  const canStart = home !== undefined && !(frame === "points" && loading)
  const started = useRef(false)
  const unmounted = useRef(false)
  useEffect(() => {
    if (!canStart || started.current) return
    const root = rootRef.current
    const container = canvasRef.current
    if (!root || !container) return
    started.current = true
    setPhase("loading")
    void import("./engine.js")
      .then(async (module) => {
        await module.configureEngine()
        return module
      })
      .then(({ MapEngine, createPopupHost }) => {
        // Strict mode starts twice; one engine per map.
        if (unmounted.current || engineRef.current) return
        const theme = readMapTheme(root)
        const padding = fitPadding()
        const engine = new MapEngine({
          container,
          config,
          style: { ...styleInput.current!, theme },
          box: latest.current.frameBox,
          padding,
          fitMaxZoom: FIT_MAX_ZOOM,
          // Labels fade on the motion tokens; under Still they swap at once.
          fadeDuration: cameraMove(root).animate ? 150 : 0,
          callbacks: {
            onLoad: () => {
              popupHostRef.current = createPopupHost(engine.map)
              setZoom(engine.zoom())
              setPhase("ready")
              updateView(engine)
            },
            onUserMove: () => {
              onFrame.current = false
            },
            onMove: () => {
              const labels = engine.zoom() >= LABEL_ZOOM
              if (labels !== root.hasAttribute("data-labels")) root.toggleAttribute("data-labels", labels)
            },
            onMoveEnd: () => {
              setZoom(Math.round(engine.zoom() * 4) / 4)
              updateView(engine)
            },
            onMarkers: (slots) => setMarkers(slots),
            onBackgroundClick: () => setPopup((current) => (current?.pinned ? null : current)),
            onError: (message) => {
              if (import.meta.env.DEV) console.warn(`[map] ${message}`)
            },
          },
        })
        engineRef.current = engine
        // Development builds hang the engine on the map's element for tests and debugging.
        if (import.meta.env.DEV) Object.defineProperty(root, "glassUxMapEngine", { value: engine, configurable: true })
      })
      .catch((reason: unknown) => {
        if (unmounted.current) return
        setPhase("failed")
        setError(reason instanceof Error ? reason.message : String(reason))
      })
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- the engine starts once; later changes flow through setStyleInput
  }, [canStart])

  useEffect(() => {
    unmounted.current = false
    return () => {
      unmounted.current = true
      popupHostRef.current?.destroy()
      popupHostRef.current = null
      engineRef.current?.destroy()
      engineRef.current = null
      started.current = false
    }
  }, [])

  const updateView = useCallback((engine: MapEngine) => {
    const bounds = engine.bounds()
    setOutside(latest.current.points.filter((point) => !boxContains(bounds, point.lng, point.lat)))
  }, [])

  /* Data and theme flow into the engine. */
  useEffect(() => {
    const engine = engineRef.current
    const root = rootRef.current
    if (!engine || !root || phase !== "ready") return
    engine.setStyleInput({ ...styleInput.current!, theme: readMapTheme(root) })
    updateView(engine)
  }, [phase, geojson, home, regions, config.basemap, updateView])

  useEffect(() => {
    const root = rootRef.current
    if (!root || phase !== "ready") return
    return observeAppearance(root, () => {
      const engine = engineRef.current
      if (engine) engine.setStyleInput({ ...styleInput.current!, theme: readMapTheme(root) })
    })
  }, [phase])

  /* Re-frame on a new scope or home region. */
  const framed = useRef<string | null>(null)
  useEffect(() => {
    const engine = engineRef.current
    const key = `${frameKey ?? ""}|${frame}|${frameBoxKey}`
    if (phase !== "ready" || !engine) {
      framed.current = key
      return
    }
    if (framed.current === key) return
    framed.current = key
    onFrame.current = true
    engine.fit(frameBox, fitPadding(), FIT_MAX_ZOOM, cameraMove(rootRef.current))
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- frameBoxKey stands for frameBox
  }, [phase, frameKey, frame, frameBoxKey])

  /* The chrome over the map changed (a header grew, a strip appeared): re-frame within it. */
  const insetKey = `${insets?.top ?? 0},${insets?.right ?? 0},${insets?.bottom ?? 0},${insets?.left ?? 0}`
  const lastInsets = useRef(insetKey)
  useEffect(() => {
    if (lastInsets.current === insetKey) return
    lastInsets.current = insetKey
    const engine = engineRef.current
    if (engine && phase === "ready" && onFrame.current) engine.fit(latest.current.frameBox, fitPadding(), FIT_MAX_ZOOM, { animate: false, duration: 0 })
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- reads the latest frame through refs
  }, [insetKey, phase])

  /* The credits fold to ⓘ after a few seconds or at the first interaction (docs/map.md). */
  const [creditsFolded, setCreditsFolded] = useState(false)
  useEffect(() => {
    if (phase !== "ready" || creditsFolded) return
    const root = rootRef.current
    const fold = (event?: Event) => {
      // Opening the credits themselves is not an interaction with the map.
      if (event && (event.target as Element | null)?.closest?.(".fa-map-attribution")) return
      setCreditsFolded(true)
    }
    const timer = window.setTimeout(fold, ATTRIBUTION_COLLAPSE_MS)
    const events = ["pointerdown", "wheel", "keydown"] as const
    for (const type of events) root?.addEventListener(type, fold, { passive: true })
    return () => {
      window.clearTimeout(timer)
      for (const type of events) root?.removeEventListener(type, fold)
    }
  }, [phase, creditsFolded])

  /* The map's box changed size: keep the frame centred in it while it is still the frame. */
  useEffect(() => {
    const root = rootRef.current
    if (!root || phase !== "ready") return
    let frameId = 0
    let last = { width: root.clientWidth, height: root.clientHeight }
    const observer = new ResizeObserver(() => {
      const size = { width: root.clientWidth, height: root.clientHeight }
      if (size.width === last.width && size.height === last.height) return
      last = size
      cancelAnimationFrame(frameId)
      frameId = requestAnimationFrame(() => {
        const engine = engineRef.current
        if (!engine || !size.width || !size.height) return
        engine.resize()
        if (onFrame.current) engine.fit(latest.current.frameBox, fitPadding(), FIT_MAX_ZOOM, { animate: false, duration: 0 })
      })
    })
    observer.observe(root)
    return () => {
      cancelAnimationFrame(frameId)
      observer.disconnect()
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- reads the latest frame through refs
  }, [phase])

  /* The view swapped back to the map: the canvas was hidden, so measure again. */
  useEffect(() => {
    if (view === "map") engineRef.current?.resize()
  }, [view])

  /* Cluster contents: for popups, accessible names and pulses. */
  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return
    let live = true
    const clusters = markers.filter((slot) => slot.kind === "cluster")
    void Promise.all(clusters.map(async (slot) => [slot.key, await engine.clusterLeaves(Number(slot.id)).catch(() => [])] as const)).then((entries) => {
      if (live) setLeaves(Object.fromEntries(entries))
    })
    return () => {
      live = false
    }
  }, [markers])

  /* Keep one marker tabbable: the selected point's, else the first in reading order. */
  const markerKeys = useMemo(() => new Set(markers.map((slot) => slot.key)), [markers])
  const keyOfPoint = useCallback(
    (id: string) => {
      if (markerKeys.has(pointKey(id))) return pointKey(id)
      for (const [key, ids] of Object.entries(leaves)) if (markerKeys.has(key) && ids.includes(id)) return key
      return null
    },
    [markerKeys, leaves]
  )
  const tabbable = (activeKey && markerKeys.has(activeKey) ? activeKey : null) ?? (selectedId ? keyOfPoint(selectedId) : null) ?? markers.toSorted((a, b) => a.lng - b.lng)[0]?.key ?? null

  /* The popup follows its marker; a cluster popup closes when its cluster is gone. */
  const popupTarget = useMemo(() => {
    if (!popup) return null
    if (popup.key.startsWith("p:")) {
      const point = byId.get(popup.key.slice(2))
      return point ? { lng: point.lng, lat: point.lat } : null
    }
    const slot = markers.find((marker) => marker.key === popup.key)
    return slot ? { lng: slot.lng, lat: slot.lat } : null
  }, [popup, byId, markers])

  useEffect(() => {
    const host = popupHostRef.current
    if (!host) return
    if (popup && popupTarget) host.open(popupTarget.lng, popupTarget.lat)
    else host.close()
  }, [popup, popupTarget])

  useEffect(() => {
    if (popup && !popupTarget) setPopup(null)
  }, [popup, popupTarget])

  /* After a pinned popup opens from the keyboard, move focus into it. */
  useEffect(() => {
    if (!popup?.pinned || !focusPopupRef.current) return
    focusPopupRef.current = false
    const frameId = requestAnimationFrame(() => {
      const first = popupHostRef.current?.element.querySelector<HTMLElement>("a[href], button:not([disabled]), [tabindex='0']")
      ;(first ?? popupHostRef.current?.element.querySelector<HTMLElement>(".fa-map-popup"))?.focus()
    })
    return () => cancelAnimationFrame(frameId)
  }, [popup])

  /* Esc anywhere in the map closes the popup and returns focus to its marker. */
  const escape = useRef<() => void>(() => undefined)
  useEffect(() => {
    escape.current = () => {
      if (popup) closePopup(true)
    }
  })
  const hasPopup = popup !== null
  useEffect(() => {
    const root = rootRef.current
    if (!root || !hasPopup) return
    // While a popup is open, Esc closes it from inside the map, or from nowhere in particular
    // (focus on the page after a pointer click); never from another overlay or a field.
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return
      const active = document.activeElement
      if (active && active !== document.body && !root.contains(active)) return
      escape.current()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [hasPopup])

  /** Focus returning to a marker after Esc does not reopen its preview. */
  const quietFocus = useRef(false)
  const focusMarker = useCallback((key: string | null) => {
    if (!key) return
    setActiveKey(key)
    requestAnimationFrame(() => {
      rootRef.current?.querySelector<HTMLElement>(`[data-marker-key="${CSS.escape(key)}"]`)?.focus()
      quietFocus.current = false
    })
  }, [])

  const closePopup = useCallback(
    (returnFocus: boolean) => {
      const key = popup?.key ?? null
      setPopup(null)
      if (returnFocus && key) {
        quietFocus.current = true
        focusMarker(key.startsWith("p:") ? (keyOfPoint(key.slice(2)) ?? key) : key)
      }
    },
    [popup, focusMarker, keyOfPoint]
  )

  /* Pointer and keyboard on markers. */
  const pinPoint = useCallback(
    (id: string, fromKeyboard: boolean) => {
      const point = latest.current.byId.get(id)
      if (!point) return
      focusPopupRef.current = fromKeyboard
      returnFocusRef.current = pointKey(id)
      setPopup({ key: pointKey(id), pinned: true })
      latest.current.onSelect?.(point)
    },
    []
  )

  const zoomIntoCluster = useCallback(async (slot: MarkerSlot) => {
    const engine = engineRef.current
    if (!engine) return
    onFrame.current = false
    const target = await engine.clusterZoom(Number(slot.id)).catch(() => engine.zoom() + 2)
    setPopup(null)
    engine.flyTo(slot.lng, slot.lat, Math.min(target + 0.25, config.maxZoom), cameraMove(rootRef.current))
  }, [config.maxZoom])

  const onActivate = useCallback(
    (slot: MarkerSlot) => {
      window.clearTimeout(hoverTimer.current)
      setActiveKey(slot.key)
      if (slot.kind === "point") pinPoint(slot.id, false)
      else void zoomIntoCluster(slot)
    },
    [pinPoint, zoomIntoCluster]
  )

  const onMarkerKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, slot: MarkerSlot) => {
      const engine = engineRef.current
      if (isNavKey(event.key) && engine) {
        event.preventDefault()
        const screen = markers.map((marker) => engine.project(marker.lng, marker.lat))
        const index = markers.findIndex((marker) => marker.key === slot.key)
        const next = nextMarker(screen, index, event.key)
        if (next !== null && markers[next]) focusMarker(markers[next].key)
        return
      }
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault()
        if (slot.kind === "point") pinPoint(slot.id, true)
        else {
          focusPopupRef.current = true
          setPopup({ key: slot.key, pinned: true })
        }
        return
      }
      if (event.key === "Escape" && popup) {
        event.preventDefault()
        setPopup(null)
      }
    },
    [markers, focusMarker, pinPoint, popup]
  )

  const onHover = useCallback((slot: MarkerSlot | null) => {
    window.clearTimeout(hoverTimer.current)
    if (latest.current.popup?.pinned) return
    hoverTimer.current = window.setTimeout(
      () => setPopup(slot ? { key: slot.kind === "point" ? pointKey(slot.id) : slot.key, pinned: false } : null),
      slot ? HOVER_OPEN_MS : HOVER_CLOSE_MS
    )
  }, [])

  const onMarkerFocus = useCallback((slot: MarkerSlot) => {
    setActiveKey(slot.key)
    if (quietFocus.current) {
      quietFocus.current = false
      return
    }
    if (latest.current.popup?.pinned) return
    window.clearTimeout(hoverTimer.current)
    setPopup({ key: slot.kind === "point" ? pointKey(slot.id) : slot.key, pinned: false })
  }, [])

  const onMarkerBlur = useCallback(() => {
    if (latest.current.popup?.pinned) return
    window.clearTimeout(hoverTimer.current)
    hoverTimer.current = window.setTimeout(() => {
      if (!popupHostRef.current?.element.contains(document.activeElement)) setPopup((current) => (current?.pinned ? current : null))
    }, HOVER_CLOSE_MS)
  }, [])

  /* Controls. */
  const fitTo = useCallback((box: LngLatBox) => {
    const engine = engineRef.current
    if (!engine) return
    // Reset frames the map again; showing every point is a view of its own.
    onFrame.current = box === latest.current.frameBox
    engine.fit(box, fitPadding(), FIT_MAX_ZOOM, cameraMove(rootRef.current))
  }, [])
  const zoomBy = (delta: number) => {
    onFrame.current = false
    engineRef.current?.zoomBy(delta, cameraMove(rootRef.current))
  }
  const flyToPoint = useCallback((point: MapPoint<T>) => {
    const engine = engineRef.current
    if (!engine) return
    onFrame.current = false
    engine.flyTo(point.lng, point.lat, Math.max(engine.zoom(), 11), cameraMove(rootRef.current))
    focusPopupRef.current = false
    setPopup({ key: pointKey(point.id), pinned: true })
    latest.current.onSelect?.(point)
  }, [])

  const resetLabel = frame === "points" && pointsBox ? `Show all ${points.length.toLocaleString("en-AU")} ${points.length === 1 ? noun.one : noun.other}` : home ? `Reset to ${home.properties.name}` : "Reset view"

  /* Markers as portals into MapLibre's marker elements. */
  const markerNodes = markers.map((slot) => {
    if (slot.kind === "point") {
      const point = byId.get(slot.id)
      if (!point) return null
      const status = point.status
      const text = [point.label, point.description, statusLabels[status]].filter(Boolean).join(", ")
      return createPortal(
        <MarkerButton
          slot={slot}
          label={text}
          text={point.label}
          status={status}
          counts={slot.counts}
          selected={selectedId === point.id}
          active={tabbable === slot.key}
          open={popup?.key === slot.key}
          pulse={pulses?.[point.id] ?? 0}
          onKeyDown={onMarkerKeyDown}
          onActivate={onActivate}
          onHover={onHover}
          onFocus={onMarkerFocus}
          onBlur={onMarkerBlur}
        />,
        slot.element,
        slot.key
      )
    }
    const ids = leaves[slot.key] ?? []
    const pulse = ids.reduce((sum, id) => sum + (pulses?.[id] ?? 0), 0)
    const selected = selectedId ? ids.includes(selectedId) : false
    return createPortal(
      <MarkerButton
        slot={slot}
        label={`${slot.size.toLocaleString("en-AU")} ${noun.other}: ${describeCounts(slot.counts, statusLabels)}`}
        status={worstOf(slot.counts)}
        counts={slot.counts}
        selected={selected}
        active={tabbable === slot.key}
        open={popup?.key === slot.key}
        pulse={pulse}
        onKeyDown={onMarkerKeyDown}
        onActivate={onActivate}
        onHover={onHover}
        onFocus={onMarkerFocus}
        onBlur={onMarkerBlur}
      />,
      slot.element,
      slot.key
    )
  })

  /* The popup's content. */
  let popupContent: ReactNode = null
  let popupLabel = ""
  if (popup && popupTarget) {
    const context: MapPopupContext = { zoom, pinned: popup.pinned, close: () => closePopup(true) }
    if (popup.key.startsWith("p:")) {
      const point = byId.get(popup.key.slice(2))
      if (point) {
        popupLabel = point.label
        popupContent = renderPopup(point, context)
      }
    } else {
      const slot = markers.find((marker) => marker.key === popup.key)
      const members = (leaves[popup.key] ?? []).map((id) => byId.get(id)).filter((point): point is MapPoint<T> => Boolean(point))
      if (slot) {
        const sorted = members.toSorted((a, b) => MAP_STATUSES.indexOf(a.status) - MAP_STATUSES.indexOf(b.status) || a.label.localeCompare(b.label))
        const cluster: MapCluster<T> = { id: Number(slot.id), lng: slot.lng, lat: slot.lat, points: sorted }
        popupLabel = `${slot.size} ${noun.other}`
        popupContent = renderClusterPopup ? (
          renderClusterPopup(cluster, {
            ...context,
            zoomIn: () => void zoomIntoCluster(slot),
            openPoint: (id) => {
              const point = byId.get(id)
              if (point) flyToPoint(point)
            },
          })
        ) : (
          <DefaultClusterPopup cluster={cluster} size={slot.size} counts={slot.counts} labels={statusLabels} noun={noun} onZoom={() => void zoomIntoCluster(slot)} onOpen={(point) => flyToPoint(point)} />
        )
      }
    }
  }

  const popupNode =
    popup && popupContent && popupHostRef.current
      ? createPortal(
          <MapPopup
            label={popupLabel}
            pinned={popup.pinned}
            onClose={() => closePopup(true)}
            onPointerEnter={() => window.clearTimeout(hoverTimer.current)}
            onPointerLeave={() => {
              if (!popup.pinned) onHover(null)
            }}
          >
            {popupContent}
          </MapPopup>,
          popupHostRef.current.element
        )
      : null

  const counts = useMemo(() => countStatuses(points), [points])
  const failed = phase === "failed"

  return (
    <div
      ref={rootRef}
      className={cx("fa-map", className)}
      style={insetStyle(insets)}
      data-phase={phase}
      data-view={view}
      data-insets={insets === null ? "pending" : undefined}
      role="region"
      aria-label={label}
      aria-describedby={hintId}
      aria-busy={phase !== "ready" && !failed ? true : undefined}
    >
      <p id={hintId} className="sr-only">
        {`${points.length.toLocaleString("en-AU")} ${points.length === 1 ? noun.one : noun.other}${points.length ? `: ${describeCounts(counts, statusLabels)}` : ""}. Arrow keys move between markers; Enter opens one.`}
      </p>
      <div ref={stageRef} className="fa-map-stage" inert={view === "list" ? true : undefined}>
        <MapSilhouette region={home} box={frameBox} />
        <div ref={canvasRef} className="fa-map-canvas" />
        {failed ? (
          <div className="fa-map-failed">
            <p>The map could not start{error && /webgl/i.test(error) ? ": this browser has WebGL turned off" : ""}.</p>
            {onViewChange ? (
              <Button size="sm" icon={<IconList />} onClick={() => onViewChange("list")}>
                View as list
              </Button>
            ) : null}
          </div>
        ) : null}
        <div className="fa-map-overlay over-imagery">
          <div className="fa-map-controls" role="toolbar" aria-label="Map controls" aria-orientation="vertical">
            <Button variant="secondary" icon={<IconZoomIn />} aria-label="Zoom in" onClick={() => zoomBy(1)} disabled={phase !== "ready"} data-map-control="zoom-in" />
            <Button variant="secondary" icon={<IconZoomOut />} aria-label="Zoom out" onClick={() => zoomBy(-1)} disabled={phase !== "ready"} data-map-control="zoom-out" />
            <Button variant="secondary" icon={frame === "points" ? <IconGlobe /> : <IconHome />} aria-label={resetLabel} onClick={() => fitTo(frameBox)} disabled={phase !== "ready"} data-map-control="reset" />
            {onViewChange ? <MapViewToggle view="map" onViewChange={onViewChange} /> : null}
          </div>
          {outside.length && phase === "ready" ? (
            <div className="fa-map-outside">
              <Menu.Root>
                <Menu.Trigger
                  render={
                    <Button variant="secondary" size="sm" icon={<IconGlobe />} data-map-control="outside">
                      {`${outside.length.toLocaleString("en-AU")} ${outside.length === 1 ? noun.one : noun.other} outside this view`}
                    </Button>
                  }
                />
                <Menu.Popup side="bottom" align="start">
                  <Menu.Item icon={<IconGlobe />} onClick={() => pointsBox && fitTo(pointsBox)}>
                    {`Show all ${points.length.toLocaleString("en-AU")} ${noun.other}`}
                  </Menu.Item>
                  <Menu.Separator />
                  {outside.slice(0, 12).map((point) => (
                    <Menu.Item key={point.id} icon={<span className="fa-map-menu-dot" data-status={point.status} aria-hidden />} trail={point.description} onClick={() => flyToPoint(point)}>
                      {point.label}
                    </Menu.Item>
                  ))}
                </Menu.Popup>
              </Menu.Root>
            </div>
          ) : null}
          <Attribution config={config} folded={creditsFolded} />
        </div>
      </div>
      {view === "list" ? <div className="fa-map-list glass-card">{list}</div> : null}
      {markerNodes}
      {popupNode}
    </div>
  )
}

/* ── Popups ─────────────────────────────────────────────────────────────────── */

interface MapPopupProps {
  label: string
  pinned: boolean
  /** Called when close occurs. The callback type specifies its arguments. */
  onClose: () => void
  /** Called when pointer enter occurs. The callback type specifies its arguments. */
  onPointerEnter: () => void
  /** Called when pointer leave occurs. The callback type specifies its arguments. */
  onPointerLeave: () => void
  children: ReactNode
}

/** The shared popup surface, entering like every fa-popup (R11.3). */
function MapPopup({ label, pinned, onClose, onPointerEnter, onPointerLeave, children }: MapPopupProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [starting, setStarting] = useState(true)
  useIsomorphicLayoutEffect(() => {
    const frame = requestAnimationFrame(() => setStarting(false))
    return () => cancelAnimationFrame(frame)
  }, [])
  return (
    <div
      ref={ref}
      className="glass-overlay fa-popup fa-map-popup"
      role="dialog"
      aria-label={label}
      data-pinned={pinned ? "" : undefined}
      data-starting-style={starting ? "" : undefined}
      tabIndex={-1}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      style={{ "--transform-origin": "bottom center" } as CSSProperties}
    >
      {children}
      {/* Last in the DOM (drawn top right) so focus lands on the content first. */}
      {pinned ? <Button className="fa-map-popup-close" variant="ghost" size="xs" icon={<IconClose />} aria-label="Close" onClick={onClose} /> : null}
    </div>
  )
}

interface DefaultClusterPopupProps<T> {
  /** Aggregate cluster represented by the marker. */
  cluster: MapCluster<T>
  size: number
  /** Counts grouped by category or status. */
  counts: StatusCounts
  /** Display and accessibility labels supplied by the application. */
  labels: Readonly<Record<MapStatus, string>>
  /** Singular and plural names used in counts and accessible labels. */
  noun: MapNoun
  /** Called when zoom occurs. The callback type specifies its arguments. */
  onZoom: () => void
  /** Called when open occurs. The callback type specifies its arguments. */
  onOpen: (point: MapPoint<T>) => void
}

/** A cluster's contents: the status breakdown and its points, worst first. */
export function DefaultClusterPopup<T>({ cluster, size, counts, labels, noun, onZoom, onOpen }: DefaultClusterPopupProps<T>) {
  return (
    <div className="fa-map-cluster-popup">
      <p className="fa-map-popup-title">{`${size.toLocaleString("en-AU")} ${noun.other}`}</p>
      <MapStatusSummary counts={counts} labels={labels} />
      <ul className="fa-map-cluster-list">
        {cluster.points.slice(0, 8).map((point) => (
          <li key={point.id}>
            <button type="button" className="fa-item fa-map-cluster-item" onClick={() => onOpen(point)}>
              <span className="fa-map-menu-dot" data-status={point.status} aria-hidden />
              <span className="fa-item-label">{point.label}</span>
              {point.description ? <span className="fa-item-trail fa-map-cluster-item-trail">{point.description}</span> : null}
            </button>
          </li>
        ))}
      </ul>
      {cluster.points.length > 8 ? <p className="fa-map-popup-more">{`${cluster.points.length - 8} more`}</p> : null}
      <Button size="sm" variant="secondary" icon={<IconZoomIn />} onClick={onZoom}>
        Zoom in
      </Button>
    </div>
  )
}

/** Status counts as dot · number · label chips (clusters, popups, legends). */
export function MapStatusSummary({ counts, labels = DEFAULT_STATUS_LABELS }: { counts: StatusCounts; labels?: Readonly<Record<MapStatus, string>> }) {
  return (
    <ul className="fa-map-status-summary">
      {MAP_STATUSES.filter((status) => counts[status] > 0).map((status) => (
        <li key={status} data-status={status}>
          <span className="fa-map-menu-dot" data-status={status} aria-hidden />
          <span className="fa-map-status-count">{counts[status].toLocaleString("en-AU")}</span>
          <span>{labels[status]}</span>
        </li>
      ))}
    </ul>
  )
}
