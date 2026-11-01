/**
 * Where popups portal to. While an element is full screen (a window in full screen, R14),
 * only that element's subtree is drawn, so a menu, tooltip or dialog portalled to the
 * document body would open unseen. Popups render into the full-screen element instead;
 * otherwise they keep Base UI's default, the body.
 *
 * Read at render time: a popup renders when it opens, so it lands in the right place.
 */
import { createContext, useContext, useSyncExternalStore } from "react"

/** The element popups should portal into: the full-screen element, if any (not the root), else undefined for Base UI's default body. Pass it as a portal's `container`. */
export function popupContainer(): HTMLElement | undefined {
  if (typeof document === "undefined") return undefined
  const element = document.fullscreenElement
  return element instanceof HTMLElement && element !== document.documentElement ? element : undefined
}

/**
 * An element a subtree's popups belong in, for content in the top layer that is not full
 * screen (a player shown with the Popover API): anything portalled to the body would open
 * behind it. Read by Menu and Tooltip through `usePopupLayer`.
 */
export const PopupLayer = /* @__PURE__ */ createContext<HTMLElement | null>(null)

/** The element a popup rendered here should portal into: the nearest `PopupLayer`, else `popupContainer()`. */
export function usePopupLayer(): HTMLElement | undefined {
  return useContext(PopupLayer) ?? popupContainer()
}

function subscribe(notify: () => void) {
  document.addEventListener("fullscreenchange", notify)
  return () => document.removeEventListener("fullscreenchange", notify)
}

/**
 * `popupContainer()` for a portal that stays mounted (the toast viewport): it re-renders on
 * entering and leaving full screen, so the portal moves with it.
 */
export function usePopupContainer(): HTMLElement | undefined {
  return useSyncExternalStore(subscribe, popupContainer, () => undefined)
}
