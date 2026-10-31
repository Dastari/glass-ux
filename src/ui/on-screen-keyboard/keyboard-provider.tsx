import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent as ReactFocusEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react"
import { afterFrame, type KeyboardContainerKeyboardProps, type KeyboardOpenChangeDetails, type KeyboardOpenChangeReason } from "./containers.js"
import { KeyboardDrawer, type KeyboardDrawerProps } from "./keyboard-drawer.js"
import { KeyboardPopover, type KeyboardPopoverProps } from "./keyboard-popover.js"
import type { BuiltInLayoutId, KeyboardLayout } from "./layouts.js"
import { canServe, isSuppressed, layoutForInput, replacesNative, restoreNative, suppressNative, type ReplaceNativePolicy } from "./linking.js"
import type { EnterKind } from "./on-screen-keyboard.js"
import { isKeyboardTarget } from "./target.js"

/** What `useOnScreenKeyboard()` returns. */
export interface OnScreenKeyboardController {
  /**
   * Open the keyboard for `target`, or else the focused linked input, the last linked input
   * that had focus, or the first one inside a KeyboardTarget. A target that is disabled or
   * read-only, or inside a disabled KeyboardTarget, does not open it. Focus moves to the
   * target if it is elsewhere.
   */
  open: (target?: HTMLElement | null) => void
  /** Close the keyboard. Focus stays where it is. */
  close: () => void
  /** Close the keyboard if it is open, else open it as `open` does. */
  toggle: (target?: HTMLElement | null) => void
  /** Whether the keyboard is shown. */
  isOpen: boolean
  /** The element the keyboard types into while it is open; null when closed. */
  target: HTMLElement | null
}

/** The per-target settings a KeyboardTarget gives the inputs inside it. */
interface TargetOptions {
  layout?: KeyboardLayout | BuiltInLayoutId
  enterKind?: EnterKind
  disabled: boolean
}

interface ProviderContextValue extends OnScreenKeyboardController {
  show: "focus" | "manual"
  /** Open (by reason) or close. */
  request: (open: boolean, reason: KeyboardOpenChangeReason, target?: HTMLElement | null, scope?: HTMLElement | null) => void
  /** A linked input gained focus. */
  link: (element: HTMLElement, options: TargetOptions) => void
  /** A pointer is going down on a linked input that may open the keyboard: keep the native keyboard closed. */
  prepare: (element: HTMLElement, options: TargetOptions) => void
  register: (wrapper: HTMLElement, options: RefObject<TargetOptions>) => () => void
}

const ProviderContext = /* @__PURE__ */ createContext<ProviderContextValue | null>(null)
const TargetContext = /* @__PURE__ */ createContext<RefObject<HTMLElement | null> | null>(null)

const INERT: OnScreenKeyboardController = Object.freeze({
  open: () => {},
  close: () => {},
  toggle: () => {},
  isOpen: false,
  target: null,
})

/** Native focus events that a nested KeyboardTarget has already linked, so outer ones skip them. */
const handled = new WeakSet<Event>()

/** Props for OnScreenKeyboardProvider. Keyboard props (`layouts`, `size`, `variant`, …) pass through to the keyboard. */
export interface OnScreenKeyboardProviderProps extends Omit<KeyboardContainerKeyboardProps, "target" | "value" | "defaultValue" | "onValueChange" | "children"> {
  /**
   * `focus`: the keyboard opens when a linked input gains focus and closes when focus leaves
   * both the input and the keyboard (kiosks, TVs). `manual` (default): only
   * `useOnScreenKeyboard().open()` and KeyboardToggle open it.
   */
  show?: "focus" | "manual"
  /** `drawer` (default): KeyboardDrawer at the bottom edge. `popover`: KeyboardPopover anchored to the input. */
  presentation?: "drawer" | "popover"
  /**
   * Keep the device's own keyboard closed while the on-screen keyboard serves an input, by
   * setting `inputmode="none"` on it and restoring its own value afterwards. `touch`
   * (default): only where the primary pointer is coarse; `always`; `never`.
   */
  replaceNative?: ReplaceNativePolicy
  /**
   * The layout for inputs whose KeyboardTarget sets none and whose `inputmode` or `type`
   * asks for none (number pads for numeric, decimal and tel; email; url). Default: the
   * first of `layouts`, else the locale's layout.
   */
  layout?: KeyboardLayout | BuiltInLayoutId
  /** Called with the next open state, why, and the input it serves. */
  onOpenChange?: (open: boolean, details: KeyboardOpenChangeDetails & { target: HTMLElement | null }) => void
  /** Drawer only: dock to this element instead of the viewport. See KeyboardDrawer `container`. */
  container?: KeyboardDrawerProps["container"]
  /** Drawer only: the element that receives `--keyboard-inset-height`. See KeyboardDrawer `scrollRoot`. */
  scrollRoot?: KeyboardDrawerProps["scrollRoot"]
  /** The drawer's or popup's own material level. Default: the page's. */
  glass?: KeyboardDrawerProps["glass"]
  /** Popover only: the preferred side of the input. Default "bottom". */
  side?: KeyboardPopoverProps["side"]
  /** Popover only: alignment with the input. Default "center". */
  align?: KeyboardPopoverProps["align"]
  /** Popover only: draw an arrow. Default false. */
  arrow?: boolean
  children?: ReactNode
}

/**
 * Links an on-screen keyboard to the inputs inside its KeyboardTargets, without changing
 * those inputs' components: any input, textarea or contenteditable element, including
 * the library's fields. One keyboard serves them all, shown as a drawer or a popover.
 *
 * With `show="focus"` focusing a linked input opens the keyboard for it; focusing another
 * linked input moves the keyboard to it without closing; focus on the keyboard keeps it
 * open; and focus leaving both closes it, one frame later so a move between inputs does
 * not flicker. Tapping the focused input again reopens it after the hide key. Closing never
 * moves focus. Disabled and read-only inputs are not served.
 *
 * `replaceNative` keeps the device's own keyboard closed while an input is served (see
 * the prop). `useOnScreenKeyboard()` opens and closes it from code; KeyboardToggle is the
 * button for it.
 */
export function OnScreenKeyboardProvider({
  show = "manual",
  presentation = "drawer",
  replaceNative = "touch",
  layout,
  enterKind,
  onOpenChange,
  container,
  scrollRoot,
  glass,
  side,
  align,
  arrow,
  children,
  ...keyboard
}: OnScreenKeyboardProviderProps) {
  const [state, setState] = useState<{ open: boolean; target: HTMLElement | null }>({ open: false, target: null })
  const wrappers = useRef(new Map<HTMLElement, RefObject<TargetOptions>>())
  const elementOptions = useRef(new WeakMap<HTMLElement, TargetOptions>())
  const last = useRef<HTMLElement | null>(null)
  const panel = useRef<HTMLDivElement | null>(null)
  const served = useRef<HTMLElement | null>(null)
  const pending = useRef(new Set<HTMLElement>())
  const live = useRef(state)
  live.current = state
  const settings = useRef({ show, replaceNative, onOpenChange })
  settings.current = { show, replaceNative, onOpenChange }

  /** The options of the innermost KeyboardTarget around an element. */
  const optionsFor = useCallback((element: HTMLElement): TargetOptions | null => {
    let best: HTMLElement | null = null
    for (const wrapper of wrappers.current.keys()) {
      if (wrapper.contains(element) && (!best || best.contains(wrapper))) best = wrapper
    }
    const found = best ? wrappers.current.get(best)?.current : undefined
    return found ?? elementOptions.current.get(element) ?? null
  }, [])

  /** Inside an enabled KeyboardTarget and editable: focus opens or retargets the keyboard. */
  const usable = useCallback(
    (element: Element | null | undefined): element is HTMLElement => {
      if (!canServe(element)) return false
      const options = optionsFor(element as HTMLElement)
      return !!options && !options.disabled
    },
    [optionsFor],
  )
  /** What `open(target)` accepts: any editable element not inside a disabled KeyboardTarget. */
  const allowed = useCallback(
    (element: Element | null | undefined): element is HTMLElement => canServe(element) && !optionsFor(element as HTMLElement)?.disabled,
    [optionsFor],
  )

  /** Make `element` the input the keyboard serves: its native keyboard closes, the last one's comes back. */
  const serve = useCallback((element: HTMLElement | null) => {
    const previous = served.current
    if (previous && previous !== element) restoreNative(previous)
    for (const each of pending.current) if (each !== element) restoreNative(each)
    pending.current.clear()
    served.current = element
    if (element && replacesNative(settings.current.replaceNative)) suppressNative(element)
  }, [])
  useEffect(
    () => () => {
      if (served.current) restoreNative(served.current)
      for (const each of pending.current) restoreNative(each)
    },
    [],
  )

  const pick = useCallback(
    (scope?: HTMLElement | null): HTMLElement | null => {
      const active = document.activeElement
      if (usable(active)) return active
      const first = (within: HTMLElement) => [...within.querySelectorAll<HTMLElement>("input, textarea, [contenteditable]")].find(usable) ?? null
      const recent = last.current?.isConnected && usable(last.current) ? last.current : null
      // A toggle inside a KeyboardTarget serves that target's inputs: the last used, else the first.
      if (scope) {
        const own = recent && scope.contains(recent) ? recent : first(scope)
        if (own) return own
      }
      if (recent) return recent
      for (const wrapper of wrappers.current.keys()) {
        const found = first(wrapper)
        if (found) return found
      }
      return null
    },
    [usable],
  )

  const request = useCallback(
    (open: boolean, reason: KeyboardOpenChangeReason, requested?: HTMLElement | null, scope?: HTMLElement | null) => {
      const current = live.current
      if (!open) {
        if (!current.open) return
        serve(null)
        live.current = { open: false, target: null }
        setState(live.current)
        settings.current.onOpenChange?.(false, { reason, target: current.target })
        return
      }
      const element = requested ? (allowed(requested) ? requested : null) : pick(scope)
      if (!element) return
      last.current = element
      // Suppress before focusing, or the native keyboard opens first.
      serve(element)
      const changed = !current.open || current.target !== element
      if (changed) {
        live.current = { open: true, target: element }
        setState(live.current)
        if (!current.open) settings.current.onOpenChange?.(true, { reason, target: element })
      }
      const active = document.activeElement
      if (active !== element && !element.contains(active)) element.focus({ preventScroll: true })
    },
    [allowed, pick, serve],
  )

  const link = useCallback(
    (element: HTMLElement, options: TargetOptions) => {
      elementOptions.current.set(element, options)
      if (options.disabled || !canServe(element)) return
      last.current = element
      const current = live.current
      if (current.open) {
        if (current.target !== element) request(true, "focus", element)
      } else if (settings.current.show === "focus") request(true, "focus", element)
    },
    [request],
  )

  const prepare = useCallback((element: HTMLElement, options: TargetOptions) => {
    const current = live.current
    if (options.disabled || !canServe(element) || (current.open && current.target === element)) return
    if (settings.current.show !== "focus" && !current.open) return
    if (!replacesNative(settings.current.replaceNative) || isSuppressed(element)) return
    suppressNative(element)
    pending.current.add(element)
    // A press that turns into a scroll never focuses: give the input its own keyboard back.
    setTimeout(() => {
      if (pending.current.has(element) && served.current !== element) {
        pending.current.delete(element)
        restoreNative(element)
      }
    }, 1000)
  }, [])

  const register = useCallback((wrapper: HTMLElement, options: RefObject<TargetOptions>) => {
    wrappers.current.set(wrapper, options)
    return () => {
      wrappers.current.delete(wrapper)
    }
  }, [])

  // Focus leaving both the input and the keyboard closes it (show="focus"), after a frame so
  // a move to another linked input retargets instead.
  useEffect(() => {
    if (!state.open || show !== "focus") return
    let cancel: (() => void) | null = null
    const check = () => {
      cancel = null
      const current = live.current
      if (!current.open) return
      const active = document.activeElement
      if (active && current.target && (active === current.target || current.target.contains(active))) return
      if (active && panel.current?.contains(active)) return
      if (usable(active)) return
      request(false, "focus-out")
    }
    const onFocusOut = () => {
      cancel?.()
      cancel = afterFrame(check)
    }
    document.addEventListener("focusout", onFocusOut, true)
    return () => {
      document.removeEventListener("focusout", onFocusOut, true)
      cancel?.()
    }
  }, [state.open, show, request, usable])

  const controller = useMemo<ProviderContextValue>(
    () => ({
      open: (target) => request(true, "api", target),
      close: () => request(false, "api"),
      toggle: (target) => request(!live.current.open, "api", target),
      isOpen: state.open,
      target: state.target,
      show,
      request,
      link,
      prepare,
      register,
    }),
    [request, link, prepare, register, state.open, state.target, show],
  )

  const target = state.target
  const options = target ? optionsFor(target) : null
  const shared = {
    ...keyboard,
    layout: options?.layout ?? (target ? layoutForInput(target) : undefined) ?? layout,
    enterKind: options?.enterKind ?? enterKind,
    glass,
    panelRef: panel,
    onOpenChange: (open: boolean, details: KeyboardOpenChangeDetails) => {
      if (open) return
      if (details.reason === "outside-press") {
        // A press on another linked input moves the keyboard there when it takes focus.
        const node = details.event?.target
        const element = node instanceof Element ? node.closest<HTMLElement>("input, textarea, [contenteditable]") : null
        if (element && usable(element)) return
      }
      request(false, details.reason)
    },
  }

  return (
    <ProviderContext value={controller}>
      {children}
      {presentation === "popover" ? (
        target ? (
          <KeyboardPopover {...shared} open={state.open} target={target} side={side} align={align} arrow={arrow} />
        ) : null
      ) : (
        <KeyboardDrawer {...shared} open={state.open} target={target} container={container} scrollRoot={scrollRoot} />
      )}
    </ProviderContext>
  )
}

/**
 * Open and close the provider's keyboard from code: `{ open, close, toggle, isOpen, target }`.
 * Outside an OnScreenKeyboardProvider it returns an inert controller (`isOpen` false,
 * `target` null, functions that do nothing), so shared components can call it
 * unconditionally.
 */
export function useOnScreenKeyboard(): OnScreenKeyboardController {
  const context = useContext(ProviderContext)
  return useMemo(
    () => (context ? { open: context.open, close: context.close, toggle: context.toggle, isOpen: context.isOpen, target: context.target } : INERT),
    [context],
  )
}

/** Internal: the provider (for KeyboardToggle) and the nearest KeyboardTarget's element. */
export function useKeyboardLink(): { provider: ProviderContextValue | null; nearest: RefObject<HTMLElement | null> | null } {
  return { provider: useContext(ProviderContext), nearest: useContext(TargetContext) }
}

/** Props for KeyboardTarget. */
export interface KeyboardTargetProps {
  /** The layout for the inputs inside. Default: what the input's `inputmode` or `type` asks for, else the provider's. */
  layout?: KeyboardLayout | BuiltInLayoutId
  /** The Enter key's label for the inputs inside. Default: each input's `enterkeyhint`, else the provider's. */
  enterKind?: EnterKind
  /** Leave the inputs inside unlinked: focusing them does not open the keyboard and `open()` ignores them. */
  disabled?: boolean
  children?: ReactNode
}

/**
 * Links every input, textarea and contenteditable element inside it (including ones added
 * later) to the nearest OnScreenKeyboardProvider, through focus events that bubble up to
 * it. It renders a `display: contents` element, so it takes no part in layout; it must sit
 * where a `div` may. Outside a provider it does nothing.
 */
export function KeyboardTarget({ layout, enterKind, disabled = false, children }: KeyboardTargetProps) {
  const provider = useContext(ProviderContext)
  const ref = useRef<HTMLDivElement>(null)
  const options = useRef<TargetOptions>({ layout, enterKind, disabled })
  options.current = { layout, enterKind, disabled }
  const register = provider?.register
  useEffect(() => {
    const element = ref.current
    if (!register || !element) return
    return register(element, options)
  }, [register])

  // A target that becomes disabled while served lets the keyboard go.
  const served = provider?.target
  const close = provider?.close
  useEffect(() => {
    if (disabled && served && ref.current?.contains(served)) close?.()
  }, [disabled, served, close])

  const editable = (node: EventTarget | null): HTMLElement | null => {
    if (!(node instanceof Element)) return null
    if (isKeyboardTarget(node)) return node as HTMLElement
    const editing = node.closest<HTMLElement>("[contenteditable]")
    return editing && isKeyboardTarget(editing) ? editing : null
  }

  return (
    <TargetContext value={ref}>
      <div
        ref={ref}
        data-keyboard-target=""
        style={{ display: "contents" }}
        onFocus={(event: ReactFocusEvent) => {
          if (!provider || handled.has(event.nativeEvent)) return
          handled.add(event.nativeEvent)
          const element = editable(event.target)
          if (element) provider.link(element, options.current)
        }}
        onPointerDownCapture={(event: ReactPointerEvent) => {
          if (!provider || event.button !== 0 || handled.has(event.nativeEvent)) return
          handled.add(event.nativeEvent)
          const element = editable(event.target)
          if (element) provider.prepare(element, options.current)
        }}
        onClick={(event: ReactMouseEvent) => {
          // Tapping the focused input again brings the keyboard back after the hide key.
          if (!provider || provider.show !== "focus" || provider.isOpen || handled.has(event.nativeEvent)) return
          handled.add(event.nativeEvent)
          const element = editable(event.target)
          if (element && element === document.activeElement && !options.current.disabled) provider.request(true, "focus", element)
        }}
      >
        {children}
      </div>
    </TargetContext>
  )
}
