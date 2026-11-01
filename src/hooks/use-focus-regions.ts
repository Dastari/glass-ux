import { useEffect, useRef, type RefObject } from "react"
import { useHotkeys } from "./use-hotkeys.js"

/** Focus region settings. */
export interface FocusRegionOptions {
  /** Regions are looked for inside this element. Defaults to the whole document. */
  scope?: RefObject<HTMLElement | null>
  /** Listen while true (default). */
  enabled?: boolean
  /**
   * The regions, in document order. Defaults to elements marked `data-focus-region` and, where
   * there are none, the outermost landmarks: header, nav, main, aside, footer and their roles.
   */
  selector?: string
}

const MARKED = "[data-focus-region]"
const LANDMARKS =
  "header, nav, main, aside, footer, [role='banner'], [role='navigation'], [role='main'], [role='complementary'], [role='contentinfo']"
const FOCUSABLE =
  "a[href], button:not([disabled]), input:not([disabled]):not([type='hidden']), select:not([disabled]), textarea:not([disabled]), [contenteditable]:not([contenteditable='false']), [tabindex]:not([tabindex='-1'])"
const MODAL = "dialog:modal, [aria-modal='true'], [role='alertdialog']"

/** Something a person can reach: not hidden, inert or removed from the accessibility tree. */
function available(element: HTMLElement) {
  if (!element.isConnected || element.closest("[inert], [hidden], [aria-hidden='true']")) return false
  if (element.checkVisibility) return element.checkVisibility({ visibilityProperty: true })
  return getComputedStyle(element).display !== "none"
}

function regionsIn(root: ParentNode, selector: string | undefined) {
  const marked = selector ?? MARKED
  let found = [...root.querySelectorAll<HTMLElement>(marked)]
  if (!selector && !found.length) {
    const landmarks = [...root.querySelectorAll<HTMLElement>(LANDMARKS)]
    found = landmarks.filter((element) => !landmarks.some((other) => other !== element && other.contains(element)))
  }
  return found.filter(available)
}

/** Whether a modal surface says so itself. Base UI's modal dialogs instead hide what lies outside them, which `available` sees. */
function modalOpen() {
  for (const element of document.querySelectorAll<HTMLElement>(MODAL)) if (available(element)) return true
  return false
}

function enter(region: HTMLElement, remembered: HTMLElement | undefined) {
  const target =
    remembered && region.contains(remembered) && available(remembered)
      ? remembered
      : [...region.querySelectorAll<HTMLElement>(FOCUSABLE)].find((element) => element.tabIndex >= 0 && available(element))
  if (target) {
    target.focus()
    if (document.activeElement === target) return
  }
  // Nothing to land on: the region itself takes focus and shows the ring from the recipes.
  if (!region.hasAttribute("tabindex")) region.tabIndex = -1
  region.toggleAttribute("data-focus-region", true)
  region.focus()
}

/**
 * F6 and Shift+F6 move between an application's regions, wrapping at the ends, so a keyboard
 * user can leave a text editor or a terminal-like pane, where Tab belongs to the content.
 * Focus returns to where it last was in a region, or else its first control; a region with
 * no control takes focus itself. Hidden and inert regions are skipped.
 *
 * Mark regions with `data-focus-region`, or rely on the landmarks. `AppShell` does this for
 * its slots with `focusRegions`.
 *
 * Browsers bind F6 themselves, to move focus to the address bar and other browser panes. The
 * hook cancels that default only when it moves focus. With fewer than two regions, while a
 * modal dialog is open, or from outside `scope`, the key stays the browser's. Ctrl+L, Alt+D
 * or ⌘L still reach the address bar from an application that uses this. A key handler that
 * calls preventDefault keeps F6 for itself.
 *
 * Returns the `aria-keyshortcuts` value for a control that documents the keys.
 * @example
 * useFocusRegions();
 * // <aside data-focus-region aria-label="Outline">…</aside>
 */
export function useFocusRegions({ scope, enabled = true, selector }: FocusRegionOptions = {}): string {
  const last = useRef(new WeakMap<HTMLElement, HTMLElement>())

  useEffect(() => {
    if (!enabled) return
    const remember = (event: FocusEvent) => {
      const target = event.target
      if (!(target instanceof HTMLElement)) return
      for (const region of regionsIn(scope?.current ?? document, selector))
        if (region !== target && region.contains(target)) last.current.set(region, target)
    }
    document.addEventListener("focusin", remember)
    return () => document.removeEventListener("focusin", remember)
  }, [enabled, scope, selector])

  return useHotkeys(
    ["f6", "shift+f6"],
    (event) => {
      const root = scope ? scope.current : document
      const active = document.activeElement
      if (!root || modalOpen()) return
      if (scope && active && active !== document.body && !root.contains(active)) return
      const regions = regionsIn(root, selector)
      if (regions.length < 2) return
      // The innermost region holding focus; a nested region comes later in document order.
      const current = regions.findLastIndex((region) => region.contains(active))
      const step = event.shiftKey ? -1 : 1
      const next = current < 0 ? (event.shiftKey ? regions.length - 1 : 0) : (current + step + regions.length) % regions.length
      const region = regions[next]!
      event.preventDefault()
      enter(region, last.current.get(region))
    },
    { allowInInputs: true, preventDefault: false, enabled }
  )
}
