/**
 * RelationshipCanvas — a pannable, zoomable diagram of record cards (a header and rows) joined
 * by edges from row to row: a schema's tables and relations, a class diagram, an API's
 * resources, a workflow's inputs and outputs. A card can link to several cards, to itself and
 * back round a cycle; TopologyCanvas draws trees, this draws graphs.
 *
 *   geometry   card heights are computed from the row count and the tokens (a probe reads
 *              them), never measured, so every edge anchor is exact before the cards render
 *              (layout.ts). Positions are the host's: controlled or not, they change only when
 *              a card is dragged or moved with the keys, or on Auto layout, and each change is
 *              reported. Cards without a position are placed by the automatic layout.
 *   render     DOM cards over one SVG of edges in the same world layer, so they stay aligned at
 *              every zoom. Panning and zooming write one transform per frame (R14.7) and never
 *              re-render a card; the dot grid moves with the camera (fa-dot-grid).
 *   pointer    drag the background (or a card's body) to pan; a card's header drags the card;
 *              the wheel pans and Ctrl or Command with the wheel (and a trackpad pinch) zooms;
 *              two fingers pinch
 *   keyboard   a listbox with one tab stop: arrow keys travel to the nearest card that way,
 *              Shift with an arrow moves the focused card, Enter opens, Space selects, Escape
 *              clears, + − 0 zoom and fit
 *   motion     the camera glides to a focused card off screen, instantly under the motion
 *              switch (R18.3)
 */
import {
  memo,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  type RefObject,
} from "react"
import { IconFullscreen, IconGrid, IconTable, IconZoomIn, IconZoomOut } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { paintDotGrid } from "../../lib/dot-grid.js"
import { useMessages } from "../../lib/i18n/index.js"
import { listFormat, numberFormat } from "../../lib/locale/intl.js"
import { useLocale } from "../../lib/locale/use-locale.js"
import { observeElementSize } from "../../lib/resize-observer.js"
import { useSelectedId, type SelectionChangeDetails } from "../../lib/use-selected-id.js"
import { Badge } from "../badge/index.js"
import { Button } from "../button/index.js"
import { EmptyState } from "../empty-state/index.js"
import { Skeleton } from "../skeleton/index.js"
import { Surface } from "../surface/index.js"
import { autoLayout, bounds, cardHeight, DEFAULT_METRICS, diagnose, edgePaths, mergePositions, nearestCard, readingOrder } from "./layout.js"
import { relationshipCanvasMessages } from "./messages.js"
import type {
  RelationshipCanvasActions,
  RelationshipCard,
  RelationshipEdge,
  RelationshipMetrics,
  RelationshipPoint,
  RelationshipPositions,
  RelationshipPositionsChangeDetails,
} from "./types.js"

const useIsomorphicLayoutEffect = typeof window === "undefined" ? () => {} : useLayoutEffect

const MAX_ZOOM = 2
const MIN_ZOOM = 0.25
/** Below this zoom the text is unreadable: labels and rows hide and the cards carry the map. */
const FAR_ZOOM = 0.45
const ZOOM_STEP = 1.2
/** px of pointer travel before a press becomes a pan or a drag (a click selects). */
const DRAG_THRESHOLD = 4
/** World px a card moves per Shift+arrow. */
const KEY_STEP = 16
const NO_POSITIONS: RelationshipPositions = {}
const NO_EDGES: readonly RelationshipEdge[] = []

export interface RelationshipCanvasProps<T = unknown> {
  /** Names the diagram: "Schema, Active". */
  label: string
  /** undefined while loading: the skeleton shows in the same box. */
  cards: readonly RelationshipCard<T>[] | undefined
  /** Links between rows. Edges to cards or rows that do not exist are skipped (with a development warning). */
  edges?: readonly RelationshipEdge[]
  /** Card positions, controlled. Cards missing from it are placed by the automatic layout. */
  positions?: RelationshipPositions
  /** Initial positions while uncontrolled. */
  defaultPositions?: RelationshipPositions
  /**
   * Called with every card's position after a card is dragged (on release), moved with
   * Shift and an arrow key, or laid out by Auto layout. Persist it to keep the arrangement.
   */
  onPositionsChange?: (positions: RelationshipPositions, details: RelationshipPositionsChangeDetails) => void
  /** Cards can be dragged and moved with the keys, and Auto layout shows. Default true. */
  movable?: boolean
  /** The selected card's id, or null for none. Controlled while defined; leave it undefined to use `defaultSelectedId`. */
  selectedId?: string | null
  /** The card selected at first when the selection is uncontrolled. */
  defaultSelectedId?: string | null
  /**
   * Called with the card id the person selects (click, Space, or Enter without `onOpen`),
   * or `null` when they clear it (Escape, or a click on empty canvas), and details whose
   * `item` is the card. The selected card's edges are drawn in the accent.
   */
  onSelectedIdChange?: (id: string | null, details: SelectionChangeDetails<RelationshipCard<T>>) => void
  /** Double-click or Enter: the card's page or editor. */
  onOpen?: (card: RelationshipCard<T>) => void
  /** The card's accessible name. Default: its title. */
  describeCard?: (card: RelationshipCard<T>) => string
  /** Re-fit when this changes (another diagram). Live changes to the same diagram keep the camera. */
  frameKey?: unknown
  /** Show the zoom, fit and Auto layout controls over the canvas. Default true. */
  controls?: boolean
  /** Draw the dot grid; it pans and scales with the camera. Default true. */
  grid?: boolean
  /** A hairline border and the surface radius around the canvas. Turn it off inside a Panel. Default true. */
  framed?: boolean
  /** One line for an empty diagram (R2.5). */
  emptyText?: ReactNode
  /** The empty state's icon. Default a table. */
  emptyIcon?: ReactNode
  /** Receives the canvas's commands (zoom, fit, auto layout) for a host toolbar. */
  actionsRef?: RefObject<RelationshipCanvasActions | null>
  className?: string
}

interface Camera {
  x: number
  y: number
  k: number
}

/** The metrics and timings the tokens set, read from the probe's computed style. */
function readProbe(probe: HTMLElement): { metrics: RelationshipMetrics; fitPadding: number; controls: number; duration: number } {
  const style = getComputedStyle(probe)
  const px = (value: string) => Number.parseFloat(value) || 0
  const seconds = (value: string) => (value.endsWith("ms") ? px(value) : px(value) * 1000)
  return {
    metrics: {
      cardWidth: px(style.width) || DEFAULT_METRICS.cardWidth,
      headerHeight: px(style.height) || DEFAULT_METRICS.headerHeight,
      rowHeight: px(style.paddingTop) || DEFAULT_METRICS.rowHeight,
      listPadding: px(style.paddingBottom),
      gapX: px(style.marginLeft) || DEFAULT_METRICS.gapX,
      gapY: px(style.marginTop) || DEFAULT_METRICS.gapY,
    },
    fitPadding: px(style.paddingLeft),
    controls: px(style.marginRight),
    duration: seconds(style.transitionDuration.split(",")[0] ?? "0s"),
  }
}

interface CardViewProps {
  card: RelationshipCard
  at: RelationshipPoint
  height: number
  selected: boolean
  tabbable: boolean
  name: string
  description: string
  movable: boolean
}

const CardView = /* @__PURE__ */ memo(function CardView({ card, at, height, selected, tabbable, name, description, movable }: CardViewProps) {
  return (
    <Surface
      material="card"
      radius="tile"
      role="option"
      className="fa-relationship-card"
      data-card-id={card.id}
      aria-selected={selected}
      aria-label={name}
      aria-description={description}
      tabIndex={tabbable ? 0 : -1}
      data-selected={selected ? "" : undefined}
      style={{ transform: `translate(${at.x}px, ${at.y}px)`, height }}
    >
      <div className="fa-relationship-card-header" data-card-handle={movable ? "" : undefined}>
        {card.icon ? <span className="fa-relationship-card-icon">{card.icon}</span> : null}
        <span className="fa-relationship-card-title">{card.title}</span>
        {card.badge === null ? null : (
          <Badge size="sm" tone="neutral">
            {card.badge ?? card.rows.length}
          </Badge>
        )}
      </div>
      <div className="fa-relationship-rows">
        {card.rows.map((row) => (
          <div key={row.id} className="fa-relationship-row" data-row-id={row.id}>
            <span className="fa-relationship-row-lead" data-tone={row.tone && row.tone !== "neutral" ? row.tone : undefined}>
              {row.icon}
            </span>
            <span className="fa-relationship-row-label">{row.label}</span>
            {row.detail ? <span className="fa-relationship-row-detail">{row.detail}</span> : null}
          </div>
        ))}
      </div>
    </Surface>
  )
})

/** The canvas's loading shape: three cards of different lengths (R9.3). */
function RelationshipSkeleton({ label }: { label: string }) {
  return (
    <div className="fa-relationship-skeleton" role="status" aria-busy="true" aria-label={label}>
      {[5, 3, 4].map((rows, index) => (
        <Skeleton.Block key={index} radius="tile" className="fa-relationship-skeleton-card" style={{ "--_rows": rows } as CSSProperties} />
      ))}
    </div>
  )
}

/**
 * A pannable, zoomable diagram of record cards joined by row-to-row edges. Cards can be
 * dragged by their header or moved with Shift and the arrow keys, and Auto layout arranges
 * them; the host keeps the positions through `onPositionsChange`. Selecting a card draws its
 * edges in the accent. It shows a skeleton while `cards` is undefined.
 *
 * Keyboard: the arrow keys move to the nearest card in that direction, Shift with an arrow
 * moves the focused card, Home and End go to the first and last card, Enter opens (or
 * selects), Space toggles the selection, Escape clears it, + and − zoom and 0 fits.
 */
export function RelationshipCanvas<T = unknown>({
  label,
  cards,
  edges = NO_EDGES,
  positions: positionsProp,
  defaultPositions,
  onPositionsChange,
  movable = true,
  selectedId: selectedIdProp,
  defaultSelectedId,
  onSelectedIdChange,
  onOpen,
  describeCard,
  frameKey,
  controls = true,
  grid = true,
  framed = true,
  emptyText,
  emptyIcon,
  actionsRef,
  className,
}: RelationshipCanvasProps<T>) {
  const messages = useMessages(relationshipCanvasMessages)
  const locale = useLocale()
  const helpId = useId()
  const markerId = `fa-rel-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`

  const rootRef = useRef<HTMLDivElement>(null)
  const probeRef = useRef<HTMLSpanElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const worldRef = useRef<HTMLDivElement>(null)
  const readoutRef = useRef<HTMLSpanElement>(null)
  const camera = useRef<Camera>({ x: 0, y: 0, k: 1 })
  const frame = useRef(0)
  const animation = useRef(0)
  const stageSize = useRef({ width: 0, height: 0 })
  const tokens = useRef({ fitPadding: 48, controls: 48, duration: 300 })
  const fitted = useRef<unknown>(Symbol("unfitted"))
  /** The camera still shows the fit: it re-fits when the box changes. A pan or zoom makes the view the person's. */
  const framed_ = useRef(true)
  const [metrics, setMetrics] = useState<RelationshipMetrics | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selectedId, select] = useSelectedId(selectedIdProp, defaultSelectedId, onSelectedIdChange)
  const [inner, setInner] = useState<RelationshipPositions>(defaultPositions ?? NO_POSITIONS)
  const stored = positionsProp ?? inner
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null)

  /* ── Tokens, then the arrangement ───────────────────────────────────────── */
  useIsomorphicLayoutEffect(() => {
    const probe = probeRef.current
    if (!probe) return
    const read = readProbe(probe)
    tokens.current = { fitPadding: read.fitPadding, controls: read.controls, duration: read.duration }
    setMetrics((current) => (current && JSON.stringify(current) === JSON.stringify(read.metrics) ? current : read.metrics))
  }, [])

  useEffect(() => {
    if (!import.meta.env.DEV || !cards) return
    const problems = diagnose(cards, edges)
    if (problems.length) console.warn(`RelationshipCanvas "${label}": ${problems.join("; ")}.`)
  }, [cards, edges, label])

  const byId = useMemo(() => new Map((cards ?? []).map((card) => [card.id, card as RelationshipCard] as const)), [cards])
  const merged = useMemo(() => (cards && metrics ? mergePositions(cards, edges, stored, metrics) : NO_POSITIONS), [cards, edges, stored, metrics])
  const shown = useMemo(() => (drag ? { ...merged, [drag.id]: { x: drag.x, y: drag.y } } : merged), [merged, drag])
  const paths = useMemo(() => (metrics ? edgePaths(byId, edges, shown, metrics) : []), [byId, edges, shown, metrics])
  const order = useMemo(() => (cards ? readingOrder(cards, merged) : []), [cards, merged])
  const ready = Boolean(cards && metrics)
  const empty = ready && !cards?.length
  const controlsReason = ready ? undefined : messages.diagramLoading
  // Latest values for the camera callbacks, which are created once.
  const live = useRef({ cards, merged, metrics })
  live.current = { cards, merged, metrics }

  const commit = useCallback(
    (next: RelationshipPositions, details: RelationshipPositionsChangeDetails) => {
      if (positionsProp === undefined) setInner(next)
      onPositionsChange?.(next, details)
    },
    [positionsProp, onPositionsChange],
  )

  /* ── The camera: one transform per frame ────────────────────────────────── */
  const percent = useMemo(() => numberFormat(locale, { style: "percent", maximumFractionDigits: 0 }), [locale])
  const apply = useCallback(() => {
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      const { x, y, k } = camera.current
      const world = worldRef.current
      if (world) world.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${k})`
      paintDotGrid(stageRef.current, camera.current)
      const readout = readoutRef.current
      const text = percent.format(k)
      if (readout && readout.textContent !== text) readout.textContent = text
      const root = rootRef.current
      const zoom = k < FAR_ZOOM ? "far" : "near"
      if (root && root.dataset.zoom !== zoom) root.dataset.zoom = zoom
    })
  }, [percent])

  const moveTo = useCallback(
    (target: Camera, animate: boolean) => {
      cancelAnimationFrame(animation.current)
      const duration = tokens.current.duration
      if (!animate || duration < 20) {
        camera.current = target
        apply()
        return
      }
      const from = { ...camera.current }
      const start = performance.now()
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / duration)
        const e = 1 - (1 - t) ** 3
        camera.current = { x: from.x + (target.x - from.x) * e, y: from.y + (target.y - from.y) * e, k: from.k + (target.k - from.k) * e }
        apply()
        if (t < 1) animation.current = requestAnimationFrame(step)
      }
      animation.current = requestAnimationFrame(step)
    },
    [apply],
  )

  /** The open part of the stage and the zoom that fits every card in it. */
  const fitting = useCallback(() => {
    const { cards: all, merged: at, metrics: m } = live.current
    if (!all?.length || !m) return null
    const { width, height } = stageSize.current
    const pad = tokens.current.fitPadding
    const room = { width: width - pad * 2 - (controls ? tokens.current.controls : 0), height: height - pad * 2 }
    if (!width || !height || room.width <= 0 || room.height <= 0) return null
    const box = bounds(all, at, m)
    return { pad, room, box, k: Math.min(room.width / Math.max(box.width, 1), room.height / Math.max(box.height, 1)) }
  }, [controls])

  /** Never further out than a quarter, unless that is what it takes to see everything (a phone). */
  const minZoom = useCallback(() => Math.min(MIN_ZOOM, (fitting()?.k ?? MIN_ZOOM) * 0.9), [fitting])

  const fitCamera = useCallback((): Camera | null => {
    const fit = fitting()
    if (!fit) return null
    const { pad, room, box } = fit
    const k = Math.min(1, fit.k)
    return { k, x: pad + (room.width - box.width * k) / 2 - box.x * k, y: pad + Math.max(0, (room.height - box.height * k) / 2) - box.y * k }
  }, [fitting])

  const fit = useCallback(
    (animate: boolean) => {
      const target = fitCamera()
      if (!target) return
      framed_.current = true
      moveTo(target, animate)
    },
    [fitCamera, moveTo],
  )

  const zoomAt = useCallback(
    (factor: number, point?: { x: number; y: number }, animate = false) => {
      const { x, y, k } = camera.current
      const { width, height } = stageSize.current
      const at = point ?? { x: width / 2, y: height / 2 }
      const next = Math.max(minZoom(), Math.min(MAX_ZOOM, k * factor))
      const ratio = next / k
      framed_.current = false
      moveTo({ k: next, x: at.x - (at.x - x) * ratio, y: at.y - (at.y - y) * ratio }, animate)
    },
    [minZoom, moveTo],
  )

  // The first arrangement (and a new frameKey) fits before paint, once the box has a size; an
  // untouched camera re-fits when the box changes.
  const tryFit = useCallback(() => {
    if (!ready || fitted.current === frameKey) return
    const target = fitCamera()
    if (!target) return
    fitted.current = frameKey
    framed_.current = true
    camera.current = target
    const world = worldRef.current
    if (world) world.style.transform = `translate3d(${target.x}px, ${target.y}px, 0) scale(${target.k})`
    apply()
  }, [ready, frameKey, fitCamera, apply])
  const tryFitRef = useRef(tryFit)
  tryFitRef.current = tryFit
  useIsomorphicLayoutEffect(() => {
    const stage = stageRef.current
    if (stage) stageSize.current = { width: stage.clientWidth, height: stage.clientHeight }
    tryFit()
  }, [tryFit, cards?.length])

  useIsomorphicLayoutEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const measure = () => {
      stageSize.current = { width: stage.clientWidth, height: stage.clientHeight }
      if (fitted.current !== frameKey) tryFitRef.current()
      else if (framed_.current) {
        const target = fitCamera()
        if (target) camera.current = target
        apply()
      } else apply()
    }
    measure()
    return observeElementSize(stage, measure)
  }, [apply, fitCamera, frameKey])

  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current)
      cancelAnimationFrame(animation.current)
    },
    [],
  )

  const runAutoLayout = useCallback(() => {
    const { cards: all, metrics: m } = live.current
    if (!all?.length || !m) return
    const next = { ...stored, ...autoLayout(all, edges, m) }
    commit(next, { reason: "auto-layout", cardId: null })
    live.current = { ...live.current, merged: next }
    fit(true)
  }, [stored, edges, commit, fit])

  useEffect(() => {
    if (!actionsRef) return
    actionsRef.current = {
      zoomIn: () => zoomAt(ZOOM_STEP, undefined, true),
      zoomOut: () => zoomAt(1 / ZOOM_STEP, undefined, true),
      fit: () => fit(true),
      autoLayout: runAutoLayout,
    }
  }, [actionsRef, zoomAt, fit, runAutoLayout])

  /** Pan so a card is inside the view (with the fit padding), gliding unless motion is off. */
  const reveal = useCallback(
    (id: string, at: RelationshipPositions = live.current.merged) => {
      const card = byId.get(id)
      const point = at[id]
      const m = live.current.metrics
      if (!card || !point || !m) return
      const { x, y, k } = camera.current
      const { width, height } = stageSize.current
      const pad = Math.min(tokens.current.fitPadding, 24)
      const left = point.x * k + x
      const top = point.y * k + y
      const right = left + m.cardWidth * k
      const bottom = top + cardHeight(card, m) * k
      const maxX = width - pad - (controls ? tokens.current.controls : 0)
      let dx = 0
      let dy = 0
      if (left < pad) dx = pad - left
      else if (right > maxX) dx = Math.max(pad - left, maxX - right)
      if (top < pad) dy = pad - top
      else if (bottom > height - pad) dy = Math.max(pad - top, height - pad - bottom)
      if (!dx && !dy) return
      framed_.current = false
      moveTo({ k, x: x + dx, y: y + dy }, true)
    },
    [byId, controls, moveTo],
  )

  /* ── Focus, selection and the keyboard ──────────────────────────────────── */
  const focusCard = useCallback(
    (id: string | undefined) => {
      if (!id) return
      setActiveId(id)
      worldRef.current?.querySelector<HTMLElement>(`[data-card-id="${CSS.escape(id)}"]`)?.focus({ preventScroll: true })
      reveal(id)
    },
    [reveal],
  )

  const tabStop = activeId && byId.has(activeId) ? activeId : selectedId && byId.has(selectedId) ? selectedId : (order[0] ?? null)
  const cardOf = (target: EventTarget) => (target as HTMLElement).closest<HTMLElement>("[data-card-id]")?.dataset.cardId

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!cards || !metrics) return
    const id = cardOf(event.target)
    const direction = ARROWS[event.key]
    if (direction && id && !event.altKey && !event.ctrlKey && !event.metaKey) {
      event.preventDefault()
      if (event.shiftKey) {
        if (!movable) return
        const at = merged[id] ?? { x: 0, y: 0 }
        const delta = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[direction]
        const next = { ...merged, [id]: { x: at.x + delta[0]! * KEY_STEP, y: at.y + delta[1]! * KEY_STEP } }
        commit(next, { reason: "keyboard", cardId: id })
        reveal(id, next)
        return
      }
      focusCard(nearestCard(id, direction, cards, merged, metrics))
      return
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault()
      focusCard(event.key === "Home" ? order[0] : order.at(-1))
      return
    }
    if ((event.key === "Enter" || event.key === " ") && id) {
      event.preventDefault()
      const card = byId.get(id) as RelationshipCard<T> | undefined
      if (event.key === "Enter" && onOpen && card) {
        onOpen(card)
        return
      }
      const next = id === selectedId && event.key === " " ? null : id
      select(next, { reason: "item-press", event: event.nativeEvent, item: next ? (card ?? null) : null })
      return
    }
    if (event.key === "Escape" && selectedId) {
      event.preventDefault()
      select(null, { reason: "escape-key", event: event.nativeEvent, item: null })
      return
    }
    if (event.metaKey || event.ctrlKey || event.altKey) return
    if (event.key === "+" || event.key === "=") zoomAt(ZOOM_STEP, undefined, true)
    else if (event.key === "-" || event.key === "_") zoomAt(1 / ZOOM_STEP, undefined, true)
    else if (event.key === "0") fit(true)
    else return
    event.preventDefault()
  }

  /* ── Pointer: pan, drag a card, pinch, wheel, click ─────────────────────── */
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef<{
    startX: number
    startY: number
    camera: Camera
    moving: boolean
    card?: { id: string; origin: RelationshipPoint }
    pinch?: { distance: number; k: number }
  } | null>(null)
  const dragFrame = useRef(0)
  const latestDrag = useRef<{ id: string; x: number; y: number } | null>(null)
  const suppressClick = useRef(false)

  const local = (event: { clientX: number; clientY: number }) => {
    const rect = stageRef.current!.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return
    cancelAnimationFrame(animation.current)
    pointers.current.set(event.pointerId, local(event))
    suppressClick.current = false
    const points = [...pointers.current.values()]
    if (points.length === 2) {
      const [a, b] = points as [{ x: number; y: number }, { x: number; y: number }]
      framed_.current = false
      setDrag(null)
      gesture.current = { startX: (a.x + b.x) / 2, startY: (a.y + b.y) / 2, camera: { ...camera.current }, moving: true, pinch: { distance: Math.hypot(a.x - b.x, a.y - b.y), k: camera.current.k } }
      return
    }
    const point = local(event)
    const handle = movable ? (event.target as HTMLElement).closest("[data-card-handle]") : null
    const id = handle ? cardOf(handle) : undefined
    const origin = id ? merged[id] : undefined
    gesture.current = { startX: point.x, startY: point.y, camera: { ...camera.current }, moving: false, card: id && origin ? { id, origin } : undefined }
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = gesture.current
    if (!current || !pointers.current.has(event.pointerId)) return
    pointers.current.set(event.pointerId, local(event))
    const points = [...pointers.current.values()]
    if (current.pinch && points.length >= 2) {
      const [a, b] = points as [{ x: number; y: number }, { x: number; y: number }]
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      const k = Math.max(minZoom(), Math.min(MAX_ZOOM, (current.pinch.k * Math.hypot(a.x - b.x, a.y - b.y)) / Math.max(current.pinch.distance, 1)))
      const ratio = k / current.camera.k
      camera.current = { k, x: mid.x - (current.startX - current.camera.x) * ratio, y: mid.y - (current.startY - current.camera.y) * ratio }
      apply()
      return
    }
    const point = local(event)
    const dx = point.x - current.startX
    const dy = point.y - current.startY
    if (!current.moving) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return
      current.moving = true
      suppressClick.current = true
      stageRef.current?.setPointerCapture(event.pointerId)
      if (rootRef.current) rootRef.current.dataset.moving = current.card ? "card" : "camera"
      if (current.card) {
        const card = byId.get(current.card.id) as RelationshipCard<T> | undefined
        if (card && current.card.id !== selectedId) select(current.card.id, { reason: "item-press", event: event.nativeEvent, item: card })
      } else framed_.current = false
    }
    if (current.card) {
      const { k } = camera.current
      latestDrag.current = { id: current.card.id, x: Math.round(current.card.origin.x + dx / k), y: Math.round(current.card.origin.y + dy / k) }
      cancelAnimationFrame(dragFrame.current)
      dragFrame.current = requestAnimationFrame(() => setDrag(latestDrag.current))
      return
    }
    camera.current = { ...current.camera, x: current.camera.x + dx, y: current.camera.y + dy }
    apply()
  }

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId)
    const current = gesture.current
    if (pointers.current.size === 0) {
      if (current?.card && current.moving && latestDrag.current) {
        cancelAnimationFrame(dragFrame.current)
        const { id, x, y } = latestDrag.current
        commit({ ...merged, [id]: { x, y } }, { reason: "drag", cardId: id })
      }
      latestDrag.current = null
      setDrag(null)
      gesture.current = null
      if (rootRef.current) delete rootRef.current.dataset.moving
    } else if (current?.pinch) {
      // One finger left: carry on as a pan from here.
      const [rest] = [...pointers.current.values()]
      gesture.current = rest ? { startX: rest.x, startY: rest.y, camera: { ...camera.current }, moving: true } : null
    }
  }

  // The wheel pans; Ctrl or Command with it (and a trackpad pinch) zooms around the pointer.
  // A non-passive listener, so the page does not scroll.
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const onWheel = (event: globalThis.WheelEvent) => {
      if (!live.current.cards?.length) return
      event.preventDefault()
      const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? stageSize.current.height : 1
      if (event.ctrlKey || event.metaKey) {
        const rect = stage.getBoundingClientRect()
        zoomAt(Math.exp(-event.deltaY * scale * 0.01), { x: event.clientX - rect.left, y: event.clientY - rect.top })
        return
      }
      const dx = event.shiftKey && !event.deltaX ? event.deltaY : event.deltaX
      const dy = event.shiftKey && !event.deltaX ? 0 : event.deltaY
      framed_.current = false
      camera.current = { ...camera.current, x: camera.current.x - dx * scale, y: camera.current.y - dy * scale }
      apply()
    }
    stage.addEventListener("wheel", onWheel, { passive: false })
    return () => stage.removeEventListener("wheel", onWheel)
  }, [zoomAt, apply])

  const onClick = (event: MouseEvent<HTMLDivElement>) => {
    if (suppressClick.current) {
      suppressClick.current = false
      return
    }
    const id = cardOf(event.target)
    if (id) {
      setActiveId(id)
      select(id, { reason: "item-press", event: event.nativeEvent, item: (byId.get(id) as RelationshipCard<T> | undefined) ?? null })
    } else if (selectedId) select(null, { reason: "outside-press", event: event.nativeEvent, item: null })
  }
  const onDoubleClick = (event: MouseEvent<HTMLDivElement>) => {
    const id = cardOf(event.target)
    const card = id ? (byId.get(id) as RelationshipCard<T> | undefined) : undefined
    if (card) onOpen?.(card)
  }

  /* ── What to draw ───────────────────────────────────────────────────────── */
  const related = useMemo(() => {
    const set = new Set<string>()
    if (!selectedId) return set
    for (const edge of edges) if (edge.from.card === selectedId || edge.to.card === selectedId) set.add(edge.id)
    return set
  }, [edges, selectedId])

  const names = useMemo(() => new Map((cards ?? []).map((card) => [card.id, describeCard?.(card) ?? card.title] as const)), [cards, describeCard])
  const descriptions = useMemo(() => {
    const list = (items: string[]) => listFormat(locale, { type: "unit" }).format(items)
    const titles = new Map((cards ?? []).map((card) => [card.id, card.title] as const))
    const result = new Map<string, string>()
    for (const card of cards ?? []) {
      const rows = card.rows.map((row) => (row.detail ? `${row.label} ${row.detail}` : row.label))
      const links: string[] = []
      for (const edge of edges) {
        const text = edge.label ?? ""
        if (edge.from.card === card.id && edge.to.card === card.id) links.push(messages.linkToItself(text))
        else if (edge.from.card === card.id && titles.has(edge.to.card)) links.push(messages.linkTo(text, titles.get(edge.to.card)!))
        else if (edge.to.card === card.id && titles.has(edge.from.card)) links.push(messages.linkFrom(text, titles.get(edge.from.card)!))
      }
      const parts = [rows.length ? messages.rowList({ count: rows.length, list: list(rows), locale }) : messages.noRows]
      if (links.length) parts.push(messages.links(list(links)))
      result.set(card.id, parts.join(" "))
    }
    return result
  }, [cards, edges, locale, messages])

  const world =
    ready && cards?.length && metrics ? (
      <div
        ref={worldRef}
        role="listbox"
        aria-label={label}
        aria-describedby={helpId}
        // Focus lives on the cards (a roving tab stop); the list itself is never a tab stop.
        tabIndex={-1}
        className="fa-relationship-world"
        onKeyDown={onKeyDown}
      >
        <svg className="fa-relationship-edges" width="1" height="1" aria-hidden>
          <defs>
            {(["", "-active"] as const).map((suffix) => (
              <marker key={suffix} id={`${markerId}${suffix}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" className="fa-relationship-arrow" data-active={suffix ? "" : undefined} />
              </marker>
            ))}
          </defs>
          {/* The selected card's edges last, so they draw over the rest. */}
          {[...paths].sort((a, b) => Number(related.has(a.edge.id)) - Number(related.has(b.edge.id))).map(({ edge, path, labelX, labelY }) => {
            const active = related.has(edge.id)
            const text = edge.cardinality === "many" ? messages.many(edge.label ?? "") : edge.label
            return (
              <g key={edge.id} className="fa-relationship-edge" data-edge-id={edge.id} data-active={active ? "" : undefined}>
                <path d={path} markerEnd={`url(#${markerId}${active ? "-active" : ""})`} />
                {text ? (
                  <text x={labelX} y={labelY} textAnchor="middle">
                    {text}
                  </text>
                ) : null}
              </g>
            )
          })}
        </svg>
        {cards.map((card) => (
          <CardView
            key={card.id}
            card={card as RelationshipCard}
            at={shown[card.id] ?? { x: 0, y: 0 }}
            height={cardHeight(card, metrics)}
            selected={card.id === selectedId}
            tabbable={card.id === tabStop}
            name={names.get(card.id) ?? card.title}
            description={descriptions.get(card.id) ?? ""}
            movable={movable}
          />
        ))}
      </div>
    ) : null

  return (
    <div ref={rootRef} className={cx("fa-relationship", className)} data-framed={framed ? "" : undefined} data-ready={ready ? "" : undefined}>
      <span ref={probeRef} className="fa-relationship-probe" aria-hidden />
      {/* oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- the pointer surface: the listbox inside carries every key */}
      <div
        ref={stageRef}
        className={cx("fa-relationship-stage", grid && "fa-dot-grid")}
        // A viewport: what is out of view pans in, never clips (R7.4).
        data-scroll-container=""
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
      >
        {world}
      </div>
      <span id={helpId} hidden>
        {movable ? messages.instructionsMovable : messages.instructions}
      </span>
      {cards === undefined ? <RelationshipSkeleton label={messages.loading} /> : null}
      {empty ? (
        <EmptyState icon={emptyIcon ?? <IconTable />} className="fa-relationship-empty">
          {emptyText ?? messages.nothingToDraw}
        </EmptyState>
      ) : null}
      {controls && !empty ? (
        <div className="fa-relationship-controls" role="toolbar" aria-label={messages.controls} aria-orientation="vertical">
          <Button variant="secondary" icon={<IconZoomIn />} aria-label={messages.zoomIn} shortcut="+" onClick={() => zoomAt(ZOOM_STEP, undefined, true)} disabledReason={controlsReason} data-relationship-control="zoom-in" />
          <span ref={readoutRef} className="fa-relationship-zoom" role="status">
            {percent.format(1)}
          </span>
          <Button variant="secondary" icon={<IconZoomOut />} aria-label={messages.zoomOut} shortcut="-" onClick={() => zoomAt(1 / ZOOM_STEP, undefined, true)} disabledReason={controlsReason} data-relationship-control="zoom-out" />
          <Button variant="secondary" icon={<IconFullscreen />} aria-label={messages.fitToView} shortcut="0" onClick={() => fit(true)} disabledReason={controlsReason} data-relationship-control="fit" />
          {movable ? (
            <Button variant="secondary" icon={<IconGrid />} aria-label={messages.autoLayout} onClick={runAutoLayout} disabledReason={controlsReason} data-relationship-control="auto-layout" />
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

const ARROWS: Record<string, "left" | "right" | "up" | "down"> = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" }
