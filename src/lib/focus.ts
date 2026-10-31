/**
 * Focus helpers shared by panes that hide (AppShell's drawer and inspector, Sidebar). A pane
 * that collapses makes its contents inert or invisible, so focus inside it first moves to the
 * control that brings it back (R20.3) instead of falling to the body.
 */

/** Focuses the element if it can take focus (connected, not inert or hidden); reports success. */
export function tryFocus(element: HTMLElement | null | undefined): boolean {
  if (!element?.isConnected || element.closest("[inert], [hidden]")) return false
  element.focus()
  return document.activeElement === element
}

/**
 * Focuses the first element that takes focus, in order; otherwise makes `fallback` focusable
 * (tabindex -1) and focuses it. Reports whether anything took focus.
 */
export function focusFirst(targets: Array<HTMLElement | null | undefined>, fallback?: HTMLElement | null): boolean {
  if (targets.some(tryFocus)) return true
  if (!fallback?.isConnected) return false
  if (!fallback.hasAttribute("tabindex")) fallback.tabIndex = -1
  fallback.focus()
  return document.activeElement === fallback
}
