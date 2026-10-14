/**
 * Topology types: what a caller gives the canvas (nodes with their upstream link) and what
 * the layout returns (boxes, cluster blocks and edge paths in world units). The library knows
 * nothing about devices: a node is an id, a parent, a label and an optional cluster key.
 */

/** How a node reaches its parent. Unknown links are drawn dashed (nothing reports the port). */
export type TopologyLinkKind = "wired" | "wireless" | "unknown"

export interface TopologyLink {
  /** Semantic entity or content kind, used to choose labels and rendering. */
  kind: TopologyLinkKind
  /** The negotiated speed in Mb/s, when a source reports it. Absent: no label. */
  speedMbps?: number
}

export interface TopologyNode<T = unknown> {
  id: string
  /** The node it hangs off; null (or an id not in the set) makes it a root. */
  parentId: string | null
  /** Its name: the label under the icon, its accessible name and the list order. */
  label: string
  /** A quieter second line under the label: an IP address. */
  detail?: string
  /**
   * Leaves only: leaves under one parent with the same key are drawn together as one block
   * ("Computers · 12") with one trunk link, so a switch with 200 clients stays readable.
   * A node with children is never clustered.
   */
  cluster?: string
  /** The link up to its parent. Default: unknown. */
  link?: TopologyLink
  /** Typed records rendered by the component. */
  data: T
}

/** How a cluster key is named and ordered (lower first). */
export interface TopologyClusterSpec {
  label: string
  order?: number
}

export interface TopologyMetrics {
  /** One node's box: the icon tile and its label. */
  cellWidth: number
  cellHeight: number
  /** Between sibling boxes, and between rows. */
  gapX: number
  gapY: number
  /** Inside a cluster block: around the members, between members and its header line. */
  clusterPad: number
  clusterGap: number
  clusterHeader: number
  /** The most members in one cluster row. */
  clusterColumns: number
  /** The corner radius of the elbow links. */
  radius: number
}

export interface LaidOutNode {
  id: string
  parentId: string | null
  /** The box's top-left corner and size, in world units. */
  x: number
  /** Vertical coordinate or accessor. */
  y: number
  /** Available width or named width tier. */
  width: number
  /** Available height used for the component’s size tier. */
  height: number
  /** The row it sits in, 0 at the top. Members sit in their cluster's row. */
  depth: number
  /** The cluster block it is drawn in. */
  clusterId?: string
}

export interface LaidOutCluster {
  /** `${parentId}::${key}`. */
  id: string
  key: string
  label: string
  parentId: string | null
  /** Horizontal coordinate or accessor. */
  x: number
  /** Vertical coordinate or accessor. */
  y: number
  /** Available width or named width tier. */
  width: number
  /** Available height used for the component’s size tier. */
  height: number
  depth: number
  /** Its place among the parent's blocks, in reading order. */
  stack: number
  /** The shelf it sits on in the parent's packed group, 0 at the top. */
  shelf: number
  /** Typed column definitions, including rendering, sorting, priorities and filters. */
  columns: number
  /** Member ids in drawing order (row by row). */
  members: readonly string[]
}

export interface LaidOutEdge {
  /** The child: a node id, or a cluster id for a cluster's trunk. */
  id: string
  from: string
  to: string
  /** An SVG path in world units: an elbow from the parent's bottom to the child's top. */
  path: string
  /** Semantic entity or content kind, used to choose labels and rendering. */
  kind: TopologyLinkKind
  /** "1 Gbps", "100 Mbps–1 Gbps"; absent when no speed is known. */
  label?: string
  /** Where the label sits: the middle of the drop into the child. */
  labelX: number
  labelY: number
}

export interface TopologyLayout {
  /** Graph or tree nodes with stable identifiers and relationships. */
  nodes: readonly LaidOutNode[]
  clusters: readonly LaidOutCluster[]
  edges: readonly LaidOutEdge[]
  /** Available width or named width tier. */
  width: number
  /** Available height used for the component’s size tier. */
  height: number
}
