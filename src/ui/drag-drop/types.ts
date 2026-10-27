import type { ReactNode } from "react"
import type { DropZoneSort } from "./layout.js"

/** How a drag is driven. */
export type DragInput = "pointer" | "keyboard"

/** Whether a drop moves the item out of its source or leaves the source in place. */
export type DragEffect = "move" | "copy"

/** The object being dragged: its id, its type for filtering, the host's data and a name. */
export interface DragItem<T = unknown> {
  /** Unique within the provider. */
  id: string
  /** What kind of object it is; drop zones filter on it with `accept`. */
  type: string
  /** The host's object, passed back unchanged in every event. */
  data: T
  /** A short name for announcements ("Invoice 1042"). */
  label: string
}

/** A place in the interface: a zone and, for sortable zones, an index among its items. */
export interface DragPosition {
  /** The zone id, or null outside every zone. */
  zoneId: string | null
  /** The index among the zone's items, or null for zones that do not sort. */
  index: number | null
}

/** What every lifecycle event carries. */
export interface DragInfo<T = unknown> {
  item: DragItem<T>
  /** Where the item was picked up. `zoneId` is null outside every zone. */
  source: DragPosition
  input: DragInput
  effect: DragEffect
}

/** `onDragStart`: the item was lifted (past the pointer threshold, or Space/Enter). */
export type DragStartEvent<T = unknown> = DragInfo<T>

/** `onDragMove`: the pointer moved (every frame during a pointer drag). Do not set React state here. */
export interface DragMoveEvent<T = unknown> extends DragInfo<T> {
  /** The pointer in viewport px, or null during a keyboard drag. */
  pointer: { x: number; y: number } | null
  /** The current target. */
  target: DragPosition
}

/** `onDragOver`: the target zone, index or verdict changed. */
export interface DragOverEvent<T = unknown> extends DragInfo<T> {
  target: DragPosition
  /** The previous target. */
  previous: DragPosition
  /** The target zone's status for this item, or null outside every zone. */
  status: DropZoneStatus | null
  /** Why the target refuses the item, when it does and says why. */
  reason: string | null
}

/** `onDrop`: the item was released over a zone that accepts it. Apply it to your data synchronously. */
export interface DropEvent<T = unknown> extends DragInfo<T> {
  target: { zoneId: string; index: number | null }
}

/** Why a drag ended without a drop. */
export type DragCancelReason =
  /** Escape, or focus left a keyboard drag. */
  | "escape"
  /** Released outside every zone. */
  | "outside"
  /** Released over a zone that is disabled or in error for this item. */
  | "blocked"
  /** Released where it started. */
  | "unchanged"
  /** The zone's `onDrop` returned false. */
  | "refused"
  /** The pointer was cancelled, the window lost focus or the provider unmounted. */
  | "interrupted"

/** `onDragCancel`: the drag ended without a drop and the item went back. */
export interface DragCancelEvent<T = unknown> extends DragInfo<T> {
  reason: DragCancelReason
}

/** `onDragEnd`: always last, after the item has settled. */
export interface DragEndEvent<T = unknown> extends DragInfo<T> {
  outcome: "dropped" | "cancelled"
  /** Why it was cancelled, or null after a drop. */
  reason: DragCancelReason | null
  /** Where it was dropped, or null when cancelled. */
  target: { zoneId: string; index: number | null } | null
}

/**
 * A zone's state for the current drag.
 *
 * - `idle`: nothing is being dragged
 * - `ready`: the item being dragged can be dropped here
 * - `disabled`: it cannot be dropped here (another type, or the zone is disabled)
 * - `error`: it would normally be accepted but cannot be now (full, duplicate, …)
 * - `pending`: a drop is being saved (`onDrop` returned a promise)
 */
export type DropZoneStatus = "idle" | "ready" | "disabled" | "error" | "pending"

/**
 * A zone's verdict on the item being dragged: `true` accepts, `false` disables, or a status
 * with the reason shown over the zone and announced.
 */
export type DropVerdict = boolean | { status: "disabled" | "error"; reason?: string }

/** Which item types a zone accepts: a type, a list of types or a test on the item. */
export type DropAccept = string | readonly string[] | ((item: DragItem) => boolean)

/** A zone's state as its render function and `useDropZone` see it. */
export interface DropZoneState {
  status: DropZoneStatus
  /** The dragged item is over this zone. */
  over: boolean
  /** Why the zone refuses the item, or why the last drop failed. */
  reason: string | null
  /** The item being dragged anywhere, or null. */
  item: DragItem | null
  /** The insertion index while over a sortable zone (render functions only). */
  index: number | null
}

/** Lifecycle callbacks for a whole provider; `useDragDropMonitor` takes the same set. */
export interface DragDropCallbacks {
  /** An item was lifted: past the pointer threshold, after a touch press, or with Space or Enter. */
  onDragStart?: (event: DragStartEvent) => void
  /** The pointer moved during a pointer drag (every frame). Write styles here, never React state. */
  onDragMove?: (event: DragMoveEvent) => void
  /** The target zone, insertion index or the target's verdict changed. */
  onDragOver?: (event: DragOverEvent) => void
  /** An item was dropped on a zone that accepted it, after the zone's own `onDrop`. */
  onDrop?: (event: DropEvent) => void
  /** A drag ended without a drop; `reason` says why. */
  onDragCancel?: (event: DragCancelEvent) => void
  /** Every drag's last event, after the item settled, with `outcome` "dropped" or "cancelled". */
  onDragEnd?: (event: DragEndEvent) => void
}

/** What an announcement knows about a place. */
export interface AnnouncedPlace {
  /** The zone's label, or null outside every zone. */
  zone: string | null
  /** 1-based position in a sortable zone, or null. */
  position: number | null
  /** Items in the zone counting the dragged one at that position, or null. */
  count: number | null
}

/** Screen reader messages. Replace any of them with `announcements` on the provider. */
export interface DragDropAnnouncements {
  lifted: (item: DragItem, place: AnnouncedPlace, input: DragInput) => string
  moved: (item: DragItem, place: AnnouncedPlace, blocked: string | null) => string
  dropped: (item: DragItem, place: AnnouncedPlace) => string
  cancelled: (item: DragItem, place: AnnouncedPlace) => string
  blocked: (item: DragItem, zone: string, reason: string | null) => string
  failed: (item: DragItem, zone: string, reason: string | null) => string
}

/** Options shared by `useDraggable` and `Draggable`. */
export interface DraggableOptions<T = unknown> {
  /** Unique within the provider; also the item's id in every event. */
  id: string
  /** The kind of object, for zone filters. Default "item". */
  type?: string
  /** The host's object. */
  data?: T
  /** A short name for announcements and the handle's accessible name. */
  label: string
  /** Not draggable; a string says why (aria-disabled with the reason as its description). */
  disabled?: boolean | string
  /** "copy" leaves the source in place. Default "move". */
  effect?: DragEffect
  /**
   * Keys that lift the item from its handle. Default Space and Enter. Leave Enter out when the
   * handle also opens something (an event that Enter opens), and say so in its description.
   */
  liftKeys?: readonly (" " | "Enter")[]
  /** Content for the drag preview instead of a copy of the element. */
  preview?: ReactNode
  /** This item was lifted. */
  onDragStart?: (event: DragStartEvent<T>) => void
  /** This item's drag ended, dropped or cancelled. */
  onDragEnd?: (event: DragEndEvent<T>) => void
}

/** Options shared by `useDropZone` and `DropZone`. */
export interface DropZoneOptions<T = unknown> {
  /** Unique within the provider; the target id in drop events. */
  id: string
  /** A short name for announcements ("Done column"). */
  label: string
  /** Item types it takes. Default: every type. A zone always takes back its own items. */
  accept?: DropAccept
  /** A verdict on the item now and, for sortable zones, the index it is over. Re-evaluated when the zone re-renders. */
  validate?: (drag: DragInfo<T>, target: { index: number | null }) => DropVerdict
  /** Refuse every item for now; a string says why. The zone reads as disabled. */
  disabled?: boolean | string
  /** Orders the Draggables inside it: they part to open a gap and close up when one leaves. */
  sort?: DropZoneSort
  /** The item came over this zone. */
  onDragEnter?: (event: DragOverEvent<T>) => void
  /** The item left this zone. */
  onDragLeave?: (event: DragOverEvent<T>) => void
  /** The index or verdict changed while over this zone. */
  onDragOver?: (event: DragOverEvent<T>) => void
  /**
   * The item was dropped here. Apply it to your data synchronously; the zone animates the
   * items to their new places. Return false to refuse (the item goes back), or a promise to
   * show the zone as pending until it settles. A rejected promise shows the zone in error;
   * reject with a `DropError` to say why. Your data is yours to restore.
   */
  onDrop?: (event: DropEvent<T>) => void | boolean | Promise<unknown>
}
