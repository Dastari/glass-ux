import { ContextMenu as BaseContextMenu } from "@base-ui/react/context-menu"
import { useRef, type ComponentProps, type KeyboardEvent, type MouseEvent } from "react"
import { usePopupMetrics } from "../../lib/popup-metrics.js"
import { Menu, type MenuPopupProps } from "../menu/index.js"

/** How long a native contextmenu that follows our keyboard-opened one is ignored. */
const KEYBOARD_ECHO_MS = 400

export type ContextMenuTriggerProps = ComponentProps<typeof BaseContextMenu.Trigger>

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
 * then opens at the bottom-left of the focused element instead of at the pointer.
 */
function ContextMenuTrigger({ onKeyDown, onContextMenuCapture, ...rest }: ContextMenuTriggerProps) {
  const openedByKeyboard = useRef(0)

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event as never)
    if (event.defaultPrevented) return
    const isMenuKey = event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")
    if (!isMenuKey) return
    event.preventDefault()
    const target = event.target as HTMLElement
    const rect = target.getBoundingClientRect()
    openedByKeyboard.current = performance.now()
    target.dispatchEvent(
      new window.MouseEvent("contextmenu", {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + Math.min(rect.width / 2, 24),
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

  return <BaseContextMenu.Trigger {...rest} onKeyDown={handleKeyDown} onContextMenuCapture={handleContextMenuCapture} />
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
  Root: BaseContextMenu.Root,
  Trigger: ContextMenuTrigger,
  Popup: ContextMenuPopup,
}

export { BaseContextMenu as ContextMenuPrimitive }
