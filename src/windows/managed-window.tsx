/**
 * A window in the workspace: the frame, wired to the store.
 *
 * Moving and resizing never re-render anything. While a pointer is down, moves are batched
 * to one per frame and written to the frame alone: `translate` while dragging (composited,
 * not inherited, so the content is not re-styled) and left/top/width/height while
 * resizing. The material drops its backdrop blur while it moves (data-moving, glass.css).
 * The store is updated once, on release (docs/performance.md).
 */
import {
  createContext,
  memo,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react"
import { flushSync } from "react-dom"
import { scaledDuration } from "../lib/motion.js"
import { DRAG_THRESHOLD, EDGE_SNAP, snapBarHit, type DragStore } from "./drag.js"
import { clamp, edgeSnapTarget, type EdgeTarget } from "./geometry.js"
import { WindowContext, useWindowManager, type WindowContextValue } from "./react.js"
import { DEFAULT_MIN_WINDOW_SIZE, describeWindow, getWindowKind } from "./registry.js"
import type { WindowManager } from "./store.js"
import type { Rect, WindowEntry } from "./types.js"
import { WindowScopeChip } from "./scope.js"
import { WindowContentHost } from "./window-content.js"
import { WindowFrame } from "./window-frame.js"

/** What the workspace hands every window: where it is drawn and how to reach the stage. */
export interface WorkspaceLink {
  stageRef: RefObject<HTMLDivElement | null>
  drag: DragStore
  /** Phones: windows are full-screen sheets. */
  sheet: boolean
  /** Rendered before the controls in sheet mode (the window switcher). */
  sheetLeading?: ReactNode
}

export const WorkspaceLinkContext = createContext<WorkspaceLink | null>(null)

/** Elements inside an app bar that must not start a drag. */
const NO_DRAG = "button, a, input, textarea, select, [role='button'], [role='menuitem'], [data-window-no-drag]"
/** The workspace's snap bar (workspace.tsx), hit-tested while a window is dragged. */
const SNAP_BAR = ".fa-wm-snap-bar"

type ResizeEdge = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw"
const EDGES: ResizeEdge[] = ["n", "s", "e", "w", "ne", "nw", "se", "sw"]

export interface ManagedWindowProps {
  entry: WindowEntry
  focused: boolean
  /** Geometry: data-geometry plus the CSS variables the workspace computed. */
  geometry: "free" | "frac" | "sheet"
  vars: Record<string, string | number>
  /** Hidden in sheet mode when another window is in front. */
  hidden: boolean
}

function toStyle(vars: Record<string, string | number>): CSSProperties {
  return vars as CSSProperties
}

/** Rectangle of an element relative to the stage. */
function relativeRect(element: Element, stage: Element): Rect {
  const box = element.getBoundingClientRect()
  const origin = stage.getBoundingClientRect()
  return { x: box.left - origin.left, y: box.top - origin.top, w: box.width, h: box.height }
}

function startPointerSession(
  target: HTMLElement,
  pointerId: number,
  onMove: (event: PointerEvent) => void,
  onEnd: (event: PointerEvent, cancelled: boolean) => void
) {
  try {
    target.setPointerCapture(pointerId)
  } catch {
    // Synthetic pointers (tests) may not be capturable; window listeners still work.
  }
  const move = (event: PointerEvent) => {
    if (event.pointerId === pointerId) onMove(event)
  }
  const finish = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) return
    window.removeEventListener("pointermove", move)
    window.removeEventListener("pointerup", finish)
    window.removeEventListener("pointercancel", finish)
    try {
      target.releasePointerCapture(pointerId)
    } catch {
      // Already released.
    }
    onEnd(event, event.type === "pointercancel")
  }
  window.addEventListener("pointermove", move)
  window.addEventListener("pointerup", finish)
  window.addEventListener("pointercancel", finish)
}

/**
 * Batch pointer moves into one update per frame. Moves only record the pointer; the update
 * runs at the start of the next frame, where it reads geometry before it writes styles, so
 * nothing forces a synchronous style recalc and a fast mouse never does work twice a frame.
 */
function frameBatcher(update: () => void) {
  let request = 0
  return {
    schedule() {
      if (!request) request = requestAnimationFrame(() => {
        request = 0
        update()
      })
    },
    /** Run a pending update now (on release), so the drop uses the last pointer position. */
    flush() {
      if (!request) return
      cancelAnimationFrame(request)
      request = 0
      update()
    },
    cancel() {
      cancelAnimationFrame(request)
      request = 0
    },
  }
}

/**
 * Give a frame its geometry back after a move: the store's commit (flushSync) has already
 * written the new geometry variables, so drop the inline overrides and the moving material.
 * A plain drop lands where it is without a transition; a snap, tile or maximise animates
 * into place and keeps the light material until it has arrived.
 */
function settleFrame(frame: HTMLElement, state: "dragging" | "resizing", animate: boolean) {
  frame.style.translate = ""
  for (const property of ["left", "top", "width", "height"] as const) frame.style.removeProperty(property)
  if (!animate) {
    // Resolve the committed geometry while this frame's transitions are still off.
    void getComputedStyle(frame).translate
    delete frame.dataset[state]
    delete frame.dataset.moving
    return
  }
  delete frame.dataset[state]
  const done = () => {
    clearTimeout(timer)
    frame.removeEventListener("transitionend", onEnd)
    delete frame.dataset.moving
  }
  const onEnd = (event: TransitionEvent) => {
    if (event.target === frame && (event.propertyName === "left" || event.propertyName === "width")) done()
  }
  // Fallback when nothing transitions (reduced motion, geometry already in place).
  const timer = setTimeout(done, scaledDuration(600) + 50)
  frame.addEventListener("transitionend", onEnd)
}

function useWindowDrag(entry: WindowEntry, frameRef: RefObject<HTMLElement | null>, manager: WindowManager, link: WorkspaceLink) {
  return (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0 || link.sheet) return
    if ((event.target as Element).closest(NO_DRAG)) return
    const frame = frameRef.current
    const stage = link.stageRef.current
    if (!frame || !stage) return
    const header = event.currentTarget
    const startX = event.clientX
    const startY = event.clientY
    let started = false
    let base: Rect = { x: 0, y: 0, w: 0, h: 0 }
    let stageBox = stage.getBoundingClientRect()
    let next = base
    let target: EdgeTarget | null = null
    let pointerX = startX
    let pointerY = startY
    let snapBar: HTMLElement | null = null

    // Once per frame: hit-test the snap targets (reads), then move the frame (one write).
    // The move is `translate` on the frame itself: not inherited, so the window's content
    // is not re-styled, and composited, so nothing is laid out or repainted.
    const frames = frameBatcher(() => {
      if (!snapBar?.isConnected) snapBar = stage.querySelector<HTMLElement>(SNAP_BAR)
      const barBox = snapBar?.getBoundingClientRect()
      const overBar = barBox && pointerX >= barBox.left && pointerX <= barBox.right && pointerY >= barBox.top && pointerY <= barBox.bottom
      const bar = overBar && snapBar ? snapBarHit(snapBar, pointerX, pointerY) : null
      target =
        bar?.zone ?? edgeSnapTarget(pointerX - stageBox.left, pointerY - stageBox.top, stageBox.width, stageBox.height, EDGE_SNAP)
      const x = clamp(base.x + pointerX - startX, 0, stageBox.width - base.w)
      const y = clamp(base.y + pointerY - startY, 0, stageBox.height - base.h)
      next = { ...base, x, y }
      frame.style.translate = `${x - base.x}px ${y - base.y}px`
      link.drag.setTarget(target, bar?.layout ?? null)
    })

    startPointerSession(
      header,
      event.pointerId,
      (move) => {
        pointerX = move.clientX
        pointerY = move.clientY
        if (!started) {
          if (Math.hypot(pointerX - startX, pointerY - startY) < DRAG_THRESHOLD) return
          started = true
          stageBox = stage.getBoundingClientRect()
          const current = relativeRect(frame, stage)
          const free = entry.layout === "floating" && !entry.snap
          if (free) {
            base = current
          } else {
            // Detach from a tile, zone or maximised: take the free size, keep the grab point.
            const w = Math.min(entry.rect.w, stageBox.width)
            const h = Math.min(entry.rect.h, stageBox.height)
            const ratio = current.w > 0 ? (startX - stageBox.left - current.x) / current.w : 0.5
            base = {
              x: clamp(startX - stageBox.left - ratio * w, 0, stageBox.width - w),
              y: clamp(current.y, 0, stageBox.height - h),
              w,
              h,
            }
            flushSync(() => manager.float(entry.id, base))
          }
          next = base
          frame.dataset.dragging = ""
          // The glass material drops its backdrop blur while the window moves (glass.css).
          frame.dataset.moving = ""
          document.documentElement.dataset.windowDragging = ""
          link.drag.start(entry.id)
        }
        frames.schedule()
      },
      (end, cancelled) => {
        if (!started) return
        if (cancelled) {
          frames.cancel()
        } else {
          pointerX = end.clientX
          pointerY = end.clientY
          frames.schedule()
          frames.flush()
        }
        flushSync(() => {
          if (cancelled) return
          if (target === "maximise") {
            manager.float(entry.id, next)
            manager.maximise(entry.id)
          } else if (target === "tile") {
            manager.float(entry.id, next)
            manager.tile(entry.id)
          } else if (target) {
            manager.snap(entry.id, target)
          } else {
            manager.float(entry.id, next)
          }
        })
        settleFrame(frame, "dragging", !cancelled && target !== null)
        delete document.documentElement.dataset.windowDragging
        link.drag.end()
      }
    )
  }
}

function useWindowResize(entry: WindowEntry, frameRef: RefObject<HTMLElement | null>, manager: WindowManager, link: WorkspaceLink) {
  const minSize = getWindowKind(entry.kind)?.minSize ?? DEFAULT_MIN_WINDOW_SIZE
  return (edge: ResizeEdge, event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    const frame = frameRef.current
    const stage = link.stageRef.current
    if (!frame || !stage) return
    manager.focus(entry.id)
    const stageBox = stage.getBoundingClientRect()
    const start = relativeRect(frame, stage)
    if (entry.layout !== "floating" || entry.snap) flushSync(() => manager.float(entry.id, start))
    const startX = event.clientX
    const startY = event.clientY
    let pointerX = startX
    let pointerY = startY
    let next = start
    // The box is written as left/top/width/height on the frame, not as the inherited
    // geometry variables, so only the frame is re-styled (its content still lays out).
    const frames = frameBatcher(() => {
      const dx = pointerX - startX
      const dy = pointerY - startY
      let { x, y, w, h } = start
      if (edge.includes("e")) w = clamp(start.w + dx, minSize.w, stageBox.width - start.x)
      if (edge.includes("s")) h = clamp(start.h + dy, minSize.h, stageBox.height - start.y)
      if (edge.includes("w")) {
        x = clamp(start.x + dx, 0, start.x + start.w - minSize.w)
        w = start.w + start.x - x
      }
      if (edge.includes("n")) {
        y = clamp(start.y + dy, 0, start.y + start.h - minSize.h)
        h = start.h + start.y - y
      }
      next = { x, y, w, h }
      frame.style.left = `${x}px`
      frame.style.top = `${y}px`
      frame.style.width = `${w}px`
      frame.style.height = `${h}px`
    })
    frame.dataset.resizing = ""
    frame.dataset.moving = ""
    startPointerSession(
      event.currentTarget,
      event.pointerId,
      (move) => {
        pointerX = move.clientX
        pointerY = move.clientY
        frames.schedule()
      },
      (end, cancelled) => {
        if (cancelled) {
          frames.cancel()
        } else {
          pointerX = end.clientX
          pointerY = end.clientY
          frames.schedule()
          frames.flush()
        }
        flushSync(() => manager.float(entry.id, cancelled ? start : next))
        settleFrame(frame, "resizing", false)
      }
    )
  }
}

/** The workspace builds `vars` afresh on every render; compare them by value. */
function sameWindowProps(a: ManagedWindowProps, b: ManagedWindowProps) {
  if (a.entry !== b.entry || a.focused !== b.focused || a.geometry !== b.geometry || a.hidden !== b.hidden) return false
  const keys = Object.keys(a.vars)
  return keys.length === Object.keys(b.vars).length && keys.every((key) => a.vars[key] === b.vars[key])
}

/**
 * One managed window. Memoised: the workspace re-renders on every store change, but a
 * window only re-renders when its own entry, focus or geometry changes; its body only
 * when { id, kind, params } change.
 */
export const ManagedWindow = memo(function ManagedWindow({ entry, focused, geometry, vars, hidden }: ManagedWindowProps) {
  const manager = useWindowManager()
  const link = useContext(WorkspaceLinkContext)
  if (!link) throw new Error("ManagedWindow must be rendered by a Workspace")
  const frameRef = useRef<HTMLElement>(null)
  const titleId = useId()
  const [actionsSlot, setActionsSlot] = useState<HTMLDivElement | null>(null)
  const [statusSlot, setStatusSlot] = useState<HTMLElement | null>(null)
  const { title, subtitle, icon: Icon } = describeWindow(entry.kind, entry.params)
  const beginDrag = useWindowDrag(entry, frameRef, manager, link)
  const beginResize = useWindowResize(entry, frameRef, manager, link)

  const context = useMemo<WindowContextValue>(
    () => ({ id: entry.id, kind: entry.kind, params: entry.params, actionsSlot, statusSlot, host: "workspace" }),
    [entry.id, entry.kind, entry.params, actionsSlot, statusSlot]
  )

  // Keyboard focus follows window focus when it changes (dock, shortcuts, close).
  const wasFocused = useRef(focused)
  useEffect(() => {
    const frame = frameRef.current
    if (focused && !wasFocused.current && frame && !frame.contains(document.activeElement)) {
      frame.focus({ preventScroll: true })
    }
    wasFocused.current = focused
  }, [focused])

  const maximised = entry.layout === "maximised"
  const resizable = !link.sheet && entry.layout === "floating"
  const state = link.sheet ? "sheet" : entry.minimised ? "minimised" : entry.layout

  return (
    <WindowFrame.Root
      ref={frameRef}
      className="fa-wm-window"
      focused={focused}
      state={state}
      tabIndex={-1}
      aria-labelledby={titleId}
      data-window-id={entry.id}
      data-window-kind={entry.kind}
      data-geometry={geometry}
      data-snap={entry.snap ?? undefined}
      data-minimised={entry.minimised ? "" : undefined}
      data-hidden={hidden ? "" : undefined}
      inert={entry.minimised || hidden}
      style={toStyle(vars)}
      onPointerDownCapture={() => manager.focus(entry.id)}
      onFocusCapture={() => manager.focus(entry.id)}
    >
      <WindowFrame.AppBar
        icon={Icon ? <Icon /> : null}
        title={title}
        subtitle={subtitle}
        scope={<WindowScopeChip scope={entry.scope} />}
        titleId={titleId}
        actionsRef={setActionsSlot}
        onPointerDown={beginDrag}
        onDoubleClick={(event) => {
          if (link.sheet || (event.target as Element).closest(NO_DRAG)) return
          manager.toggleMaximise(entry.id)
        }}
        controls={
          <WindowFrame.Controls
            title={title}
            maximised={maximised}
            compact={link.sheet}
            leading={link.sheet ? link.sheetLeading : undefined}
            onPopOut={manager.canPopOut(entry.id) ? () => popOut(manager, entry, frameRef.current) : undefined}
            onMinimise={() => manager.minimise(entry.id)}
            onToggleMaximise={() => manager.toggleMaximise(entry.id)}
            onClose={() => void manager.close(entry.id)}
          />
        }
      />
      <WindowContext.Provider value={context}>
        <WindowContentHost id={entry.id} kind={entry.kind} params={entry.params} />
      </WindowContext.Provider>
      <WindowFrame.StatusBar ref={setStatusSlot} />
      {resizable
        ? EDGES.map((edge) => (
            <span
              key={edge}
              className="fa-window-resize"
              data-edge={edge}
              aria-hidden
              onPointerDown={(event) => beginResize(edge, event)}
            />
          ))
        : null}
    </WindowFrame.Root>
  )
}, sameWindowProps)

/** Pop a window out at the same size and screen position it has in the workspace. */
function popOut(manager: WindowManager, entry: WindowEntry, frame: HTMLElement | null) {
  const box = frame?.getBoundingClientRect()
  const chromeY = window.outerHeight - window.innerHeight
  manager.popOut(
    entry.id,
    box
      ? {
          left: window.screenX + box.left,
          top: window.screenY + chromeY + box.top,
          width: box.width,
          height: box.height,
        }
      : undefined
  )
}
