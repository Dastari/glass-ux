/**
 * The separator between two resizable tracks: length parsing, clamping, the drag and the keys.
 * SplitPane and PaneLayout share it, so the two behave alike. Not part of the package's public
 * API. Drawn with `.fa-split-handle` inside a `.fa-split` (split-pane.css).
 */
import type { ComponentProps, PointerEvent as ReactPointerEvent, Ref } from "react"
import { remPx } from "../../lib/rem.js"
import type { SplitPaneLength } from "./split-pane.js"

/** The arrow keys' step and, with Shift, the bigger step. */
const STEP_REM = 1
const BIG_STEP_REM = 4

/** A length in px against the split's length. */
export function lengthPx(length: SplitPaneLength, total: number): number {
  if (typeof length === "number") return length
  const value = Number.parseFloat(length)
  if (length.endsWith("%")) return (value / 100) * total
  if (length.endsWith("rem")) return value * remPx()
  return value
}

/** A length as CSS. */
export const lengthCss = (length: SplitPaneLength) => (typeof length === "number" ? `${length}px` : length)

/** A value kept within `low` and `high`. */
export const clampLength = (value: number, { low, high }: { low: number; high: number }) => Math.min(high, Math.max(low, value))

/** What a key does to a separator. */
export type SeparatorKeyAction = { kind: "step"; delta: number } | { kind: "low" } | { kind: "high" } | { kind: "toggle" }

/**
 * What a key press does: arrows step in px (Shift for bigger steps, following the reading
 * direction along a horizontal split), Home and End go to the limits, Enter hides or shows.
 * Null for any other key.
 */
export function separatorKeyAction(event: { key: string; shiftKey: boolean }, horizontal: boolean, root: Element | null): SeparatorKeyAction | null {
  const rtl = horizontal && root && getComputedStyle(root).direction === "rtl"
  const grow = horizontal ? (rtl ? "ArrowLeft" : "ArrowRight") : "ArrowDown"
  const shrink = horizontal ? (rtl ? "ArrowRight" : "ArrowLeft") : "ArrowUp"
  const step = (event.shiftKey ? BIG_STEP_REM : STEP_REM) * remPx()
  if (event.key === grow) return { kind: "step", delta: step }
  if (event.key === shrink) return { kind: "step", delta: -step }
  if (event.key === "Home") return { kind: "low" }
  if (event.key === "End") return { kind: "high" }
  if (event.key === "Enter") return { kind: "toggle" }
  return null
}

export interface SeparatorDragOptions {
  /** The split, for its reading direction. */
  root: Element
  horizontal: boolean
  /** The pointer's travel from the press in px, positive where the first track grows. */
  onMove: (delta: number) => void
  /** The drag finished; `cancelled` when the pointer was cancelled. */
  onEnd: (cancelled: boolean) => void
}

/** Capture the pointer on the handle and report its travel until release. */
export function startSeparatorDrag(event: ReactPointerEvent<HTMLElement>, { root, horizontal, onMove, onEnd }: SeparatorDragOptions) {
  event.preventDefault()
  const handle = event.currentTarget
  handle.setPointerCapture(event.pointerId)
  // In RTL the first pane is on the right: moving right makes it smaller.
  const sign = horizontal && getComputedStyle(root).direction === "rtl" ? -1 : 1
  const origin = horizontal ? event.clientX : event.clientY
  const move = (moveEvent: PointerEvent) => {
    const position = horizontal ? moveEvent.clientX : moveEvent.clientY
    onMove(sign * (position - origin))
  }
  const end = (endEvent: PointerEvent) => {
    handle.removeEventListener("pointermove", move)
    handle.removeEventListener("pointerup", end)
    handle.removeEventListener("pointercancel", end)
    onEnd(endEvent.type === "pointercancel")
  }
  handle.addEventListener("pointermove", move)
  handle.addEventListener("pointerup", end)
  handle.addEventListener("pointercancel", end)
}

export interface SeparatorProps extends Omit<ComponentProps<"div">, "role" | "ref"> {
  ref?: Ref<HTMLDivElement>
  horizontal: boolean
  label: string
  /** The id of the track it resizes. */
  controls?: string | undefined
  /** The limits and value as percentages. Leave out to write them to the element yourself. */
  min?: number
  max?: number
  now?: number
  active?: boolean
}

/** The focusable separator between two tracks, with its grip. */
export function Separator({ ref, horizontal, label, controls, min, max, now, active, ...rest }: SeparatorProps) {
  return (
    <div
      {...rest}
      ref={ref}
      role="separator"
      tabIndex={0}
      aria-orientation={horizontal ? "vertical" : "horizontal"}
      aria-label={label}
      aria-controls={controls}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={now}
      className="fa-split-handle"
      data-active={active ? "" : undefined}
    >
      <span className="fa-split-grip" aria-hidden />
    </div>
  )
}
