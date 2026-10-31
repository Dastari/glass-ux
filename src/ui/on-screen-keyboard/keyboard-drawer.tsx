import { useCallback, useEffect, useLayoutEffect, useRef, useState, type Ref } from "react"
import type { GlassLevel } from "../../lib/appearance/appearance.js"
import { cx } from "../../lib/cx.js"
import { useDirection } from "../../lib/locale/direction.js"
import { prefersReducedMotion } from "../../lib/motion.js"
import { popupContainer } from "../../lib/popup-container.js"
import { observeElementSizes } from "../../lib/resize-observer.js"
import { useControllable } from "../../lib/use-controllable.js"
import { Portal } from "../portal/index.js"
import {
  elementOf,
  keepFocus,
  useEscapeIn,
  usePresence,
  type ElementOrRef,
  type KeyboardContainerKeyboardProps,
  type KeyboardOpenChangeDetails,
} from "./containers.js"
import { OnScreenKeyboard } from "./on-screen-keyboard.js"
import { resolveTarget } from "./target.js"

/** The custom property an open KeyboardDrawer sets on its scroll root: the drawer's height in px. */
export const KEYBOARD_INSET_PROPERTY = "--keyboard-inset-height"

/** Props for KeyboardDrawer. Every OnScreenKeyboard prop except `onHide`, `onEscape` and `autoFocus` passes through to the keyboard. */
export interface KeyboardDrawerProps extends KeyboardContainerKeyboardProps {
  /** Whether the drawer is shown. Pair with `onOpenChange` to control it. */
  open?: boolean
  /** Whether the drawer starts shown when uncontrolled. Default false. */
  defaultOpen?: boolean
  /** Called with the next open state and why: Escape (in the target or on the keyboard) or the hide key. */
  onOpenChange?: (open: boolean, details: KeyboardOpenChangeDetails) => void
  /**
   * Dock to the bottom of this element instead of the viewport, and render into it. It must
   * be a containing block (`position: relative`) that does not scroll itself, such as a
   * window's or a kiosk frame's outer element. Default: the viewport (rendered into the
   * full-screen element when there is one, else the body).
   */
  container?: ElementOrRef
  /**
   * The element that receives `--keyboard-inset-height` (the drawer's height, in px) while
   * the drawer is open; it inherits to everything inside. Default: `container`, else
   * `document.documentElement`. In a Glass UX layout the document never scrolls, so pad the
   * scroll container's content with it, and the last fields can scroll above the drawer:
   * `padding-block-end: var(--keyboard-inset-height, 0px)`.
   */
  scrollRoot?: ElementOrRef
  /** The drawer's own material level: `full` (Glass), `reduced` (Frosted) or `solid`. Default: the page's. */
  glass?: GlassLevel
  /** A class for the drawer panel (the keyboard takes `className`). */
  panelClassName?: string
  /** The drawer panel element, while it is mounted. */
  panelRef?: Ref<HTMLDivElement>
}

/** Assign an element to a callback or object ref. */
function assignRef<T>(ref: Ref<T> | undefined, value: T | null): void {
  if (typeof ref === "function") ref(value)
  else if (ref) (ref as { current: T | null }).current = value
}

/**
 * Scroll the target so it sits above the drawer: a temporary `scroll-margin-block-end` of
 * the drawer's height, then `scrollIntoView({ block: "nearest" })`, which scrolls only as
 * far as needed and leaves a visible target where it is.
 */
function revealAbove(target: HTMLElement, inset: number): void {
  if (typeof target.scrollIntoView !== "function") return
  const style = target.style
  const previous = style.scrollMarginBlockEnd
  const view = target.ownerDocument.defaultView
  const rem = view ? Number.parseFloat(view.getComputedStyle(target.ownerDocument.documentElement).fontSize) || 16 : 16
  style.scrollMarginBlockEnd = `${inset + rem}px`
  target.scrollIntoView({ block: "nearest", inline: "nearest", behavior: prefersReducedMotion() ? "auto" : "smooth" })
  style.scrollMarginBlockEnd = previous
}

/**
 * An on-screen keyboard docked to the bottom of the viewport (or a `container`), for
 * kiosks and touch screens. Non-modal: no scrim, no focus trap, and pointer presses on it
 * never take focus from the input it types into, so the page stays usable around it.
 *
 * It slides up and down on the motion tokens (at once under Still or reduced motion),
 * keeps its last row above the home indicator (safe area), spans a phone's width and is
 * centred with a maximum width on larger screens. Its material follows the appearance
 * settings (Glass, Frosted, Solid, Flat); `glass` sets this drawer's own level.
 *
 * While open it sets `--keyboard-inset-height` (its height in px) on `scrollRoot` —
 * `document.documentElement` by default — so a layout can pad its scroll container's
 * content with `var(--keyboard-inset-height, 0px)`, and scrolls `target` into view above
 * itself (only as far as needed). Without that padding a field at the very end of a
 * scroller cannot rise above the drawer.
 * Escape (in the target or on the keyboard) and the hide key close it.
 *
 * To open it when a field gains focus, use OnScreenKeyboardProvider and KeyboardTarget.
 */
export function KeyboardDrawer({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  container,
  scrollRoot,
  glass,
  panelClassName,
  panelRef,
  target,
  size = "md",
  ...keyboard
}: KeyboardDrawerProps) {
  const [open, setOpen] = useControllable(openProp, defaultOpen)
  const direction = useDirection()
  // The portal mounts a commit after the drawer, so effects wait for the element itself.
  const [panelElement, setPanelElement] = useState<HTMLDivElement | null>(null)
  const presence = usePresence(open, panelElement)
  const latestPanelRef = useRef(panelRef)
  latestPanelRef.current = panelRef
  const attach = useCallback((element: HTMLDivElement | null) => {
    setPanelElement(element)
    assignRef(latestPanelRef.current, element)
  }, [])
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null)
  useEffect(() => {
    const element = resolveTarget(target)
    if (element !== targetElement) setTargetElement(element)
  })

  const change = useCallback(
    (next: boolean, details: KeyboardOpenChangeDetails) => {
      onOpenChange?.(next, details)
      setOpen(next)
    },
    [onOpenChange, setOpen],
  )
  const hide = useCallback(() => change(false, { reason: "hide-key" }), [change])
  const escape = useCallback((event?: Event) => change(false, { reason: "escape-key", event }), [change])
  useEscapeIn(targetElement, open, escape)

  // ── inset and reveal ───────────────────────────────────────────────────────
  const containerElement = elementOf(container)
  const showing = open && presence.mounted
  useLayoutEffect(() => {
    const element = panelElement
    if (!showing || !element) return
    const root = elementOf(scrollRoot) ?? containerElement ?? element.ownerDocument.documentElement
    const previous = root.style.getPropertyValue(KEYBOARD_INSET_PROPERTY)
    let last = -1
    const update = () => {
      const height = Math.round(element.offsetHeight)
      if (height === last) return
      last = height
      root.style.setProperty(KEYBOARD_INSET_PROPERTY, `${height}px`)
    }
    update()
    const sizes = observeElementSizes(update)
    sizes.observe(element)
    return () => {
      sizes.disconnect()
      if (previous) root.style.setProperty(KEYBOARD_INSET_PROPERTY, previous)
      else root.style.removeProperty(KEYBOARD_INSET_PROPERTY)
    }
  }, [showing, panelElement, scrollRoot, containerElement])

  useLayoutEffect(() => {
    if (!showing || !panelElement || !targetElement) return
    revealAbove(targetElement, panelElement.offsetHeight)
  }, [showing, panelElement, targetElement])

  if (!presence.mounted) return null
  const portalTarget = containerElement ?? popupContainer()
  return (
    <Portal container={portalTarget}>
      <div className="fa-osk-drawer-dock" data-docked={containerElement ? "container" : "viewport"} dir={direction}>
        <div
          ref={attach}
          className={cx("glass-overlay fa-osk-drawer", panelClassName)}
          data-size={size}
          data-glass={glass}
          data-open={presence.phase === "open" ? "" : undefined}
          data-starting-style={presence.phase === "starting" ? "" : undefined}
          data-ending-style={presence.phase === "ending" ? "" : undefined}
          data-print="hide"
          inert={presence.phase === "ending"}
          onPointerDown={keepFocus}
          onMouseDown={keepFocus}
        >
          <OnScreenKeyboard {...keyboard} target={target} size={size} onHide={hide} onEscape={() => escape()} />
        </div>
      </div>
    </Portal>
  )
}
