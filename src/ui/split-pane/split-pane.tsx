import { useMessages } from "../../lib/i18n/index.js"
import { splitPaneMessages } from "./messages.js"
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
import { useStorageScope } from "../../lib/storage-scope.js"
import { useElementSize } from "../../lib/use-element-size.js"
import { Button } from "../button/index.js"
import { clampLength, lengthCss, lengthPx, separatorKeyAction, Separator, startSeparatorDrag } from "./separator.js"

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
  const messages = useMessages(splitPaneMessages)

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
  const narrow = measured && total < lengthPx(collapseBelow, total)
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
    const low = Math.max(lengthPx(startMin, total), room - lengthPx(endMax, total))
    const high = Math.min(lengthPx(startMax, total), room - lengthPx(endMin, total))
    return { low, high: Math.max(low, high) }
  }
  const clamp = (value: number) => clampLength(value, bounds())
  const raw = sizeProp ?? remembered.size
  const current = raw !== undefined ? clamp(raw) : measured ? clamp(lengthPx(defaultSize, total)) : 0

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
    if (measured) onSizeChange?.(Math.round(clamp(lengthPx(defaultSize, total))))
  }

  // ── Drag ───────────────────────────────────────────────────────────────
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !rootRef.current) return
    const root = rootRef.current
    const from = current
    let latest = from
    startSeparatorDrag(event, {
      root,
      horizontal,
      onMove: (delta) => {
        latest = clamp(from + delta)
        root.style.setProperty("--_size", `${latest}px`)
      },
      onEnd: () => {
        root.style.removeProperty("--_size")
        setDragging(false)
        if (latest !== from) commit(latest)
      },
    })
    setDragging(true)
  }

  // ── Keys ───────────────────────────────────────────────────────────────
  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const action = separatorKeyAction(event, horizontal, rootRef.current)
    if (!action) return
    const { low, high } = bounds()
    if (action.kind === "step") commit(current + action.delta)
    else if (action.kind === "low") commit(low)
    else if (action.kind === "high") commit(high)
    else setCollapsed(!collapsed)
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
    "--_start": `clamp(${lengthCss(startMin)}, var(--_size, ${raw !== undefined ? `${raw}px` : lengthCss(defaultSize)}), min(${lengthCss(startMax)}, 100% - var(--_handle) - ${lengthCss(endMin)}))`,
    [horizontal ? "gridTemplateColumns" : "gridTemplateRows"]: tracks,
    ...style,
  } as CSSProperties

  const toggle = (
    <div className="fa-split-rail">
      <Button
        variant="ghost"
        size="sm"
        icon={<IconSidebar />}
        aria-label={narrow && overlaid ? messages.hidePane(giving) : messages.showPane(giving)}
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
        <Separator
          ref={handleRef}
          horizontal={horizontal}
          label={messages.resize(startLabel)}
          controls={startId}
          min={percent(bounds().low)}
          max={percent(bounds().high)}
          now={percent(current)}
          active={dragging}
          onPointerDown={onPointerDown}
          onKeyDown={onKeyDown}
          onDoubleClick={reset}
        />
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

