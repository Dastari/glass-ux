/**
 * The window kind registry (R14.2). A kind says how to title a window from its params and
 * how to load its body. Bodies are lazy, so every kind is its own code-split chunk and
 * nothing loads until a window of that kind is on screen.
 *
 * This module holds definitions only (no React runtime), so the store can read titles and
 * sizes without depending on a UI framework. The lazy body components are created in
 * window-content.tsx.
 */
import type { ComponentType } from "react"
import type { IconComponent } from "../ui/icon/index.js"
import type { WindowParams } from "./types.js"

export interface WindowContentProps<P extends WindowParams = WindowParams> {
  id: string
  /** Serialisable parameters used to reconstruct the view. */
  params: P
}

export interface WindowKindDefinition<P extends WindowParams = WindowParams> {
  /** Stable, namespaced id persisted with every window of this kind, e.g. "remote-control". */
  kind: string
  title: (params: P) => string
  /** A data subtitle (R2.2): the endpoint, organisation or user the window is about. */
  subtitle?: (params: P) => string | undefined
  /**
   * The tenant scope (organisation id) a window of this kind belongs to, from its params:
   * a terminal belongs to its endpoint's organisation. Read once, when the window opens, and
   * stored with it. `OpenWindowInput.scope` takes precedence.
   */
  scope?: (params: P) => string | null | undefined
  icon: IconComponent
  load: () => Promise<{ default: ComponentType<WindowContentProps<P>> }>
  /**
   * Deduplicate: opening a window whose key matches an open one focuses it instead.
   * Default: the window id (so every open creates a new window).
   */
  key?: (params: P) => string
  /** Preferred floating size in CSS pixels. */
  size?: { w: number; h: number }
  minSize?: { w: number; h: number }
  /** Allow popping out into a browser window. Default true. */
  popout?: boolean
  /** Offer Full screen in the app bar, where the browser allows it. Default true. */
  fullscreen?: boolean
}

type AnyKind = WindowKindDefinition<WindowParams>

const kinds = new Map<string, AnyKind>()
const listeners = new Set<() => void>()

/** Floating size, in CSS pixels, for a kind that sets no `size`. */
export const DEFAULT_WINDOW_SIZE = { w: 760, h: 520 }
/** Smallest resizable size, in CSS pixels, for a kind that sets no `minSize`. */
export const DEFAULT_MIN_WINDOW_SIZE = { w: 320, h: 200 }

/**
 * Register a kind. Re-registering the same kind replaces it (hot reload).
 *
 * Call it at module scope (or in an effect), never during render: registering notifies every
 * mounted `WindowContentHost`, and React rejects updating another component mid-render.
 */
export function registerWindowKind<P extends WindowParams>(definition: WindowKindDefinition<P>) {
  kinds.set(definition.kind, definition as unknown as AnyKind)
  for (const notify of listeners) notify()
  return definition
}

/** Returns the registered definition for `kind`, or `undefined` when it has not been registered. */
export function getWindowKind(kind: string): AnyKind | undefined {
  return kinds.get(kind)
}

/** Returns every registered window kind definition, in registration order. */
export function listWindowKinds(): AnyKind[] {
  return [...kinds.values()]
}

/** Called when a kind is (re)registered, so lazy components can be rebuilt. */
export function onWindowKindsChange(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Title and subtitle for a window, falling back gracefully for an unknown kind. */
export function describeWindow(kind: string, params: WindowParams) {
  const definition = kinds.get(kind)
  if (!definition) return { title: "Unavailable window", subtitle: kind, icon: undefined }
  return { title: definition.title(params), subtitle: definition.subtitle?.(params), icon: definition.icon }
}
