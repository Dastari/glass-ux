import { useMessages } from "../../lib/i18n/index.js"
import { mapMessages } from "./messages.js"
/**
 * PinMap — a small map with one pin: where an address is, or where a person points.
 *
 * Anatomy (a fill component in a glass-inset well; the parent sets its height, R7.3):
 *   canvas    MapLibre GL, loaded on demand with the map chunk (pin-engine.ts), themed from
 *             the same tokens as GeoMap (style.ts), so it recolours with mode and palette
 *   pin       a focusable button at the point: drag it, or focus it and use the arrow keys
 *             (Shift moves further); clicking the map moves it there. Fixed when read-only.
 *   zoom      + and − (the wheel never zooms it: a form scrolls past it)
 *   credit    the data licence's short form ("© OpenStreetMap"), always visible
 *
 * Until MapLibre arrives the well shows its loading tile; when it cannot load (no WebGL, tiles
 * blocked) it says so in the same box. Nothing moves either way (R9).
 */
import { useEffect, useRef, useState, type KeyboardEvent } from "react"
import { createPortal } from "react-dom"
import { IconMapPin, IconZoomIn, IconZoomOut } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { observeElementSize } from "../../lib/resize-observer.js"
import { Button } from "../button/index.js"
import type { PinEngine } from "./pin-engine.js"
import { tokenDuration } from "../../lib/motion.js"
import { observeAppearance, readMapTheme } from "./theme.js"
import type { LngLatBox, MapConfig } from "./types.js"

export interface PinPoint {
  lat: number
  lng: number
}

export interface PinMapProps {
  /** Typed component configuration and external provider definitions. */
  config: MapConfig
  /** The pin, or null for none yet. */
  value: PinPoint | null
  /**
   * Called when the pin is dropped, nudged with the arrow keys or placed by a click. Without it
   * the pin is fixed (a read-only preview).
   */
  onValueChange?: (point: PinPoint) => void
  /** Names the map for assistive tech: "Map of 12 Example Lane". */
  label: string
  /** Zoom used to show the pin. Default 16 (a street and its buildings). */
  zoom?: number
  /** The area shown when there is no pin: [west, south, east, north]. Default: the world. */
  fallback?: LngLatBox
  className?: string
}

const WORLD: LngLatBox = [-170, -58, 178, 75]
/** Keyboard nudge in screen pixels; Shift moves five times as far. */
const NUDGE_PX = 4

type Phase = "loading" | "ready" | "failed"

/** Camera timing from the motion tokens: --duration-slow, nothing under Still (R18.3). */
function cameraMove(root: HTMLElement | null) {
  if (!root) return { animate: false, duration: 0 }
  const duration = tokenDuration("--duration-slow", 0, root)
  return { animate: duration > 40, duration }
}

const describe = (point: PinPoint) => `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`

/** A map with one draggable pin for choosing a location: drag, click or nudge it with the arrow keys (Shift moves further). Controlled through `value`; without `onValueChange` it is a read-only preview. */
export function PinMap({ config, value, onValueChange, label, zoom = 16, fallback = WORLD, className }: PinMapProps) {
  const messages = useMessages(mapMessages)

  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<PinEngine | null>(null)
  const [engine, setEngine] = useState<PinEngine | null>(null)
  const [phase, setPhase] = useState<Phase>("loading")
  const latest = useRef({ value, onValueChange })
  latest.current = { value, onValueChange }
  const editable = Boolean(onValueChange)

  // Start the engine once; later values flow through setPin.
  useEffect(() => {
    const root = rootRef.current
    const container = canvasRef.current
    if (!root || !container) return
    let cancelled = false
    void import("./pin-engine.js")
      .then(({ createPinEngine }) =>
        createPinEngine({
          container,
          config,
          theme: readMapTheme(root),
          center: latest.current.value,
          box: fallback,
          zoom,
          fadeDuration: cameraMove(root).animate ? 150 : 0,
          draggable: editable,
          onLoad: () => {
            if (!cancelled) setPhase("ready")
          },
          onPlace: (point) => latest.current.onValueChange?.(point),
          onError: (message) => {
            if (import.meta.env.DEV) console.warn(`[pin-map] ${message}`)
          },
        })
      )
      .then((created) => {
        if (cancelled) {
          created.destroy()
          return
        }
        engineRef.current = created
        setEngine(created)
        if (import.meta.env.DEV) Object.defineProperty(root, "glassUxPinEngine", { value: created, configurable: true })
      })
      .catch(() => {
        if (!cancelled) setPhase("failed")
      })
    return () => {
      cancelled = true
      engineRef.current?.destroy()
      engineRef.current = null
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- the engine starts once per mount
  }, [])

  // The pin follows the value; a new point from outside (a lookup) is brought into view.
  const shown = useRef<string | null>(value ? describe(value) : null)
  useEffect(() => {
    if (!engine) return
    if (!value) {
      engine.clearPin()
      shown.current = null
      return
    }
    engine.setPin(value)
    const key = describe(value)
    if (shown.current !== key) {
      shown.current = key
      engine.show(value, zoom, cameraMove(rootRef.current))
    }
  }, [engine, value, zoom])

  // Recolour with mode and palette.
  useEffect(() => {
    const root = rootRef.current
    if (!engine || !root) return
    return observeAppearance(root, () => engine.setTheme(readMapTheme(root)))
  }, [engine])

  // The well can change size (a dialog opening): keep the canvas filling it.
  useEffect(() => {
    const root = rootRef.current
    if (!engine || !root || typeof ResizeObserver === "undefined") return
    return observeElementSize(root, () => engine.resize())
  }, [engine])

  const onPinKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!engine || !onValueChange) return
    const step = event.shiftKey ? NUDGE_PX * 5 : NUDGE_PX
    const delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[event.key]
    if (!delta) return
    event.preventDefault()
    const next = engine.nudge(delta[0] ?? 0, delta[1] ?? 0)
    if (next) {
      shown.current = describe(next)
      onValueChange(next)
    }
  }

  const credits = (config.basemap?.attribution ?? []).filter((credit) => credit.minimal)

  return (
    <div
      ref={rootRef}
      className={cx("fa-map fa-pin-map glass-inset", className)}
      data-phase={phase}
      data-editable={editable ? "" : undefined}
      role="group"
      aria-label={label}
    >
      <div ref={canvasRef} className="fa-pin-map-canvas" />
      {phase === "loading" ? (
        <div className="fa-pin-map-placeholder" aria-hidden>
          <IconMapPin />
        </div>
      ) : null}
      {phase === "failed" ? <p className="fa-pin-map-note">{value ? messages.mapLoadFailedAt(describe(value)) : messages.theMapCouldNotLoad}</p> : null}
      {engine && value
        ? createPortal(
            <button
              type="button"
              className="fa-pin-map-pin"
              aria-label={editable ? messages.pinAtDragItOrUseThe(describe(value)) : messages.pinAt(describe(value))}
              aria-disabled={editable ? undefined : true}
              tabIndex={editable ? 0 : -1}
              onKeyDown={onPinKey}
            >
              <IconMapPin />
            </button>,
            engine.host
          )
        : null}
      {phase === "ready" ? (
        <div className="fa-pin-map-controls over-imagery">
          <Button variant="secondary" size="xs" icon={<IconZoomIn />} aria-label={messages.zoomIn} onClick={() => engine?.zoomBy(1)} />
          <Button variant="secondary" size="xs" icon={<IconZoomOut />} aria-label={messages.zoomOut} onClick={() => engine?.zoomBy(-1)} />
        </div>
      ) : null}
      {credits.length ? (
        <div className="fa-pin-map-credit over-imagery">
          {credits.map((credit) =>
            credit.href ? (
              <a key={credit.label} href={credit.href} target="_blank" rel="noreferrer" title={credit.label}>
                {credit.minimal}
              </a>
            ) : (
              <span key={credit.label} title={credit.label}>
                {credit.minimal}
              </span>
            )
          )}
        </div>
      ) : null}
    </div>
  )
}
