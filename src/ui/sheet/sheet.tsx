import { Drawer } from "@base-ui/react/drawer"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type RefObject,
} from "react"
import { Dialog, DialogSurface, type DialogChangeDetails, type DialogPopupProps, type SideSurfaceOptions } from "../dialog/index.js"
import { useDirection } from "../../lib/locale/direction.js"
import { readingKey } from "../../lib/direction.js"
import { useMessages } from "../../lib/i18n/index.js"
import { numberFormat } from "../../lib/locale/intl.js"
import { useLocale } from "../../lib/locale/use-locale.js"
import { remPx } from "../../lib/rem.js"
import { useControllable } from "../../lib/use-controllable.js"
import { sheetMessages } from "./messages.js"

export type SheetSize = "sm" | "md" | "lg"
/** The edge a sheet slides in from, and the direction a swipe dismisses it. */
export type SheetSide = "left" | "right" | "bottom" | "start" | "end"
/**
 * A height a bottom sheet rests at: a fraction of the viewport height (`0.5`; `1` is the
 * full height), a number of pixels above 1 (`240`), or a `px` or `rem` string (`"10rem"`).
 */
export type SheetSnapPoint = number | string
/** Why the snap point changed (`swipe`, or `none` for the handle, keyboard and focus), with `cancel()` to refuse it. */
export type SheetSnapPointChangeDetails = Drawer.Root.SnapPointChangeEventDetails

type PhysicalSide = Exclude<SheetSide, "start" | "end">
const SWIPE: Record<PhysicalSide, "left" | "right" | "down"> = { left: "left", right: "right", bottom: "down" }

interface SnapValue {
  /** The snap points from the lowest to the highest. */
  points: readonly SheetSnapPoint[]
  /** Each point's label, in `points` order. */
  labels: readonly (string | undefined)[]
  active: SheetSnapPoint | null
  set: (point: SheetSnapPoint, event: Event) => void
}

interface SheetValue {
  edge: PhysicalSide
  modal: boolean
  /** Draw a scrim: modal, and not stacked on a modal sheet (whose own scrim stays). */
  scrim: boolean
  /** How many sheets enclose this one. */
  depth: number
  snap: SnapValue | null
}

const SheetContext = /* @__PURE__ */ createContext<SheetValue | null>(null)

export interface SheetRootProps {
  open?: boolean
  defaultOpen?: boolean
  /** Called with the next open state and Base UI change details (the reason; `details.cancel()` keeps it open) when the trigger opens it or a swipe, Esc, the scrim or a close control dismisses it. Pair with `open` to control it. */
  onOpenChange?: (open: boolean, details: DialogChangeDetails) => void
  /** Called with the final open state once the slide-in or slide-out animation has finished. */
  onOpenChangeComplete?: (open: boolean) => void
  /**
   * Default true: a scrim covers the page, focus stays in the sheet and the page is inert.
   * `false` opens it beside the page: no scrim, the page keeps scrolling and taking
   * clicks, Tab moves on to the page, and Esc still closes it.
   */
  modal?: boolean
  /**
   * Keep the sheet open on a press outside it (Esc, a swipe and close controls still close
   * it). A non-modal sheet also stays open when focus moves to the page. Default: true when
   * `modal` is false, otherwise false.
   */
  disablePointerDismissal?: boolean
  /**
   * `right` (default): inspector and secondary detail. `left`: the section drawer on
   * tablets and phones. `bottom`: a short list of choices or actions (phone "More").
   * `start` and `end` follow DirectionProvider; `left` and `right` stay physical.
   */
  side?: SheetSide
  /**
   * Bottom sheets only: the heights it rests at, such as `["10rem", 0.5, 1]`. The sheet
   * takes the viewport's height, shows as much of it as the active point allows and
   * follows a drag to the nearest point (a fast flick carries further; past the lowest it
   * closes). Its grab handle becomes a slider: arrow keys step between points and
   * Home/End pick the lowest and highest. Below the highest point the body does not
   * scroll; dragging or scrolling it raises the sheet first. Ignored on side sheets.
   */
  snapPoints?: readonly SheetSnapPoint[]
  /** The active snap point, one of `snapPoints`. Pair with `onSnapPointChange` to control it. */
  snapPoint?: SheetSnapPoint | null
  /** The snap point an uncontrolled sheet opens at, and returns to each time it closes. Default: the first of `snapPoints`. */
  defaultSnapPoint?: SheetSnapPoint | null
  /** Called with the next snap point (`null` while a swipe closes the sheet) when a drag, the handle, a key or focus moves it. `details.cancel()` keeps the current point. */
  onSnapPointChange?: (snapPoint: SheetSnapPoint | null, details: SheetSnapPointChangeDetails) => void
  /** Labels for the handle's value, in `snapPoints` order (for example "Peek", "Half", "Full"). Default: "Height 2 of 3". */
  snapPointLabels?: readonly string[]
  /** Settle on the point nearest the drag distance instead of letting a fast flick skip points. */
  snapToSequentialPoints?: boolean
  /** Ref exposing the component’s imperative action contract. */
  actionsRef?: RefObject<{ unmount: () => void; close: () => void } | null>
  children?: ReactNode
}

/** A snap point's height in px, to put the points in order. */
function snapHeight(point: SheetSnapPoint, viewport: number, rem: number) {
  if (typeof point === "number") return point <= 1 ? Math.max(0, point) * viewport : point
  const value = Number.parseFloat(point)
  if (!Number.isFinite(value)) return 0
  return point.trim().endsWith("rem") ? value * rem : value
}

function orderSnapPoints(points: readonly SheetSnapPoint[]) {
  if (typeof window === "undefined") return [...points]
  const viewport = document.documentElement.clientHeight || window.innerHeight
  const rem = remPx()
  return [...points].sort((a, b) => snapHeight(a, viewport, rem) - snapHeight(b, viewport, rem))
}

/** Change details for a move the handle, a key or focus asked for. */
function snapChangeDetails(event: Event): SheetSnapPointChangeDetails {
  const details = {
    reason: "none",
    event,
    trigger: undefined,
    isCanceled: false,
    isPropagationAllowed: false,
    cancel() {
      details.isCanceled = true
    },
    allowPropagation() {
      details.isPropagationAllowed = true
    },
  }
  return details as SheetSnapPointChangeDetails
}

const NO_POINTS: readonly SheetSnapPoint[] = []

/** A pane from a screen edge: swipe toward that edge (or Esc, or the scrim) to dismiss. */
function SheetRoot({
  side = "right",
  modal = true,
  disablePointerDismissal = !modal,
  snapPoints,
  snapPoint,
  defaultSnapPoint,
  onSnapPointChange,
  snapPointLabels,
  snapToSequentialPoints,
  ...props
}: SheetRootProps) {
  const rtl = useDirection() === "rtl"
  const parent = useContext(SheetContext)
  const depth = (parent?.depth ?? -1) + 1
  const edge = side === "start" ? (rtl ? "right" : "left") : side === "end" ? (rtl ? "left" : "right") : side
  const points = edge === "bottom" && snapPoints?.length ? snapPoints : NO_POINTS
  const fallback = defaultSnapPoint !== undefined ? defaultSnapPoint : (points[0] ?? null)
  const [active, setActive] = useControllable<SheetSnapPoint | null>(snapPoint, fallback)
  // Base UI's drag and our handle both settle through here, so `cancel()` works for both.
  const change = useCallback(
    (next: SheetSnapPoint | null, details: SheetSnapPointChangeDetails) => {
      onSnapPointChange?.(next, details)
      if (!details.isCanceled) setActive(next)
    },
    [onSnapPointChange, setActive]
  )

  useEffect(() => {
    if (import.meta.env.DEV && depth > 1)
      console.warn("Sheet: sheets stack at most two deep (R13.3). Open a window instead.")
    if (import.meta.env.DEV && snapPoints?.length && edge !== "bottom")
      console.warn("Sheet: snapPoints apply to bottom sheets only.")
  }, [depth, edge, snapPoints])

  const snap = useMemo<SnapValue | null>(() => {
    if (!points.length) return null
    const ordered = orderSnapPoints(points)
    return {
      points: ordered,
      labels: ordered.map((point) => snapPointLabels?.[points.indexOf(point)]),
      active,
      set: (point, event) => change(point, snapChangeDetails(event)),
    }
  }, [points, snapPointLabels, active, change])
  const scrim = modal && !parent?.modal
  const value = useMemo<SheetValue>(() => ({ edge, modal, scrim, depth, snap }), [edge, modal, scrim, depth, snap])

  const snapProps = points.length
    ? { snapPoints: points as SheetSnapPoint[], snapPoint: active, defaultSnapPoint: fallback, onSnapPointChange: change, snapToSequentialPoints }
    : {}
  return (
    <SheetContext value={value}>
      <Drawer.Root
        swipeDirection={SWIPE[edge]}
        modal={modal}
        disablePointerDismissal={disablePointerDismissal}
        {...snapProps}
        {...props}
      />
    </SheetContext>
  )
}

/** Index of the active point in the ordered list (the lowest when it is not one of them). */
function activeIndex(snap: SnapValue) {
  const index = snap.active === null ? -1 : snap.points.findIndex((point) => Object.is(point, snap.active))
  return Math.max(0, index)
}

/**
 * A bottom sheet's grab handle when it has snap points: a vertical slider over them.
 * Arrows and Page keys step, Home/End pick the lowest and highest, and a press (or Enter
 * or Space) raises it one point, from the highest back to the lowest.
 */
function SnapHandle({ snap }: { snap: SnapValue }) {
  const messages = useMessages(sheetMessages)
  const number = numberFormat(useLocale())
  const index = activeIndex(snap)
  const last = snap.points.length - 1
  const latest = useRef({ index, last, snap })
  latest.current = { index, last, snap }

  const go = (next: number, event: Event) => {
    const { index, last, snap } = latest.current
    const target = Math.min(last, Math.max(0, next))
    if (target !== index) snap.set(snap.points[target]!, event)
  }
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const key = readingKey(event.key, event.currentTarget)
    const next =
      key === "ArrowUp" || key === "ArrowRight" || key === "PageUp" ? index + 1
      : key === "ArrowDown" || key === "ArrowLeft" || key === "PageDown" ? index - 1
      : key === "Home" ? 0
      : key === "End" ? last
      : key === "Enter" || key === " " ? (index === last ? 0 : index + 1)
      : null
    if (next === null) return
    event.preventDefault()
    event.stopPropagation()
    go(next, event.nativeEvent)
  }
  // Base UI captures the pointer for its drag, so the press ends on the viewport and no
  // click reaches the handle: a release close to where it began is the press.
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    const start = { x: event.clientX, y: event.clientY }
    const view = event.currentTarget.ownerDocument.defaultView!
    const end = (up: globalThis.PointerEvent) => {
      view.removeEventListener("pointerup", end, true)
      view.removeEventListener("pointercancel", cancel, true)
      if (Math.hypot(up.clientX - start.x, up.clientY - start.y) > 4) return
      const { index, last } = latest.current
      go(index === last ? 0 : index + 1, up)
    }
    const cancel = () => {
      view.removeEventListener("pointerup", end, true)
      view.removeEventListener("pointercancel", cancel, true)
    }
    view.addEventListener("pointerup", end, true)
    view.addEventListener("pointercancel", cancel, true)
  }

  return (
    <div
      role="slider"
      tabIndex={0}
      className="fa-sheet-handle"
      aria-label={messages.heightControl}
      aria-orientation="vertical"
      aria-valuemin={1}
      aria-valuemax={last + 1}
      aria-valuenow={index + 1}
      aria-valuetext={snap.labels[index] ?? messages.heightStep(number.format(index + 1), number.format(last + 1))}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
    >
      <span className="fa-dialog-handle" />
    </div>
  )
}

/** Wheel events closer together than this belong to one gesture (one trackpad flick). */
const WHEEL_GESTURE_MS = 200

export interface SheetPopupProps {
  /** Width: sm 360 · md 480 · lg 640. Side sheets keep a sliver of the page visible on
   *  phones; a bottom sheet spans the phone's width. */
  size?: SheetSize
  className?: string
  children?: ReactNode
  /** Accessible name when a visible label does not name the control. */
  "aria-label"?: string
  /** The element to focus when the sheet opens (default: the sheet itself). `false` leaves focus where it is, for a non-modal sheet that follows a selection on the page. */
  initialFocus?: DialogPopupProps["initialFocus"]
  /** The element to focus when the sheet closes (default: the trigger, or the element focused before it opened). */
  finalFocus?: DialogPopupProps["finalFocus"]
}

/**
 * Below the highest snap point the body does not scroll, so a wheel over the sheet raises
 * it one point per gesture instead (and never scrolls the page behind a non-modal sheet).
 * A native listener, because React's wheel listener is passive and cannot prevent that.
 */
function useSnapWheel(snap: SnapValue | null, popup: RefObject<HTMLDivElement | null>) {
  const latest = useRef(snap)
  latest.current = snap
  const detach = useRef<(() => void) | null>(null)
  return useCallback((element: HTMLDivElement | null) => {
    popup.current = element
    detach.current?.()
    detach.current = null
    if (!element) return
    let at = -Infinity
    let stepped = false
    const onWheel = (event: globalThis.WheelEvent) => {
      const current = latest.current
      if (!current || event.ctrlKey || Math.abs(event.deltaY) < Math.abs(event.deltaX)) return
      const index = activeIndex(current)
      if (index === current.points.length - 1) return
      event.preventDefault()
      if (event.timeStamp - at > WHEEL_GESTURE_MS) stepped = false
      at = event.timeStamp
      if (stepped || event.deltaY <= 0) return
      stepped = true
      current.set(current.points[index + 1]!, event)
    }
    element.addEventListener("wheel", onWheel, { passive: false })
    detach.current = () => element.removeEventListener("wheel", onWheel)
  }, [popup])
}

/**
 * A glass pane from the sheet's edge: the inspector (right), the section drawer (left) or
 * a short list of choices (bottom, with a grab handle). Same header, scrolling body and
 * footer as Dialog; the edges it touches respect the safe area.
 */
function SheetPopup({ size = "md", ...rest }: SheetPopupProps) {
  const sheet = useContext(SheetContext)
  const edge = sheet?.edge ?? "right"
  const snap = sheet?.snap ?? null
  const popupRef = useRef<HTMLDivElement | null>(null)
  const wheelRef = useSnapWheel(snap, popupRef)
  const top = snap ? activeIndex(snap) === snap.points.length - 1 : true
  // Lowered from the highest point, the body shows its start again (it cannot scroll there).
  useEffect(() => {
    const body = top ? null : popupRef.current?.querySelector(".fa-dialog-body")
    if (body) body.scrollTop = 0
  }, [top])

  let options: SideSurfaceOptions = {
    scrim: sheet?.scrim ?? true,
    viewport: { "data-modal": sheet?.modal === false ? "false" : undefined },
  }
  if (snap) {
    options = {
      ...options,
      popupRef: wheelRef,
      // One point is a fixed height: the handle stays decorative.
      handle: snap.points.length > 1 ? <SnapHandle snap={snap} /> : undefined,
      popup: {
        "data-snap-points": "",
        "data-snap-top": top ? "" : undefined,
        // Below the highest point, focus reaching a control below the visible part raises the
        // sheet. The content box ends where the visible part does and moves with the sheet;
        // a body that focus has already scrolled (it cannot scroll otherwise) counts too.
        onFocus: (event: FocusEvent<HTMLDivElement>) => {
          const target = event.target
          const content = target instanceof Element ? target.closest(".fa-dialog-content") : null
          if (top || !content || target === content) return
          const below = target.getBoundingClientRect().bottom > content.getBoundingClientRect().bottom + 1
          const scrolled = (target.closest(".fa-dialog-body")?.scrollTop ?? 0) > 0
          if (below || scrolled) snap.set(snap.points[snap.points.length - 1]!, event.nativeEvent)
        },
      },
    }
  }
  return <DialogSurface {...rest} mode="side" kind="side" size={size} edge={edge} sheet={options} />
}

/**
 * A pane that slides in from a screen edge, built from parts: `Root` (state and `side`),
 * `Trigger`, `Popup`, `Header`, `Body` (scrolls), `Footer` and `Close`. Swipe toward the
 * edge, Esc or the scrim dismisses it. A bottom sheet can rest at `snapPoints`; a
 * non-modal sheet (`modal={false}`) leaves the page usable; a sheet opened from inside
 * another stacks on it, and the one behind recedes until it closes.
 */
export const Sheet = {
  Root: SheetRoot,
  Trigger: Drawer.Trigger,
  Popup: SheetPopup,
  Header: Dialog.Header,
  Body: Dialog.Body,
  Footer: Dialog.Footer,
  Close: Drawer.Close,
}
