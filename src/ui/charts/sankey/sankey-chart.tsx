import { useMessages } from "../../../lib/i18n/index.js"
import { sankeyMessages } from "./messages.js"
import { memo, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { ChartText, textWidth } from "../core/axes.js"
import { ChartFrame, type ChartCommonProps, type PlotBox } from "../core/frame.js"
import { formatShare, formatValue, type LocalizedFormat, type ValueFormat } from "../core/format.js"
import { cssPath } from "../core/geometry.js"
import { useLocale } from "../../../lib/locale/use-locale.js"
import { HitLayer, pointRect, spatialNav } from "../core/hit.js"
import { useHoverStore, useStoreValue, type HoverStore } from "../core/hover.js"
import { ChartLegend, type LegendItem } from "../core/legend.js"
import { seriesAttrs, slotFor, type ChartTone } from "../core/series.js"
import { ProportionStrip } from "../core/strip.js"
import { shareFraction, type ChartTableModel } from "../core/table.js"
import type { ChartTier } from "../core/tier.js"
import { ChartTooltip, TooltipBody, type TooltipRow } from "../core/tooltip.js"
import { useRtl } from "../core/use-rtl.js"
import { LiveRegion } from "../line/line-chart.js"
import { ribbonAt, ribbonCentreAt, ribbonPath, sankeyLayout, type LaidLink, type LaidNode, type SankeyLayout } from "./layout.js"

export interface SankeyNode {
  key: string
  label: string
  /** Nodes in one group share a colour and a legend entry. Without one, a node is its own group. */
  group?: string
  /** Categorical slot 1–8; defaults to the group's position, and stays on slot 8 past eight groups. */
  slot?: number
  /** Status tone, only when the node means that state. */
  tone?: ChartTone
}

export interface SankeyLink {
  /** The `key` of the node the flow leaves. */
  source: string
  /** The `key` of the node the flow enters. */
  target: string
  /** How much flows. Links without a positive value are ignored. */
  value: number
}

/** What a Sankey position is: a node, or the flow between two nodes. */
export type SankeyTarget = { kind: "node"; key: string } | { kind: "link"; source: string; target: string }

export interface SankeyChartProps extends ChartCommonProps, ValueFormat {
  /** The stages or categories flows pass through. A node without a link is not drawn. */
  nodes: readonly SankeyNode[]
  /** The flows. A link that closes a loop cannot be drawn: it stays in the table, and the chart says how many were left out. */
  links: readonly SankeyLink[]
  /** Header for the table's source column. */
  sourceLabel?: string
  /** Header for the table's target column. */
  targetLabel?: string
  /**
   * Click, Enter or Space on a node or a flow. While set, the plot's accessible name says
   * Enter selects.
   */
  onActivate?: (target: SankeyTarget) => void
}

/**
 * How amounts divide and join across stages: nodes in columns, ribbons as wide as what flows
 * through them. Nodes stay in the column of their longest path, and those with nothing
 * leaving stand in the last. Ribbons take their source's colour. Pointing at a node lifts its
 * flows. Past eight groups, colour stops telling nodes apart, so give related nodes a `group`;
 * labels name each node where they fit, and the tooltip and table always do.
 *
 * Hiding a group in the legend removes its nodes and every flow that touches them, and the
 * rest re-lay. Hidden flows are not reassigned, so a neighbour's total shrinks with them.
 *
 * The flow runs with the reading direction: in right-to-left text it starts on the right.
 * Arrow keys move on screen in the direction pressed, through nodes and the flows between.
 *
 *   micro    a proportion strip of the first column, with the total as a trail
 *   compact  nodes, ribbons and the labels that fit, passive
 *   full     labels with values, the interactive legend, the tooltip and arrow keys
 */
export function SankeyChart(props: SankeyChartProps) {
  const messages = useMessages(sankeyMessages, { locale: props.locale })
  const { label, title, state: stateProp = "ready", nodes, links, sourceLabel: sourceLabelProp, targetLabel: targetLabelProp, unit, format, onActivate, ...rest } = props
  const sourceLabel = sourceLabelProp ?? messages.source
  const targetLabel = targetLabelProp ?? messages.target
  const [hidden, setHidden] = useState<ReadonlySet<string>>(() => new Set())
  const store = useHoverStore()
  const locale = useLocale(props.locale)
  const fmt: LocalizedFormat = useMemo(() => ({ unit, format, locale }), [unit, format, locale])

  const groups = useMemo(() => {
    const out = new Map<string, { key: string; label: string; slot: number; tone?: ChartTone }>()
    for (const node of nodes) {
      const key = node.group ?? node.key
      if (!out.has(key)) out.set(key, { key, label: node.group ?? node.label, slot: slotFor(out.size, node.slot), tone: node.tone })
    }
    return out
  }, [nodes])
  const nodeByKey = useMemo(() => new Map(nodes.map((node) => [node.key, node])), [nodes])
  const shownNodes = useMemo(() => nodes.filter((node) => !hidden.has(node.group ?? node.key)), [nodes, hidden])
  const shownLinks = useMemo(() => {
    const shown = new Set(shownNodes.map((node) => node.key))
    return links.filter((link) => shown.has(link.source) && shown.has(link.target))
  }, [links, shownNodes])
  // The structure, whatever the box: the micro tier's strip, the trail and the empty test read it.
  const structure = useMemo(() => sankeyLayout(shownNodes, shownLinks, { width: 1, height: 1, nodeWidth: 0, nodeGap: 0, iterations: 0 }), [shownNodes, shownLinks])
  const allLoops = useMemo(() => sankeyLayout(nodes, links, { width: 1, height: 1, nodeWidth: 0, nodeGap: 0, iterations: 0 }), [nodes, links])
  const state = stateProp === "ready" && allLoops.nodes.length === 0 ? "empty" : stateProp

  const table = useMemo<ChartTableModel>(() => {
    const out = new Map<string, number>()
    for (const link of links) if (link.value > 0) out.set(link.source, (out.get(link.source) ?? 0) + link.value)
    const nameOf = (key: string) => nodeByKey.get(key)?.label ?? key
    const drawnLinks = links.filter((link) => nodeByKey.has(link.source) && nodeByKey.has(link.target) && link.value > 0)
    const loopNote = allLoops.loops.length ? [messages.loopsNotDrawn(allLoops.loops.length, locale)] : []
    return {
      columns: [
        { key: "source", label: sourceLabel },
        { key: "target", label: targetLabel },
        { key: "value", label: messages.value, numeric: true },
        { key: "share", label: messages.shareOfSource, numeric: true },
      ],
      rows: drawnLinks.map((link) => ({ source: nameOf(link.source), target: nameOf(link.target), value: formatValue(link.value, fmt), share: formatShare(link.value, out.get(link.source) ?? 0, locale) })),
      values: drawnLinks.map((link) => ({ value: link.value, share: shareFraction(link.value, out.get(link.source) ?? 0) })),
      notes: loopNote.length ? loopNote : undefined,
    }
  }, [links, nodeByKey, fmt, locale, sourceLabel, targetLabel, messages, allLoops.loops.length])

  const legend: LegendItem[] = [...groups.values()].map((group) => ({ key: group.key, label: group.label, slot: group.slot, tone: group.tone, shape: "box" }))
  const toggle = (key: string) =>
    setHidden((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  // A few groups fit beside the title; more take the foot, so the title keeps the head.
  const crowded = legend.length > 4
  const legendRow = <ChartLegend items={legend} hidden={hidden} onToggle={toggle} />
  const head = (tier: ChartTier): ReactNode => (tier === "full" && legend.length > 1 ? legendRow : null)

  const sources = structure.nodes.filter((node) => node.column === 0)
  const total = sources.reduce((sum, node) => sum + node.value, 0)
  const trail = (
    <span className="fa-chart-figure">
      <span className="fa-chart-figure-label">{messages.total}</span>
      <span className="fa-chart-figure-value">{formatValue(total, fmt)}</span>
    </span>
  )

  return (
    <ChartFrame {...rest} kind="sankey" label={label} title={title} state={state} table={table} head={crowded ? undefined : head} foot={crowded ? legendRow : undefined} footLegend trail={trail} note={allLoops.loops.length ? messages.loopsNotDrawn(allLoops.loops.length, locale) : undefined}>
      {(box) => <SankeyPlot box={box} nodes={shownNodes} links={shownLinks} groups={groups} structure={structure} store={store} fmt={fmt} label={label} onActivate={onActivate} />}
    </ChartFrame>
  )
}

interface SankeyPlotProps {
  box: PlotBox
  nodes: readonly SankeyNode[]
  links: readonly SankeyLink[]
  groups: ReadonlyMap<string, { slot: number; tone?: ChartTone }>
  structure: SankeyLayout
  /** External store observed by the component. */
  store: HoverStore
  fmt: LocalizedFormat
  label: string
  onActivate?: (target: SankeyTarget) => void
}

const SankeyPlot = /* @__PURE__ */ memo(function SankeyPlot({ box, nodes, links, groups, structure, store, fmt, label, onActivate }: SankeyPlotProps) {
  const messages = useMessages(sankeyMessages, { locale: fmt.locale })
  const plotRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const rtl = useRtl(plotRef)
  const { width, height, tier, rem } = box
  const full = tier === "full"
  const micro = tier === "micro"
  const nodeWidth = 0.5 * rem

  const layout = useMemo(() => sankeyLayout(nodes, links, { width, height, nodeWidth, nodeGap: rem, mirror: rtl }), [nodes, links, width, height, nodeWidth, rem, rtl])
  const n = layout.nodes.length
  const count = n + layout.links.length
  const inputNode = (node: LaidNode) => nodes[node.index]
  const colour = (node: LaidNode | undefined) => {
    const input = node ? inputNode(node) : undefined
    const group = input ? groups.get(input.group ?? input.key) : undefined
    return { slot: input?.slot ?? group?.slot ?? 1, tone: input?.tone ?? group?.tone }
  }
  const nameOf = (node: LaidNode | undefined) => (node ? (inputNode(node)?.label ?? node.key) : "")

  // Labels stand after a node; in the last column, before it. Those that would touch give way.
  const labels = useMemo(() => {
    if (micro) return []
    const span = layout.columns > 1 ? (width - nodeWidth) / (layout.columns - 1) - nodeWidth : width
    const line = 1.0625 * rem
    const last = layout.columns - 1
    const taken = new Map<number, number>()
    const out: Array<{ node: LaidNode; x: number; anchor: "start" | "end"; room: number; y: number }> = []
    for (const node of layout.nodes.toSorted((a, b) => a.y0 - b.y0)) {
      const before = rtl ? node.column !== last : node.column === last
      // The last gap holds labels from both its sides.
      const room = (node.column >= last - 1 ? span / 2 : span) - 0.75 * rem
      if (room < 3 * rem) continue
      const y = (node.y0 + node.y1) / 2
      if (y - (taken.get(node.column) ?? -Infinity) < line) continue
      taken.set(node.column, y)
      out.push({ node, x: before ? node.x0 - 0.375 * rem : node.x1 + 0.375 * rem, anchor: before ? "end" : "start", room, y })
    }
    return out
  }, [micro, layout, width, nodeWidth, rem, rtl])

  // Hovering dims the marks underneath; the overlay redraws what the cursor is on. No mark re-renders.
  useEffect(
    () =>
      store.subscribe(() => {
        svgRef.current?.toggleAttribute("data-hovering", store.get() !== null)
      }),
    [store]
  )

  if (micro) {
    const sources = structure.nodes.filter((node) => node.column === 0)
    return <ProportionStrip items={sources.map((node) => ({ key: node.key, value: node.value, ...colour(node) }))} width={width} height={height} rem={rem} />
  }

  const linkOf = (index: number) => (index >= n ? layout.links[index - n] : undefined)
  const locate = (x: number, y: number) => {
    const reach = 0.125 * rem
    const node = layout.nodes.findIndex((item) => x >= item.x0 - reach && x <= item.x1 + reach && y >= item.y0 - reach && y <= item.y1 + reach)
    if (node >= 0) return node
    const link = ribbonAt(layout.links, x, y, reach)
    return link === null ? null : n + link
  }
  const anchor = (index: number) => {
    const link = linkOf(index)
    if (link) {
      const x = (link.x0 + link.x1) / 2
      return { x, y: ribbonCentreAt(link, x) ?? (link.y0 + link.y1) / 2 }
    }
    const node = layout.nodes[index]
    return node ? { x: (node.x0 + node.x1) / 2, y: (node.y0 + node.y1) / 2 } : { x: width / 2, y: height / 2 }
  }
  const rects = [
    ...layout.nodes,
    ...layout.links.map((link, index) => {
      const at = anchor(n + index)
      return pointRect(at)
    }),
  ]
  const nav = (index: number, key: string) => spatialNav(rects, index, key)
  const linkName = (link: LaidLink) => messages.flow(nameOf(layout.nodes[link.source]), nameOf(layout.nodes[link.target]))
  const linkShare = (link: LaidLink) => formatShare(link.value, layout.nodes[link.source]?.outgoing ?? 0, fmt.locale)
  const valueText = (index: number) => {
    const link = linkOf(index)
    if (link) return `${linkName(link)} · ${formatValue(link.value, fmt)} · ${messages.ofSource(linkShare(link))}`
    const node = layout.nodes[index]
    return node ? `${nameOf(node)} · ${formatValue(node.value, fmt)}` : ""
  }
  const target = (index: number): SankeyTarget | undefined => {
    const link = linkOf(index)
    if (link) return { kind: "link", source: layout.nodes[link.source]?.key ?? "", target: layout.nodes[link.target]?.key ?? "" }
    const node = layout.nodes[index]
    return node ? { kind: "node", key: node.key } : undefined
  }

  return (
    <div ref={plotRef} className="fa-chart-layer fa-chart-sankey">
      <svg ref={svgRef} className="fa-chart-svg" width={width} height={height} aria-hidden>
        {layout.links.map((link) => (
          <path key={link.index} className="fa-chart-sankey-link" {...seriesAttrs(colour(layout.nodes[link.source]).slot, colour(layout.nodes[link.source]).tone)} d={ribbonPath(link)} style={{ d: cssPath(ribbonPath(link)) } as CSSProperties} />
        ))}
        {layout.nodes.map((node) => (
          <rect key={node.key} className="fa-chart-sankey-node" x={node.x0} y={node.y0} width={node.x1 - node.x0} height={Math.max(1, node.y1 - node.y0)} {...seriesAttrs(colour(node).slot, colour(node).tone)} />
        ))}
      </svg>
      <div className="fa-chart-labels" aria-hidden>
        {labels.map(({ node, x, anchor: side, room, y }) => (
          <ChartText key={node.key} className="fa-chart-sankey-label" x={x} y={y} anchor={side} width={room}>
            <span className="fa-chart-sankey-name">{nameOf(node)}</span>
            {full && room >= textWidth(`${nameOf(node)} ${formatValue(node.value, fmt)}`, rem) ? <span className="fa-chart-sankey-value">{formatValue(node.value, fmt)}</span> : null}
          </ChartText>
        ))}
      </div>
      {full ? (
        <>
          <FlowHighlight store={store} layout={layout} colour={colour} width={width} height={height} rem={rem} />
          <HitLayer
            store={store}
            count={count}
            locate={locate}
            anchor={anchor}
            nav={nav}
            initial={0}
            cursor="pointer"
            label={onActivate ? messages.inspectFlowsEnterSelects(label) : messages.inspectFlows(label)}
            valueText={valueText}
            onActivate={
              onActivate
                ? (index) => {
                    const chosen = target(index)
                    if (chosen) onActivate(chosen)
                  }
                : undefined
            }
          />
          <ChartTooltip store={store} anchor={plotRef}>
            {(hover) => {
              const link = linkOf(hover.index)
              if (link) {
                return <TooltipBody title={linkName(link)} rows={[{ key: "flow", label: messages.ofSource(linkShare(link)), value: formatValue(link.value, fmt), shape: "box", ...colour(layout.nodes[link.source]) }]} />
              }
              const node = layout.nodes[hover.index]
              if (!node) return null
              const rows: TooltipRow[] = []
              if (node.incoming > 0) rows.push({ key: "in", label: messages.incoming, value: formatValue(node.incoming, fmt), shape: "box", ...colour(node) })
              if (node.outgoing > 0) rows.push({ key: "out", label: messages.outgoing, value: formatValue(node.outgoing, fmt), shape: "box", ...colour(node) })
              return <TooltipBody title={nameOf(node)} rows={rows} />
            }}
          </ChartTooltip>
          <LiveRegion store={store} text={valueText} />
        </>
      ) : null}
    </div>
  )
})

/** The flows at the cursor, redrawn over the dimmed diagram, and a ring on a node. */
function FlowHighlight({ store, layout, colour, width, height, rem }: { store: HoverStore; layout: SankeyLayout; colour: (node: LaidNode | undefined) => { slot: number; tone?: ChartTone }; width: number; height: number; rem: number }) {
  const hover = useStoreValue(store)
  if (!hover) return null
  const n = layout.nodes.length
  const onNode = hover.index < n
  const links = onNode ? layout.links.filter((link) => link.source === hover.index || link.target === hover.index) : layout.links.slice(hover.index - n, hover.index - n + 1)
  const node = onNode ? layout.nodes[hover.index] : undefined
  return (
    <svg className="fa-chart-overlay" width={width} height={height} aria-hidden>
      {links.map((link) => (
        <path key={link.index} className="fa-chart-sankey-link" data-lift="" d={ribbonPath(link)} {...seriesAttrs(colour(layout.nodes[link.source]).slot, colour(layout.nodes[link.source]).tone)} />
      ))}
      {node ? <rect className="fa-chart-hover-ring" x={node.x0 - 1} y={node.y0 - 1} width={node.x1 - node.x0 + 2} height={Math.max(1, node.y1 - node.y0) + 2} rx={0.125 * rem} /> : null}
    </svg>
  )
}
