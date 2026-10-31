/**
 * Dragging and keyboard resizing for a docked pane's edge, as AppShell's drawer handle does:
 * the width follows the pointer within its limits, a drag below 60% of the minimum previews
 * the collapsed state and commits it on release, and a drag out from a collapsed pane opens
 * it. While dragging only a custom property and two attributes on the pane's element change,
 * so nothing re-renders (R14.5, R18.5); the result commits once on release.
 */
import { readingKey } from "../../lib/direction.js"
import { remPx } from "../../lib/rem.js"

/** The drag below which a release collapses the pane, as a fraction of the minimum width. */
export const COLLAPSE_FRACTION = 0.6

export interface PaneDragOptions {
  /** The element that carries the width property and `data-resizing` (and, by default, `data-state`). */
  element: HTMLElement
  /** The custom property the dragged width is written to. @defaultValue "--fa-sidebar-width" */
  property?: string
  /**
   * Shows the collapsed (true) or expanded (false) state while the drag crosses the threshold,
   * and clears it on release (null). By default it writes `data-state` and restores it.
   */
  preview?: (collapsed: boolean | null) => void
  /** The element under the pointer, which captures it. */
  handle: HTMLElement
  /** The pointer that pressed. */
  event: PointerEvent
  /** +1 when moving the pointer towards the reading end widens the pane, −1 when it narrows it (end side, or right-to-left). */
  sign: 1 | -1
  /** Whether the pane is expanded when the drag starts. */
  open: boolean
  /** The pane's rendered width in px when the drag starts (0 when it has slid away). */
  startWidth: number
  /** Width limits in rem. */
  min: number
  max: number
  /** Called once on release with the width in rem (undefined when the drag collapsed the pane, which keeps its last width) and whether the pane ends up open. Not called for a press that did not move. */
  onCommit: (width: number | undefined, open: boolean) => void
  /** Called on release when the pointer did not move: a press. */
  onPress?: () => void
}

/** Starts a pointer drag on a pane edge. */
export function startPaneDrag({
  element,
  property = "--fa-sidebar-width",
  preview,
  handle,
  event,
  sign,
  open,
  startWidth,
  min,
  max,
  onCommit,
  onPress,
}: PaneDragOptions) {
  const rem = remPx()
  const minPx = min * rem
  const maxPx = max * rem
  const startX = event.clientX
  const initialState = element.getAttribute("data-state")
  const initialWidth = element.style.getPropertyValue(property)
  // React renders the committed state before the next paint (an application that controls
  // `open` may refuse it), so the default preview hands the attribute back to React.
  const show =
    preview ??
    ((collapsed: boolean | null) => {
      if (collapsed !== null) element.setAttribute("data-state", collapsed ? "collapsed" : "expanded")
      else if (initialState !== null) element.setAttribute("data-state", initialState)
    })
  let width = open ? startWidth : minPx
  let collapsed = !open
  let moved = false
  let settle = 0
  handle.setPointerCapture(event.pointerId)
  element.setAttribute("data-resizing", "")

  const setCollapsed = (next: boolean) => {
    if (next === collapsed) return
    collapsed = next
    // Crossing the threshold animates: let the transitions run for this change.
    element.removeAttribute("data-resizing")
    show(next)
    window.clearTimeout(settle)
    settle = window.setTimeout(() => {
      if (handle.hasPointerCapture(event.pointerId)) element.setAttribute("data-resizing", "")
    }, 200)
  }

  const move = (moveEvent: PointerEvent) => {
    const delta = (moveEvent.clientX - startX) * sign
    if (Math.abs(moveEvent.clientX - startX) > 2) moved = true
    if (!moved) return
    const raw = (open ? startWidth : 0) + delta
    if (raw < minPx * COLLAPSE_FRACTION) {
      setCollapsed(true)
      return
    }
    setCollapsed(false)
    width = Math.min(maxPx, Math.max(minPx, raw))
    element.style.setProperty(property, `${(width / rem).toFixed(3)}rem`)
  }
  const up = () => {
    handle.removeEventListener("pointermove", move)
    handle.removeEventListener("pointerup", up)
    handle.removeEventListener("pointercancel", up)
    window.clearTimeout(settle)
    element.removeAttribute("data-resizing")
    if (!moved) {
      onPress?.()
      return
    }
    show(null)
    if (initialWidth) element.style.setProperty(property, initialWidth)
    else element.style.removeProperty(property)
    onCommit(collapsed ? undefined : Math.round((width / rem) * 100) / 100, !collapsed)
  }
  handle.addEventListener("pointermove", move)
  handle.addEventListener("pointerup", up)
  handle.addEventListener("pointercancel", up)
}

/** One keyboard step, in rem. Shift takes bigger steps. */
export const RESIZE_STEP_REM = 1
/** One Shift+arrow step, in rem. */
export const RESIZE_BIG_STEP_REM = 4

/**
 * The width a resize handle's key asks for, in rem, or null when the key does not resize.
 * ← and → follow the reading direction: towards the reading end widens a start pane and
 * narrows an end pane. Each press steps a rem (Shift: four); Home and End jump to the limits.
 * The caller clamps and commits it.
 */
export function resizeKeyWidth(
  event: { key: string; shiftKey: boolean; currentTarget: Element },
  { current, min, max, side }: { current: number; min: number; max: number; side: "start" | "end" }
): number | null {
  const key = readingKey(event.key, event.currentTarget)
  const step = (event.shiftKey ? RESIZE_BIG_STEP_REM : RESIZE_STEP_REM) * (side === "start" ? 1 : -1)
  if (key === "ArrowRight") return current + step
  if (key === "ArrowLeft") return current - step
  if (event.key === "Home") return min
  if (event.key === "End") return max
  return null
}

/** The theme's default sidebar width (`--sidebar-w`) in rem: 16.5 unless a theme changes it. */
export function themeSidebarRem(): number {
  if (typeof document === "undefined") return 16.5
  const probe = getComputedStyle(document.documentElement).getPropertyValue("--sidebar-w").trim()
  const value = Number.parseFloat(probe)
  return probe.endsWith("rem") && Number.isFinite(value) ? value : 16.5
}
