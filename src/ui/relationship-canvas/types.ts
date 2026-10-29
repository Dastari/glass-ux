import type { ReactNode } from "react"

/** A point in the canvas's world space, in CSS pixels at 100% zoom. */
export interface RelationshipPoint {
  x: number
  y: number
}

/** Card positions by card id. Cards without one are placed by the automatic layout. */
export type RelationshipPositions = Readonly<Record<string, RelationshipPoint>>

/** The tone of a row's lead icon: neutral by default; `warning` is the convention for keys. */
export type RelationshipRowTone = "neutral" | "accent" | "success" | "warning" | "danger"

/** One line of a card: a field, a property, a port. Edges can start or end on it. */
export interface RelationshipRow {
  /** Unique within its card; edges name it as their endpoint's `row`. */
  id: string
  label: string
  /** Trailing text in the monospace face: a type such as `uuid` or `text?`. */
  detail?: string
  /** A small lead icon (a key for a primary key). Rows without one keep the slot, so names line up. */
  icon?: ReactNode
  /** The lead icon's colour. Default neutral. */
  tone?: RelationshipRowTone
}

/** One record on the canvas: a header and its rows. */
export interface RelationshipCard<T = unknown> {
  /** Unique on the canvas; edges, positions and the selection use it. */
  id: string
  title: string
  /** The header icon (a table, a class, a resource). */
  icon?: ReactNode
  /** The header's count badge. Default: the number of rows; `null` hides it. */
  badge?: ReactNode
  rows: readonly RelationshipRow[]
  /** The caller's record, handed back in callbacks. */
  data?: T
}

/** Where an edge attaches: a card, and one of its rows or (without `row`) its header. */
export interface RelationshipEndpoint {
  card: string
  row?: string
}

/** A directed link from one row (or header) to another, on another card or the same one. */
export interface RelationshipEdge {
  /** Unique on the canvas. */
  id: string
  from: RelationshipEndpoint
  /** The arrowhead's end. */
  to: RelationshipEndpoint
  /** Drawn at the edge's middle: a relation's name. Plain text. */
  label?: string
  /** `many` marks a to-many link in its label. Default `one`. */
  cardinality?: "one" | "many"
}

/** The card geometry, in CSS pixels; the canvas reads it from its tokens. */
export interface RelationshipMetrics {
  cardWidth: number
  headerHeight: number
  rowHeight: number
  /** Above the first row and below the last. */
  listPadding: number
  /** Between columns of the automatic layout. */
  gapX: number
  /** Between cards in a column. */
  gapY: number
}

/** A drawn edge: its SVG path and the label's anchor, in world space. */
export interface RelationshipEdgePath {
  edge: RelationshipEdge
  path: string
  labelX: number
  labelY: number
}

/** Why the positions changed: a card dragged, moved with the keyboard, or the automatic layout. */
export type RelationshipPositionsReason = "drag" | "keyboard" | "auto-layout"

/** The second argument of `onPositionsChange`. */
export interface RelationshipPositionsChangeDetails {
  reason: RelationshipPositionsReason
  /** The card that moved, or null for the automatic layout. */
  cardId: string | null
}

/** The canvas's commands, for a host toolbar (`actionsRef`). */
export interface RelationshipCanvasActions {
  zoomIn: () => void
  zoomOut: () => void
  /** Fit every card in view. */
  fit: () => void
  /** Lay every card out again (reported through `onPositionsChange`), then fit. */
  autoLayout: () => void
}
