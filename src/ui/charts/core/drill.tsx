import { hierarchy, type HierarchyNode } from "d3-hierarchy"
import { useMemo, useState } from "react"
import { IconChevronRight } from "../../../icons/generated/icons.js"
import { formatShare, formatValue, type LocalizedFormat } from "./format.js"
import { slotFor, SLOT_COUNT } from "./series.js"
import type { ChartTableModel } from "./table.js"

/** A node in a hierarchy chart: a folder and its size, a category and its children. */
export interface HierarchyDatum {
  label: string
  /** The node's own value; parents sum their children (plus their own value, if any). */
  value?: number
  children?: readonly HierarchyDatum[]
  /** Colour by kind instead of by branch: "documents", "system", "media"… */
  group?: string
}

/** branch: each top-level child keeps one hue down its subtree · group: by kind (a file's
 *  type) · depth: one hue per level below the focus (SpaceMonger). */
export type ColourBy = "branch" | "group" | "depth"

export type Node = HierarchyNode<HierarchyDatum>

/** Build the summed, largest-first hierarchy once. */
export function useHierarchy(data: HierarchyDatum): Node {
  return useMemo(
    () =>
      hierarchy<HierarchyDatum>(data, (d) => (d.children ? [...d.children] : undefined))
        .sum((d) => d.value ?? 0)
        // oxlint-disable-next-line unicorn/no-array-sort -- d3 hierarchy's node.sort, not Array#sort
        .sort((a, b) => (b.value ?? 0) - (a.value ?? 0)),
    [data]
  )
}

/** A node's path from the root as child indices — stable across renders. */
export type DrillPath = readonly number[]

export function nodeAt(root: Node, path: DrillPath): Node {
  let node = root
  for (const index of path) {
    const next = node.children?.[index]
    if (!next) break
    node = next
  }
  return node
}

export function pathOf(node: Node): DrillPath {
  const out: number[] = []
  let current: Node | null = node
  while (current?.parent) {
    out.unshift(current.parent.children?.indexOf(current) ?? 0)
    current = current.parent
  }
  return out
}

/**
 * Drill-down state: the focused node and the way back. Click or Enter drills in; the path,
 * Backspace and Escape go back up.
 */
export function useDrill(root: Node) {
  const [path, setPath] = useState<DrillPath>([])
  const focus = useMemo(() => nodeAt(root, path), [root, path])
  const trail = useMemo(() => focus.ancestors().toReversed(), [focus])
  return {
    focus,
    trail,
    depth: path.length,
    drill: (node: Node) => {
      if (node.children?.length) setPath(pathOf(node))
    },
    up: () => setPath((current) => current.slice(0, -1)),
    to: (depth: number) => setPath((current) => current.slice(0, depth)),
  }
}

/**
 * Colour slots: by branch (each child of the root keeps one hue all the way down), by group (a
 * kind of file) or by depth below the focus. Slots follow size order and never cycle; the
 * tail shares "other".
 */
export function colourKeys(root: Node, colourBy: ColourBy, groups?: readonly string[], focus: Node = root): (node: Node) => number | "other" {
  if (colourBy === "depth") return (node) => slotFor(Math.max(0, node.depth - focus.depth - 1))
  if (colourBy === "group") {
    const order = [...(groups ?? [])]
    if (!groups) {
      const totals = new Map<string, number>()
      for (const leaf of root.leaves()) {
        const key = leaf.data.group ?? "other"
        totals.set(key, (totals.get(key) ?? 0) + (leaf.value ?? 0))
      }
      order.push(...[...totals.entries()].toSorted((a, b) => b[1] - a[1]).map(([key]) => key))
    }
    const slot = new Map(order.map((key, index) => [key, index < SLOT_COUNT ? slotFor(index) : ("other" as const)]))
    const groupOf = (node: Node): string => node.data.group ?? (node.children ? groupOf(node.children[0]!) : "other")
    return (node) => slot.get(groupOf(node)) ?? "other"
  }
  const branches = new Map((root.children ?? []).map((child, index) => [child, index < SLOT_COUNT - 1 ? slotFor(index) : ("other" as const)]))
  return (node) => {
    let current: Node = node
    while (current.parent && current.parent !== root) current = current.parent
    return branches.get(current) ?? "other"
  }
}

/** The table for a hierarchy: the focused level's children, largest first. */
export function hierarchyTable(focus: Node, fmt: LocalizedFormat, label = "Name"): ChartTableModel {
  const total = focus.value ?? 0
  return {
    columns: [
      { key: "name", label },
      { key: "value", label: "Size", numeric: true },
      { key: "share", label: "Share", numeric: true },
      { key: "items", label: "Items", numeric: true },
    ],
    rows: (focus.children ?? []).map((child) => ({
      name: child.data.label,
      value: formatValue(child.value ?? 0, fmt),
      share: formatShare(child.value ?? 0, total, fmt.locale),
      items: child.children ? String(child.leaves().length) : "—",
    })),
  }
}

/**
 * Where a drill-down is: the root, each ancestor (each one navigates back) and the current
 * node. One line at the head's height; the middle collapses to "…" when the path is long and
 * every crumb truncates with an ellipsis.
 */
export function DrillPathBar({ trail, onSelect, label = "Drill path" }: {
  /** Root first, focused node last, as `useDrill().trail` returns it; the last node renders as the current place. */
  trail: readonly Node[]
  /** Called with the zero-based depth of the ancestor the person clicks (0 is the root); not called for the current node. Pass `useDrill().to`. */
  onSelect: (depth: number) => void
  label?: string
}) {
  const last = trail.length - 1
  const shown = trail.length > 4 ? [0, -1, last - 1, last] : trail.map((_, index) => index)
  return (
    <nav className="fa-chart-path" aria-label={label}>
      <ol>
        {shown.map((index, position) => (
          <li key={`${index}-${position}`} className="fa-chart-path-item">
            {position > 0 ? <IconChevronRight className="fa-chart-path-sep" /> : null}
            {index === -1 ? (
              <span className="fa-chart-path-gap" aria-hidden>
                …
              </span>
            ) : index === last ? (
              <span className="fa-chart-path-current" aria-current="location" title={trail[index]!.data.label}>
                {trail[index]!.data.label}
              </span>
            ) : (
              <button type="button" className="fa-chart-path-link fa-pressable" onClick={() => onSelect(index)} title={trail[index]!.data.label}>
                {trail[index]!.data.label}
              </button>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
