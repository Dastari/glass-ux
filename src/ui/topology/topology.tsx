import { useDirection } from "../../lib/locale/direction.js"
import { readingKey } from "../../lib/direction.js"
import { useMessages } from "../../lib/i18n/index.js"
import { topologyMessages } from "./messages.js"
/**
 * TopologyCanvas — a pannable, zoomable map of a tree of nodes (a network: gateway, then
 * switches and access points, then clients clustered by kind). UniFi-style rows, elbow
 * links with their speed where known, unknown links dashed, wireless links dotted.
 *
 *   layout     d3-hierarchy's tidy tree, loaded on demand (layout.ts says why not elkjs or
 *              d3-force); the canvas shows its skeleton in the same box until it lands
 *   render     DOM, not Canvas2D: about 300 nodes is ~3,000 elements, well inside what a
 *              composited layer pans at 60 fps, and every node stays a real element: the
 *              caller's own identity tile (tokens, themes, the state dot), focus, a tooltip, a
 *              context menu and an accessible name. Links are one SVG under the nodes.
 *              Panning and zooming write one transform per frame on the world layer (R14.7)
 *              and never re-render a node.
 *   keyboard   a listbox: arrows move between nodes like a family tree (nav.ts), Enter or
 *              Space selects, double-click opens, + − 0 zoom and fit, Shift+F10 opens the
 *              node's menu
 *   sizes      metrics come from tokens (a probe element reads them), so density and UI scale
 *              size the map; container tiers drop the minimap, then the zoom buttons (R7)
 *   motion     the camera glides to a focused node off screen, instantly under the motion
 *              switch (R18.3)
 *   list       "View as list" swaps the map for the caller's list (a DataTable) in the same box
 *   bleed      it has no material: in a Panel, or full bleed behind floating page chrome
 *              (src/shell/bleed.tsx), whose reach it takes as `insets` so every frame, the
 *              controls and the minimap stay in the part that shows
 */
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type PointerEvent, type ReactNode } from "react"
import { IconFullscreen, IconLayers, IconList, IconNetwork, IconZoomIn, IconZoomOut } from "../../icons/generated/icons.js"
import { resolveActions, type ActionSet } from "../../lib/actions/actions.js"
import { cx } from "../../lib/cx.js"
import { useLocale } from "../../lib/locale/use-locale.js"
import { observeElementSize } from "../../lib/resize-observer.js"
import { useSelectedId, type SelectionChangeDetails } from "../../lib/use-selected-id.js"
import { ActionMenuItems } from "../actions/index.js"
import { Button } from "../button/index.js"
import { ContextMenu } from "../context-menu/index.js"
import { EmptyState } from "../empty-state/index.js"
import { Skeleton } from "../skeleton/index.js"
import { clusterLabel } from "./label.js"
import { indexTopology, moveFocus, type TopologyMove } from "./nav.js"
import type { LaidOutNode, TopologyClusterSpec, TopologyLayout, TopologyMetrics, TopologyNode } from "./types.js"

const useIsomorphicLayoutEffect = typeof window === "undefined" ? () => {} : useLayoutEffect

/** Zoom limits: never closer than twice the drawn size; never further than a quarter, or the fit. */
const MAX_ZOOM = 2
const MIN_ZOOM = 0.25
/** Below this zoom the labels are unreadable: they hide and the tiles carry the map. */
const FAR_ZOOM = 0.55
/** px of pointer travel before a press becomes a pan (a click selects). */
const DRAG_THRESHOLD = 4
const ZOOM_STEP = 1.25

export type TopologyView = "map" | "list"

/** The actions a node's right-click (and Shift+F10) opens: the caller's ActionSet (R12). */
export interface TopologyNodeMenu {
  // oxlint-disable-next-line typescript/no-explicit-any -- any entity's ActionSet
  /** Shared action definitions used by menus, headers and the command palette. */
  set: ActionSet<any>
  /** Selected entities passed to action visibility, enablement, confirmation and execution. */
  targets: readonly unknown[]
  /** "Actions for ORB-SW-CORE". */
  label: string
}

export interface TopologyCanvasProps<T> {
  /** Names the map: "Network map, Office LAN". */
  label: string
  /** undefined while loading: the skeleton shows in the same box. */
  nodes: readonly TopologyNode<T>[] | undefined
  /** How cluster keys are named and ordered. */
  clusters?: Readonly<Record<string, TopologyClusterSpec>>
  /** The node's tile (an identity's icon tier). Keep it stable (useCallback). */
  renderNode: (node: TopologyNode<T>) => ReactNode
  /** The node's accessible name: "Switch ORB-SW-CORE, Online, wired 1 Gbps to FA-GW01". Default: its label. */
  describeNode?: (node: TopologyNode<T>) => string
  /** The selected node's id, or null for none. Controlled while defined; leave it undefined to use `defaultSelectedId`. */
  selectedId?: string | null
  /** The node selected at first when the selection is uncontrolled. */
  defaultSelectedId?: string | null
  /**
   * Called with the node id the person selects (click, Enter or Space), or `null` when they
   * clear it (Space on the selected node, Escape, or a click on empty canvas), and details
   * whose `item` is the node. Not called when the id is unchanged.
   */
  onSelectedIdChange?: (id: string | null, details: SelectionChangeDetails<TopologyNode<T>>) => void
  /** Double-click (and the caller's Open action): the node's page. */
  onOpen?: (node: TopologyNode<T>) => void
  /** The node's ActionSet for right-click. */
  nodeMenu?: (node: TopologyNode<T>) => TopologyNodeMenu | undefined
  /** Re-fit when this changes (another network). Live changes to the same map keep the camera. */
  frameKey?: unknown
  /** Currently selected presentation view. */
  view?: TopologyView
  /** Called with the view the person switches to from the view toggle in the map's controls; the toggle shows only when this is set. Pair with `view`. */
  onViewChange?: (view: TopologyView) => void
  /** The list view's content: a DataTable of the same nodes, with TopologyViewToggle in its toolbar. */
  list?: ReactNode
  /** Show the minimap where there is room (the user can turn it off). Default true. */
  minimap?: boolean
  /** One line for an empty map (R2.5). */
  emptyText?: ReactNode
  /**
   * Page chrome floating over a full-bleed canvas, in CSS pixels (useBleed): fitting, the
   * controls, the minimap and the way to a focused node stay clear of it, and an untouched
   * camera re-fits when it changes. `null` means "being measured": the canvas holds its
   * loading shape and its first frame back until it is known, so nothing jumps (R9).
   */
  insets?: TopologyInsets | null
  className?: string
}

export interface TopologyInsets {
  top?: number
  right?: number
  bottom?: number
  left?: number
}

const NO_INSETS = { top: 0, right: 0, bottom: 0, left: 0 }

/** Insets as the canvas's tokens (topology.css). */
function insetStyle(insets: TopologyInsets | null | undefined): CSSProperties | undefined {
  if (!insets) return undefined
  const style: Record<string, string> = {}
  for (const side of ["top", "right", "bottom", "left"] as const) {
    const value = insets[side]
    if (value) style[`--fa-topology-inset-${side}`] = `${Math.round(value)}px`
  }
  return style as CSSProperties
}

/** "View as list" / "View as map": in the map's controls, and in the list's toolbar. */
export function TopologyViewToggle({ view, onViewChange, size = "md" }: {
  /** The view currently shown; the button offers the other one (an icon button on the map, "View as map" in the list). */
  view: TopologyView
  /** Called with the view the person switches to. */
  onViewChange: (view: TopologyView) => void
  size?: "sm" | "md"
}) {
  const messages = useMessages(topologyMessages)

  return view === "map" ? (
    <Button variant="secondary" size={size} icon={<IconList />} aria-label={messages.viewAsList} data-topology-control="view" onClick={() => onViewChange("list")} />
  ) : (
    <Button variant="secondary" size={size} icon={<IconNetwork />} onClick={() => onViewChange("map")} data-topology-control="view">
      {messages.viewAsMap} </Button>
  )
}

/** The canvas's loading shape: a root, a row of three, a row of clusters (R9.3). */
export function TopologySkeleton({ className }: { className?: string }) {
  const messages = useMessages(topologyMessages)

  return (
    <div className={cx("fa-topology-skeleton", className)} role="status" aria-busy="true" aria-label={messages.loadingTheMap}>
      <div className="fa-topology-skeleton-row">
        <Skeleton.Block radius="tile" className="fa-topology-skeleton-tile" />
      </div>
      <div className="fa-topology-skeleton-row">
        {[0, 1, 2].map((key) => (
          <Skeleton.Block key={key} radius="tile" className="fa-topology-skeleton-tile" />
        ))}
      </div>
      <div className="fa-topology-skeleton-row">
        {[0, 1, 2].map((key) => (
          <Skeleton.Block key={key} radius="tile" className="fa-topology-skeleton-cluster" />
        ))}
      </div>
    </div>
  )
}

/** The whole canvas while there is nothing to give it yet (no label, no nodes): the same box and loading shape. */
export function TopologyCanvasSkeleton({ insets, className }: {
  /** Page chrome over the canvas in CSS pixels, matching the TopologyCanvas's `insets`; `null` marks them as still being measured. */
  insets?: TopologyInsets | null
  className?: string
}) {
  return (
    <div className={cx("fa-topology", className)} style={insetStyle(insets)} data-insets={insets === null ? "pending" : undefined}>
      <TopologySkeleton />
    </div>
  )
}

interface Camera {
  /** Horizontal coordinate or accessor. */
  x: number
  /** Vertical coordinate or accessor. */
  y: number
  k: number
}

/** The metrics and timings the tokens set, read from the probe's computed style. */
function readProbe(probe: HTMLElement): { metrics: Partial<TopologyMetrics>; fitPadding: number; controls: number; duration: number } {
  const style = getComputedStyle(probe)
  const px = (value: string) => Number.parseFloat(value) || 0
  const seconds = (value: string) => (value.endsWith("ms") ? px(value) : px(value) * 1000)
  return {
    metrics: {
      cellWidth: px(style.width),
      cellHeight: px(style.height),
      gapX: px(style.marginLeft),
      gapY: px(style.marginTop),
      clusterPad: px(style.paddingLeft),
      clusterHeader: px(style.paddingTop),
      clusterGap: px(style.paddingRight),
      radius: px(style.borderTopLeftRadius),
    },
    fitPadding: px(style.paddingBottom),
    controls: px(style.marginRight),
    duration: seconds(style.transitionDuration.split(",")[0] ?? "0s"),
  }
}

interface NodeViewProps {
  node: TopologyNode
  box: LaidOutNode
  /** Relative to its cluster block, when it is in one. */
  origin: { x: number; y: number }
  /** The selected state or collection. */
  selected: boolean
  tabbable: boolean
  name: string
  // oxlint-disable-next-line typescript/no-explicit-any -- the caller's node type
  renderNode: (node: any) => ReactNode
}

const NodeView = memo(function NodeView({ node, box, origin, selected, tabbable, name, renderNode }: NodeViewProps) {
  return (
    <div
      role="option"
      className="fa-topology-node"
      data-node-id={node.id}
      aria-selected={selected}
      aria-label={name}
      tabIndex={tabbable ? 0 : -1}
      data-selected={selected ? "" : undefined}
      style={{ transform: `translate(${box.x - origin.x}px, ${box.y - origin.y}px)` }}
    >
      <span className="fa-topology-node-tile">{renderNode(node)}</span>
      <span className="fa-topology-node-label">{node.label}</span>
      {node.detail ? <span className="fa-topology-node-detail">{node.detail}</span> : null}
    </div>
  )
})

/**
 * A pannable, zoomable network map that lays nodes out as a family tree with clustered blocks,
 * with arrow-key navigation between nodes, selection, a right-click node menu, a minimap and
 * an optional list view in the same box. It shows a skeleton while `nodes` is undefined.
 *
 * Keyboard: the arrow keys move between nodes like a family tree, Enter selects, Space
 * toggles the selection, Escape clears it, + and − zoom, 0 fits the map, and Shift+F10 opens
 * the focused node's menu.
 */
export function TopologyCanvas<T>({
  label,
  nodes,
  clusters,
  renderNode,
  describeNode,
  selectedId: selectedIdProp,
  defaultSelectedId,
  onSelectedIdChange,
  onOpen,
  nodeMenu,
  frameKey,
  view = "map",
  onViewChange,
  list,
  minimap = true,
  emptyText: emptyTextProp,
  insets,
  className,
}: TopologyCanvasProps<T>) {
  const messages = useMessages(topologyMessages)
  const emptyText = emptyTextProp ?? messages.nothingToDraw

  const rootRef = useRef<HTMLDivElement>(null)
  const probeRef = useRef<HTMLSpanElement>(null)
  const measureRef = useRef<HTMLSpanElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const worldRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<SVGRectElement>(null)
  const camera = useRef<Camera>({ x: 0, y: 0, k: 1 })
  const frame = useRef(0)
  const animation = useRef(0)
  const stageSize = useRef({ width: 0, height: 0 })
  const layoutSize = useRef({ width: 0, height: 0 })
  const tokens = useRef({ fitPadding: 24, controls: 48, duration: 300 })
  const locale = useLocale()
  const rtl = useDirection() === "rtl"
  const [metrics, setMetrics] = useState<Partial<TopologyMetrics> | null>(null)
  const [layout, setLayout] = useState<TopologyLayout | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selectedId, select] = useSelectedId(selectedIdProp, defaultSelectedId, onSelectedIdChange)
  const [showMinimap, setShowMinimap] = useState(minimap)
  const [menuNode, setMenuNode] = useState<TopologyNode<T> | null>(null)
  const fitted = useRef<unknown>(Symbol("unfitted"))
  const framePending = useRef<() => boolean>(() => false)
  /** The camera still shows the fit: it re-fits when the box or the chrome changes. A pan or zoom makes the view the user's; fit makes it ours again. */
  const framed = useRef(true)
  const pending = insets === null
  const open = useRef(NO_INSETS)

  /* ── Metrics from the tokens, then the layout (code split) ─────────────── */
  useIsomorphicLayoutEffect(() => {
    const probe = probeRef.current
    if (!probe) return
    const read = readProbe(probe)
    tokens.current = { fitPadding: read.fitPadding, controls: read.controls, duration: read.duration }
    setMetrics((current) => (current && JSON.stringify(current) === JSON.stringify(read.metrics) ? current : read.metrics))
  }, [])

  useEffect(() => {
    if (!nodes || !metrics) return
    let live = true
    void import("./layout.js").then(({ layoutTopology }) => {
      if (!live) return
      // A block widens to its label: measured in the label's own type (topology.css).
      const measure = measureRef.current
      const labelWidth = measure
        ? (text: string) => {
            measure.textContent = text
            return measure.getBoundingClientRect().width
          }
        : undefined
      setLayout(layoutTopology(nodes, { metrics, clusters, labelWidth, locale, rtl }))
    })
    return () => {
      live = false
    }
  }, [nodes, metrics, clusters, locale, rtl])

  useIsomorphicLayoutEffect(() => {
    layoutSize.current = { width: layout?.width ?? 0, height: layout?.height ?? 0 }
  }, [layout])
  const byId = useMemo(() => new Map((nodes ?? []).map((node) => [node.id, node] as const)), [nodes])
  const index = useMemo(() => (layout ? indexTopology(layout, rtl) : null), [layout, rtl])
  // Laid out, and the chrome over it known: until then the loading shape holds the box.
  const ready = Boolean(layout && nodes) && !pending
  /** Why the zoom, fit and minimap controls are unavailable (R12). */
  const controlsReason = ready ? undefined : messages.theMapIsLoading
  const empty = ready && !nodes?.length

  /* ── The camera: one transform per frame ────────────────────────────────── */
  const apply = useCallback(() => {
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      const { x, y, k } = camera.current
      const world = worldRef.current
      if (world) world.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${k})`
      // What shows: the stage less the chrome floating over it.
      const inset = open.current
      const { width, height } = stageSize.current
      const shownWidth = Math.max(0, width - inset.left - inset.right)
      const shownHeight = Math.max(0, height - inset.top - inset.bottom)
      const rect = viewportRef.current
      if (rect) {
        rect.setAttribute("x", String((inset.left - x) / k))
        rect.setAttribute("y", String((inset.top - y) / k))
        rect.setAttribute("width", String(shownWidth / k))
        rect.setAttribute("height", String(shownHeight / k))
      }
      const root = rootRef.current
      const zoom = k < FAR_ZOOM ? "far" : "near"
      if (root && root.dataset.zoom !== zoom) root.dataset.zoom = zoom
      // The minimap shows only while part of the map is out of view: then it is a way back.
      const size = layoutSize.current
      const overflow = x < inset.left - 1 || y < inset.top - 1 || x + size.width * k > width - inset.right + 1 || y + size.height * k > height - inset.bottom + 1
      if (root && (root.dataset.overflow !== undefined) !== overflow) {
        if (overflow) root.dataset.overflow = ""
        else delete root.dataset.overflow
      }
    })
  }, [])

  const minZoom = useCallback(() => {
    if (!layout) return MIN_ZOOM
    const { width, height } = stageSize.current
    const inset = open.current
    const fit = Math.min((width - inset.left - inset.right) / Math.max(layout.width, 1), (height - inset.top - inset.bottom) / Math.max(layout.height, 1))
    return Math.min(MIN_ZOOM, fit * 0.9)
  }, [layout])

  const moveTo = useCallback(
    (target: Camera, animate: boolean) => {
      cancelAnimationFrame(animation.current)
      const duration = tokens.current.duration
      const root = rootRef.current
      if (!animate || duration < 20) {
        camera.current = target
        apply()
        return
      }
      const from = { ...camera.current }
      const start = performance.now()
      if (root) root.dataset.moving = ""
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / duration)
        const e = 1 - (1 - t) ** 3
        camera.current = { x: from.x + (target.x - from.x) * e, y: from.y + (target.y - from.y) * e, k: from.k + (target.k - from.k) * e }
        apply()
        if (t < 1) animation.current = requestAnimationFrame(step)
        else if (root) delete root.dataset.moving
      }
      animation.current = requestAnimationFrame(step)
    },
    [apply]
  )

  const fitCamera = useCallback((): Camera | null => {
    if (!layout) return null
    const { width, height } = stageSize.current
    if (!width || !height) return null
    const pad = tokens.current.fitPadding
    const inset = open.current
    // The open part of the stage: inside the chrome, the fit padding and the controls column.
    const left = inset.left + pad
    const top = inset.top + pad
    const room = { width: width - left - (inset.right + pad + tokens.current.controls), height: height - top - (inset.bottom + pad) }
    if (room.width <= 0 || room.height <= 0) return null
    const k = Math.max(minZoom(), Math.min(1, room.width / Math.max(layout.width, 1), room.height / Math.max(layout.height, 1)))
    return { k, x: left + (room.width - layout.width * k) / 2, y: top + Math.max(0, (room.height - layout.height * k) / 2) }
  }, [layout, minZoom])

  const fit = useCallback(
    (animate: boolean) => {
      const target = fitCamera()
      if (!target) return
      framed.current = true
      moveTo(target, animate)
    },
    [fitCamera, moveTo]
  )

  /** Re-fit at once, before paint, while the camera still shows the fit (the box or the chrome changed). */
  const refit = useCallback(() => {
    if (!framed.current || fitted.current !== frameKey) return false
    const target = fitCamera()
    if (!target) return false
    cancelAnimationFrame(animation.current)
    camera.current = target
    const world = worldRef.current
    if (world) world.style.transform = `translate3d(${target.x}px, ${target.y}px, 0) scale(${target.k})`
    apply()
    return true
  }, [frameKey, fitCamera, apply])
  const refitRef = useRef(refit)
  useIsomorphicLayoutEffect(() => {
    refitRef.current = refit
  }, [refit])

  const zoomAt = useCallback(
    (factor: number, point?: { x: number; y: number }, animate = false) => {
      const { x, y, k } = camera.current
      const { width, height } = stageSize.current
      const at = point ?? { x: width / 2, y: height / 2 }
      const next = Math.max(minZoom(), Math.min(MAX_ZOOM, k * factor))
      const ratio = next / k
      framed.current = false
      moveTo({ k: next, x: at.x - (at.x - x) * ratio, y: at.y - (at.y - y) * ratio }, animate)
    },
    [minZoom, moveTo]
  )

  // The chrome over the canvas: an untouched camera re-fits to the part that shows.
  const insetKey = `${insets?.top ?? 0},${insets?.right ?? 0},${insets?.bottom ?? 0},${insets?.left ?? 0}`
  useIsomorphicLayoutEffect(() => {
    open.current = { top: insets?.top ?? 0, right: insets?.right ?? 0, bottom: insets?.bottom ?? 0, left: insets?.left ?? 0 }
    if (!refitRef.current()) apply()
    // insetKey stands for the insets' values.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [insetKey, apply])

  // The stage's size; the first layout (and a new frameKey) fits. Live changes keep the camera,
  // unless it still shows the fit: then it re-fits to the new box.
  useIsomorphicLayoutEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const measure = () => {
      stageSize.current = { width: stage.clientWidth, height: stage.clientHeight }
      // A map laid out while its box had no size (a hidden tab) fits once it has one.
      if (!framePending.current() && !refitRef.current()) apply()
    }
    measure()
    return observeElementSize(stage, measure)
  }, [apply])

  /** Fit a new map (the first layout, or a new frameKey) once its box has a size. True when it did. */
  const tryFit = useCallback(() => {
    // Not while the chrome is being measured: the first frame would land under it.
    if (!layout || pending || fitted.current === frameKey) return false
    const target = fitCamera()
    if (!target) return false
    fitted.current = frameKey
    framed.current = true
    camera.current = target
    // Before paint, so the first frame of the map is already framed.
    const world = worldRef.current
    if (world) world.style.transform = `translate3d(${target.x}px, ${target.y}px, 0) scale(${target.k})`
    apply()
    return true
  }, [layout, pending, frameKey, fitCamera, apply])
  useIsomorphicLayoutEffect(() => {
    framePending.current = tryFit
    const stage = stageRef.current
    if (stage) stageSize.current = { width: stage.clientWidth, height: stage.clientHeight }
    tryFit()
  }, [tryFit])

  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current)
      cancelAnimationFrame(animation.current)
    },
    []
  )

  /** Pan so a node is inside the view (with the fit padding), gliding unless motion is off. */
  const reveal = useCallback(
    (id: string) => {
      const box = index?.nodes.get(id)
      if (!box) return
      const { x, y, k } = camera.current
      const { width, height } = stageSize.current
      const pad = tokens.current.fitPadding
      const inset = open.current
      const left = box.x * k + x
      const top = box.y * k + y
      const right = left + box.width * k
      const bottom = top + box.height * k
      const minX = inset.left + pad
      const maxX = width - inset.right - pad - tokens.current.controls
      const minY = inset.top + pad
      const maxY = height - inset.bottom - pad
      let dx = 0
      let dy = 0
      if (left < minX) dx = minX - left
      else if (right > maxX) dx = maxX - right
      if (top < minY) dy = minY - top
      else if (bottom > maxY) dy = maxY - bottom
      if (!dx && !dy) return
      framed.current = false
      moveTo({ k, x: x + dx, y: y + dy }, true)
    },
    [index, moveTo]
  )

  /* ── Focus, selection and the keyboard ──────────────────────────────────── */
  const focusNode = useCallback(
    (id: string | undefined) => {
      if (!id) return
      setActiveId(id)
      const element = worldRef.current?.querySelector<HTMLElement>(`[data-node-id="${CSS.escape(id)}"]`)
      element?.focus({ preventScroll: true })
      reveal(id)
    },
    [reveal]
  )

  // The roving tab stop: the selected node, else the one last focused, else the first.
  const tabStop = activeId && byId.has(activeId) ? activeId : selectedId && byId.has(selectedId) ? selectedId : (index?.order[0] ?? null)

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!index) return
    const nodeId = (event.target as HTMLElement).closest<HTMLElement>("[data-node-id]")?.dataset.nodeId ?? null
    const move = KEYS[readingKey(event.key, event.currentTarget)]
    if (move) {
      event.preventDefault()
      focusNode(moveFocus(index, nodeId, move))
      return
    }
    if ((event.key === "Enter" || event.key === " ") && nodeId) {
      event.preventDefault()
      const next = nodeId === selectedId && event.key === " " ? null : nodeId
      select(next, { reason: "item-press", event: event.nativeEvent, item: next ? (byId.get(next) ?? null) : null })
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

  /* ── Pointer: pan, pinch, wheel, click ──────────────────────────────────── */
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef<{ startX: number; startY: number; camera: Camera; panning: boolean; pinch?: { distance: number; k: number } } | null>(null)
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
      framed.current = false
      gesture.current = { startX: (a.x + b.x) / 2, startY: (a.y + b.y) / 2, camera: { ...camera.current }, panning: true, pinch: { distance: Math.hypot(a.x - b.x, a.y - b.y), k: camera.current.k } }
      return
    }
    const point = local(event)
    gesture.current = { startX: point.x, startY: point.y, camera: { ...camera.current }, panning: false }
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
    if (!current.panning) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return
      current.panning = true
      framed.current = false
      suppressClick.current = true
      stageRef.current?.setPointerCapture(event.pointerId)
      if (rootRef.current) rootRef.current.dataset.moving = ""
    }
    camera.current = { ...current.camera, x: current.camera.x + dx, y: current.camera.y + dy }
    apply()
  }

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId)
    if (pointers.current.size === 0) {
      gesture.current = null
      if (rootRef.current) delete rootRef.current.dataset.moving
    } else if (gesture.current?.pinch) {
      // One finger left: carry on as a pan from here.
      const [rest] = [...pointers.current.values()]
      gesture.current = rest ? { startX: rest.x, startY: rest.y, camera: { ...camera.current }, panning: true } : null
    }
  }

  // The wheel zooms around the pointer; it needs a non-passive listener to stop the page.
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const onWheel = (event: globalThis.WheelEvent) => {
      if (!layout) return
      event.preventDefault()
      const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? stageSize.current.height : 1
      const factor = Math.exp(-event.deltaY * scale * (event.ctrlKey ? 0.01 : 0.0015))
      const rect = stage.getBoundingClientRect()
      zoomAt(factor, { x: event.clientX - rect.left, y: event.clientY - rect.top })
    }
    stage.addEventListener("wheel", onWheel, { passive: false })
    return () => stage.removeEventListener("wheel", onWheel)
  }, [layout, zoomAt])

  const nodeOf = (event: MouseEvent) => (event.target as HTMLElement).closest<HTMLElement>("[data-node-id]")?.dataset.nodeId
  const onClick = (event: MouseEvent<HTMLDivElement>) => {
    if (suppressClick.current) {
      suppressClick.current = false
      return
    }
    const id = nodeOf(event)
    if (id) {
      setActiveId(id)
      select(id, { reason: "item-press", event: event.nativeEvent, item: byId.get(id) ?? null })
    } else if (selectedId) select(null, { reason: "outside-press", event: event.nativeEvent, item: null })
  }
  const onDoubleClick = (event: MouseEvent<HTMLDivElement>) => {
    const id = nodeOf(event)
    const node = id ? byId.get(id) : undefined
    if (node) onOpen?.(node)
  }

  /* ── The minimap ────────────────────────────────────────────────────────── */
  const minimapRef = useRef<SVGSVGElement>(null)
  const centreOnMinimap = (event: PointerEvent<SVGSVGElement>) => {
    const svg = minimapRef.current
    if (!svg || !layout) return
    const rect = svg.getBoundingClientRect()
    const s = Math.min(rect.width / layout.width, rect.height / layout.height)
    const wx = (event.clientX - rect.left - (rect.width - layout.width * s) / 2) / s
    const wy = (event.clientY - rect.top - (rect.height - layout.height * s) / 2) / s
    const { k } = camera.current
    const inset = open.current
    framed.current = false
    moveTo({ k, x: (inset.left + stageSize.current.width - inset.right) / 2 - wx * k, y: (inset.top + stageSize.current.height - inset.bottom) / 2 - wy * k }, false)
  }

  /* ── What to draw ───────────────────────────────────────────────────────── */
  const names = useMemo(() => new Map((nodes ?? []).map((node) => [node.id, describeNode?.(node) ?? node.label] as const)), [nodes, describeNode])
  // The selected node's way up to the root is drawn in the accent.
  const activePath = useMemo(() => {
    const path = new Set<string>()
    if (!layout || !selectedId || !index) return path
    const node = index.nodes.get(selectedId)
    if (!node) return path
    if (node.clusterId) path.add(node.clusterId)
    else path.add(node.id)
    for (let up = node.parentId; up; up = index.nodes.get(up)?.parentId ?? null) path.add(up)
    return path
  }, [layout, selectedId, index])

  const menu = menuNode ? nodeMenu?.(menuNode) : undefined
  const menuGroups = menu ? resolveActions(menu.set, menu.targets, "context") : []
  const onContextMenuCapture = (event: MouseEvent<HTMLDivElement>) => {
    const id = nodeOf(event)
    const node = id ? byId.get(id) : undefined
    if (!node || !nodeMenu?.(node)) {
      // Not on a node: no Glass UX menu here.
      event.stopPropagation()
      return
    }
    setMenuNode(node)
    setActiveId(node.id)
  }

  const structural = layout?.nodes.filter((node) => !node.clusterId) ?? []
  const world = layout ? (
    <div
      ref={worldRef}
      role="listbox"
      aria-label={label}
      // Focus lives on the nodes (a roving tab stop); the list itself is never a tab stop.
      tabIndex={-1}
      className="fa-topology-world"
      style={{ width: layout.width, height: layout.height }}
      onKeyDown={onKeyDown}
    >
      <svg className="fa-topology-links" width={layout.width} height={layout.height} aria-hidden>
        {layout.edges.map((edge) => (
          <path key={edge.id} d={edge.path} className="fa-topology-link" data-kind={edge.kind} data-active={activePath.has(edge.to) ? "" : undefined} />
        ))}
      </svg>
      {layout.edges.map((edge) =>
        edge.label ? (
          <span key={edge.id} className="fa-topology-link-label" style={{ transform: `translate(${edge.labelX}px, ${edge.labelY}px) translate(-50%, -50%)` }} aria-hidden>
            {edge.label}
          </span>
        ) : null
      )}
      {layout.clusters.map((cluster) => (
        <div
          key={cluster.id}
          role="group"
          aria-label={`${cluster.label}, ${cluster.members.length}`}
          className="fa-topology-cluster"
          data-active={activePath.has(cluster.id) ? "" : undefined}
          style={{ transform: `translate(${cluster.x}px, ${cluster.y}px)`, width: cluster.width, height: cluster.height }}
        >
          <span className="fa-topology-cluster-label" aria-hidden>
            {clusterLabel(cluster.label, cluster.members.length, locale)}
          </span>
          {cluster.members.map((id) => {
            const node = byId.get(id)
            const box = index?.nodes.get(id)
            return node && box ? (
              <NodeView key={id} node={node} box={box} origin={cluster} selected={id === selectedId} tabbable={id === tabStop} name={names.get(id) ?? node.label} renderNode={renderNode} />
            ) : null
          })}
        </div>
      ))}
      {structural.map((box) => {
        const node = byId.get(box.id)
        return node ? (
          <NodeView key={box.id} node={node} box={box} origin={ORIGIN} selected={box.id === selectedId} tabbable={box.id === tabStop} name={names.get(box.id) ?? node.label} renderNode={renderNode} />
        ) : null
      })}
    </div>
  ) : null

  return (
    <div
      ref={rootRef}
      className={cx("fa-topology", className)}
      style={insetStyle(insets)}
      data-view={view}
      data-ready={ready ? "" : undefined}
      data-minimap={showMinimap ? "" : undefined}
      data-insets={pending ? "pending" : undefined}
    >
      <span ref={probeRef} className="fa-topology-probe" aria-hidden />
      <span ref={measureRef} className="fa-topology-measure" aria-hidden />
      {/* oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- the pointer surface: the listbox inside carries every key */}
      <div
        ref={stageRef}
        className="fa-topology-stage"
        // A viewport: what is out of view pans in, never clips (R7.4).
        data-scroll-container=""
        inert={view === "list" || undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
      >
        {world && nodeMenu ? (
          <ContextMenu.Root disabled={!menuGroups.length}>
            <ContextMenu.Trigger render={world} onContextMenuCapture={onContextMenuCapture} />
            <ContextMenu.Popup aria-label={menu ? messages.actionsFor(menu.label) : messages.actions}>
              {menu ? <ActionMenuItems groups={menuGroups} targets={menu.targets} surface="context" /> : null}
            </ContextMenu.Popup>
          </ContextMenu.Root>
        ) : (
          world
        )}
      </div>
      {!ready ? <TopologySkeleton /> : null}
      {empty ? (
        <EmptyState icon={<IconNetwork />} className="fa-topology-empty">
          {emptyText}
        </EmptyState>
      ) : null}
      {view === "map" && !empty ? (
        // Full bleed, they float over the map like the dashboard map's controls, in the imagery
        // context (R4.7); in a Panel they are its controls (no blur inside its blur, R4.2).
        <div className={cx("fa-topology-overlay", insets !== undefined && "over-imagery")}>
          {layout && showMinimap ? (
            <div className="fa-topology-minimap glass-control">
              <svg
                ref={minimapRef}
                viewBox={`0 0 ${Math.max(layout.width, 1)} ${Math.max(layout.height, 1)}`}
                aria-hidden
                onPointerDown={(event) => {
                  event.currentTarget.setPointerCapture(event.pointerId)
                  centreOnMinimap(event)
                }}
                onPointerMove={(event) => {
                  if (event.buttons) centreOnMinimap(event)
                }}
              >
                {layout.clusters.map((cluster) => (
                  <rect key={cluster.id} className="fa-topology-minimap-cluster" x={cluster.x} y={cluster.y} width={cluster.width} height={cluster.height} />
                ))}
                {structural.map((node) => (
                  <rect key={node.id} className="fa-topology-minimap-node" x={node.x} y={node.y} width={node.width} height={node.height} data-selected={node.id === selectedId ? "" : undefined} />
                ))}
                <rect ref={viewportRef} className="fa-topology-minimap-view" />
              </svg>
            </div>
          ) : null}
          <div className="fa-topology-controls" role="toolbar" aria-label={messages.mapControls} aria-orientation="vertical">
            <Button variant="secondary" icon={<IconZoomIn />} aria-label={messages.zoomIn} shortcut="+" onClick={() => zoomAt(ZOOM_STEP, undefined, true)} disabledReason={controlsReason} data-topology-control="zoom-in" />
            <Button variant="secondary" icon={<IconZoomOut />} aria-label={messages.zoomOut} shortcut="-" onClick={() => zoomAt(1 / ZOOM_STEP, undefined, true)} disabledReason={controlsReason} data-topology-control="zoom-out" />
            <Button variant="secondary" icon={<IconFullscreen />} aria-label={messages.fitToView} shortcut="0" onClick={() => fit(true)} disabledReason={controlsReason} data-topology-control="fit" />
            {minimap ? (
              <Button
                variant="secondary"
                icon={<IconLayers />}
                aria-label={messages.minimap}
                tooltip={showMinimap ? messages.minimapShownWhilePartOfTheMapIs : messages.minimapOff}
                aria-pressed={showMinimap}
                onClick={() => setShowMinimap((value) => !value)}
                disabledReason={controlsReason}
                data-topology-control="minimap"
              />
            ) : null}
            {onViewChange ? <TopologyViewToggle view="map" onViewChange={onViewChange} /> : null}
          </div>
        </div>
      ) : null}
      {view === "list" ? <div className="fa-topology-list">{list}</div> : null}
    </div>
  )
}

const ORIGIN = { x: 0, y: 0 }
const KEYS: Record<string, TopologyMove> = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", Home: "home", End: "end" }
