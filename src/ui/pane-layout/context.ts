/** What panels and the tree read from the layout around them. */
import { createContext, use, type ComponentType, type ReactNode } from "react"
import type { HostStore } from "./hosts.js"
import type { PaneLayoutState, PaneTarget } from "./tree.js"

/** A panel as the host describes it. Everything but `title` and `component` is optional. */
export interface PaneDefinition {
  /** Tab text, region name, and "Resize Layers", "Move Layers". Application text. */
  title: string
  icon?: ReactNode
  /** Mounted once, on first show, with `{ id }`. Keep it stable: a new identity remounts (R22.4). */
  component: ComponentType<{ id: string }>
  /** The smallest this panel's stack can be dragged to, along the split. Default "12rem", as SplitPane. */
  minSize?: `${number}rem`
  /**
   * What happens to the panel while it is hidden (a background tab, a collapsed or covered
   * stack, the panels a phone is not showing).
   *
   * - `pause` (default): state stays, but effects are cleaned up and set up again on show
   *   (React's Activity), so observers and timers stop.
   * - `run`: effects keep running, with no cleanup and no remount. Use it for anything that must
   *   stay connected: a remote session, a terminal, a live stream.
   */
  whenHidden?: "pause" | "run"
  /** The panel that fills the box when the layout collapses (R21.3). */
  primary?: boolean
  /** False keeps the panel where it is: no Move to rows, and drops are refused. Default true. */
  movable?: boolean
  /** False offers no way to close the panel. Default true. */
  closable?: boolean
  /** Runs before close, like a window's CloseGuard (R13.7). Without it the panel simply closes. */
  canClose?: () => boolean | Promise<boolean>
  unsaved?: boolean
  /** A tab the next open replaces: its label is italic until `onKeep`. The host does the replacing. */
  preview?: boolean
  /** A `preview` tab should stay: double-clicked, or Keep open in its menu. */
  onKeep?: () => void
  /** Menu rows for the panel's menus (`Menu.Item`), above the rows the layout adds. */
  contextMenu?: ReactNode
}

/** The live layout and its operations, from {@link usePaneLayout}. */
export interface PaneLayoutHandle {
  layout: PaneLayoutState
  /** Add a panel, or reveal it when it is already open. */
  open(id: string, to?: PaneTarget): void
  /** Close a panel after its `canClose`. Resolves false when the panel refused. */
  close(id: string): Promise<boolean>
  move(id: string, to: PaneTarget): void
  /** Show a panel: its stack's active panel, with the stack open and not covered. */
  reveal(id: string): void
  /** Replace the whole layout, such as switching saved workspaces. A panel in both keeps its mount. */
  setLayout(layout: PaneLayoutState): void
}

/** What the tree, its menus and `usePanelActions` share. */
export interface PaneTree extends PaneLayoutHandle {
  store: HostStore
  definition: (id: string) => PaneDefinition | null
  locked: boolean
  narrow: boolean
  /** Fill the layout with a stack, or none. */
  maximise: (stack: string | null) => void
  /** Move and put focus on the panel in its new place, for a move chosen from a menu. */
  moveFocused: (id: string, to: PaneTarget) => void
  /** Reading direction of the layout, read when asked. */
  rtl: () => boolean
}

export const PaneTreeContext = /* @__PURE__ */ createContext<PaneTree | null>(null)

export const PaneHandleContext = /* @__PURE__ */ createContext<PaneLayoutHandle | null>(null)

/** The tree around a stack or menu (internal). */
export function usePaneTree(): PaneTree {
  const tree = use(PaneTreeContext)
  if (!tree) throw new Error("usePanelActions must be inside a panel of a PaneLayout.")
  return tree
}

/**
 * The live layout and its operations, inside a panel. Outside one, use the pure functions
 * (`movePanel`, `closePanel`) on a controlled layout.
 */
export function usePaneLayout(): PaneLayoutHandle {
  const handle = use(PaneHandleContext)
  if (!handle) throw new Error("usePaneLayout must be inside a panel of a PaneLayout.")
  return handle
}
