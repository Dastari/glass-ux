import { useEffect, useRef, type KeyboardEvent, type PointerEvent } from "react"
import { useStoreValue, type HoverStore } from "./hover.js"

export interface HitLayerProps {
  /** External store observed by the component. */
  store: HoverStore
  /** How many positions the cursor can visit. */
  count: number
  /** Plot-local px → position index (null: nothing there). */
  locate: (x: number, y: number) => number | null
  /** Position index → plot-local px where the readout anchors (the snapped point). */
  anchor: (index: number) => { x: number; y: number }
  /** Pointer readouts follow the snapped x (line charts) instead of the pointer itself. */
  snap?: boolean
  /** Arrow-key movement; default steps through indices in order. Return null to stay. */
  nav?: (index: number, key: string) => number | null
  /** Click or Enter on a position (drill-down, selection). */
  onActivate?: (index: number) => void
  /** Escape or Backspace: back up a level (drill-downs). Without it Escape clears the cursor. */
  onEscape?: () => void
  /** Accessible name for the cursor. */
  label: string
  /** What the cursor is on, for assistive tech: "10:32 · CPU 34%". */
  valueText: (index: number) => string
  /** Where the keyboard cursor starts. */
  initial?: number
  /** Controlled cursor or crosshair state. */
  cursor?: "crosshair" | "pointer"
  /** Cover only part of the plot (plot-local px), leaving the rest (a legend) to the pointer. */
  bounds?: { left: number; top: number; width: number; height: number }
  /**
   * Keys the chart handles itself (a zoomable chart's + and −), before the cursor keys. It
   * receives the event and the cursor's index; return true when it handled the key.
   */
  onKey?: (event: KeyboardEvent<HTMLDivElement>, index: number) => boolean
  /** The extra keys, for assistive tech (`aria-keyshortcuts`): "+ - Shift+ArrowLeft". */
  keyShortcuts?: string
}

const STEP_KEYS = new Set(["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"])

/** The default cursor movement: arrows step, Page keys jump a tenth, Home and End go to the ends. */
export function linearNav(index: number, key: string, count: number): number {
  const page = Math.max(1, Math.round(count / 10))
  switch (key) {
    case "ArrowRight":
    case "ArrowUp":
      return Math.min(count - 1, index + 1)
    case "ArrowLeft":
    case "ArrowDown":
      return Math.max(0, index - 1)
    case "PageUp":
      return Math.min(count - 1, index + page)
    case "PageDown":
      return Math.max(0, index - page)
    case "Home":
      return 0
    case "End":
      return count - 1
    default:
      return index
  }
}

/**
 * The pointer and keyboard surface over a plot. It writes the position to the hover store;
 * the marks never re-render. It is one tab stop exposed as a slider over the data positions
 * (R11.5: arrows move within it), so a keyboard or screen-reader user gets the same readout
 * as the pointer, and Escape clears it. A readout opened by the pointer also closes on Escape
 * wherever focus is, without moving the pointer (WCAG 1.4.13), and the key is not passed on
 * to a dialog around the chart.
 */
export function HitLayer({ store, count, locate, anchor, snap = false, nav, onActivate, onEscape, label, valueText, initial, cursor = "crosshair", bounds, onKey, keyShortcuts }: HitLayerProps) {
  const ref = useRef<HTMLDivElement>(null)
  const hover = useStoreValue(store)
  const index = hover?.index ?? null
  const hoverOpen = hover?.via === "pointer"
  useEffect(() => {
    if (!hoverOpen) return
    const dismiss = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return
      // The focused chart handles Escape itself (back up a level, clear the cursor).
      if (ref.current && ref.current.contains(document.activeElement)) return
      if (store.get()?.via !== "pointer") return
      event.stopPropagation()
      store.set(null)
    }
    document.addEventListener("keydown", dismiss, true)
    return () => document.removeEventListener("keydown", dismiss, true)
  }, [hoverOpen, store])
  /** At rest the slider still has a value (ARIA requires one): where the keyboard would start. */
  const resting = Math.min(Math.max(0, count - 1), initial ?? Math.max(0, count - 1))

  /** The plot's origin in viewport px (the layer may cover only part of the plot). */
  const origin = (element: HTMLElement) => {
    const box = element.getBoundingClientRect()
    return { left: box.left - (bounds?.left ?? 0), top: box.top - (bounds?.top ?? 0) }
  }

  const place = (next: number, via: "pointer" | "keyboard", pointer?: { x: number; y: number }) => {
    if (!ref.current) return
    const box = origin(ref.current)
    const at = anchor(next)
    store.set({
      index: next,
      x: box.left + (via === "keyboard" || snap || !pointer ? at.x : pointer.x),
      y: box.top + (via === "keyboard" || !pointer ? at.y : pointer.y),
      via,
    })
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const box = origin(event.currentTarget)
    const local = { x: event.clientX - box.left, y: event.clientY - box.top }
    const found = locate(local.x, local.y)
    if (found === null || found < 0) {
      store.set(null)
      return
    }
    const current = store.get()
    if (current && current.index === found && current.via === "pointer" && snap) return
    place(found, "pointer", local)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (onEscape && (event.key === "Escape" || event.key === "Backspace")) {
      event.preventDefault()
      event.stopPropagation()
      onEscape()
      return
    }
    if (count === 0) return
    if (event.key === "Escape") {
      if (store.get()) {
        event.stopPropagation()
        store.set(null)
      }
      return
    }
    const current = store.get()?.index ?? initial ?? count - 1
    if (onKey?.(event, current)) {
      event.preventDefault()
      return
    }
    if ((event.key === "Enter" || event.key === " ") && onActivate) {
      event.preventDefault()
      onActivate(current)
      return
    }
    if (!STEP_KEYS.has(event.key)) return
    event.preventDefault()
    const next = nav ? (nav(current, event.key) ?? current) : linearNav(current, event.key, count)
    place(next, "keyboard")
  }

  return (
    <div
      ref={ref}
      className="fa-chart-hit"
      data-cursor={cursor}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-keyshortcuts={keyShortcuts}
      aria-valuemin={0}
      aria-valuemax={Math.max(0, count - 1)}
      aria-valuenow={index ?? resting}
      aria-valuetext={count > 0 ? valueText(index ?? resting) : undefined}
      onPointerMove={onPointerMove}
      onPointerLeave={() => {
        if (store.get()?.via === "pointer") store.set(null)
      }}
      onPointerDown={(event) => {
        // Touch: a tap shows the readout where the finger is.
        if (event.pointerType !== "mouse") onPointerMove(event)
      }}
      style={bounds ? { left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height, right: "auto", bottom: "auto" } : undefined}
      onClick={(event) => {
        if (!onActivate) return
        const box = origin(event.currentTarget)
        const found = locate(event.clientX - box.left, event.clientY - box.top)
        if (found !== null && found >= 0) onActivate(found)
      }}
      onFocus={() => {
        if (!store.get() && count > 0) place(initial ?? count - 1, "keyboard")
      }}
      onBlur={() => {
        if (store.get()?.via === "keyboard") store.set(null)
      }}
      onKeyDown={onKeyDown}
    />
  )
}
