import { IconKeyboard, IconKeyboardHide } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { useMessages } from "../../lib/i18n/index.js"
import { Button, type ButtonProps } from "../button/index.js"
import { useKeyboardLink } from "./keyboard-provider.js"
import { onScreenKeyboardMessages } from "./messages.js"
import type { OnScreenKeyboardTarget } from "./on-screen-keyboard.js"
import { resolveTarget } from "./target.js"

/** Props for KeyboardToggle: a Button (ghost by default) without its own icon or label. */
export interface KeyboardToggleProps extends Omit<ButtonProps, "icon" | "iconEnd" | "children" | "aria-pressed"> {
  /**
   * The input to open the keyboard for. Default: the focused linked input; else, when the
   * toggle sits in a KeyboardTarget, that target's last focused input or its first; else the
   * last linked input that had focus, else the first linked input.
   */
  target?: OnScreenKeyboardTarget
}

/**
 * The button that shows and hides the OnScreenKeyboardProvider's keyboard: a keyboard icon,
 * pressed (`aria-pressed`) while the keyboard is open. Pressing it never takes focus from
 * the input, so the caret stays where it was; when the input is not focused (the toggle was
 * reached with Tab), opening moves focus to it. Named "On-screen keyboard", with a "Show
 * keyboard" or "Hide keyboard" tooltip. Outside a provider it renders nothing.
 */
export function KeyboardToggle({ target, variant = "ghost", className, tooltip, onClick, onPointerDown, onMouseDown, ...rest }: KeyboardToggleProps) {
  const { provider, nearest } = useKeyboardLink()
  const messages = useMessages(onScreenKeyboardMessages)
  if (!provider) return null
  const open = provider.isOpen
  return (
    <Button
      {...rest}
      variant={variant}
      className={cx("fa-osk-toggle", className)}
      icon={open ? <IconKeyboardHide /> : <IconKeyboard />}
      aria-label={rest["aria-label"] ?? messages.keyboardToggle}
      aria-pressed={open}
      tooltip={tooltip ?? (open ? messages.hide : messages.show)}
      onPointerDown={(event) => {
        onPointerDown?.(event)
        // Keep focus (and the caret) in the input.
        if (event.button === 0) event.preventDefault()
      }}
      onMouseDown={(event) => {
        onMouseDown?.(event)
        if (event.button === 0) event.preventDefault()
      }}
      onClick={(event) => {
        onClick?.(event)
        if (event.defaultPrevented) return
        provider.request(!open, "toggle", resolveTarget(target), nearest?.current)
      }}
    />
  )
}
