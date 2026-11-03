import { useEffect, useMemo, useRef, type RefObject } from "react"
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

/** Moves between focus regions, for a host that binds the keys itself. */
export interface FocusRegionNavigation {
  /** Focus the next region, wrapping at the end. False when focus stayed: fewer than two regions, a modal dialog open, or focus outside `scope`. */
  next(): boolean
  /** Focus the previous region, wrapping at the start. False when focus stayed, as for `next`. */
  previous(): boolean
}

/**
 * The traversal behind {@link useFocusRegions} with no keys bound: `next()` and `previous()`
 * move as F6 and Shift+F6 would, remembering where focus last was in each region and skipping
 * hidden and inert ones. Use it where an application routes its own shortcuts, through
 * `defineActions` or a `KeymapProvider` binding, so the host can veto or rebind them. Each
 * returns whether focus moved; call `preventDefault` on the key only then, so the browser keeps
 * F6 otherwise.
 * @example
 * const regions = useFocusRegionNavigation({ scope: root });
 * defineActions([{ id: "nextRegion", shortcut: "f6", run: () => regions.next() }]);
 */
export function useFocusRegionNavigation({ scope, enabled = true, selector }: FocusRegionOptions = {}): FocusRegionNavigation {
  const last = useRef(new WeakMap<HTMLElement, HTMLElement>())
  const options = useRef({ scope, enabled, selector })
  options.current = { scope, enabled, selector }

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

  return useMemo(() => {
    const move = (step: 1 | -1) => {
      const { scope, enabled, selector } = options.current
      if (!enabled) return false
      const root = scope ? scope.current : document
      const active = document.activeElement
      if (!root || modalOpen()) return false
      if (scope && active && active !== document.body && !root.contains(active)) return false
      const regions = regionsIn(root, selector)
      if (regions.length < 2) return false
      // The innermost region holding focus; a nested region comes later in document order.
      const current = regions.findLastIndex((region) => region.contains(active))
      const next = current < 0 ? (step < 0 ? regions.length - 1 : 0) : (current + step + regions.length) % regions.length
      const region = regions[next]!
      enter(region, last.current.get(region))
      return true
    }
    return { next: () => move(1), previous: () => move(-1) }
  }, [])
}

/**
 * F6 and Shift+F6 move between an application's regions, wrapping at the ends, so a keyboard
 * user can leave a text editor or a terminal-like pane, where Tab belongs to the content.
 * Focus returns to where it last was in a region, or else its first control; a region with
 * no control takes focus itself. Hidden and inert regions are skipped.
 *
 * Mark regions with `data-focus-region`, or rely on the landmarks. `AppShell` does this for
 * its slots with `focusRegions`. An application that binds its own keys uses
 * {@link useFocusRegionNavigation} instead.
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
export function useFocusRegions(options: FocusRegionOptions = {}): string {
  const regions = useFocusRegionNavigation(options)
  return useHotkeys(
    ["f6", "shift+f6"],
    (event) => {
      if (event.shiftKey ? regions.previous() : regions.next()) event.preventDefault()
    },
    { allowInInputs: true, preventDefault: false, enabled: options.enabled ?? true }
  )
}
