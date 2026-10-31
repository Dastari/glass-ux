import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react"
import { tokenDuration } from "../../lib/motion.js"
import type { OnScreenKeyboardProps } from "./on-screen-keyboard.js"

/** Why a keyboard container opened or closed. */
export type KeyboardOpenChangeReason =
  /** Escape pressed in the target or on the keyboard. */
  | "escape-key"
  /** The keyboard's hide key. */
  | "hide-key"
  /** A pointer pressed outside both the target and the keyboard (KeyboardPopover). */
  | "outside-press"
  /** A linked input gained focus (OnScreenKeyboardProvider with `show="focus"`). */
  | "focus"
  /** Focus left both the linked input and the keyboard. */
  | "focus-out"
  /** KeyboardToggle. */
  | "toggle"
  /** `useOnScreenKeyboard().open()` or `close()`. */
  | "api"

/** Passed with every open-state change of a keyboard container. */
export interface KeyboardOpenChangeDetails {
  /** What opened or closed it. */
  reason: KeyboardOpenChangeReason
  /** The DOM event behind the change, when there is one (the pointer press outside, the Escape keydown). */
  event?: Event
}

/**
 * The OnScreenKeyboard props a container passes through to its keyboard. The container
 * owns `onHide` and `onEscape` (both close it); `autoFocus` is left out because a
 * container keeps focus in its target.
 */
export type KeyboardContainerKeyboardProps = Omit<OnScreenKeyboardProps, "onHide" | "onEscape" | "autoFocus">

/** An element, a ref to one, or nothing. */
export type ElementOrRef = HTMLElement | RefObject<HTMLElement | null> | null | undefined

/** The element an `ElementOrRef` refers to. */
export function elementOf(value: ElementOrRef): HTMLElement | null {
  if (!value) return null
  return "current" in value && !(typeof Node !== "undefined" && value instanceof Node) ? value.current : (value as HTMLElement)
}

/** Run after the next frame: focus has settled and layout reflects the change. */
export function afterFrame(callback: () => void): () => void {
  if (typeof requestAnimationFrame === "function") {
    const id = requestAnimationFrame(callback)
    return () => cancelAnimationFrame(id)
  }
  const id = setTimeout(callback, 16)
  return () => clearTimeout(id)
}

/**
 * Escape pressed in the target closes the keyboard first, as hiding a phone's keyboard does:
 * the listener sits on the target itself, so a dialog or menu around it keeps its own Escape
 * for the next press. An IME composition or an Escape already handled is left alone.
 */
export function useEscapeIn(element: HTMLElement | null, enabled: boolean, onEscape: (event: KeyboardEvent) => void): void {
  const latest = useRef(onEscape)
  latest.current = onEscape
  useEffect(() => {
    if (!element || !enabled) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented || event.isComposing) return
      event.preventDefault()
      event.stopPropagation()
      latest.current(event)
    }
    element.addEventListener("keydown", onKeyDown)
    return () => element.removeEventListener("keydown", onKeyDown)
  }, [element, enabled])
}

/** The presence of a sliding panel: mounted while open and while it slides away. */
export interface Presence {
  mounted: boolean
  /** "starting" for the first frame (the closed position), then "open", then "ending" while it leaves. */
  phase: "starting" | "open" | "ending"
}

/**
 * Keep a panel mounted while it slides out, and give it one frame in its closed position
 * before it slides in, so CSS transitions run both ways. Pass the panel element once it is
 * mounted. Exit waits for the panel's
 * `transitionend` or the slow duration token (zero under Still or reduced motion).
 */
export function usePresence(open: boolean, element: HTMLElement | null): Presence {
  const [state, setState] = useState<Presence>(() => ({ mounted: open, phase: open ? "open" : "ending" }))
  let current = state
  if (open && (!state.mounted || state.phase === "ending")) {
    // Opening (again): from the closed position unless it was still on screen.
    current = { mounted: true, phase: state.mounted ? "open" : "starting" }
    setState(current)
  } else if (!open && state.mounted && state.phase !== "ending") {
    current = { mounted: true, phase: "ending" }
    setState(current)
  }

  useLayoutEffect(() => {
    // Wait for the panel (a portal mounts a commit later), lay it out in its closed position,
    // then let it slide in.
    if (current.phase !== "starting" || !element) return
    element.getBoundingClientRect()
    return afterFrame(() => setState((previous) => (previous.phase === "starting" ? { mounted: true, phase: "open" } : previous)))
  }, [current.phase, element])

  useEffect(() => {
    if (current.phase !== "ending" || !current.mounted) return
    let done = false
    const finish = () => {
      if (done) return
      done = true
      setState((previous) => (previous.phase === "ending" ? { mounted: false, phase: "ending" } : previous))
    }
    const timer = setTimeout(finish, tokenDuration("--duration-slow", 300) + 50)
    const onEnd = (event: TransitionEvent) => {
      if (event.target === element && event.propertyName === "transform") finish()
    }
    element?.addEventListener("transitionend", onEnd)
    return () => {
      clearTimeout(timer)
      element?.removeEventListener("transitionend", onEnd)
    }
  }, [current.phase, current.mounted, element])

  return current
}

/** Keep pointer presses on a container's own surface (not a key) from taking focus from the target. */
export function keepFocus(event: { button: number; preventDefault(): void; target: EventTarget | null }): void {
  if (event.button !== 0) return
  const target = event.target as Element | null
  // Text fields inside a container (an application's own) still take focus.
  if (target?.closest?.("input, textarea, select, [contenteditable]")) return
  event.preventDefault()
}
