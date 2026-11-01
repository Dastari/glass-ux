import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type RefObject } from "react"
import { IconClose, IconGrip, IconMaximise, IconMove, IconRestore } from "../../icons/generated/icons.js"
import { isRtl } from "../../lib/direction.js"
import { DRAG_THRESHOLD } from "../../windows/drag.js"
import { Button } from "../button/index.js"
import { Menu } from "../menu/index.js"
import { TruncatedText } from "../truncated-text/index.js"
import type { mediaPlayerMessages } from "./messages.js"
import {
  WINDOW_SIZES,
  clampWindowRect,
  cornerWindowRect,
  defaultWindowRect,
  resizeWindowRect,
  snapWindowRect,
  type MediaViewport,
  type MediaWindowCorner,
  type MediaWindowRect,
} from "./state.js"

const viewportOf = (element: HTMLElement): MediaViewport => {
  const root = element.ownerDocument.documentElement
  return { width: root.clientWidth, height: root.clientHeight }
}

/** One key press moves the mini player this far; with Shift it resizes by the same amount. */
const KEY_STEP = 24

export interface MiniWindowOptions {
  shell: RefObject<HTMLElement | null>
  /** The player is in the mini window. */
  active: boolean
  /** The picture's width over height. */
  aspect: () => number
  rect?: MediaWindowRect | undefined
  defaultRect?: MediaWindowRect | undefined
  onRectChange?: ((rect: MediaWindowRect) => void) | undefined
  onMoved?: (() => void) | undefined
}

/** The mini window's rectangle: pointer drags write transforms each frame and commit once (R14.5, R18.5). */
export function useMiniWindow({ shell, active, aspect, rect: rectProp, defaultRect, onRectChange, onMoved }: MiniWindowOptions) {
  const [inner, setInner] = useState<MediaWindowRect | null>(defaultRect ?? null)
  const rect = rectProp ?? inner
  const current = useRef(rect)
  current.current = rect
  const dragged = useRef(false)
  const latest = useRef({ onRectChange, onMoved })
  latest.current = { onRectChange, onMoved }

  const write = useCallback(
    (next: MediaWindowRect) => {
      const element = shell.current
      if (!element) return
      element.style.translate = `${next.x}px ${next.y}px`
      element.style.width = `${next.width}px`
      element.style.height = `${next.height}px`
    },
    [shell],
  )

  const commit = useCallback(
    (next: MediaWindowRect, announce = false) => {
      current.current = next
      write(next)
      setInner(next)
      latest.current.onRectChange?.(next)
      if (announce) latest.current.onMoved?.()
    },
    [write],
  )

  useLayoutEffect(() => {
    const element = shell.current
    if (!active || !element) return
    const viewport = viewportOf(element)
    write(clampWindowRect(current.current ?? defaultWindowRect(viewport, aspect(), isRtl(element)), viewport))
    if (!current.current) setInner(defaultWindowRect(viewport, aspect(), isRtl(element)))
    const onResize = () => {
      if (current.current) commit(clampWindowRect(current.current, viewportOf(element)))
    }
    window.addEventListener("resize", onResize)
    return () => {
      window.removeEventListener("resize", onResize)
      element.style.translate = ""
      element.style.width = ""
      element.style.height = ""
    }
  }, [active, aspect, commit, shell, write])

  // Follow a controlled rectangle.
  useEffect(() => {
    if (active && rectProp) write(rectProp)
  }, [active, rectProp, write])

  /** Shared by moves and resizes: `compute` maps the pointer's travel to a rectangle. */
  const session = useCallback(
    (event: ReactPointerEvent<HTMLElement>, compute: (start: MediaWindowRect, dx: number, dy: number, viewport: MediaViewport) => MediaWindowRect, finish: (rect: MediaWindowRect, viewport: MediaViewport) => MediaWindowRect, threshold: number) => {
      const element = shell.current
      const start = current.current
      if (event.button !== 0 || !element || !start) return
      const target = event.currentTarget
      const pointerId = event.pointerId
      const originX = event.clientX
      const originY = event.clientY
      const viewport = viewportOf(element)
      let moving = false
      let frame = 0
      let pointerX = originX
      let pointerY = originY
      let next = start
      dragged.current = false
      const paint = () => {
        frame = 0
        next = compute(start, pointerX - originX, pointerY - originY, viewport)
        write(next)
      }
      const onMove = (move: PointerEvent) => {
        if (move.pointerId !== pointerId) return
        pointerX = move.clientX
        pointerY = move.clientY
        if (!moving) {
          if (Math.hypot(pointerX - originX, pointerY - originY) < threshold) return
          moving = true
          dragged.current = true
          element.dataset.moving = ""
          try {
            target.setPointerCapture(pointerId)
          } catch {
            // Synthetic pointers may not be capturable; the window listeners still work.
          }
        }
        if (!frame) frame = requestAnimationFrame(paint)
      }
      const onEnd = (end: PointerEvent) => {
        if (end.pointerId !== pointerId) return
        window.removeEventListener("pointermove", onMove)
        window.removeEventListener("pointerup", onEnd)
        window.removeEventListener("pointercancel", onEnd)
        if (frame) {
          cancelAnimationFrame(frame)
          paint()
        }
        if (!moving) return
        delete element.dataset.moving
        if (end.type === "pointercancel") write(start)
        else commit(finish(next, viewport), true)
      }
      window.addEventListener("pointermove", onMove)
      window.addEventListener("pointerup", onEnd)
      window.addEventListener("pointercancel", onEnd)
    },
    [commit, shell, write],
  )

  const beginMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if ((event.target as Element).closest("button, input, .fa-media-resize")) return
      session(event, (start, dx, dy, viewport) => clampWindowRect({ ...start, x: start.x + dx, y: start.y + dy }, viewport), (next, viewport) => snapWindowRect(next, viewport), DRAG_THRESHOLD)
    },
    [session],
  )

  const beginResize = useCallback(
    (event: ReactPointerEvent<HTMLElement>, corner: MediaWindowCorner) => {
      event.stopPropagation()
      session(event, (start, dx, dy, viewport) => resizeWindowRect(start, corner, dx, dy, viewport), (next) => next, 0)
    },
    [session],
  )

  const nudge = useCallback(
    (dx: number, dy: number, grow: number) => {
      const element = shell.current
      const start = current.current
      if (!element || !start) return
      const height = (start.width + grow) * (start.height / start.width)
      commit(clampWindowRect({ x: start.x + dx, y: start.y + dy, width: start.width + grow, height }, viewportOf(element)), true)
    },
    [commit, shell],
  )

  const toCorner = useCallback(
    (corner: MediaWindowCorner) => {
      const element = shell.current
      if (element && current.current) commit(cornerWindowRect(current.current, corner, viewportOf(element)), true)
    },
    [commit, shell],
  )

  const toSize = useCallback(
    (width: number) => {
      const element = shell.current
      const start = current.current
      if (element && start) commit(clampWindowRect({ ...start, width, height: width * (start.height / start.width) }, viewportOf(element)), true)
    },
    [commit, shell],
  )

  return { beginMove, beginResize, nudge, toCorner, toSize, dragged }
}

/** What the window bar and handles need. */
export type MiniWindow = ReturnType<typeof useMiniWindow>

export interface WindowBarProps {
  window: MiniWindow
  t: typeof mediaPlayerMessages.defaults
  title?: string | undefined
  onMenuChange: (open: boolean) => void
  onMaximise?: (() => void) | undefined
  onReturn: () => void
  onClose: () => void
}

const CORNERS = [
  ["top-left", "topLeft"],
  ["top-right", "topRight"],
  ["bottom-left", "bottomLeft"],
  ["bottom-right", "bottomRight"],
] as const

const SIZES = [
  ["small", "sizeSmall"],
  ["medium", "sizeMedium"],
  ["large", "sizeLarge"],
] as const

/** The mini player's title bar: a keyboard move handle, a Move menu for one pointer (WCAG 2.5.7) and a way out. */
export function WindowBar({ window: mini, t, title, onMenuChange, onMaximise, onReturn, onClose }: WindowBarProps) {
  const onHandleKey = (event: KeyboardEvent<HTMLElement>) => {
    const step = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key]
    if (!step) return
    event.preventDefault()
    event.stopPropagation()
    if (event.shiftKey) mini.nudge(0, 0, (step[0]! || -step[1]!) * KEY_STEP)
    else mini.nudge(step[0]! * KEY_STEP, step[1]! * KEY_STEP, 0)
  }
  return (
    // The drag has the handle's arrow keys and the Move menu as its other paths.
    // oxlint-disable-next-line jsx-a11y/no-static-element-interactions
    <div className="fa-media-window-bar over-imagery" data-print="hide" onPointerDown={mini.beginMove}>
      <Button className="fa-media-grip" variant="ghost" size="sm" icon={<IconGrip />} aria-label={t.movePlayer} tooltip={t.moveHelp} onKeyDown={onHandleKey} />
      <span className="fa-media-window-title">{title ? <TruncatedText>{title}</TruncatedText> : null}</span>
      <Menu.Root onOpenChange={(open) => onMenuChange(open)}>
        <Menu.Trigger render={<Button variant="ghost" size="sm" icon={<IconMove />} aria-label={t.playerPosition} />} />
        <Menu.Popup side="bottom" align="end">
          {CORNERS.map(([corner, label]) => (
            <Menu.Item key={corner} onClick={() => mini.toCorner(corner)}>
              {t[label]}
            </Menu.Item>
          ))}
          <Menu.Separator />
          {SIZES.map(([size, label]) => (
            <Menu.Item key={size} onClick={() => mini.toSize(WINDOW_SIZES[size])}>
              {t[label]}
            </Menu.Item>
          ))}
        </Menu.Popup>
      </Menu.Root>
      {onMaximise ? <Button className="fa-media-wide" variant="ghost" size="sm" icon={<IconMaximise />} aria-label={t.maximise} onClick={onMaximise} /> : null}
      <Button variant="ghost" size="sm" icon={<IconRestore />} aria-label={t.returnToPage} onClick={onReturn} />
      <Button variant="ghost" size="sm" icon={<IconClose />} aria-label={t.closePlayer} onClick={onClose} />
    </div>
  )
}

/** Pointer handles at the corners. The keyboard path is Shift with arrows on the move handle, and the menu's sizes. */
export function ResizeHandles({ window: mini }: { window: MiniWindow }) {
  return (
    <>
      {CORNERS.map(([corner]) => (
        <span key={corner} className="fa-media-resize" data-corner={corner} aria-hidden onPointerDown={(event) => mini.beginResize(event, corner)} />
      ))}
    </>
  )
}
