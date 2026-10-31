import { useMessages } from "../../../lib/i18n/index.js"
import { treemapMessages } from "./messages.js"
import { hierarchy, treemap as d3treemap, treemapSquarify, type HierarchyRectangularNode } from "d3-hierarchy"
import { memo, useEffect, useMemo, useRef, type CSSProperties } from "react"
import { colourKeys, DrillPathBar, hierarchyTable, useDrill, useHierarchy, type ColourBy, type HierarchyDatum, type Node } from "../core/drill.js"
import { ChartFrame, type ChartCommonProps, type PlotBox } from "../core/frame.js"
import { formatShare, formatValue, type LocalizedFormat, type ValueFormat } from "../core/format.js"
import { useLocale } from "../../../lib/locale/use-locale.js"
import { cssPath, roundRectPath } from "../core/geometry.js"
import { HitLayer } from "../core/hit.js"
import { useHoverStore, useStoreValue, type HoverStore } from "../core/hover.js"
import { seriesAttrs } from "../core/series.js"
import { ProportionStrip, type StripItem } from "../core/strip.js"
import type { ChartTier } from "../core/tier.js"
import { ChartTooltip, TooltipBody } from "../core/tooltip.js"
import { LiveRegion } from "../line/line-chart.js"

export interface TreemapProps extends ChartCommonProps, ValueFormat {
  /** Typed records rendered by the component. */
  data: HierarchyDatum
  /** Colour by top-level branch (default), by each leaf's `group` (file kind) or by depth. */
  colourBy?: ColourBy
  /** Group order for `colourBy="group"`; defaults to largest first. */
  groups?: readonly string[]
  /** Header for the table's name column ("Folder"). */
  nameLabel?: string
}

type Rect = HierarchyRectangularNode<HierarchyDatum>

/**
 * Nested rectangles sized by value — SpaceMonger/WinDirStat for disk usage. Tiles are soft
 * tints of their branch's (or kind's) colour with the 2px surface gap between them; labels
 * appear only where they fit and truncate with an ellipsis, the size line only where there is
 * height for it. Click or Enter drills into a tile; the path, Backspace and Escape go back.
 *
 *   micro    a proportion strip of the top level, the largest as a trail
 *   compact  one level of tiles with labels, passive
 *   full     two levels (groups with a header, their children inside), the drill path, the
 *            tooltip (size, share of parent and of the whole) and keyboard navigation by
 *            direction
 */
export function Treemap(props: TreemapProps) {
  const messages = useMessages(treemapMessages, { locale: props.locale })

  const { label, title, state = "ready", data, colourBy = "branch", groups, unit, format, nameLabel: nameLabelProp, ...rest } = props
  const nameLabel = nameLabelProp ?? messages.name

  const locale = useLocale(props.locale)
  const fmt: LocalizedFormat = useMemo(() => ({ unit, format, locale }), [unit, format, locale])
  const root = useHierarchy(data)
  const drill = useDrill(root)
  const store = useHoverStore()
  const colour = useMemo(() => colourKeys(root, colourBy, groups, drill.focus), [root, colourBy, groups, drill.focus])
  const table = useMemo(() => hierarchyTable(drill.focus, fmt, nameLabel), [drill.focus, fmt, nameLabel])
  const lead = drill.focus.children?.[0]
  const trail = lead ? (
    <span className="fa-chart-figure">
      <span className="fa-chart-figure-label">{lead.data.label}</span>
      <span className="fa-chart-figure-value">{formatShare(lead.value ?? 0, drill.focus.value ?? 0, fmt.locale)}</span>
    </span>
  ) : null
  // The path appears once there is a way back; at the root the title already names it.
  const head = (tier: ChartTier) => (tier === "full" && drill.depth > 0 ? <DrillPathBar trail={drill.trail} onSelect={(depth) => drill.to(depth)} /> : null)

  return (
    <ChartFrame {...rest} kind="treemap" label={label} title={title} state={state} table={table} trail={trail} head={head}>
      {(box) => <TreemapPlot box={box} focus={drill.focus} root={root} colour={colour} store={store} fmt={fmt} label={label} onDrill={drill.drill} onUp={drill.depth > 0 ? drill.up : undefined} />}
    </ChartFrame>
  )
}

interface TreemapPlotProps {
  box: PlotBox
  focus: Node
  root: Node
  colour: (node: Node) => number | "other"
  /** External store observed by the component. */
  store: HoverStore
  fmt: LocalizedFormat
  label: string
  /** Called with the node to drill into when the person activates a tile (click, Enter or Space): the tile's node if it has children, otherwise its parent below the focus; not called when neither applies. */
  onDrill: (node: Node) => void
  /** Called with no arguments on Escape, to go up one level. Omit at the root. */
  onUp?: () => void
}

interface Tile {
  /** The node's path from the root: unique even when names repeat ("Microsoft"). */
  id: string
  node: Node
  rect: Rect
  depth: number
  /** Named content slot. */
  slot: number | "other"
  /** A group draws its children inside, under a header. */
  group: boolean
  d: string
}

const TreemapPlot = /* @__PURE__ */ memo(function TreemapPlot({ box, focus, root, colour, store, fmt, label, onDrill, onUp }: TreemapPlotProps) {
  const messages = useMessages(treemapMessages)

  const plotRef = useRef<HTMLDivElement>(null)
  const { width, height, tier, rem } = box
  const full = tier === "full"
  // Full: folders nest three deep, each with a header where it has room (SpaceMonger).
  const levels = full ? 3 : 1
  const header = 1.375 * rem
  const gap = 2

  const tiles = useMemo<Tile[]>(() => {
    if (tier === "micro") return []
    const sub = hierarchy<{ node: Node }>({ node: focus }, (d) => d.node.children?.map((child) => ({ node: child })))
      .sum((d) => (d.node.children?.length ? 0 : (d.node.value ?? 0)))
      // oxlint-disable-next-line unicorn/no-array-sort -- d3 hierarchy's node.sort, not Array#sort
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
    const nests = (n: { depth: number; children?: unknown[] }) => n.depth > 0 && n.depth < levels && Boolean(n.children?.length)
    const roomy = (n: { x0: number; x1: number; y0: number; y1: number }) => n.x1 - n.x0 > 4 * rem && n.y1 - n.y0 > header * 2.4
    const laid = d3treemap<{ node: Node }>()
      .tile(treemapSquarify.ratio(1.2))
      .size([width, height])
      .paddingInner(gap)
      .paddingTop((n) => (nests(n) ? (roomy(n) ? header : gap * 2) : 0))
      .paddingRight((n) => (nests(n) ? gap * 2 : 0))
      .paddingBottom((n) => (nests(n) ? gap * 2 : 0))
      .paddingLeft((n) => (nests(n) ? gap * 2 : 0))
      .round(false)(sub)
    const out: Tile[] = []
    laid.each((n) => {
      if (n.depth === 0 || n.depth > levels) return
      const w = n.x1 - n.x0
      const h = n.y1 - n.y0
      if (w < 1.5 || h < 1.5) return
      const node = n.data.node
      out.push({
        id: node.ancestors().map((a) => a.data.label).join("/"),
        node,
        rect: n as unknown as Rect,
        depth: n.depth,
        slot: colour(node),
        group: nests(n),
        d: roundRectPath(n.x0, n.y0, w, h, n.depth === 1 ? 0.375 * rem : 0.25 * rem),
      })
    })
    return out
  }, [tier, focus, width, height, levels, rem, header, colour])

  /** The keyboard walks the top level; the pointer finds the deepest tile under it. */
  const top = useMemo(() => tiles.map((tile, index) => ({ tile, index })).filter(({ tile }) => tile.depth === 1), [tiles])

  // After a drill, a keyboard user lands on the first tile of the new level.
  useEffect(() => {
    const plot = plotRef.current
    if (!plot || !plot.contains(document.activeElement)) {
      store.set(null)
      return
    }
    const first = top[0]
    if (!first) return
    const origin = plot.getBoundingClientRect()
    const { rect } = first.tile
    store.set({ index: first.index, x: origin.left + (rect.x0 + rect.x1) / 2, y: origin.top + (rect.y0 + rect.y1) / 2, via: "keyboard" })
  }, [top, store])

  if (tier === "micro") {
    const children = focus.children ?? []
    const items: StripItem[] = children.slice(0, 6).map((child) => ({ key: child.data.label, value: child.value ?? 0, slot: colour(child) }))
    if (children.length > 6) items.push({ key: "other", value: children.slice(6).reduce((sum, child) => sum + (child.value ?? 0), 0), slot: "other" })
    return <ProportionStrip items={items} width={width} height={height} rem={rem} />
  }

  const total = root.value ?? 0
  const locate = (lx: number, ly: number) => {
    let found: number | null = null
    tiles.forEach(({ rect }, index) => {
      if (lx >= rect.x0 && lx <= rect.x1 && ly >= rect.y0 && ly <= rect.y1) found = index // later = deeper
    })
    return found
  }
  const anchor = (index: number) => {
    const rect = tiles[index]?.rect
    return rect ? { x: (rect.x0 + rect.x1) / 2, y: (rect.y0 + rect.y1) / 2 } : { x: width / 2, y: height / 2 }
  }
  const nav = (index: number, key: string) => {
    // From any tile, move between top-level tiles by direction.
    let from = tiles[index]?.node
    while (from && from.parent && from.parent !== focus) from = from.parent
    const position = Math.max(0, top.findIndex(({ tile }) => tile.node === from))
    const next = spatialNav(
      top.map(({ tile }) => tile.rect),
      position,
      key
    )
    return next === null ? null : (top[next]?.index ?? null)
  }
  /** What a click or Enter opens: the tile if it is a folder, else the folder it is in. */
  const target = (index: number): Node | undefined => {
    const node = tiles[index]?.node
    if (!node) return undefined
    if (node.children?.length) return node
    return node.parent && node.parent !== focus ? node.parent : undefined
  }
  const valueText = (index: number) => {
    const node = tiles[index]?.node
    if (!node) return ""
    return (target(index) ? messages.pressEnterToOpen : (label: string) => label)(`${node.data.label} · ${formatValue(node.value ?? 0, fmt)} · ${formatShare(node.value ?? 0, focus.value ?? 0, fmt.locale)}`)
  }

  return (
    <div ref={plotRef} className="fa-chart-layer fa-chart-treemap">
      <svg className="fa-chart-svg" width={width} height={height} aria-hidden>
        {tiles.map((tile) => (
          <path
            key={tile.id}
            className="fa-chart-tile"
            data-depth={tile.depth}
            data-group={tile.group ? "" : undefined}
            {...(tile.slot === "other" ? { "data-slot": "other" } : seriesAttrs(tile.slot))}
            style={{ d: cssPath(tile.d) } as CSSProperties}
          />
        ))}
      </svg>
      <div className="fa-chart-labels" aria-hidden>
        {tiles.map((tile) => (
          <TileLabel key={tile.id} tile={tile} fmt={fmt} rem={rem} header={header} />
        ))}
      </div>
      {full ? (
        <>
          <TileHighlight store={store} tiles={tiles} width={width} height={height} rem={rem} />
          <HitLayer
            store={store}
            count={tiles.length}
            locate={locate}
            anchor={anchor}
            nav={nav}
            initial={top[0]?.index ?? 0}
            cursor="pointer"
            label={messages.explore(label)}
            valueText={valueText}
            onActivate={(index) => {
              const node = target(index)
              if (node) onDrill(node)
            }}
            onEscape={onUp}
          />
          <ChartTooltip store={store} anchor={plotRef}>
            {(hover) => {
              const node = tiles[hover.index]?.node
              if (!node) return null
              const rows = (node.children ?? []).slice(0, 4).map((child) => ({
                key: child.data.label,
                label: child.data.label,
                value: formatValue(child.value ?? 0, fmt),
                detail: formatShare(child.value ?? 0, node.value ?? 0, fmt.locale),
                shape: "box" as const,
                ...(colour(child) === "other" ? { tone: "neutral" } : { slot: colour(child) as number }),
              }))
              const where = node
                .ancestors()
                .toReversed()
                .slice(focus.depth + 1, -1)
                .map((a) => a.data.label)
                .join(" › ")
              return (
                <TooltipBody
                  title={node.data.label}
                  meta={`${formatValue(node.value ?? 0, fmt)} · ${formatShare(node.value ?? 0, total, fmt.locale)}`}
                  rows={rows}
                  footer={[where, target(hover.index) ? messages.clickToOpen : null].filter(Boolean).join(" · ") || undefined}
                />
              )
            }}
          </ChartTooltip>
          <LiveRegion store={store} text={valueText} />
        </>
      ) : null}
    </div>
  )
})

/** Name and size inside a tile, only where they fit; group tiles label their header. */
function TileLabel({ tile, fmt, rem, header }: { tile: Tile; fmt: LocalizedFormat; rem: number; header: number }) {
  const { rect, group, depth, node } = tile
  const w = rect.x1 - rect.x0
  const h = rect.y1 - rect.y0
  const pad = 0.375 * rem
  if (w < 3.25 * rem || h < 1.25 * rem) return null
  if (group) {
    if (h < header * 2.4 || w < 4 * rem) return null
    return (
      <span className="fa-chart-tile-label" data-group="" style={{ left: rect.x0 + pad, top: rect.y0, width: w - pad * 2, height: header }}>
        <span className="fa-chart-tile-name">{node.data.label}</span>
        <span className="fa-chart-tile-size">{formatValue(node.value ?? 0, fmt)}</span>
      </span>
    )
  }
  // Nested tiles only name themselves when roomy; small ones stay quiet (the tooltip names them).
  if (depth > 1 && (w < 4.5 * rem || h < 2 * rem)) return null
  const twoLines = h >= 2.75 * rem
  return (
    <span className="fa-chart-tile-label" data-lines={twoLines ? "2" : "1"} style={{ left: rect.x0 + pad, top: rect.y0 + (twoLines ? 0.3125 * rem : 0), width: w - pad * 2, height: twoLines ? h - 0.3125 * rem : h }}>
      <span className="fa-chart-tile-name">{node.data.label}</span>
      {twoLines ? <span className="fa-chart-tile-size">{formatValue(node.value ?? 0, fmt)}</span> : null}
    </span>
  )
}

function TileHighlight({ store, tiles, width, height, rem }: { store: HoverStore; tiles: Tile[]; width: number; height: number; rem: number }) {
  const hover = useStoreValue(store)
  const tile = hover ? tiles[hover.index] : undefined
  if (!tile) return null
  const { rect } = tile
  return (
    <svg className="fa-chart-overlay" width={width} height={height} aria-hidden>
      <path className="fa-chart-hover-ring" d={roundRectPath(rect.x0 + 0.75, rect.y0 + 0.75, rect.x1 - rect.x0 - 1.5, rect.y1 - rect.y0 - 1.5, tile.depth === 1 ? 0.375 * rem : 0.25 * rem)} />
    </svg>
  )
}

/** Move to the nearest rectangle in the arrow's direction (centre to centre, favouring the axis). */
export function spatialNav(rects: ReadonlyArray<{ x0: number; x1: number; y0: number; y1: number }>, index: number, key: string): number | null {
  const from = rects[index]
  if (!from) return null
  if (key === "Home") return 0
  if (key === "End") return rects.length - 1
  const cx = (from.x0 + from.x1) / 2
  const cy = (from.y0 + from.y1) / 2
  let best: number | null = null
  let bestScore = Infinity
  rects.forEach((rect, candidate) => {
    if (candidate === index) return
    const x = (rect.x0 + rect.x1) / 2
    const y = (rect.y0 + rect.y1) / 2
    const dx = x - cx
    const dy = y - cy
    let primary = 0
    let secondary = 0
    switch (key) {
      case "ArrowRight":
        if (rect.x0 < from.x1 - 1) return
        primary = dx
        secondary = Math.abs(dy)
        break
      case "ArrowLeft":
        if (rect.x1 > from.x0 + 1) return
        primary = -dx
        secondary = Math.abs(dy)
        break
      case "ArrowDown":
        if (rect.y0 < from.y1 - 1) return
        primary = dy
        secondary = Math.abs(dx)
        break
      case "ArrowUp":
        if (rect.y1 > from.y0 + 1) return
        primary = -dy
        secondary = Math.abs(dx)
        break
      default:
        return
    }
    const score = primary + secondary * 2
    if (score < bestScore) {
      bestScore = score
      best = candidate
    }
  })
  return best
}
