/**
 * The drag and drop engine behind DragDropProvider: registries of draggables and zones, one
 * session at a time, pointer and keyboard input, hit-testing, the preview ("ghost"), sortable
 * zones that part and close up, auto-scroll, announcements and the lifecycle events.
 *
 * Nothing renders while a gesture runs (R18.5): the preview moves with `transform`, items move
 * with `translate` animations written straight onto their elements, and zone and item states
 * are data attributes. React hears about discrete changes only (a lift, a zone's status, the
 * end). The host's data changes once, on drop, inside `flushSync`; the items then animate from
 * where they were drawn to where they now lay out, so a refused drop slides back on its own.
 */
import type { ReactNode } from "react"
import { flushSync } from "react-dom"
import { feedbackHold, motionScale, tokenDuration } from "../../lib/motion.js"
import { arrange, gridColumns, insertionIndex, keyboardStep, type Box, type DropZoneSort, type Shift } from "./layout.js"
import type {
  AnnouncedPlace,
  DragCancelEvent,
  DragCancelReason,
  DragDropAnnouncements,
  DragDropCallbacks,
  DragEffect,
  DragEndEvent,
  DragInfo,
  DragInput,
  DragItem,
  DragOverEvent,
  DragPosition,
  DraggableOptions,
  DropAccept,
  DropEvent,
  DropZoneOptions,
  DropZoneState,
  DropZoneStatus,
} from "./types.js"

/**
 * Reject a drop's promise with a DropError to show its message over the zone and announce it
 * ("List is full"). Other rejections show a generic failure.
 */
export class DropError extends Error {
  constructor(reason: string) {
    super(reason)
    this.name = "DropError"
  }
}

/** A registered draggable: options from the latest render and its elements. */
export interface DraggableRecord {
  id: string
  options: DraggableOptions<unknown>
  /** The nearest enclosing zone. */
  zoneId: string | null
  element: HTMLElement | null
  handle: HTMLElement | null
  /** The handle is a dedicated grip, so a touch drag starts without a long press. */
  grip: boolean
  dragging: boolean
  listeners: Set<() => void>
}

/** A registered drop zone. */
export interface ZoneRecord {
  id: string
  options: DropZoneOptions<unknown>
  element: HTMLElement | null
  state: DropZoneState
  /** The same state without the index, so most subscribers re-render only when the status changes. */
  summary: DropZoneState
  listeners: Set<() => void>
}

/** The drag being shown, for previews and `useActiveDrag`. */
export interface ActiveDrag {
  info: DragInfo
  /** The host's preview content and the element it renders into. */
  preview: ReactNode | null
  previewHost: HTMLElement | null
}

interface Verdict {
  status: Exclude<DropZoneStatus, "idle" | "pending">
  reason: string | null
  /** Refused for its type: the zone is transparent to hit-testing. */
  typeBlocked: boolean
}

interface ZoneLayout {
  zone: ZoneRecord
  sort: DropZoneSort
  items: DraggableRecord[]
  elements: HTMLElement[]
  boxes: Box[]
  removed: number | null
  insert: number | null
  gap: number
  rowGap: number
  origin: { x: number; y: number }
  rtl: boolean
  slot: Box | null
  applied: Map<HTMLElement, Shift>
  animations: Map<HTMLElement, Animation>
}

interface Session {
  record: DraggableRecord
  item: DragItem
  info: DragInfo
  input: DragInput
  effect: DragEffect
  source: DragPosition
  element: HTMLElement
  size: { w: number; h: number }
  grab: { x: number; y: number }
  pointer: { x: number; y: number }
  start: { x: number; y: number }
  ghost: HTMLElement
  layouts: Map<string, ZoneLayout>
  verdicts: Map<string, Verdict>
  over: ZoneRecord | null
  index: number | null
  /** Sending the item home: the source zone opens its gap whatever its verdict. */
  returning: boolean
  ending: boolean
  dirty: Set<string>
  frame: number
  duration: number
  easing: string
  cleanup: Array<() => void>
  scrollers: { from: Element | null; chain: HTMLElement[] }
}

interface Pending {
  record: DraggableRecord
  pointerId: number
  start: { x: number; y: number }
  last: { x: number; y: number }
  longPress: boolean
  timer: number
  cleanup: () => void
}

const ZERO: Shift = { x: 0, y: 0 }
/** Pixels a mouse or pen moves before a press becomes a drag. */
const THRESHOLD = 4
/** How long a touch holds still on an item before it lifts (ms). */
const LONG_PRESS = 260
/** How far a touch may wander while it holds (px). */
const TOUCH_SLOP = 8
/** The band along a scroller's edge that scrolls it (px), and the top speed (px per frame). */
const EDGE = 48
const MAX_SPEED = 18
/** Elements inside a draggable that keep their own pointer behaviour. */
const INTERACTIVE = "button, a[href], input, select, textarea, label, [contenteditable]:not([contenteditable='false']), [data-dnd-ignore]"

const cleanReason = (reason: string | null | undefined) => (reason ? reason.replace(/[.\s]+$/, "") : "")
const pos = (place: AnnouncedPlace) => (place.position !== null && place.count !== null ? `, position ${place.position} of ${place.count}` : "")

/** The default English messages. */
export const DEFAULT_ANNOUNCEMENTS: DragDropAnnouncements = {
  lifted: (item, place, input) =>
    `Lifted ${item.label}${place.zone ? ` in ${place.zone}${pos(place)}` : ""}.${input === "keyboard" ? " Arrow keys move it, Space or Enter drops it, Escape cancels." : ""}`,
  moved: (item, place, blocked) =>
    blocked !== null ? `${place.zone ?? "Here"}: ${cleanReason(blocked) || `${item.label} cannot be dropped here`}.` : place.zone ? `${place.zone}${pos(place)}.` : "Not over a drop area.",
  dropped: (item, place) => `Dropped ${item.label}${place.zone ? ` in ${place.zone}${pos(place)}` : ""}.`,
  cancelled: (item, place) => `Move cancelled. ${item.label} returned${place.zone ? ` to ${place.zone}${pos(place)}` : ""}.`,
  blocked: (item, zone, reason) => `${item.label} cannot be dropped in ${zone}${reason ? `: ${cleanReason(reason)}` : ""}.`,
  failed: (item, zone, reason) => `${item.label} could not be dropped in ${zone}${reason ? `: ${cleanReason(reason)}` : ""}.`,
}

/** Instructions read with every handle (aria-describedby). */
export const DRAG_INSTRUCTIONS = "Press Space or Enter to lift. Arrow keys move, Space or Enter drops, Escape cancels."

function accepts(accept: DropAccept | undefined, item: DragItem) {
  if (accept === undefined) return true
  if (typeof accept === "function") return accept(item)
  if (typeof accept === "string") return accept === item.type
  return accept.includes(item.type)
}

const domOrder = (a: Element, b: Element) => (a === b ? 0 : a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1)
const px = (value: number) => `${Math.round(value * 100) / 100}px`
const translateValue = (shift: Shift) => `${px(shift.x)} ${px(shift.y)}`

function parseTranslate(value: string): Shift | null {
  if (!value || value === "none") return ZERO
  const [x, y] = value.split(/\s+/).map((part) => Number.parseFloat(part))
  if (x === undefined || !Number.isFinite(x)) return null
  return { x, y: y !== undefined && Number.isFinite(y) ? y : 0 }
}

/** The longest transition on an element (ms), with a frame of slack. */
function transitionMs(element: Element) {
  const style = getComputedStyle(element)
  const parse = (list: string) => list.split(",").map((part) => Number.parseFloat(part) * (part.trim().endsWith("ms") ? 1 : 1000) || 0)
  const durations = parse(style.transitionDuration)
  const delays = parse(style.transitionDelay)
  return Math.max(0, ...durations.map((duration, index) => duration + (delays[index] ?? 0))) + 20
}

const isScroller = (node: HTMLElement, axis: "x" | "y") => {
  const style = getComputedStyle(node)
  const overflow = axis === "y" ? style.overflowY : style.overflowX
  return /(auto|scroll|overlay)/.test(overflow) && (axis === "y" ? node.scrollHeight > node.clientHeight + 1 : node.scrollWidth > node.clientWidth + 1)
}

/** A copy of the element that follows the pointer: inert, unlabelled, outside every query. */
function makeGhost(element: HTMLElement, rect: DOMRect, custom: boolean, input: DragInput) {
  const ghost = document.createElement("div")
  ghost.className = "fa-dnd-ghost"
  ghost.setAttribute("aria-hidden", "true")
  ghost.setAttribute("inert", "")
  ghost.dataset.input = input
  const style = getComputedStyle(element)
  let host: HTMLElement | null = null
  if (custom) {
    host = document.createElement("div")
    host.className = "fa-dnd-preview"
    ghost.append(host)
  } else {
    ghost.style.width = px(rect.width)
    ghost.style.height = px(rect.height)
    ghost.style.borderRadius = style.borderRadius
    const clone = element.cloneNode(true) as HTMLElement
    for (const node of [clone, ...clone.querySelectorAll<HTMLElement>("*")]) {
      node.removeAttribute("id")
      node.removeAttribute("tabindex")
      node.removeAttribute("aria-describedby")
      node.removeAttribute("aria-labelledby")
      for (const name of ["data-dnd-item", "data-dnd-zone", "data-dnd-handle", "data-dnd-source", "data-drop-state", "data-drop-over", "data-drop-reason", "data-dnd-receiving"]) node.removeAttribute(name)
    }
    clone.removeAttribute("role")
    // Inherited text styles come from ancestors the copy no longer has.
    for (const name of ["color", "font-family", "font-size", "font-weight", "font-style", "line-height", "letter-spacing", "text-align", "direction"])
      clone.style.setProperty(name, style.getPropertyValue(name))
    clone.style.width = px(rect.width)
    clone.style.height = px(rect.height)
    clone.style.margin = "0"
    clone.style.boxSizing = "border-box"
    clone.style.translate = "none"
    clone.style.opacity = "1"
    clone.classList.add("fa-dnd-ghost-copy")
    ghost.append(clone)
  }
  document.body.append(ghost)
  return { ghost, host }
}

/** Owns every draggable and drop zone under one DragDropProvider. */
export class DragDropManager {
  /** The provider's callbacks (latest render). */
  callbacks: DragDropCallbacks = {}
  /** Messages for the live region. */
  announcements: DragDropAnnouncements = DEFAULT_ANNOUNCEMENTS
  /** The provider's polite live region. */
  announcer: HTMLElement | null = null
  /** Scroll containers and the page near their edges during a pointer drag. */
  autoScroll = true
  /** The drag being shown, for previews and `useActiveDrag`. */
  active: ActiveDrag | null = null

  private monitors = new Set<DragDropCallbacks>()
  private activeListeners = new Set<() => void>()
  private draggables = new Map<string, DraggableRecord>()
  private zones = new Map<string, ZoneRecord>()
  private zoneByElement = new WeakMap<Element, ZoneRecord>()
  private session: Session | null = null
  private pending: Pending | null = null
  private flips = new Set<Animation>()
  private timers = new Set<number>()
  private lastAnnouncement = ""

  /* ── Registries ─────────────────────────────────────────────────────────────────── */

  /** Create a draggable record (the hook keeps one per component). */
  createDraggable(id: string, options: DraggableOptions<unknown>, zoneId: string | null): DraggableRecord {
    return { id, options, zoneId, element: null, handle: null, grip: false, dragging: false, listeners: new Set() }
  }

  /** Create a zone record (the hook keeps one per component). */
  createZone(id: string, options: DropZoneOptions<unknown>): ZoneRecord {
    const state: DropZoneState = { status: "idle", over: false, reason: null, item: null, index: null }
    return { id, options, element: null, state, summary: state, listeners: new Set() }
  }

  registerDraggable(record: DraggableRecord) {
    this.draggables.set(record.id, record)
    this.markDirty(record.zoneId)
    return () => {
      if (this.draggables.get(record.id) === record) this.draggables.delete(record.id)
      this.markDirty(record.zoneId)
    }
  }

  /** Connect a draggable's elements; returns the cleanup. */
  attachDraggable(record: DraggableRecord, element: HTMLElement | null, handle: HTMLElement | null, grip: boolean) {
    record.element = element
    record.handle = handle ?? element
    record.grip = grip && handle !== null
    this.markDirty(record.zoneId)
    const target = record.handle
    if (!target) return () => {}
    const down = (event: PointerEvent) => this.pointerDown(record, event)
    const key = (event: KeyboardEvent) => this.keyDown(record, event)
    const blur = () => {
      const session = this.session
      if (session && session.record === record && session.input === "keyboard" && !session.ending) this.cancel("escape")
    }
    // Images and links inside the handle would start the browser's own drag, which cancels ours.
    const native = (event: DragEvent) => event.preventDefault()
    target.addEventListener("pointerdown", down)
    target.addEventListener("keydown", key)
    target.addEventListener("blur", blur)
    target.addEventListener("dragstart", native)
    return () => {
      target.removeEventListener("dragstart", native)
      target.removeEventListener("pointerdown", down)
      target.removeEventListener("keydown", key)
      target.removeEventListener("blur", blur)
      if (record.element === element) record.element = null
      if (record.handle === target) record.handle = null
    }
  }

  /** The record's options or zone changed. */
  draggableChanged(record: DraggableRecord, zoneId: string | null) {
    if (record.zoneId === zoneId) return
    this.markDirty(record.zoneId)
    record.zoneId = zoneId
    this.markDirty(zoneId)
  }

  registerZone(zone: ZoneRecord) {
    this.zones.set(zone.id, zone)
    const session = this.session
    if (session && !session.ending) {
      this.evaluate(zone)
      this.markDirty(zone.id)
    }
    return () => {
      if (this.zones.get(zone.id) === zone) this.zones.delete(zone.id)
      const current = this.session
      if (current) {
        current.layouts.delete(zone.id)
        if (current.over === zone) this.setTarget(null, null)
      }
    }
  }

  /** Connect a zone's element; returns the cleanup. */
  attachZone(zone: ZoneRecord, element: HTMLElement | null) {
    zone.element = element
    if (!element) return () => {}
    this.zoneByElement.set(element, zone)
    element.setAttribute("data-dnd-zone", "")
    this.writeZone(zone)
    this.markDirty(zone.id)
    return () => {
      this.zoneByElement.delete(element)
      if (zone.element === element) zone.element = null
    }
  }

  /** A zone re-rendered during a drag: its verdict may have changed (reactive states). */
  zoneChanged(zone: ZoneRecord) {
    const session = this.session
    if (!session || session.ending || this.zones.get(zone.id) !== zone) return
    const before = session.verdicts.get(zone.id)
    const after = this.evaluate(zone)
    if (before && before.status === after.status && before.reason === after.reason) return
    if (session.over === zone) {
      this.applyLayouts()
      this.updateCursor()
      this.emitOver(zone, session.index, zone, session.index)
    }
  }

  subscribeZone(zone: ZoneRecord, listener: () => void) {
    zone.listeners.add(listener)
    return () => {
      zone.listeners.delete(listener)
    }
  }

  subscribeDraggable(record: DraggableRecord, listener: () => void) {
    record.listeners.add(listener)
    return () => {
      record.listeners.delete(listener)
    }
  }

  /** Listen to every lifecycle event under the provider. */
  monitor(callbacks: DragDropCallbacks) {
    this.monitors.add(callbacks)
    return () => {
      this.monitors.delete(callbacks)
    }
  }

  subscribeActive = (listener: () => void) => {
    this.activeListeners.add(listener)
    return () => {
      this.activeListeners.delete(listener)
    }
  }

  getActive = () => this.active

  /** Stop everything now (the provider unmounted). */
  destroy() {
    this.abandonPending()
    if (this.session) this.cancel("interrupted", false)
    for (const timer of this.timers) window.clearTimeout(timer)
    this.timers.clear()
  }

  /* ── Events and announcements ───────────────────────────────────────────────────── */

  private emit<K extends keyof DragDropCallbacks>(name: K, event: Parameters<NonNullable<DragDropCallbacks[K]>>[0]) {
    const call = (callbacks: DragDropCallbacks) => (callbacks[name] as ((value: typeof event) => void) | undefined)?.(event)
    call(this.callbacks)
    for (const monitor of this.monitors) call(monitor)
  }

  private announce(text: string) {
    const region = this.announcer
    if (!region || !text) return
    // The same message twice in a row is still read.
    const next = text === this.lastAnnouncement ? `${text} ` : text
    this.lastAnnouncement = next
    region.textContent = next
  }

  private place(zone: ZoneRecord | null, index: number | null): AnnouncedPlace {
    const session = this.session
    if (!zone) return { zone: null, position: null, count: null }
    const layout = session?.layouts.get(zone.id)
    if (!layout || index === null) return { zone: zone.options.label, position: null, count: null }
    const remaining = layout.items.length - (layout.removed === null ? 0 : 1)
    return { zone: zone.options.label, position: index + 1, count: remaining + 1 }
  }

  private later(callback: () => void, ms: number) {
    const timer = window.setTimeout(() => {
      this.timers.delete(timer)
      callback()
    }, ms)
    this.timers.add(timer)
  }

  /* ── Zone state ─────────────────────────────────────────────────────────────────── */

  private setZoneState(zone: ZoneRecord, patch: Partial<DropZoneState>) {
    const next = { ...zone.state, ...patch }
    const previous = zone.state
    if (next.status === previous.status && next.over === previous.over && next.reason === previous.reason && next.item === previous.item && next.index === previous.index) return
    zone.state = next
    const summary = zone.summary
    if (next.status !== summary.status || next.over !== summary.over || next.reason !== summary.reason || next.item !== summary.item) zone.summary = { ...next, index: null }
    this.writeZone(zone)
    for (const listener of zone.listeners) listener()
  }

  private writeZone(zone: ZoneRecord) {
    const element = zone.element
    if (!element) return
    const { status, over, reason } = zone.state
    element.setAttribute("data-drop-state", status)
    element.toggleAttribute("data-drop-over", over)
    if (reason && (status === "error" || status === "disabled")) element.setAttribute("data-drop-reason", reason)
    else element.removeAttribute("data-drop-reason")
    if (status === "pending") element.setAttribute("aria-busy", "true")
    else element.removeAttribute("aria-busy")
  }

  private verdictFor(zone: ZoneRecord, index: number | null): Verdict {
    const session = this.session as Session
    const options = zone.options
    if (zone.id !== session.source.zoneId && !accepts(options.accept, session.item)) return { status: "disabled", reason: null, typeBlocked: true }
    if (options.disabled) return { status: "disabled", reason: typeof options.disabled === "string" ? options.disabled : null, typeBlocked: false }
    const result = options.validate ? options.validate(session.info, { index }) : true
    if (result === true) return { status: "ready", reason: null, typeBlocked: false }
    if (result === false) return { status: "disabled", reason: null, typeBlocked: false }
    return { status: result.status, reason: result.reason ?? null, typeBlocked: false }
  }

  /** Re-evaluate a zone for the current drag and publish its state. */
  private evaluate(zone: ZoneRecord) {
    const session = this.session as Session
    const over = session.over === zone
    const verdict = this.verdictFor(zone, over ? session.index : null)
    session.verdicts.set(zone.id, verdict)
    this.setZoneState(zone, { status: verdict.status, reason: verdict.reason, over, item: session.item, index: over ? session.index : null })
    return verdict
  }

  private updateCursor() {
    const session = this.session
    if (!session) return
    const over = session.over
    const verdict = over ? session.verdicts.get(over.id) : undefined
    const blocked = over !== null && verdict?.status !== "ready"
    document.documentElement.setAttribute("data-dnd", blocked ? "blocked" : "dragging")
    // The reason travels with the item, where the person is looking.
    const ghost = session.ghost
    if (blocked && verdict?.reason) {
      ghost.setAttribute("data-reason", verdict.reason)
      ghost.setAttribute("data-status", verdict.status)
    } else {
      ghost.removeAttribute("data-reason")
      ghost.removeAttribute("data-status")
    }
  }

  /* ── Measuring and arranging sortable zones ─────────────────────────────────────── */

  private markDirty(zoneId: string | null) {
    const session = this.session
    if (session && zoneId !== null && !session.ending) session.dirty.add(zoneId)
  }

  private zoneOrigin(element: HTMLElement) {
    const rect = element.getBoundingClientRect()
    return { x: rect.left + element.clientLeft - element.scrollLeft, y: rect.top + element.clientTop - element.scrollTop }
  }

  private measure(zone: ZoneRecord): ZoneLayout | null {
    const session = this.session as Session
    const sort = zone.options.sort
    const element = zone.element
    if (!sort || !element) return null
    const items = [...this.draggables.values()]
      .filter((record) => record.zoneId === zone.id && record.element?.isConnected)
      .sort((a, b) => domOrder(a.element as HTMLElement, b.element as HTMLElement))
    const elements = items.map((record) => record.element as HTMLElement)
    const origin = this.zoneOrigin(element)
    const boxes = elements.map((item) => {
      const rect = item.getBoundingClientRect()
      return { x: rect.left - origin.x, y: rect.top - origin.y, w: rect.width, h: rect.height }
    })
    const style = getComputedStyle(element)
    const rtl = style.direction === "rtl"
    const rowGap = Number.parseFloat(style.rowGap) || 0
    let gap = sort === "vertical" ? rowGap : Number.parseFloat(style.columnGap) || 0
    if (sort !== "grid" && boxes.length >= 2) {
      const [a, b] = boxes as [Box, Box]
      const measured = sort === "vertical" ? b.y - (a.y + a.h) : rtl ? a.x - (b.x + b.w) : b.x - (a.x + a.w)
      if (Number.isFinite(measured)) gap = Math.max(0, measured)
    }
    const padStart = Number.parseFloat(style.paddingLeft) || 0
    const padEnd = Number.parseFloat(style.paddingRight) || 0
    const removedAt = items.findIndex((record) => record.id === session.item.id)
    return {
      zone,
      sort,
      items,
      elements,
      boxes,
      removed: session.effect === "move" && removedAt >= 0 ? removedAt : null,
      insert: null,
      gap,
      rowGap,
      origin: { x: rtl && sort === "horizontal" ? element.clientWidth - padEnd : padStart, y: Number.parseFloat(style.paddingTop) || 0 },
      rtl,
      slot: null,
      applied: new Map(),
      animations: new Map(),
    }
  }

  private shift(layout: ZoneLayout, element: HTMLElement, shift: Shift, instant: boolean) {
    const session = this.session as Session
    const previous = layout.applied.get(element) ?? ZERO
    if (previous.x === shift.x && previous.y === shift.y) return
    layout.applied.set(element, shift)
    if (typeof element.animate !== "function") {
      element.style.translate = shift.x || shift.y ? translateValue(shift) : ""
      return
    }
    let from = previous
    const running = layout.animations.get(element)
    if (running) {
      from = parseTranslate(getComputedStyle(element).translate) ?? previous
      running.cancel()
    }
    const animation = element.animate([{ translate: translateValue(from) }, { translate: translateValue(shift) }], {
      duration: instant ? 0 : session.duration,
      easing: session.easing,
      fill: "forwards",
    })
    layout.animations.set(element, animation)
  }

  private resetLayout(layout: ZoneLayout) {
    for (const animation of layout.animations.values()) animation.cancel()
    layout.animations.clear()
    for (const element of layout.applied.keys()) element.style.removeProperty("translate")
    layout.applied.clear()
    const element = layout.zone.element
    if (element) {
      element.removeAttribute("data-dnd-receiving")
      element.style.removeProperty("--_dnd-space-block")
      element.style.removeProperty("--_dnd-space-inline")
    }
  }

  /** Arrange every sortable zone for the current target. */
  private applyLayouts(instant = false) {
    const session = this.session as Session
    for (const layout of session.layouts.values()) {
      const zone = layout.zone
      const isTarget = session.over === zone && session.index !== null
      const receiving = session.returning ? zone.id === session.source.zoneId : isTarget && session.verdicts.get(zone.id)?.status === "ready"
      const insert = receiving ? (session.returning ? session.source.index : session.index) : null
      const { shifts, slot } = arrange({ sort: layout.sort, boxes: layout.boxes, removed: layout.removed, insert, size: session.size, gap: layout.gap, rowGap: layout.rowGap, origin: layout.origin, rtl: layout.rtl })
      layout.insert = insert
      layout.slot = slot
      shifts.forEach((shift, index) => {
        const element = layout.elements[index]
        if (element) this.shift(layout, element, shift, instant)
      })
      // A zone that gains an item grows by one slot so the last item stays inside it.
      const element = zone.element
      if (!element) continue
      const grows = insert !== null && layout.removed === null
      element.toggleAttribute("data-dnd-receiving", grows)
      if (grows && slot) {
        if (layout.sort === "horizontal") {
          element.style.setProperty("--_dnd-space-inline", px(slot.w))
          element.style.removeProperty("--_dnd-space-block")
        } else {
          element.style.setProperty("--_dnd-space-block", px(slot.h))
          element.style.removeProperty("--_dnd-space-inline")
        }
      } else {
        element.style.removeProperty("--_dnd-space-block")
        element.style.removeProperty("--_dnd-space-inline")
      }
    }
  }

  private remeasureDirty() {
    const session = this.session as Session
    if (session.dirty.size === 0) return
    for (const id of session.dirty) {
      const zone = this.zones.get(id)
      const old = session.layouts.get(id)
      if (old) this.resetLayout(old)
      session.layouts.delete(id)
      if (!zone) continue
      if (!session.verdicts.has(id)) this.evaluate(zone)
      const layout = this.measure(zone)
      if (layout) session.layouts.set(id, layout)
    }
    session.dirty.clear()
    this.applyLayouts(true)
  }

  /** The landing slot of the current target in viewport px, or null. */
  private slotRect(zone: ZoneRecord | null): Box | null {
    const session = this.session as Session
    if (!zone?.element) return null
    const layout = session.layouts.get(zone.id)
    if (!layout?.slot) return null
    const origin = this.zoneOrigin(zone.element)
    return { x: origin.x + layout.slot.x, y: origin.y + layout.slot.y, w: layout.slot.w, h: layout.slot.h }
  }

  /* ── Targeting ──────────────────────────────────────────────────────────────────── */

  private setTarget(zone: ZoneRecord | null, index: number | null) {
    const session = this.session
    if (!session || session.ending) return false
    const previous = session.over
    const previousIndex = session.index
    if (zone === previous && index === previousIndex) return false
    session.over = zone
    session.index = index
    if (previous && previous !== zone && this.zones.get(previous.id) === previous) this.evaluate(previous)
    if (zone) this.evaluate(zone)
    this.applyLayouts()
    this.updateCursor()
    this.emitOver(previous, previousIndex, zone, index)
    return true
  }

  private emitOver(previous: ZoneRecord | null, previousIndex: number | null, zone: ZoneRecord | null, index: number | null) {
    const session = this.session as Session
    const verdict = zone ? session.verdicts.get(zone.id) : undefined
    const event: DragOverEvent = {
      ...session.info,
      target: { zoneId: zone?.id ?? null, index },
      previous: { zoneId: previous?.id ?? null, index: previousIndex },
      status: verdict?.status ?? null,
      reason: verdict?.reason ?? null,
    }
    if (previous && previous !== zone) previous.options.onDragLeave?.(event)
    if (zone && zone !== previous) zone.options.onDragEnter?.(event)
    else if (zone) zone.options.onDragOver?.(event)
    this.emit("onDragOver", event)
  }

  /** The zone under the pointer: the innermost one that takes this type, else the innermost one. */
  private hitZone(x: number, y: number) {
    const hit = document.elementFromPoint(x, y)
    const session = this.session as Session
    let fallback: ZoneRecord | null = null
    for (let node: Element | null = hit; node; node = node.parentElement) {
      const zone = this.zoneByElement.get(node)
      if (!zone || this.zones.get(zone.id) !== zone) continue
      fallback ??= zone
      if (!session.verdicts.get(zone.id)?.typeBlocked) return { zone, hit }
    }
    return { zone: fallback, hit }
  }

  private pointerTarget() {
    const session = this.session as Session
    const { x, y } = session.pointer
    const { zone, hit } = this.hitZone(x, y)
    let index: number | null = null
    const layout = zone ? session.layouts.get(zone.id) : undefined
    if (zone?.element && layout) {
      const origin = this.zoneOrigin(zone.element)
      const centre = { x: x - session.grab.x + session.size.w / 2 - origin.x, y: y - session.grab.y + session.size.h / 2 - origin.y }
      index = insertionIndex(layout.sort, layout.boxes, layout.removed, centre, { gap: layout.gap, rowGap: layout.rowGap, origin: layout.origin, size: session.size, rtl: layout.rtl })
    }
    const zoneChanged = zone !== session.over
    if (this.setTarget(zone, index) && zoneChanged) {
      const verdict = zone ? session.verdicts.get(zone.id) : undefined
      this.announce(this.announcements.moved(session.item, this.place(zone, index), verdict && verdict.status !== "ready" ? (verdict.reason ?? "") : null))
    }
    return hit
  }

  /* ── Auto-scroll ────────────────────────────────────────────────────────────────── */

  private autoScrollStep(hit: Element | null) {
    const session = this.session as Session
    if (!this.autoScroll) return
    if (session.scrollers.from !== hit) {
      const chain: HTMLElement[] = []
      for (let node = hit instanceof HTMLElement ? hit : (hit?.parentElement ?? null); node && node !== document.body && node !== document.documentElement; node = node.parentElement)
        if (isScroller(node, "y") || isScroller(node, "x")) chain.push(node)
      session.scrollers = { from: hit, chain }
    }
    const { x, y } = session.pointer
    const speed = (distance: number, band: number) => MAX_SPEED * Math.min(1, (band - distance) / band) ** 2
    const run = (rect: { top: number; bottom: number; left: number; right: number }, scroll: (dx: number, dy: number) => void, canX: boolean, canY: boolean) => {
      const bandY = Math.min(EDGE, (rect.bottom - rect.top) / 4)
      const bandX = Math.min(EDGE, (rect.right - rect.left) / 4)
      let dy = 0
      let dx = 0
      // Only towards an edge the pointer has moved to, so lifting near an edge does not scroll.
      if (canY && y < rect.top + bandY && y < session.start.y) dy = -speed(y - rect.top, bandY)
      else if (canY && y > rect.bottom - bandY && y > session.start.y) dy = speed(rect.bottom - y, bandY)
      if (canX && x < rect.left + bandX && x < session.start.x) dx = -speed(x - rect.left, bandX)
      else if (canX && x > rect.right - bandX && x > session.start.x) dx = speed(rect.right - x, bandX)
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return false
      scroll(Math.round(dx), Math.round(dy))
      return true
    }
    for (const node of session.scrollers.chain) {
      const rect = node.getBoundingClientRect()
      const before = node.scrollTop + node.scrollLeft
      if (run(rect, (dx, dy) => node.scrollBy(dx, dy), isScroller(node, "x"), isScroller(node, "y")) && node.scrollTop + node.scrollLeft !== before) return
    }
    const page = document.scrollingElement
    if (page) run({ top: 0, left: 0, bottom: window.innerHeight, right: window.innerWidth }, (dx, dy) => window.scrollBy(dx, dy), page.scrollWidth > window.innerWidth, page.scrollHeight > window.innerHeight)
  }

  /* ── The frame loop ─────────────────────────────────────────────────────────────── */

  private placeGhost() {
    const session = this.session as Session
    let x: number
    let y: number
    if (session.input === "pointer") {
      x = session.pointer.x - session.grab.x
      y = session.pointer.y - session.grab.y
    } else {
      const slot = this.slotRect(session.over)
      const zoneElement = session.over?.element
      if (slot) {
        x = slot.x
        y = slot.y
      } else if (zoneElement && session.over?.id !== session.source.zoneId) {
        const rect = zoneElement.getBoundingClientRect()
        x = rect.left + (rect.width - session.size.w) / 2
        y = rect.top + (rect.height - session.size.h) / 2
      } else {
        const rect = session.element.getBoundingClientRect()
        x = rect.left
        y = rect.top
      }
    }
    session.ghost.style.transform = `translate3d(${px(x)}, ${px(y)}, 0)`
  }

  private tick = () => {
    const session = this.session
    if (!session || session.ending) return
    this.remeasureDirty()
    if (session.input === "pointer") {
      const hit = this.pointerTarget()
      this.autoScrollStep(hit)
    }
    this.placeGhost()
    session.frame = requestAnimationFrame(this.tick)
  }

  /* ── Starting ───────────────────────────────────────────────────────────────────── */

  private start(record: DraggableRecord, input: DragInput, pointer: { x: number; y: number } | null) {
    const element = record.element
    if (this.session || !element?.isConnected) return false
    for (const animation of this.flips) animation.finish()
    this.flips.clear()
    const rect = element.getBoundingClientRect()
    const options = record.options
    const item: DragItem = { id: record.id, type: options.type ?? "item", data: options.data, label: options.label }
    const effect = options.effect ?? "move"
    const zone = record.zoneId !== null ? (this.zones.get(record.zoneId) ?? null) : null
    const custom = options.preview !== undefined && options.preview !== null
    const { ghost, host } = makeGhost(element, rect, custom, input)
    const root = document.documentElement
    const start = pointer ?? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    const session: Session = {
      record,
      item,
      info: { item, source: { zoneId: zone?.id ?? null, index: null }, input, effect },
      input,
      effect,
      source: { zoneId: zone?.id ?? null, index: null },
      element,
      size: { w: rect.width, h: rect.height },
      grab: { x: start.x - rect.left, y: start.y - rect.top },
      pointer: start,
      start,
      ghost,
      layouts: new Map(),
      verdicts: new Map(),
      over: null,
      index: null,
      returning: false,
      ending: false,
      dirty: new Set(),
      frame: 0,
      duration: tokenDuration("--duration-base", 200),
      easing: getComputedStyle(root).getPropertyValue("--ease-standard").trim() || "ease",
      cleanup: [],
      scrollers: { from: null, chain: [] },
    }
    this.session = session
    // Measure every sortable zone before anything moves.
    for (const candidate of this.zones.values()) {
      const layout = this.measure(candidate)
      if (layout) session.layouts.set(candidate.id, layout)
    }
    const sourceLayout = zone ? session.layouts.get(zone.id) : undefined
    const sourceIndex = sourceLayout ? sourceLayout.items.findIndex((entry) => entry.id === record.id) : -1
    session.source = { zoneId: zone?.id ?? null, index: sourceIndex >= 0 ? sourceIndex : null }
    session.info = { item, source: session.source, input, effect }
    session.over = zone
    session.index = session.source.index
    for (const candidate of this.zones.values()) this.evaluate(candidate)
    this.applyLayouts(true)

    element.setAttribute("data-dnd-source", effect)
    root.setAttribute("data-dnd", "dragging")
    root.setAttribute("data-dnd-input", input)
    window.getSelection()?.removeAllRanges()
    this.placeGhost()
    // Lift on the next frame so the shadow and scale ease in from the resting item.
    requestAnimationFrame(() => {
      if (this.session === session && !session.ending) ghost.setAttribute("data-lifted", "")
    })
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || this.session !== session || session.input !== "pointer") return
      event.preventDefault()
      event.stopPropagation()
      this.cancel("escape")
    }
    const blur = () => {
      if (this.session === session && !session.ending && session.input === "pointer") this.cancel("interrupted")
    }
    window.addEventListener("keydown", escape, true)
    window.addEventListener("blur", blur)
    session.cleanup.push(() => {
      window.removeEventListener("keydown", escape, true)
      window.removeEventListener("blur", blur)
    })

    record.dragging = true
    for (const listener of record.listeners) listener()
    this.active = { info: session.info, preview: custom ? options.preview : null, previewHost: host }
    for (const listener of this.activeListeners) listener()

    options.onDragStart?.(session.info)
    this.emit("onDragStart", session.info)
    this.announce(this.announcements.lifted(item, this.place(zone, session.index), input))
    session.frame = requestAnimationFrame(this.tick)
    return true
  }

  /* ── Pointer input ──────────────────────────────────────────────────────────────── */

  private pointerDown(record: DraggableRecord, event: PointerEvent) {
    if (this.session || this.pending) return
    if (event.pointerType === "mouse" && event.button !== 0) return
    if (!event.isPrimary || record.options.disabled) return
    const handle = record.handle
    if (!handle) return
    const target = event.target instanceof Element ? event.target : null
    const interactive = target?.closest(INTERACTIVE)
    if (interactive && interactive !== handle && handle.contains(interactive)) return
    const longPress = event.pointerType === "touch" && !record.grip
    const point = { x: event.clientX, y: event.clientY }
    const move = (next: PointerEvent) => this.pointerMove(next)
    const up = (next: PointerEvent) => {
      if (next.pointerId !== pointerId) return
      if (this.session && !this.session.ending && this.session.input === "pointer") {
        this.suppressClick()
        this.drop()
      } else this.abandonPending()
    }
    const cancel = (next: PointerEvent) => {
      if (next.pointerId !== pointerId) return
      if (this.session && !this.session.ending && this.session.input === "pointer") this.cancel("interrupted")
      else this.abandonPending()
    }
    // Once lifted, a touch drag must not scroll the page or open a context menu.
    const touchMove = (next: TouchEvent) => {
      if (this.session && next.cancelable) next.preventDefault()
    }
    const menu = (next: Event) => {
      if (this.session || (this.pending && this.pending.longPress)) next.preventDefault()
    }
    const pointerId = event.pointerId
    window.addEventListener("pointermove", move, { passive: false })
    window.addEventListener("pointerup", up)
    window.addEventListener("pointercancel", cancel)
    document.addEventListener("touchmove", touchMove, { passive: false })
    document.addEventListener("contextmenu", menu, true)
    const cleanup = () => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
      window.removeEventListener("pointercancel", cancel)
      document.removeEventListener("touchmove", touchMove)
      document.removeEventListener("contextmenu", menu, true)
    }
    const pending: Pending = { record, pointerId, start: point, last: point, longPress, timer: 0, cleanup }
    if (longPress)
      pending.timer = window.setTimeout(() => {
        if (this.pending !== pending) return
        this.beginPointer(pending)
      }, LONG_PRESS)
    this.pending = pending
  }

  private beginPointer(pending: Pending) {
    window.clearTimeout(pending.timer)
    if (!this.start(pending.record, "pointer", pending.start)) {
      this.abandonPending()
      return
    }
    const session = this.session as Session
    session.pointer = pending.last
    // The window listeners now belong to the session.
    session.cleanup.push(pending.cleanup)
    this.pending = null
  }

  private abandonPending() {
    const pending = this.pending
    if (!pending) return
    window.clearTimeout(pending.timer)
    pending.cleanup()
    this.pending = null
  }

  private pointerMove(event: PointerEvent) {
    const pending = this.pending
    if (pending && event.pointerId === pending.pointerId) {
      pending.last = { x: event.clientX, y: event.clientY }
      const distance = Math.hypot(event.clientX - pending.start.x, event.clientY - pending.start.y)
      if (pending.longPress) {
        if (distance > TOUCH_SLOP) this.abandonPending()
        return
      }
      if (distance < THRESHOLD) return
      this.beginPointer(pending)
    }
    const session = this.session
    if (!session || session.ending || session.input !== "pointer") return
    if (event.cancelable) event.preventDefault()
    session.pointer = { x: event.clientX, y: event.clientY }
    this.placeGhost()
    this.emit("onDragMove", { ...session.info, pointer: session.pointer, target: { zoneId: session.over?.id ?? null, index: session.index } })
  }

  /** The click that follows a pointer drag's release must not activate the item. */
  private suppressClick() {
    const stop = (event: MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
    }
    window.addEventListener("click", stop, { capture: true, once: true })
    window.setTimeout(() => window.removeEventListener("click", stop, { capture: true }), 0)
  }

  /* ── Keyboard input ─────────────────────────────────────────────────────────────── */

  private keyDown(record: DraggableRecord, event: KeyboardEvent) {
    if (event.target !== record.handle || event.defaultPrevented) return
    const session = this.session
    if (!session) {
      if ((event.key === " " || event.key === "Enter") && !record.options.disabled && !event.repeat) {
        event.preventDefault()
        this.start(record, "keyboard", null)
      }
      return
    }
    if (session.record !== record || session.input !== "keyboard" || session.ending) return
    switch (event.key) {
      case "Escape":
        event.preventDefault()
        event.stopPropagation()
        this.cancel("escape")
        return
      case " ":
      case "Enter":
        event.preventDefault()
        if (!event.repeat) this.drop()
        return
      case "Tab":
        event.preventDefault()
        return
      case "ArrowUp":
      case "ArrowDown":
      case "ArrowLeft":
      case "ArrowRight":
        event.preventDefault()
        this.keyboardMove(event.key)
        return
    }
  }

  /** Zones a keyboard drag can visit, in document order. */
  private keyboardZones() {
    const session = this.session as Session
    return [...this.zones.values()]
      .filter((zone) => zone.element?.isConnected && (zone === session.over || session.verdicts.get(zone.id)?.status === "ready" || session.verdicts.get(zone.id)?.status === "error"))
      .sort((a, b) => domOrder(a.element as HTMLElement, b.element as HTMLElement))
  }

  private keyboardMove(key: string) {
    const session = this.session as Session
    const zone = session.over
    const layout = zone ? session.layouts.get(zone.id) : undefined
    const count = layout ? layout.items.length - (layout.removed === null ? 0 : 1) : 0
    const columns = layout?.sort === "grid" ? gridColumns(layout.boxes) : 1
    const step = zone ? keyboardStep(layout ? layout.sort : null, key, session.index ?? 0, count, columns, layout?.rtl ?? false) : "next"
    if (step === null) return
    let nextZone = zone
    let nextIndex = session.index
    if (typeof step === "number") nextIndex = step
    else {
      const zones = this.keyboardZones()
      const at = zone ? zones.indexOf(zone) : -1
      const candidate = step === "next" ? zones[at + 1] : at > 0 ? zones[at - 1] : at < 0 ? zones[zones.length - 1] : undefined
      if (!candidate) return
      nextZone = candidate
      const nextLayout = session.layouts.get(candidate.id)
      if (nextLayout) {
        const nextCount = nextLayout.items.length - (nextLayout.removed === null ? 0 : 1)
        nextIndex = step === "next" ? 0 : nextCount
        if (nextLayout.sort !== "grid" && session.index !== null) nextIndex = Math.min(session.index, nextCount)
      } else nextIndex = null
    }
    if (!this.setTarget(nextZone, nextIndex)) return
    this.reveal()
    const verdict = nextZone ? session.verdicts.get(nextZone.id) : undefined
    this.announce(this.announcements.moved(session.item, this.place(nextZone, nextIndex), verdict && verdict.status !== "ready" ? (verdict.reason ?? "") : null))
  }

  /** Keep the keyboard target in view. */
  private reveal() {
    const session = this.session as Session
    const zone = session.over
    if (!zone?.element) return
    const slot = this.slotRect(zone)
    if (!slot) {
      zone.element.scrollIntoView?.({ block: "nearest", inline: "nearest" })
      return
    }
    for (let node: HTMLElement | null = zone.element; node && node !== document.body; node = node.parentElement) {
      if (!isScroller(node, "y")) continue
      const rect = node.getBoundingClientRect()
      if (slot.y < rect.top) node.scrollTop -= rect.top - slot.y
      else if (slot.y + slot.h > rect.bottom) node.scrollTop += slot.y + slot.h - rect.bottom
      return
    }
    if (slot.y < 0 || slot.y + slot.h > window.innerHeight) window.scrollBy(0, slot.y < 0 ? slot.y : slot.y + slot.h - window.innerHeight)
  }

  /* ── Ending ─────────────────────────────────────────────────────────────────────── */

  private stopInput(session: Session) {
    session.ending = true
    cancelAnimationFrame(session.frame)
    for (const cleanup of session.cleanup) cleanup()
    session.cleanup = []
  }

  /** Release over the current target. */
  private drop() {
    const session = this.session
    if (!session || session.ending) return
    const zone = session.over
    if (!zone) return this.cancel("outside")
    const verdict = session.verdicts.get(zone.id)
    if (!verdict || verdict.status !== "ready") {
      // A keyboard drop on a refused zone stays lifted and says why.
      if (session.input === "keyboard") {
        this.announce(this.announcements.blocked(session.item, zone.options.label, verdict?.reason ?? null))
        return
      }
      return this.cancel("blocked")
    }
    if (zone.id === session.source.zoneId && session.effect === "move" && (session.index === session.source.index || session.layouts.get(zone.id) === undefined)) return this.cancel("unchanged")
    const event: DropEvent = { ...session.info, target: { zoneId: zone.id, index: session.index } }
    this.stopInput(session)
    const ghost = session.ghost
    const slot = this.slotRect(zone)
    ghost.setAttribute("data-settling", "")
    ghost.removeAttribute("data-lifted")
    if (slot) ghost.style.transform = `translate3d(${px(slot.x)}, ${px(slot.y)}, 0)`
    else ghost.setAttribute("data-fade", "")
    const before = this.visualRects(session)
    if (slot) before.set(session.item.id, slot)
    this.later(() => this.commit(session, zone, event, before), transitionMs(ghost))
  }

  /** Where every sortable item is drawn now, by id. */
  private visualRects(session: Session) {
    const rects = new Map<string, Box>()
    for (const layout of session.layouts.values())
      layout.items.forEach((record, index) => {
        const element = layout.elements[index]
        if (!element?.isConnected || record.id === session.item.id) return
        const rect = element.getBoundingClientRect()
        rects.set(record.id, { x: rect.left, y: rect.top, w: rect.width, h: rect.height })
      })
    return rects
  }

  private commit(session: Session, zone: ZoneRecord, event: DropEvent, before: Map<string, Box>) {
    if (this.session !== session) return
    let result: unknown
    flushSync(() => {
      result = zone.options.onDrop?.(event)
      this.emit("onDrop", event)
    })
    this.teardown(session)
    this.flip(before)
    if (session.input === "keyboard") (this.draggables.get(session.item.id)?.handle ?? session.record.handle)?.focus({ preventScroll: true })
    if (result === false) {
      this.announce(this.announcements.blocked(session.item, zone.options.label, null))
      this.end(session, "cancelled", "refused", null)
      return
    }
    this.announce(this.announcements.dropped(session.item, this.place(zone, event.target.index)))
    if (result && typeof (result as Promise<unknown>).then === "function") this.track(zone, session.item, result as Promise<unknown>)
    this.end(session, "dropped", null, event.target)
  }

  /** Show a zone as pending until the drop's promise settles, and in error if it fails. */
  private track(zone: ZoneRecord, item: DragItem, promise: Promise<unknown>) {
    this.setZoneState(zone, { status: "pending", reason: null })
    promise.then(
      () => {
        if (!this.session && zone.state.status === "pending") this.setZoneState(zone, { status: "idle" })
      },
      (error: unknown) => {
        if (this.session) return
        const reason = error instanceof DropError ? error.message : null
        this.setZoneState(zone, { status: "error", reason })
        this.announce(this.announcements.failed(item, zone.options.label, reason))
        this.later(() => {
          if (!this.session && zone.state.status === "error") this.setZoneState(zone, { status: "idle", reason: null })
        }, feedbackHold())
      }
    )
  }

  /** Animate items from where they were drawn to where they now lay out. */
  private flip(before: Map<string, Box>) {
    if (motionScale() < 0.1 || before.size === 0) return
    const duration = tokenDuration("--duration-base", 200)
    const easing = getComputedStyle(document.documentElement).getPropertyValue("--ease-standard").trim() || "ease"
    for (const record of this.draggables.values()) {
      const element = record.element
      const was = before.get(record.id)
      if (!was || !element?.isConnected || typeof element.animate !== "function") continue
      const now = element.getBoundingClientRect()
      const dx = was.x - now.left
      const dy = was.y - now.top
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue
      const animation = element.animate([{ translate: translateValue({ x: dx, y: dy }) }, { translate: translateValue(ZERO) }], { duration, easing })
      this.flips.add(animation)
      animation.onfinish = animation.oncancel = () => this.flips.delete(animation)
    }
  }

  /** End without a drop; the item flies home unless `animated` is false. */
  cancel(reason: DragCancelReason, animated = true) {
    const session = this.session
    if (!session || session.ending) return
    this.stopInput(session)
    const sourceZone = session.source.zoneId !== null ? (this.zones.get(session.source.zoneId) ?? null) : null
    const refusedBy = session.over
    const finish = () => {
      if (this.session !== session) return
      this.teardown(session)
      if (session.input === "keyboard") session.record.handle?.focus({ preventScroll: true })
      this.emit("onDragCancel", { ...session.info, reason } satisfies DragCancelEvent)
      if (reason !== "unchanged" && reason !== "interrupted")
        this.announce(reason === "blocked" && refusedBy ? this.announcements.blocked(session.item, refusedBy.options.label, session.verdicts.get(refusedBy.id)?.reason ?? null) : this.announcements.cancelled(session.item, this.place(sourceZone, session.source.index)))
      this.end(session, "cancelled", reason, null)
    }
    if (!animated) return finish()
    // The source opens its gap again and the copy flies back into it.
    session.returning = true
    const previous = session.over
    session.over = null
    session.index = null
    if (previous && this.zones.get(previous.id) === previous) this.setZoneState(previous, { over: false })
    this.applyLayouts()
    const ghost = session.ghost
    ghost.setAttribute("data-settling", "")
    ghost.removeAttribute("data-lifted")
    if (session.element.isConnected) {
      const rect = session.element.getBoundingClientRect()
      ghost.style.transform = `translate3d(${px(rect.left)}, ${px(rect.top)}, 0)`
    } else ghost.setAttribute("data-fade", "")
    this.later(finish, transitionMs(ghost))
  }

  private teardown(session: Session) {
    for (const layout of session.layouts.values()) this.resetLayout(layout)
    session.ghost.remove()
    session.element.removeAttribute("data-dnd-source")
    session.record.element?.removeAttribute("data-dnd-source")
    const root = document.documentElement
    root.removeAttribute("data-dnd")
    root.removeAttribute("data-dnd-input")
    this.session = null
    for (const zone of this.zones.values()) if (zone.state.status !== "pending") this.setZoneState(zone, { status: "idle", over: false, reason: null, item: null, index: null })
    else this.setZoneState(zone, { over: false, item: null, index: null })
    session.record.dragging = false
    for (const listener of session.record.listeners) listener()
    this.active = null
    for (const listener of this.activeListeners) listener()
  }

  private end(session: Session, outcome: DragEndEvent["outcome"], reason: DragCancelReason | null, target: DragEndEvent["target"]) {
    const event: DragEndEvent = { ...session.info, outcome, reason, target }
    const record = this.draggables.get(session.item.id) ?? session.record
    record.options.onDragEnd?.(event)
    this.emit("onDragEnd", event)
  }
}
