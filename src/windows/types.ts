/**
 * Window system types (docs/windows.md, docs/ui-rules.md R14).
 *
 * Everything here is serialisable. A window is reconstructed from `{ id, kind, params }`
 * plus its layout; React nodes, callbacks and credentials never enter the store, the
 * storage key or the sync channel.
 */
import type { StatusKind } from "../ui/badge/index.js"
import type { SnapZone } from "./geometry.js"

/** Parameters a window kind needs to rebuild itself. Primitives only. */
export type WindowParams = Readonly<Record<string, string | number | boolean>>

export interface WindowDescriptor {
  id: string
  /** Semantic entity or content kind, used to choose labels and rendering. */
  kind: string
  /** Serialisable parameters used to reconstruct the view. */
  params: WindowParams
}

/**
 * Where a visible window lives.
 *   tiled      a column beside the primary window (the layout shrinks the primary)
 *   floating   over the workspace, free or snapped to a zone
 *   maximised  fills the workspace
 */
export type WindowLayout = "tiled" | "floating" | "maximised"

/** A rectangle in workspace pixels (origin = the workspace's top-left corner). */
export interface Rect {
  /** Horizontal coordinate or accessor. */
  x: number
  /** Vertical coordinate or accessor. */
  y: number
  w: number
  h: number
}

export interface WindowEntry extends WindowDescriptor {
  /**
   * The tenant scope the window belongs to (an organisation id), or null for a window that
   * belongs to none. Windows sit above the scope (R14.4): switching scope never closes,
   * pauses or reloads one; the frame and the dock only label it.
   */
  scope: string | null
  /** Layout or presentation mode. */
  layout: WindowLayout
  /** Where "restore" returns a maximised window to. */
  restoreLayout: Exclude<WindowLayout, "maximised">
  /** A floating window snapped to a zone; its rectangle derives from the zone. */
  snap: SnapZone | null
  /** Free-floating geometry, kept while tiled or maximised so restore lands in place. */
  rect: Rect
  minimised: boolean
  /** Rendered in its own browser window; the workspace keeps only its dock entry. */
  poppedOut: boolean
  /** Stacking order among floating and maximised windows. Higher is on top. */
  z: number
  openedAt: number
}

export interface WindowManagerState {
  /** Insertion order is dock order. */
  windows: readonly WindowEntry[]
  /** The focused window, PRIMARY_WINDOW_ID for the routed view, or null. Per tab. */
  focusedId: string | null
  /** Column dividers for 2 and 3 column tiling, as fractions of the workspace width. */
  splits: Readonly<Record<"2" | "3", readonly number[]>>
  /** Lamport revision. Every local change increments it; sync applies newer snapshots. */
  rev: number
}

export const PRIMARY_WINDOW_ID = "primary"

export type WindowStatusTone = "success" | "warning" | "danger" | "info" | "neutral"

/** How each window tone draws as the shared StatusDot (connected, degraded, failed,
 *  connecting, idle). */
export const WINDOW_TONE_STATUS = {
  success: "online",
  warning: "warning",
  danger: "error",
  info: "connecting",
  neutral: "offline",
} as const satisfies Record<WindowStatusTone, StatusKind>

/** The live state a window publishes for its dock entry (not persisted). */
export interface WindowIndicator {
  tone: WindowStatusTone
  label: string
}

export type WindowEventType =
  | "open"
  | "focus"
  | "beforeclose"
  | "close"
  | "minimise"
  | "restore"
  | "maximise"
  | "layout"
  | "popout"
  | "return"
  | "sync"

export interface WindowEvent {
  /** Semantic content or control type. */
  type: WindowEventType
  /** The window concerned; PRIMARY_WINDOW_ID for primary focus, "" for whole-state sync. */
  id: string
  entry: WindowEntry | null
  /** The typed source adapter or asset definition consumed by this component. */
  source: "local" | "remote"
  /** Only meaningful for "beforeclose": stops the close. */
  preventDefault: () => void
  readonly defaultPrevented: boolean
}

export type WindowEventListener = (event: WindowEvent) => void

/**
 * A close guard runs before a window closes (dirty forms, live sessions). Return false
 * (or resolve false) to keep the window open; normally after asking the user.
 */
export type CloseGuard = () => boolean | Promise<boolean>

export interface OpenWindowInput {
  /** Semantic entity or content kind, used to choose labels and rendering. */
  kind: string
  /** Serialisable parameters used to reconstruct the view. */
  params?: WindowParams
  /** The window's scope (an organisation id). Default: the kind's `scope(params)`, else none. */
  scope?: string | null
  /** Explicit id. When omitted the kind's `key(params)` is used, else a random id. */
  id?: string
  /** Layout or presentation mode. */
  layout?: Exclude<WindowLayout, "maximised"> | "maximised"
  /** Initial free-floating size; the position is centred and cascaded. */
  size?: { w: number; h: number }
}
