/**
 * SplitPane — two panes and the divider between them: a tree beside a table, a list above
 * its details.
 *
 * The divider is a separator: drag it, or focus it and use the arrow keys (Shift for bigger
 * steps), Home and End for the limits, and Enter to hide or show the pane that gives way.
 * Double-click restores the default size. Each pane keeps between its minimum and maximum,
 * clamped in CSS so the first frame is right before anything is measured. A drag writes only
 * a custom property and commits once at the end (docs/performance.md).
 *
 * In a split narrower than `collapseBelow`, the pane that gives way hides behind a button in a
 * slim rail; the button shows it over the other pane. Inside a window body the size is
 * remembered per window kind; elsewhere pass `storageKey`.
 */
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react"
import { IconSidebar } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { remPx } from "../../lib/rem.js"
import { useStorageScope } from "../../lib/storage-scope.js"
import { useElementSize } from "../../lib/use-element-size.js"
import { Button } from "../button/index.js"

/** A length along the split: px as a number, or a string in rem, px or % of the split. */
export type SplitPaneLength = number | `${number}rem` | `${number}px` | `${number}%`

export interface SplitPaneProps extends Omit<ComponentProps<"div">, "children"> {
  /** The first pane: the tree, the list. */
  start: ReactNode
  /** The second pane: the table, the details. */
  end: ReactNode
  /** Names the first pane: its region, the divider ("Resize Folders") and the button that shows it ("Show Folders"). */
  startLabel: string
  /** Names the second pane's region, and its button when it is the one that gives way. */
  endLabel?: string
  /** `horizontal` (default): side by side. `vertical`: one above the other. */
  orientation?: "horizontal" | "vertical"
  /** The first pane's size when none is remembered. Default "40%". */
  defaultSize?: SplitPaneLength
  /** The first pane's size in px, controlled. Pair with `onSizeChange`. */
  size?: number
  /** Called with the first pane's new size in px when a drag or a key press sets it. */
  onSizeChange?: (size: number) => void
  /** The first pane's minimum. Default "12rem". */
  startMin?: SplitPaneLength
  /** The first pane's maximum. Default "100%" (only the second pane's minimum limits it). */
  startMax?: SplitPaneLength
  /** The second pane's minimum. Default "12rem". */
  endMin?: SplitPaneLength
  /** The second pane's maximum. Default "100%". */
  endMax?: SplitPaneLength
  /** The pane that gives way: Enter on the divider hides it, and a narrow split hides it. Default "start". */
  collapse?: "start" | "end"
  /** Below this length along the split, the pane that gives way hides behind a button. Default "40rem". */
  collapseBelow?: SplitPaneLength
  /**
   * Where the size is remembered (localStorage). Inside a window body it defaults to one key
   * per window kind (`glass-ux.split:window:<kind>:<name>`); elsewhere nothing is remembered
   * unless you pass one. null turns it off.
   */
  storageKey?: string | null
  /** Tells several splits in one window kind apart in storage. Default "split". */
  name?: string
}

interface Remembered {
  size?: number
  collapsed?: boolean
}

/** A length in px against the split's length. */
function toPx(length: SplitPaneLength, total: number): number {
  if (typeof length === "number") return length
  const value = Number.parseFloat(length)
  if (length.endsWith("%")) return (value / 100) * total
  if (length.endsWith("rem")) return value * remPx()
  return value
}

/** A length as CSS. */
const toCss = (length: SplitPaneLength) => (typeof length === "number" ? `${length}px` : length)

function read(key: string | null): Remembered {
  if (!key || typeof localStorage === "undefined") return {}
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "null") as Remembered | null
    return value && typeof value === "object" ? value : {}
  } catch {
    return {}
  }
}

function write(key: string | null, value: Remembered) {
  if (!key || typeof localStorage === "undefined") return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Private mode or a full store: the size lasts for this page.
  }
}

const STEP_REM = 1
const BIG_STEP_REM = 4

/**
 * Two panes and the divider between them: a tree beside a table, a list above its details.
 * Drag the divider or use its keys; each pane keeps within its limits; the pane that gives
 * way hides on Enter, or behind a rail button in a narrow split. Remembered per window kind
 * inside a window body.
 */
export function SplitPane({
  start,
  end,
  startLabel,
  endLabel,
  orientation = "horizontal",
  defaultSize = "40%",
  size: sizeProp,
  onSizeChange,
  startMin = "12rem", // tokens:allow a prop default, in rem so it follows UI scale
  startMax = "100%",
  endMin = "12rem", // tokens:allow a prop default, in rem so it follows UI scale
  endMax = "100%",
  collapse = "start",
  collapseBelow = "40rem", // tokens:allow a prop default, in rem so it follows UI scale
  storageKey,
  name = "split",
  className,
  style,
  ...rest
}: SplitPaneProps) {
  const scope = useStorageScope()
  const key = storageKey === undefined ? (scope ? `glass-ux.split:${scope}:${name}` : null) : storageKey
  const [remembered, setRemembered] = useState<Remembered>(() => read(key))
  const rootRef = useRef<HTMLDivElement>(null)
  const handleRef = useRef<HTMLDivElement>(null)
  const box = useElementSize(rootRef)
  const horizontal = orientation === "horizontal"
  const total = horizontal ? box.width : box.height
  const startId = useId()
  const endId = useId()
  const [dragging, setDragging] = useState(false)
  const [overlay, setOverlay] = useState(false)

  const measured = total > 0
  const narrow = measured && total < toPx(collapseBelow, total)
  const collapsed = Boolean(remembered.collapsed)
  const hidden = narrow || collapsed
  // While hidden in a narrow split, the button shows the pane over the other one.
  const overlaid = narrow && overlay
  useEffect(() => {
    if (!narrow) setOverlay(false)
  }, [narrow])

  // The handle's own length is part of the split (measured by the observer, never mid-render).
  const handleBox = useElementSize(handleRef)
  const handlePx = horizontal ? handleBox.width : handleBox.height
  const bounds = () => {
    const room = total - handlePx
    const low = Math.max(toPx(startMin, total), room - toPx(endMax, total))
    const high = Math.min(toPx(startMax, total), room - toPx(endMin, total))
    return { low, high: Math.max(low, high) }
  }
  const clamp = (value: number) => {
    const { low, high } = bounds()
    return Math.min(high, Math.max(low, value))
  }
  const raw = sizeProp ?? remembered.size
  const current = raw !== undefined ? clamp(raw) : measured ? clamp(toPx(defaultSize, total)) : 0

  const commit = (next: number) => {
    const value = Math.round(clamp(next))
    if (sizeProp === undefined) {
      const stored = { ...remembered, size: value }
      setRemembered(stored)
      write(key, stored)
    }
    onSizeChange?.(value)
  }
  const setCollapsed = (value: boolean) => {
    const stored = { ...remembered, collapsed: value }
    setRemembered(stored)
    write(key, stored)
  }
  const reset = () => {
    const stored = { ...remembered, size: undefined }
    setRemembered(stored)
    write(key, stored)
    if (measured) onSizeChange?.(Math.round(clamp(toPx(defaultSize, total))))
  }

  // ── Drag ───────────────────────────────────────────────────────────────
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !rootRef.current) return
    event.preventDefault()
    const handle = event.currentTarget
    const root = rootRef.current
    handle.setPointerCapture(event.pointerId)
    // In RTL the first pane is on the right: moving right makes it smaller.
    const sign = horizontal && getComputedStyle(root).direction === "rtl" ? -1 : 1
    const origin = horizontal ? event.clientX : event.clientY
    const from = current
    let latest = from
    setDragging(true)
    const move = (moveEvent: PointerEvent) => {
      const position = horizontal ? moveEvent.clientX : moveEvent.clientY
      latest = clamp(from + sign * (position - origin))
      root.style.setProperty("--_size", `${latest}px`)
    }
    const up = () => {
      handle.removeEventListener("pointermove", move)
      handle.removeEventListener("pointerup", up)
      handle.removeEventListener("pointercancel", up)
      root.style.removeProperty("--_size")
      setDragging(false)
      if (latest !== from) commit(latest)
    }
    handle.addEventListener("pointermove", move)
    handle.addEventListener("pointerup", up)
    handle.addEventListener("pointercancel", up)
  }

  // ── Keys ───────────────────────────────────────────────────────────────
  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const rtl = horizontal && rootRef.current && getComputedStyle(rootRef.current).direction === "rtl"
    const grow = horizontal ? (rtl ? "ArrowLeft" : "ArrowRight") : "ArrowDown"
    const shrink = horizontal ? (rtl ? "ArrowRight" : "ArrowLeft") : "ArrowUp"
    const step = (event.shiftKey ? BIG_STEP_REM : STEP_REM) * remPx()
    const { low, high } = bounds()
    if (event.key === grow) commit(current + step)
    else if (event.key === shrink) commit(current - step)
    else if (event.key === "Home") commit(low)
    else if (event.key === "End") commit(high)
    else if (event.key === "Enter") setCollapsed(!collapsed)
    else return
    event.preventDefault()
  }

  const percent = (value: number) => (measured ? Math.round((value / total) * 100) : 0)
  const giving = collapse === "start" ? startLabel : (endLabel ?? "pane")
  const tracks = hidden
    ? collapse === "start"
      ? "var(--_rail) minmax(0, 1fr)"
      : "minmax(0, 1fr) var(--_rail)"
    : "var(--_start) var(--_handle) minmax(0, 1fr)"
  const vars = {
    // The first pane's size, clamped to both panes' limits along the split.
    "--_start": `clamp(${toCss(startMin)}, var(--_size, ${raw !== undefined ? `${raw}px` : toCss(defaultSize)}), min(${toCss(startMax)}, 100% - var(--_handle) - ${toCss(endMin)}))`,
    [horizontal ? "gridTemplateColumns" : "gridTemplateRows"]: tracks,
    ...style,
  } as CSSProperties

  const toggle = (
    <div className="fa-split-rail">
      <Button
        variant="ghost"
        size="sm"
        icon={<IconSidebar />}
        aria-label={narrow ? `${overlaid ? "Hide" : "Show"} ${giving}` : `Show ${giving}`}
        aria-expanded={narrow ? overlaid : false}
        aria-controls={collapse === "start" ? startId : endId}
        onClick={() => (narrow ? setOverlay(!overlay) : setCollapsed(false))}
      />
    </div>
  )
  const paneHidden = (pane: "start" | "end") => hidden && collapse === pane && !overlaid
  const closeOverlay = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (overlaid && event.key === "Escape") {
      event.stopPropagation()
      setOverlay(false)
    }
  }

  return (
    <div
      {...rest}
      ref={rootRef}
      className={cx("fa-split", className)}
      data-orientation={orientation}
      data-collapse={collapse}
      data-hidden={hidden ? "" : undefined}
      data-overlay={overlaid ? "" : undefined}
      data-dragging={dragging ? "" : undefined}
      style={vars}
    >
      <div
        id={startId}
        role="region"
        aria-label={startLabel}
        className="fa-split-pane"
        data-pane="start"
        hidden={paneHidden("start") || undefined}
        onKeyDown={collapse === "start" ? closeOverlay : undefined}
      >
        {start}
      </div>
      {hidden ? (
        toggle
      ) : (
        <div
          ref={handleRef}
          role="separator"
          tabIndex={0}
          aria-orientation={horizontal ? "vertical" : "horizontal"}
          aria-label={`Resize ${startLabel}`}
          aria-controls={startId}
          aria-valuemin={percent(bounds().low)}
          aria-valuemax={percent(bounds().high)}
          aria-valuenow={percent(current)}
          className="fa-split-handle"
          data-active={dragging ? "" : undefined}
          onPointerDown={onPointerDown}
          onKeyDown={onKeyDown}
          onDoubleClick={reset}
        >
          <span className="fa-split-grip" aria-hidden />
        </div>
      )}
      <div
        id={endId}
        role={endLabel ? "region" : undefined}
        aria-label={endLabel}
        className="fa-split-pane"
        data-pane="end"
        hidden={paneHidden("end") || undefined}
        onKeyDown={collapse === "end" ? closeOverlay : undefined}
      >
        {end}
      </div>
    </div>
  )
}

/** The default storage key for a split inside a window body of `kind`, for clearing it. */
export const splitPaneStorageKey = (kind: string, name = "split") => `glass-ux.split:window:${kind}:${name}`

