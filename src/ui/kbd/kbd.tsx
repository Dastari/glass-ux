import { useSyncExternalStore, type ComponentProps } from "react"
import { cx } from "../../lib/cx.js"
import { ariaShortcut, detectPlatform, formatShortcut, shortcutKeys, type Platform } from "./shortcut.js"

const noop = () => () => {}

/**
 * The viewer's platform. The server renders the non-Apple form; the client corrects it
 * right after hydration, so shortcut text never causes a hydration error.
 */
export function usePlatform(): Platform {
  return useSyncExternalStore(noop, detectPlatform, () => "other" as const)
}

export interface KbdProps extends Omit<ComponentProps<"kbd">, "children"> {
  /** A shortcut such as "mod+k", "mod+shift+r", "shift+f10" or a single key ("esc"). */
  keys: string
  /**
   * `keys` draws keycaps (help text, palette hints). `text` is the quiet inline form used
   * at the trailing edge of menu and palette rows.
   */
  variant?: "keys" | "text"
  size?: "sm" | "md"
}

/**
 * A keyboard shortcut, formatted for the viewer's platform: ⌘K on macOS, Ctrl K elsewhere.
 * The text is announced in its platform form; `aria-keyshortcuts` belongs on the control
 * the shortcut triggers, not here.
 */
export function Kbd({ keys, variant = "keys", size = "md", className, ...rest }: KbdProps) {
  const platform = usePlatform()
  if (variant === "text") {
    return (
      <kbd {...rest} className={cx("fa-kbd", className)} data-variant="text">
        {formatShortcut(keys, platform)}
      </kbd>
    )
  }
  return (
    <kbd {...rest} className={cx("fa-kbd", className)} data-variant="keys" data-size={size}>
      {shortcutKeys(keys, platform).map((cap, index) => (
        <kbd key={`${cap}-${index}`} className="fa-kbd-key">
          {cap}
        </kbd>
      ))}
    </kbd>
  )
}

/** aria-keyshortcuts value for the current platform. */
export function useAriaShortcut(keys: string | undefined) {
  const platform = usePlatform()
  return keys ? ariaShortcut(keys, platform) : undefined
}
