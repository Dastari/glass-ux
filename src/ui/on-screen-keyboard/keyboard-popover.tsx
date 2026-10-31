import { Popover as BasePopover } from "@base-ui/react/popover"
import { useCallback, useEffect, useState, type Ref } from "react"
import type { GlassLevel } from "../../lib/appearance/appearance.js"
import { cx } from "../../lib/cx.js"
import { DirectionPortal } from "../../lib/direction-portal.js"
import { useMessages } from "../../lib/i18n/index.js"
import { popupContainer } from "../../lib/popup-container.js"
import { usePopupMetrics } from "../../lib/popup-metrics.js"
import { useControllable } from "../../lib/use-controllable.js"
import { keepFocus, useEscapeIn, type KeyboardContainerKeyboardProps, type KeyboardOpenChangeDetails } from "./containers.js"
import { onScreenKeyboardMessages } from "./messages.js"
import { OnScreenKeyboard, type OnScreenKeyboardTarget } from "./on-screen-keyboard.js"
import { resolveTarget } from "./target.js"

/** Props for KeyboardPopover. Every OnScreenKeyboard prop except `onHide`, `onEscape` and `autoFocus` passes through to the keyboard. */
export interface KeyboardPopoverProps extends Omit<KeyboardContainerKeyboardProps, "target"> {
  /** The input, textarea or contenteditable element the keyboard types into and is anchored to, or a ref to it. */
  target: OnScreenKeyboardTarget
  /** Whether the keyboard is shown. Pair with `onOpenChange` to control it. */
  open?: boolean
  /** Whether it starts shown when uncontrolled. Default false. */
  defaultOpen?: boolean
  /**
   * Called with the next open state and why: Escape, the hide key, or a pointer pressed
   * outside both the target and the keyboard.
   */
  onOpenChange?: (open: boolean, details: KeyboardOpenChangeDetails) => void
  /** The side of the target it prefers; it flips when there is no room. Default "bottom". */
  side?: "bottom" | "top"
  /** Its alignment with the target; it shifts to stay on screen. Default "center". */
  align?: "start" | "center" | "end"
  /** Draw an arrow pointing at the target. Default false: like Popover, it grows out of the target instead. */
  arrow?: boolean
  /** This popup's own material level: `full` (Glass), `reduced` (Frosted) or `solid`. Default: the page's. */
  glass?: GlassLevel
  /** A class for the popup (the keyboard takes `className`). */
  panelClassName?: string
  /** The popup element, while it is mounted. */
  panelRef?: Ref<HTMLDivElement>
}

/**
 * A floating ("hover") on-screen keyboard anchored to its target, such as a search field.
 * Non-modal: focus stays in the target, and pressing keys never takes it. Prefers the side
 * below the target, flips above when there is no room and shifts to stay on screen.
 *
 * Escape, the hide key and a pointer pressed outside both the target and the keyboard
 * close it. It is a non-modal dialog named by the keyboard messages, built on Base UI's
 * popover and positioned like Popover (`--popup-offset`, the collision padding).
 */
export function KeyboardPopover({
  target,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  side = "bottom",
  align = "center",
  arrow = false,
  glass,
  panelClassName,
  panelRef,
  size = "md",
  ...keyboard
}: KeyboardPopoverProps) {
  const [open, setOpen] = useControllable(openProp, defaultOpen)
  const messages = useMessages(onScreenKeyboardMessages)
  const popup = usePopupMetrics()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  useEffect(() => {
    const element = resolveTarget(target)
    if (element !== anchor) setAnchor(element)
  })

  const change = useCallback(
    (next: boolean, details: KeyboardOpenChangeDetails) => {
      onOpenChange?.(next, details)
      setOpen(next)
    },
    [onOpenChange, setOpen],
  )
  const escape = useCallback((event?: Event) => change(false, { reason: "escape-key", event }), [change])
  useEscapeIn(anchor, open, escape)

  return (
    <BasePopover.Root
      open={open && !!anchor}
      modal={false}
      onOpenChange={(next, details) => {
        if (next) return
        const event = details.event as Event | undefined
        const node = event?.target instanceof Node ? event.target : null
        if (details.reason === "outside-press") {
          // The target is part of the keyboard: pressing in it moves the caret.
          if (node && anchor?.contains(node)) {
            details.cancel()
            return
          }
          change(false, { reason: "outside-press", event })
        } else if (details.reason === "escape-key") change(false, { reason: "escape-key", event })
        else if (details.reason === "focus-out") {
          // Focus going back to the target from a key keeps it open.
          const to = (event as FocusEvent | undefined)?.relatedTarget
          if (to instanceof Node && anchor?.contains(to)) {
            details.cancel()
            return
          }
          change(false, { reason: "focus-out", event })
        }
      }}
    >
      <BasePopover.Portal render={<DirectionPortal />} container={popupContainer()}>
        <BasePopover.Positioner
          className="fa-osk-popover-positioner"
          anchor={anchor}
          side={side}
          align={align}
          sideOffset={arrow ? popup.offset * 2 : popup.offset}
          collisionPadding={popup.collisionPadding}
          arrowPadding={popup.rem}
        >
          <BasePopover.Popup
            ref={panelRef}
            className={cx("glass-overlay fa-popup fa-osk-popover", panelClassName)}
            data-size={size}
            data-glass={glass}
            data-print="hide"
            aria-label={messages.keyboardPanel}
            initialFocus={false}
            finalFocus={false}
            onPointerDown={keepFocus}
            onMouseDown={keepFocus}
          >
            {arrow ? <BasePopover.Arrow className="fa-osk-popover-arrow" /> : null}
            <OnScreenKeyboard {...keyboard} target={target} size={size} onHide={() => change(false, { reason: "hide-key" })} onEscape={() => escape()} />
          </BasePopover.Popup>
        </BasePopover.Positioner>
      </BasePopover.Portal>
    </BasePopover.Root>
  )
}
