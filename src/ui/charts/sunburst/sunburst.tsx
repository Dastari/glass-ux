import { hierarchy, partition } from "d3-hierarchy"
import { arc as d3arc } from "d3-shape"
import { memo, useEffect, useMemo, useRef, type CSSProperties } from "react"
import { colourKeys, DrillPathBar, hierarchyTable, useDrill, useHierarchy, type ColourBy, type HierarchyDatum, type Node } from "../core/drill.js"
import { ChartFrame, type ChartCommonProps, type PlotBox } from "../core/frame.js"
import { centreSize, formatShare, formatValue, type LocalizedFormat, type ValueFormat } from "../core/format.js"
import { useLocale } from "../../../lib/locale/use-locale.js"
import { cssPath } from "../core/geometry.js"
import { HitLayer } from "../core/hit.js"
import { useHoverStore, useStoreValue, type HoverStore } from "../core/hover.js"
import { ChartLegend, type LegendItem } from "../core/legend.js"
import { seriesAttrs } from "../core/series.js"
import { ProportionStrip, type StripItem } from "../core/strip.js"
import type { ChartTier } from "../core/tier.js"
import { LiveRegion } from "../line/line-chart.js"

export interface SunburstProps extends ChartCommonProps, ValueFormat {
  /** Typed records rendered by the component. */
  data: HierarchyDatum
  /** Strategy used to assign colours to hierarchical data. */
  colourBy?: ColourBy
  /** Action groups in display order. */
  groups?: readonly string[]
  /** Rings drawn below the focus at the full tier (compact draws two). */
  depth?: number
  /** Display label for the name field. */
  nameLabel?: string
}

interface ArcNode {
  node: Node
  x0: number
  x1: number
  depth: number
  /** Named content slot. */
  slot: number | "other"
  d: string
}

/**
 * Rings of a hierarchy around its centre — DaisyDisk for disk usage. Each child of the focus
 * owns a hue and its descendants ring outward in fading steps of it. The centre is Metric's
 * value: the focus and its size, replaced by whatever the pointer (or arrow keys) is on. Click
 * or Enter drills into an arc; the centre, the path, Backspace and Escape go back.
 *
 *   micro    a proportion strip of the focus's children
 *   compact  two rings and the centre, passive
 *   full     three rings, the centre readout, the drill path and the children as a list
 */
export function Sunburst(props: SunburstProps) {
  const { label, title, state = "ready", data, colourBy = "branch", groups, depth = 3, unit, format, nameLabel = "Name", ...rest } = props
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
  const head = (tier: ChartTier) => (tier === "full" && drill.depth > 0 ? <DrillPathBar trail={drill.trail} onSelect={(level) => drill.to(level)} /> : null)
  return (
    <ChartFrame {...rest} kind="sunburst" label={label} title={title} state={state} table={table} trail={trail} head={head}>
      {(box) => <SunburstPlot box={box} focus={drill.focus} colour={colour} store={store} fmt={fmt} label={label} rings={depth} onDrill={drill.drill} onUp={drill.depth > 0 ? drill.up : undefined} />}
    </ChartFrame>
  )
}

interface SunburstPlotProps {
  box: PlotBox
  focus: Node
  colour: (node: Node) => number | "other"
  /** External store observed by the component. */
  store: HoverStore
  fmt: LocalizedFormat
  label: string
  rings: number
  /** Called with the arc's node when the person activates an arc that has children (click, Enter or Space); not called for leaves. */
  onDrill: (node: Node) => void
  /** Called with no arguments on Escape or when the centre is activated, to go up one level. Omit at the root, which also hides the "go up" hint. */
  onUp?: () => void
}

const TAU = Math.PI * 2

const SunburstPlot = memo(function SunburstPlot({ box, focus, colour, store, fmt, label, rings: ringCount, onDrill, onUp }: SunburstPlotProps) {
  const plotRef = useRef<HTMLDivElement>(null)
  const { width, height, tier, rem } = box
  const full = tier === "full"
  const rings = full ? ringCount : 2
  const listW = full && width > 30 * rem ? Math.min(16 * rem, width * 0.38) : 0
  const avail = width - (listW ? listW + 1.5 * rem : 0)
  const r = Math.max(8, Math.min(avail, height) / 2)
  const cx = listW ? r : width / 2
  const cy = height / 2
  const hole = r * (full ? 0.36 : 0.5)
  const band = (r - hole) / rings
  const gap = 2

  const arcs = useMemo<ArcNode[]>(() => {
    if (tier === "micro") return []
    const sub = hierarchy<{ node: Node }>({ node: focus }, (d) => d.node.children?.map((child) => ({ node: child })))
      .sum((d) => (d.node.children?.length ? 0 : (d.node.value ?? 0)))
      // oxlint-disable-next-line unicorn/no-array-sort -- d3 hierarchy's node.sort, not Array#sort
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
    const laid = partition<{ node: Node }>().size([TAU, rings + 1])(sub)
    const shape = d3arc<{ x0: number; x1: number; depth: number }>()
      .startAngle((a) => a.x0)
      .endAngle((a) => a.x1)
      .padAngle((a) => Math.min((a.x1 - a.x0) / 3, gap / (hole + (a.depth - 0.5) * band)))
      .padRadius(1)
      .innerRadius((a) => hole + (a.depth - 1) * band + gap / 2)
      .outerRadius((a) => hole + a.depth * band - gap / 2)
      .cornerRadius(Math.min(0.25 * rem, band / 3))
    const out: ArcNode[] = []
    laid.each((n) => {
      if (n.depth === 0 || n.depth > rings) return
      if ((n.x1 - n.x0) * (hole + n.depth * band) < 1.5) return
      const a = { x0: n.x0, x1: n.x1, depth: n.depth }
      out.push({ node: n.data.node, x0: n.x0, x1: n.x1, depth: n.depth, slot: colour(n.data.node), d: shape(a) ?? "" })
    })
    return out
  }, [tier, focus, rings, hole, band, rem, colour])

  // After a drill, a keyboard user lands on the largest child of the new centre.
  useEffect(() => {
    const plot = plotRef.current
    if (!plot || !plot.contains(document.activeElement)) {
      store.set(null)
      return
    }
    const first = arcs[0]
    if (!first) return
    const origin = plot.getBoundingClientRect()
    const mid = (first.x0 + first.x1) / 2
    const radius = hole + (first.depth - 0.5) * band
    store.set({ index: 0, x: origin.left + cx + Math.sin(mid) * radius, y: origin.top + cy - Math.cos(mid) * radius, via: "keyboard" })
  }, [arcs, store, cx, cy, hole, band])

  if (tier === "micro") {
    const children = focus.children ?? []
    const items: StripItem[] = children.slice(0, 6).map((child) => ({ key: child.data.label, value: child.value ?? 0, slot: colour(child) }))
    if (children.length > 6) items.push({ key: "other", value: children.slice(6).reduce((sum, child) => sum + (child.value ?? 0), 0), slot: "other" })
    return <ProportionStrip items={items} width={width} height={height} rem={rem} />
  }

  const locate = (lx: number, ly: number) => {
    const dx = lx - cx
    const dy = ly - cy
    const dist = Math.hypot(dx, dy)
    if (dist < hole) return arcs.length // the centre: "up"
    const ring = Math.ceil((dist - hole) / band)
    let angle = Math.atan2(dx, -dy)
    if (angle < 0) angle += TAU
    const index = arcs.findIndex((a) => a.depth === ring && angle >= a.x0 && angle <= a.x1)
    return index < 0 ? null : index
  }
  const anchor = (index: number) => {
    const a = arcs[index]
    if (!a) return { x: cx, y: cy }
    const mid = (a.x0 + a.x1) / 2
    const radius = hole + (a.depth - 0.5) * band
    return { x: cx + Math.sin(mid) * radius, y: cy - Math.cos(mid) * radius }
  }
  const nav = (index: number, key: string) => ringNav(arcs, index, key)
  const valueText = (index: number) => {
    const a = arcs[index]
    if (!a) return `${focus.data.label} · ${formatValue(focus.value ?? 0, fmt)}${onUp ? " · press Escape to go up" : ""}`
    return `${a.node.data.label} · ${formatValue(a.node.value ?? 0, fmt)} · ${formatShare(a.node.value ?? 0, focus.value ?? 0, fmt.locale)}${a.node.children?.length ? " · press Enter to open" : ""}`
  }
  const list: LegendItem[] = (focus.children ?? []).slice(0, 8).map((child) => {
    const slot = colour(child)
    return { key: child.data.label, label: child.data.label, ...(slot === "other" ? { tone: "neutral" } : { slot }), shape: "dot", value: formatValue(child.value ?? 0, fmt), detail: formatShare(child.value ?? 0, focus.value ?? 0, fmt.locale) }
  })

  return (
    <div ref={plotRef} className="fa-chart-layer fa-chart-sunburst">
      <svg className="fa-chart-svg" width={width} height={height} aria-hidden>
        <g transform={`translate(${cx},${cy})`}>
          {arcs.map((a, index) => (
            <path
              key={`${a.depth}-${a.node.data.label}-${index}`}
              className="fa-chart-arc"
              data-depth={a.depth}
              {...(a.slot === "other" ? { "data-slot": "other" } : seriesAttrs(a.slot))}
              style={{ d: cssPath(a.d), "--_enter-delay": `calc(var(--duration-instant) * ${a.depth - 1})` } as CSSProperties}
            />
          ))}
        </g>
        <SunburstHover store={store} arcs={arcs} cx={cx} cy={cy} />
      </svg>
      <SunburstCentre store={store} arcs={arcs} focus={focus} fmt={fmt} cx={cx} cy={cy} hole={hole} rem={rem} interactive={full} canGoUp={Boolean(onUp)} />
      {listW ? (
        <div className="fa-chart-pie-legend" style={{ insetInlineStart: 2 * r + 1.5 * rem, insetBlock: 0, width: listW }}>
          <ChartLegend items={list} layout="list" />
        </div>
      ) : null}
      {full ? (
        <>
          <HitLayer
            store={store}
            count={arcs.length + 1}
            locate={locate}
            anchor={anchor}
            nav={nav}
            initial={0}
            cursor="pointer"
            label={`${label} — explore`}
            valueText={valueText}
            bounds={{ left: cx - r, top: cy - r, width: 2 * r, height: 2 * r }}
            onActivate={(index) => {
              if (index === arcs.length) return onUp?.()
              const a = arcs[index]
              if (a?.node.children?.length) onDrill(a.node)
            }}
            onEscape={onUp}
          />
          <LiveRegion store={store} text={valueText} />
        </>
      ) : null}
    </div>
  )
})

function SunburstHover({ store, arcs, cx, cy }: { store: HoverStore; arcs: ArcNode[]; cx: number; cy: number }) {
  const hover = useStoreValue(store)
  const a = hover ? arcs[hover.index] : undefined
  if (!a) return null
  return (
    <g transform={`translate(${cx},${cy})`}>
      <path className="fa-chart-hover-ring" d={a.d} />
    </g>
  )
}

function SunburstCentre({ store, arcs, focus, fmt, cx, cy, hole, rem, interactive, canGoUp }: { store: HoverStore; arcs: ArcNode[]; focus: Node; fmt: LocalizedFormat; cx: number; cy: number; hole: number; rem: number; interactive: boolean; canGoUp: boolean }) {
  const hover = useStoreValue(store)
  const a = interactive && hover ? arcs[hover.index] : undefined
  const onCentre = interactive && hover && hover.index === arcs.length
  const node = a?.node ?? focus
  const size = centreSize(hole, rem) === "lg" ? "md" : centreSize(hole, rem)
  if (hole < 1.75 * rem) return null
  return (
    <div className="fa-chart-centre" data-size={size} data-hovering={a ? "" : undefined} style={{ left: cx - hole * 0.86, top: cy - hole * 0.86, width: hole * 1.72, height: hole * 1.72 }}>
      <data className="fa-chart-centre-value" value={node.value ?? 0}>
        {formatValue(node.value ?? 0, fmt)}
      </data>
      <span className="fa-chart-centre-label" hidden={hole < 2.25 * rem}>{onCentre && canGoUp ? `Back to ${focus.parent?.data.label ?? ""}` : a ? `${node.data.label} · ${formatShare(node.value ?? 0, focus.value ?? 0, fmt.locale)}` : node.data.label}</span>
    </div>
  )
}

/** Left/Right walk a ring in angle order; Up moves out to a child ring, Down back in. */
function ringNav(arcs: readonly ArcNode[], index: number, key: string): number | null {
  const from = arcs[index]
  if (!from) return arcs.length ? 0 : null
  const ring = arcs
    .map((a, i) => ({ a, i }))
    .filter(({ a }) => a.depth === from.depth)
    .toSorted((p, q) => p.a.x0 - q.a.x0)
  const position = ring.findIndex(({ i }) => i === index)
  const mid = (from.x0 + from.x1) / 2
  switch (key) {
    case "ArrowRight":
      return ring[(position + 1) % ring.length]?.i ?? null
    case "ArrowLeft":
      return ring[(position - 1 + ring.length) % ring.length]?.i ?? null
    case "ArrowUp": {
      const child = arcs.findIndex((a) => a.depth === from.depth + 1 && a.node.parent === from.node)
      return child < 0 ? null : child
    }
    case "ArrowDown": {
      const parent = arcs.findIndex((a) => a.depth === from.depth - 1 && mid >= a.x0 && mid <= a.x1)
      return parent < 0 ? null : parent
    }
    case "Home":
      return 0
    case "End":
      return arcs.length - 1
    default:
      return null
  }
}
