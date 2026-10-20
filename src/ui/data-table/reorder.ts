/**
 * Row reordering (opt-in with `reorder`): drag a row's grip, or lift it with the keyboard.
 *
 * A pointer drag looks and behaves like DragDropProvider's: the preview (a copy of the row) is
 * lifted into the top layer with the same `.fa-dnd-ghost` / `.fa-dnd-lift` styles, and the same
 * transparent shield owns the cursor, hover and the wheel. The rows themselves stay in the
 * table, which virtualizes them, so the parting and the drop slot are the table's own.
 *
 * The host owns the order. The table reports one move on release (row, from/to index and the
 * neighbours it landed between) and the host passes the new `rows` back. While a gesture runs,
 * nothing renders: the moving row and its neighbours are moved with the `translate` property
 * (React owns `transform`), written straight onto the elements, and the one React commit
 * happens on release (docs/performance.md, R14). Every transition reads the
 * motion tokens, so the global motion switch (--motion-scale) stills them.
 *
 * Everything above the DOM section is pure and unit-tested.
 */

import { adoptTheme, makeShield, raise } from "../drag-drop/top-layer.js"

/** A move as `rows` indexes plus the neighbours, so a server can persist "after X". */
export interface ReorderIds {
  rowId: string
  /** The row now directly before the moved row, or null at the start (of its group). */
  previousId: string | null
  /** The row now directly after the moved row, or null at the end (of its group). */
  nextId: string | null
}

/**
 * Move one row of a list: the row at `from` ends up at index `to` and the rows between close
 * up. Returns a new array (the input is not changed); an out-of-range index returns a copy.
 * Use it for local data in `reorder.onReorder`: `setRows((rows) => moveRow(rows, move.from, move.to))`.
 */
export function moveRow<T>(rows: readonly T[], from: number, to: number): T[] {
  const next = [...rows]
  if (from === to || from < 0 || to < 0 || from >= rows.length || to >= rows.length) return next
  const [row] = next.splice(from, 1)
  next.splice(to, 0, row as T)
  return next
}

/**
 * Re-apply a pending move to a fresh list by id: the row goes after `previousId` (or before
 * `nextId` when it moved to the start). Returns `rows` itself when there is nothing to do.
 */
export function applyMove<T>(rows: readonly T[], getRowId: (row: T) => string, move: ReorderIds): readonly T[] {
  const from = rows.findIndex((row) => getRowId(row) === move.rowId)
  if (from < 0) return rows
  const without = rows.filter((_, index) => index !== from)
  let at = -1
  if (move.previousId !== null) {
    const previous = without.findIndex((row) => getRowId(row) === move.previousId)
    if (previous >= 0) at = previous + 1
  }
  if (at < 0 && move.nextId !== null) at = without.findIndex((row) => getRowId(row) === move.nextId)
  if (at < 0 || at === from) return rows
  without.splice(at, 0, rows[from] as T)
  return without
}

/* ── Availability (R11.3: an unavailable action explains why) ─────────────────────── */

/** What stands between the visible order and the manual order. */
export interface ReorderConditions {
  /** The host's own `reorder.disabled`. */
  disabled?: boolean | string
  sorted: boolean
  searched: boolean
  filtered: boolean
  /** Grouped without `withinGroups`. */
  grouped: boolean
  /** More rows than this page, without `withinPage`. */
  paged: boolean
  /** Live rows held behind the "N new" pill. */
  held: boolean
  /** A previous move is still being saved. */
  saving: boolean
}

export const REORDER_REASONS = {
  disabled: "Reordering is unavailable",
  sorted: "Clear sorting to reorder",
  searched: "Clear the search to reorder",
  filtered: "Clear filters to reorder",
  grouped: "Reordering is unavailable while rows are grouped",
  paged: "Show every row on one page to reorder",
  held: "Show the new rows to reorder",
  saving: "Saving the previous move…",
} as const

/** Why reordering is unavailable now, or null when it is available. */
export function reorderUnavailable(conditions: ReorderConditions): string | null {
  const { disabled } = conditions
  if (typeof disabled === "string" && disabled) return disabled
  if (disabled) return REORDER_REASONS.disabled
  for (const key of ["saving", "sorted", "searched", "filtered", "grouped", "paged", "held"] as const)
    if (conditions[key]) return REORDER_REASONS[key]
  return null
}

/* ── Announcements (one assertive live region per table) ──────────────────────────── */

/** "3 of 12", or "3 of 8 in Phones" within a group. */
export function positionText(position: number, count: number, group?: string) {
  return `${position} of ${count}${group ? ` in ${group}` : ""}`
}

export const reorderMessages = {
  lifted: (label: string, position: string, pointer = false) =>
    pointer
      ? `Lifted ${label}, position ${position}.`
      : `Lifted ${label}, position ${position}. Use the arrow keys to move, Space to drop, Escape to cancel.`,
  moved: (label: string, position: string) => `${label}, position ${position}.`,
  dropped: (label: string, position: string) => `Dropped ${label} at position ${position}.`,
  cancelled: (label: string, position: string) => `Reorder cancelled. ${label} returned to position ${position}.`,
  failed: (label: string, position: string, reason?: string) =>
    `${label} could not be moved${reason ? `: ${reason.replace(/[.\s]+$/, "")}` : ""}. Returned to position ${position}.`,
  instructions: "Press Space to lift, the arrow keys to move, Space to drop and Escape to cancel. Alt with an arrow key moves one place.",
  /** The grip's tooltip: short, since the description above is read with the grip. */
  hint: "Drag to reorder, or press Space and use the arrow keys",
}

/* ── Geometry: where lines go while a row moves ────────────────────────────────────── */

/** A line's box in the rows container: offset from its top and height (px). */
export interface LineBox {
  start: number
  size: number
}

/** Where the moving row lands (its top) when it moves from `from` to `to`. */
export function slotStart(from: number, to: number, measure: (index: number) => LineBox) {
  const target = measure(to)
  if (to > from) return target.start + target.size - measure(from).size
  return target.start
}

/** How far a line is displaced (px) while the row at `from` is over `to`. */
export function lineShift(index: number, from: number, to: number, measure: (index: number) => LineBox, gap: number) {
  if (index === from) return slotStart(from, to, measure) - measure(from).start
  const step = measure(from).size + gap
  if (to > from && index > from && index <= to) return -step
  if (to < from && index >= to && index < from) return step
  return 0
}

/**
 * The target line for a moving row whose centre is at `center`: it passes a neighbour once its
 * centre crosses the neighbour's midpoint. Stays within `first`…`last`.
 */
export function targetFor(center: number, from: number, first: number, last: number, measure: (index: number) => LineBox) {
  const mid = (index: number) => {
    const box = measure(index)
    return box.start + box.size / 2
  }
  let target = from
  for (let index = from + 1; index <= last && center > mid(index); index++) target = index
  if (target !== from) return target
  for (let index = from - 1; index >= first && center < mid(index); index--) target = index
  return target
}

/** Clamp a line index into the range. */
export const clampLine = (index: number, first: number, last: number) => Math.min(Math.max(index, first), last)

/* ── DOM: the session that moves elements while a row is lifted ───────────────────── */

export interface ReorderSessionOptions {
  /** The table root: carries data-reordering for the gesture. */
  root: HTMLElement
  /** The element whose children are the lines (rows or cards). */
  container: HTMLElement
  /** The moving line. */
  element: HTMLElement
  from: number
  /** The first and last line the row may move to. */
  first: number
  last: number
  measure: (index: number) => LineBox
  /** Space between lines (cards), px. */
  gap: number
  /** Active display or interaction mode. */
  mode: "pointer" | "keyboard"
}

const active = new WeakMap<HTMLElement, ReorderSession>()

/** The longest transition on an element (ms), with a frame of slack. */
export function transitionMs(element: Element) {
  const style = getComputedStyle(element)
  const parse = (list: string) => list.split(",").map((part) => Number.parseFloat(part) * (part.trim().endsWith("ms") ? 1 : 1000) || 0)
  const durations = parse(style.transitionDuration)
  const delays = parse(style.transitionDelay)
  return Math.max(0, ...durations.map((duration, index) => duration + (delays[index] ?? 0))) + 20
}

function px(value: number) {
  return `0 ${Math.round(value * 100) / 100}px`
}

/**
 * Displaces the lines between the moving row and its target. Lines mounted later (the
 * virtualizer mounts rows as the body scrolls) take their place without a transition.
 */
export class ReorderSession {
  readonly options: ReorderSessionOptions
  target: number
  private applied = new Map<HTMLElement, number>()
  private frame = 0
  private onFrame: (() => void) | null = null
  private done = false

  constructor(options: ReorderSessionOptions) {
    this.options = options
    this.target = options.from
    active.get(options.root)?.finish(false)
    active.set(options.root, this)
    options.root.removeAttribute("data-reorder-settling")
    options.root.setAttribute("data-reordering", options.mode)
    options.element.setAttribute(options.mode === "pointer" ? "data-reorder-placeholder" : "data-reorder-lifted", "")
    this.sync()
    const tick = () => {
      if (this.done) return
      this.onFrame?.()
      this.sync()
      this.frame = requestAnimationFrame(tick)
    }
    this.frame = requestAnimationFrame(tick)
  }

  /** Run something every frame while the session lasts (auto-scroll, the ghost). */
  every(callback: (() => void) | null) {
    this.onFrame = callback
  }

  get count() {
    return this.options.last - this.options.first + 1
  }

  /** Where the moving row lands now (px from the container's top). */
  slot(target = this.target) {
    return slotStart(this.options.from, target, this.options.measure)
  }

  private lines() {
    const lines: HTMLElement[] = []
    for (const child of this.options.container.children)
      if (child instanceof HTMLElement && child.dataset.item !== undefined && child.dataset.index !== undefined) lines.push(child)
    return lines
  }

  /** Move every mounted line to where it belongs for the current target. */
  sync() {
    const { from, first, last, measure, gap } = this.options
    for (const line of this.lines()) {
      const index = Number(line.dataset.index)
      const shift = index < first || index > last ? 0 : lineShift(index, from, this.target, measure, gap)
      const previous = this.applied.get(line)
      if (previous === shift) continue
      if (previous === undefined && shift !== 0) {
        // Newly mounted: take its place at once, then transition like the rest.
        line.style.transition = "none"
        line.style.translate = px(shift)
        requestAnimationFrame(() => line.style.removeProperty("transition"))
      } else line.style.translate = shift ? px(shift) : ""
      this.applied.set(line, shift)
    }
    for (const line of this.applied.keys()) if (!line.isConnected) this.applied.delete(line)
  }

  /** Move the target; false when it did not change. */
  setTarget(target: number) {
    const next = clampLine(target, this.options.first, this.options.last)
    if (next === this.target) return false
    this.target = next
    this.sync()
    return true
  }

  /**
   * End the session. `animated`: the lines slide home (a cancel). Otherwise they drop their
   * displacement in the same frame, which is how a commit swaps the visual order for the real
   * one without a flash.
   */
  finish(animated: boolean) {
    if (this.done) return
    this.done = true
    cancelAnimationFrame(this.frame)
    const { root, element } = this.options
    if (active.get(root) === this) active.delete(root)
    element.removeAttribute("data-reorder-placeholder")
    element.removeAttribute("data-reorder-lifted")
    const lines = new Set([...this.applied.keys(), ...this.lines()])
    if (!animated) {
      root.setAttribute("data-reorder-settling", "")
      root.removeAttribute("data-reordering")
      for (const line of lines) line.style.translate = ""
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (!active.has(root)) root.removeAttribute("data-reorder-settling")
        })
      )
      return
    }
    for (const line of lines) line.style.translate = ""
    window.setTimeout(() => {
      if (!active.has(root)) root.removeAttribute("data-reordering")
    }, transitionMs(element))
  }
}

/* ── Pointer: drag the grip (mouse, touch and pen) ─────────────────────────────────── */

/** Pixels the pointer moves before a press on the grip becomes a drag. */
const DRAG_THRESHOLD = 4

/** The nearest element that scrolls vertically: the table's own body, else an ancestor. */
export function scrollParent(from: HTMLElement): HTMLElement {
  for (let node: HTMLElement | null = from; node; node = node.parentElement) {
    if (node === document.body || node === document.documentElement) break
    const { overflowY } = getComputedStyle(node)
    if (/(auto|scroll|overlay)/.test(overflowY) && node.scrollHeight > node.clientHeight + 1) return node
  }
  return (document.scrollingElement as HTMLElement | null) ?? document.documentElement
}

/** The visible band of a scroller in client coordinates (the viewport for the page). */
function viewOf(scroller: HTMLElement) {
  const isPage = scroller === document.scrollingElement || scroller === document.documentElement
  if (isPage) return { top: 0, bottom: window.innerHeight }
  const rect = scroller.getBoundingClientRect()
  return { top: rect.top, bottom: rect.top + scroller.clientHeight }
}

/** A visual copy of the row: inert, unlabelled, outside every query. */
function copyLine(element: HTMLElement) {
  const copy = element.cloneNode(true) as HTMLElement
  for (const node of [copy, ...copy.querySelectorAll<HTMLElement>("*")]) {
    node.removeAttribute("id")
    node.removeAttribute("data-index")
    node.removeAttribute("data-item")
    node.removeAttribute("data-row-id")
    node.removeAttribute("aria-describedby")
  }
  copy.removeAttribute("aria-rowindex")
  copy.removeAttribute("role")
  copy.removeAttribute("tabindex")
  copy.removeAttribute("data-flash")
  copy.removeAttribute("data-reorder-placeholder")
  copy.removeAttribute("data-reorder-failed")
  copy.setAttribute("aria-hidden", "true")
  copy.setAttribute("inert", "")
  copy.classList.add("fa-dt-ghost")
  copy.style.translate = ""
  copy.style.transition = ""
  copy.style.transform = "none"
  return copy
}

/** The table's own variables a row reads, carried onto the preview outside the table. */
const CARRIED = ["--_row-h", "--_cell-px", "--_grip-h", "--_sticky-base", "--fa-dt-select-w", "--fa-dt-grip-w", "--fa-dt-lead-w", "--fa-dt-trail-w", "--fa-dt-detail-h"]
const INHERITED = ["color", "font-family", "font-size", "font-weight", "line-height", "letter-spacing", "direction"]

/** The part of the scroller the rows show through, in client coordinates. */
function bandOf(scroller: HTMLElement) {
  const rect = scroller.getBoundingClientRect()
  return { left: rect.left + scroller.clientLeft, width: scroller.clientWidth }
}

/**
 * The drag preview, shared with DragDropProvider: `.fa-dnd-ghost` in the top layer, which only
 * moves, and `.fa-dnd-lift` inside it, which scales and casts the shadow. Inside that, a bare
 * copy of the table's frame (its states and variables, none of its chrome) holds a copy of the
 * row, clipped to the part of the table that is in view and scrolled sideways like it, so
 * pinned columns stay where they were.
 */
function makePreview(element: HTMLElement, root: HTMLElement, container: HTMLElement, scroller: HTMLElement, grab: { x: number; y: number }) {
  const rect = element.getBoundingClientRect()
  const band = bandOf(scroller)
  const ghost = document.createElement("div")
  ghost.className = "fa-dnd-ghost fa-dt-preview"
  ghost.setAttribute("aria-hidden", "true")
  ghost.setAttribute("inert", "")
  ghost.dataset.input = "pointer"
  ghost.dataset.layout = container.classList.contains("fa-dt-cards") ? "cards" : "rows"
  ghost.style.width = `${band.width}px`
  ghost.style.height = `${rect.height}px`
  const lift = document.createElement("div")
  lift.className = "fa-dnd-lift"
  lift.style.transformOrigin = `${grab.x}px ${grab.y}px`
  lift.style.borderRadius = getComputedStyle(element).borderRadius
  const frame = document.createElement("div")
  frame.className = "fa-dt fa-dt-preview-frame"
  for (const { name, value } of root.attributes)
    // Its states (data-reorderable and the rest), not the gesture's (data-reordering, …).
    if (name.startsWith("data-") && !/^data-reorder(ing|-)/.test(name)) frame.setAttribute(name, value)
  frame.style.cssText = root.style.cssText
  const rootStyle = getComputedStyle(root)
  for (const name of [...CARRIED, ...INHERITED]) {
    const value = rootStyle.getPropertyValue(name)
    if (value) frame.style.setProperty(name, value)
  }
  const lines = document.createElement("div")
  lines.className = container.className
  lines.style.width = `${container.offsetWidth}px`
  // Where the lines start in the scroller's content (its padding, the table's insets).
  lines.style.marginInlineStart = `${container.getBoundingClientRect().left + scroller.scrollLeft - band.left}px`
  const copy = copyLine(element)
  copy.style.height = `${rect.height}px`
  lines.append(copy)
  frame.append(lines)
  lift.append(frame)
  ghost.append(lift)
  adoptTheme(ghost, element)
  raise(ghost, root)
  // Scrolled like the table (after mounting: only a laid-out box scrolls).
  frame.scrollLeft = scroller.scrollLeft
  return ghost
}

export interface PointerReorder {
  /** Stop now without committing (unmount, rows replaced). */
  cancel: () => void
}

export interface PointerReorderOptions extends Omit<ReorderSessionOptions, "mode"> {
  handle: HTMLElement
  /** The table's scroller: auto-scroll starts here and walks up to a scrolling ancestor. */
  scroller: HTMLElement
  /** The drag began (past the threshold). */
  onStart: () => void
  /** The target line changed. */
  onTarget: (target: number) => void
  /** Released over `target` (after the ghost settled; `from` when it did not move). Commit synchronously. */
  onDrop: (target: number) => void
  /** Escape, pointercancel or `cancel()`. */
  onCancel: () => void
}

/**
 * Start a pointer drag on a grip. Nothing happens until the pointer moves past a small
 * threshold, so a tap still focuses the grip. While dragging, the ghost follows the pointer
 * vertically, the lines part around the target, and the body auto-scrolls near its edges.
 */
export function startPointerReorder(event: PointerEvent, options: PointerReorderOptions): PointerReorder | null {
  if (event.pointerType === "mouse" && event.button !== 0) return null
  const { handle, container, element, measure, first, last, from } = options
  const startX = event.clientX
  const startY = event.clientY
  const pointerId = event.pointerId
  let lastY = startY
  let session: ReorderSession | null = null
  let ghost: HTMLElement | null = null
  let shield: HTMLElement | null = null
  let grab = 0
  let settling = false
  let scroller: HTMLElement | null = null

  try {
    handle.setPointerCapture(pointerId)
  } catch {
    // Synthetic events in tests have no active pointer.
  }

  const own = measure(from)
  const minTop = measure(first).start
  const lastBox = measure(last)
  const maxTop = lastBox.start + lastBox.size - own.size

  const place = () => {
    if (!session || !ghost || settling) return
    const top = container.getBoundingClientRect().top
    // Within the lines' range, and within the visible body so it waits at an edge while the
    // body auto-scrolls.
    let low = minTop
    let high = maxTop
    if (scroller) {
      const view = viewOf(scroller)
      low = Math.max(low, Math.min(view.top - top, high))
      high = Math.max(low, Math.min(high, view.bottom - top - own.size))
    }
    const y = Math.min(Math.max(lastY - top - grab, low), high)
    moveGhost(ghost, top + y)
    if (session.setTarget(targetFor(y + own.size / 2, from, first, last, measure))) options.onTarget(session.target)
  }

  const autoScroll = () => {
    if (!scroller) return
    const rect = viewOf(scroller)
    const zone = Math.min(own.size * 1.5, (rect.bottom - rect.top) / 4)
    const max = Math.max(6, own.size * 0.5)
    let speed = 0
    // Only towards an edge the pointer has moved to: picking up a row that already sits in an
    // edge zone does not start scrolling.
    if (lastY < rect.top + zone && lastY < startY) speed = -max * Math.min(1, (rect.top + zone - lastY) / zone) ** 2
    else if (lastY > rect.bottom - zone && lastY > startY) speed = max * Math.min(1, (lastY - (rect.bottom - zone)) / zone) ** 2
    const scrolling = Math.abs(speed) >= 0.5
    // While the body runs past, lines take their places at once instead of easing.
    if (scrolling !== options.root.hasAttribute("data-reorder-scrolling"))
      options.root.toggleAttribute("data-reorder-scrolling", scrolling)
    if (scrolling) scroller.scrollTop += Math.round(speed)
  }

  /** The preview's place on screen: level with the table's rows, `top` from the viewport. */
  const moveGhost = (copy: HTMLElement, top: number) => {
    copy.style.transform = `translate(${bandOf(options.scroller).left}px, ${Math.round(top * 100) / 100}px)`
  }

  const begin = () => {
    const rect = element.getBoundingClientRect()
    grab = startY - rect.top
    // The shield goes up first so the preview stacks above it in the top layer.
    shield = makeShield(options.root)
    ghost = makePreview(element, options.root, container, options.scroller, { x: startX - bandOf(options.scroller).left, y: grab })
    session = new ReorderSession({ ...options, mode: "pointer" })
    scroller = scrollParent(options.scroller)
    place()
    // Lift on the next frame so the shadow fades in from the row's resting state.
    requestAnimationFrame(() => ghost?.setAttribute("data-lifted", ""))
    session.every(() => {
      autoScroll()
      place()
    })
    options.onStart()
  }

  const detach = () => {
    options.root.removeAttribute("data-reorder-scrolling")
    handle.removeEventListener("pointermove", move)
    handle.removeEventListener("pointerup", up)
    handle.removeEventListener("pointercancel", cancelled)
    handle.removeEventListener("lostpointercapture", cancelled)
    window.removeEventListener("keydown", escape, true)
    shield?.remove()
    shield = null
    try {
      if (handle.hasPointerCapture(pointerId)) handle.releasePointerCapture(pointerId)
    } catch {
      // Already released.
    }
  }

  /** Fly the ghost to a line's slot, then run `then`. */
  const settle = (target: number, then: () => void) => {
    const current = session
    const copy = ghost
    if (!current || !copy) return then()
    settling = true
    copy.setAttribute("data-settling", "")
    copy.removeAttribute("data-lifted")
    moveGhost(copy, container.getBoundingClientRect().top + current.slot(target))
    window.setTimeout(then, transitionMs(copy))
  }

  const drop = () => {
    detach()
    const current = session
    if (!current) return
    const target = current.target
    settle(target, () => {
      options.onDrop(target)
      current.finish(false)
      ghost?.remove()
    })
  }

  const abort = (animated: boolean) => {
    detach()
    const current = session
    if (!current) return
    if (!animated) {
      current.finish(false)
      ghost?.remove()
      options.onCancel()
      return
    }
    current.setTarget(from)
    settle(from, () => {
      current.finish(false)
      ghost?.remove()
    })
    options.onCancel()
  }

  function move(next: PointerEvent) {
    if (next.pointerId !== pointerId) return
    lastY = next.clientY
    if (!session) {
      if (Math.abs(next.clientY - startY) < DRAG_THRESHOLD && Math.abs(next.clientX - startX) < DRAG_THRESHOLD) return
      begin()
    }
    next.preventDefault()
    place()
  }
  function up(next: PointerEvent) {
    if (next.pointerId === pointerId) drop()
  }
  function cancelled(next: PointerEvent) {
    if (next.pointerId === pointerId && !settling) abort(true)
  }
  function escape(key: KeyboardEvent) {
    if (key.key !== "Escape" || !session) return
    key.preventDefault()
    key.stopPropagation()
    abort(true)
  }

  handle.addEventListener("pointermove", move)
  handle.addEventListener("pointerup", up)
  handle.addEventListener("pointercancel", cancelled)
  handle.addEventListener("lostpointercapture", cancelled)
  window.addEventListener("keydown", escape, true)

  return {
    cancel: () => {
      if (!settling) abort(false)
    },
  }
}

/* ── Keyboard: keep the landing slot in view ───────────────────────────────────────── */

/** Scroll so `start`…`start + size` (px in the container) is visible in the scroller. */
export function revealSlot(container: HTMLElement, from: HTMLElement, start: number, size: number) {
  const scroller = scrollParent(from)
  const view = viewOf(scroller)
  const top = container.getBoundingClientRect().top + start
  const bottom = top + size
  if (top < view.top) scroller.scrollTop -= view.top - top
  else if (bottom > view.bottom) scroller.scrollTop += bottom - view.bottom
}
