/**
 * Column resizing (R16.3): drag a header edge, double-click it to fit the content, or
 * focus it and use the arrow keys. While dragging, only CSS custom properties on the
 * table root change, so no React render happens until the pointer is released.
 */
import { columnKey, cssVar } from "./layout.js"

export interface ResizeColumn {
  id: string
  minWidth: number
  maxWidth: number
}

/** Keyboard steps in rem (16px / 64px at the default scale). */
export const KEY_STEP = 1
export const KEY_STEP_LARGE = 4

export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)
const round = (value: number) => Math.round(value * 100) / 100

export function remPx() {
  return Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
}

/** The rendered width of a column in rem (what the user sees, including any grow). */
export function renderedWidth(root: HTMLElement, id: string) {
  const header = root.querySelector<HTMLElement>(`.fa-dt-th[data-col="${columnKey(id)}"]`)
  return header ? header.getBoundingClientRect().width / remPx() : 0
}

/** Write a provisional width straight onto the root (no React render). */
function preview(root: HTMLElement, key: string, width: number) {
  const value = `${round(width)}rem`
  root.style.setProperty(cssVar.width(key), value)
  root.style.setProperty(cssVar.min(key), value)
  root.style.setProperty(cssVar.max(key), value)
  root.style.setProperty(cssVar.grow(key), "0")
  root.style.setProperty(cssVar.shrink(key), "0")
}

function snapshot(root: HTMLElement, key: string) {
  const names = [cssVar.width(key), cssVar.min(key), cssVar.max(key), cssVar.grow(key), cssVar.shrink(key)]
  const saved = names.map((name) => [name, root.style.getPropertyValue(name)] as const)
  return () => {
    for (const [name, value] of saved) root.style.setProperty(name, value)
  }
}

/**
 * Start a pointer drag on a resize handle. Calls `onCommit` with the final width (rem) on
 * release, or nothing if the pointer barely moved (a click or the first half of a
 * double-click). Escape cancels.
 */
export function startPointerResize(
  event: PointerEvent,
  handle: HTMLElement,
  root: HTMLElement,
  column: ResizeColumn,
  onCommit: (width: number) => void
) {
  if (event.button !== 0) return
  event.preventDefault()
  const key = columnKey(column.id)
  const scale = remPx()
  const start = renderedWidth(root, column.id)
  const startX = event.clientX
  const direction = getComputedStyle(root).direction === "rtl" ? -1 : 1
  const restore = snapshot(root, key)
  let width = start
  let moved = false

  handle.setPointerCapture(event.pointerId)
  root.setAttribute("data-resizing", key)

  const move = (next: PointerEvent) => {
    const delta = ((next.clientX - startX) * direction) / scale
    if (!moved && Math.abs(next.clientX - startX) < 2) return
    moved = true
    width = clamp(start + delta, column.minWidth, column.maxWidth)
    preview(root, key, width)
  }
  const finish = (commit: boolean) => {
    handle.removeEventListener("pointermove", move)
    handle.removeEventListener("pointerup", up)
    handle.removeEventListener("pointercancel", cancel)
    window.removeEventListener("keydown", escape, true)
    if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId)
    root.removeAttribute("data-resizing")
    if (commit && moved) onCommit(round(width))
    else restore()
  }
  const up = () => finish(true)
  const cancel = () => finish(false)
  const escape = (keyEvent: KeyboardEvent) => {
    if (keyEvent.key !== "Escape") return
    keyEvent.preventDefault()
    keyEvent.stopPropagation()
    finish(false)
  }

  handle.addEventListener("pointermove", move)
  handle.addEventListener("pointerup", up)
  handle.addEventListener("pointercancel", cancel)
  window.addEventListener("keydown", escape, true)
}

/** Arrow keys on a focused handle: ±1rem, Shift ±4rem, Home/End to the limits. */
export function keyboardResize(event: KeyboardEvent, root: HTMLElement, column: ResizeColumn): number | null {
  const current = renderedWidth(root, column.id)
  const step = event.shiftKey ? KEY_STEP_LARGE : KEY_STEP
  const rtl = getComputedStyle(root).direction === "rtl"
  let next: number | null = null
  if (event.key === "ArrowRight") next = current + (rtl ? -step : step)
  else if (event.key === "ArrowLeft") next = current - (rtl ? -step : step)
  else if (event.key === "Home") next = column.minWidth
  else if (event.key === "End") next = column.maxWidth
  if (next === null) return null
  event.preventDefault()
  return round(clamp(next, column.minWidth, column.maxWidth))
}

/**
 * Fit a column to its widest rendered content (header included). Measures every cell of
 * the column at max-content in one layout pass.
 */
export function measureContentWidth(root: HTMLElement, column: ResizeColumn) {
  const key = columnKey(column.id)
  const cells = [...root.querySelectorAll<HTMLElement>(`[data-col="${key}"]`)]
  if (!cells.length) return null
  for (const cell of cells) cell.setAttribute("data-measure", "")
  let widest = 0
  for (const cell of cells) widest = Math.max(widest, cell.getBoundingClientRect().width)
  for (const cell of cells) cell.removeAttribute("data-measure")
  const scale = remPx()
  // A hair of slack so sub-pixel text never ellipsises right after fitting.
  return round(clamp(widest / scale + 0.125, column.minWidth, column.maxWidth))
}
