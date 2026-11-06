import { ContextMenu as BaseContextMenu } from "@base-ui/react/context-menu"
import { createContext, useContext, useRef, type ComponentProps, type KeyboardEvent, type MouseEvent, type TouchEvent } from "react"
import { usePopupMetrics } from "../../lib/popup-metrics.js"
import { isRtl } from "../../lib/direction.js"
import { Menu, type MenuPopupProps } from "../menu/index.js"

/** How long a native contextmenu that follows our keyboard-opened one is ignored. */
const KEYBOARD_ECHO_MS = 400

/** How long after a long press lifts its click may still arrive. */
const LONG_PRESS_CLICK_MS = 700

export type ContextMenuTriggerProps = ComponentProps<typeof BaseContextMenu.Trigger>
export type ContextMenuRootProps = ComponentProps<typeof BaseContextMenu.Root>

/** What one touch has done: whether a finger is down, and whether it opened the menu. */
interface TouchGesture {
  down: boolean
  opened: boolean
  liftedAt: number
}
const GestureContext = /* @__PURE__ */ createContext<{ current: TouchGesture } | null>(null)

/** The menu's root. It notes a menu opened by a long press, so the trigger can drop the click that follows. */
function ContextMenuRoot({ onOpenChange, ...rest }: ContextMenuRootProps) {
  const gesture = useRef<TouchGesture>({ down: false, opened: false, liftedAt: 0 })
  return (
    <GestureContext value={gesture}>
      <BaseContextMenu.Root
        {...rest}
        onOpenChange={(open, details) => {
          if (open && gesture.current.down) gesture.current.opened = true
          onOpenChange?.(open, details)
        }}
      />
    </GestureContext>
  )
}

/**
 * Opened from the keyboard, a menu should start on its first row (as menus opened with
 * Enter do). The context menu opens as if from the pointer, so once its popup has focus,
 * step onto the first row.
 */
function highlightFirstItem(attempt = 0) {
  const active = document.activeElement as HTMLElement | null
  if (active?.getAttribute("role") === "menu") {
    active.dispatchEvent(new window.KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }))
    return
  }
  if (attempt < 30) requestAnimationFrame(() => highlightFirstItem(attempt + 1))
}

/**
 * The area that opens the menu on right-click or long-press — and, so the keyboard
 * reaches it too (R11.5), on Shift+F10 or the Menu key while focus is inside it. The menu
 * then opens at the bottom inline start of the focused element instead of at the pointer.
 */
function ContextMenuTrigger({ onKeyDown, onContextMenuCapture, onTouchStartCapture, onTouchEndCapture, onClickCapture, ...rest }: ContextMenuTriggerProps) {
  const openedByKeyboard = useRef(0)
  const gesture = useContext(GestureContext)

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (gesture) gesture.current = { down: true, opened: false, liftedAt: 0 }
    onTouchStartCapture?.(event as never)
  }
  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (gesture) {
      gesture.current.down = false
      gesture.current.liftedAt = performance.now()
    }
    onTouchEndCapture?.(event as never)
  }
  // Lifting a long press clicks what is under the finger: a link would navigate away while the
  // menu it just opened is still up.
  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    if (gesture?.current.opened) {
      const { liftedAt } = gesture.current
      gesture.current.opened = false
      if (performance.now() - liftedAt < LONG_PRESS_CLICK_MS) {
        event.preventDefault()
        event.stopPropagation()
        return
      }
    }
    onClickCapture?.(event as never)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event as never)
    if (event.defaultPrevented) return
    const isMenuKey = event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")
    if (!isMenuKey) return
    event.preventDefault()
    const target = event.target as HTMLElement
    const rect = target.getBoundingClientRect()
    const inset = Math.min(rect.width / 2, 24)
    openedByKeyboard.current = performance.now()
    target.dispatchEvent(
      new window.MouseEvent("contextmenu", {
        bubbles: true,
        cancelable: true,
        clientX: isRtl(target) ? rect.right - inset : rect.left + inset,
        clientY: rect.bottom,
      })
    )
    highlightFirstItem()
  }

  const handleContextMenuCapture = (event: MouseEvent<HTMLDivElement>) => {
    // Some browsers still fire their own contextmenu after the key; ignore that echo.
    if (event.nativeEvent.isTrusted && performance.now() - openedByKeyboard.current < KEYBOARD_ECHO_MS) {
      event.preventDefault()
      event.stopPropagation()
      return
    }
    onContextMenuCapture?.(event as never)
  }

  return (
    <BaseContextMenu.Trigger
      {...rest}
      onKeyDown={handleKeyDown}
      onContextMenuCapture={handleContextMenuCapture}
      onTouchStartCapture={handleTouchStart}
      onTouchEndCapture={handleTouchEnd}
      onClickCapture={handleClick}
    />
  )
}

/** The context menu surface: identical to Menu.Popup, positioned at the pointer. */
function ContextMenuPopup(props: MenuPopupProps) {
  // Half the trigger gap: the pointer rests just outside the first row, not on its edge.
  const { pointerOffset } = usePopupMetrics()
  return <Menu.Popup sideOffset={pointerOffset} align="start" {...props} />
}

/**
 * Right-click menus. Visually and structurally the same as Menu — the same item parts —
 * so a row's ⋯ menu and its context menu are indistinguishable (R11.6).
 */
export const ContextMenu = {
  ...Menu,
  Root: ContextMenuRoot,
  Trigger: ContextMenuTrigger,
  Popup: ContextMenuPopup,
}

export { BaseContextMenu as ContextMenuPrimitive }
