/**
 * Full screen for one window (R14): the Fullscreen API on the window's frame. The frame
 * hides its app bar and status bar while it is the full-screen element, so the body fills
 * the screen; popups portal into it (popupContainer). Esc, or `exit`, leaves full screen.
 * State is per document and never stored or synced.
 */
import { useCallback, useSyncExternalStore, type RefObject } from "react"

function subscribe(notify: () => void) {
  document.addEventListener("fullscreenchange", notify)
  return () => document.removeEventListener("fullscreenchange", notify)
}

/** Whether this document may put an element in full screen (false in most iframes and on iPhone). */
export function fullscreenSupported() {
  return typeof document !== "undefined" && document.fullscreenEnabled === true && "requestFullscreen" in Element.prototype
}

export interface WindowFullscreen {
  /** The frame is the full-screen element. */
  fullscreen: boolean
  /** Enter, or leave, full screen. Entering needs a user gesture (a click or key press). */
  toggle: () => void
  /** Leave full screen when the frame is in it; otherwise nothing. */
  exit: () => void
}

/** Full screen for the frame in `ref`. */
export function useWindowFullscreen(ref: RefObject<HTMLElement | null>): WindowFullscreen {
  const fullscreen = useSyncExternalStore(
    subscribe,
    () => ref.current !== null && document.fullscreenElement === ref.current,
    () => false
  )
  const exit = useCallback(() => {
    if (ref.current && document.fullscreenElement === ref.current) void document.exitFullscreen().catch(() => {})
  }, [ref])
  const toggle = useCallback(() => {
    const frame = ref.current
    if (!frame) return
    if (document.fullscreenElement === frame) exit()
    else void frame.requestFullscreen({ navigationUI: "hide" }).catch(() => {})
  }, [ref, exit])
  return { fullscreen, toggle, exit }
}
