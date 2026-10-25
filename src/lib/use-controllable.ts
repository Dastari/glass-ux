import { useCallback, useRef, useState } from "react"

/** A next value, or an updater that receives the current value (like `useState`). */
export type ControllableUpdate<T> = T | ((previous: T) => T)

/**
 * A value that is controlled when `value` is given and uncontrolled otherwise: the same
 * component works bound to a form (value + onChange) and on its own (defaultValue).
 * Only `undefined` means uncontrolled; `null` is a controlled value.
 *
 * The setter keeps one identity for the component's lifetime, so it can be passed to
 * memoised children and effect dependencies. It accepts a value or an updater
 * `(previous) => next`; successive updates in one event see each other's result. Every
 * call reports the next value to `onChange`. Function values are not supported, because
 * a function passed to the setter is treated as an updater.
 * @example
 * const [open, setOpen] = useControllable(props.open, false, props.onOpenChange)
 */
export function useControllable<T>(
  value: T | undefined,
  defaultValue: T,
  onChange?: (next: T) => void
): [T, (next: ControllableUpdate<T>) => void] {
  const [inner, setInner] = useState<T>(defaultValue)
  const controlled = value !== undefined
  const current = controlled ? value : inner

  // Read by the stable setter. Assigned while rendering, as the previous per-render setter
  // closed over this render's values: a child's layout effect, which runs before this
  // component's effects, still sees the current value and onChange.
  const latest = useRef({ current, shown: current, controlled, onChange })
  latest.current = { current, shown: current, controlled, onChange }

  const set = useCallback((update: ControllableUpdate<T>) => {
    const state = latest.current
    const next = typeof update === "function" ? (update as (previous: T) => T)(state.current) : update
    // A second update before the next render builds on this one.
    state.current = next
    if (state.controlled) {
      // A parent that does not accept the value never re-renders; after this task, updates
      // build on the value it shows again.
      queueMicrotask(() => {
        if (latest.current === state) state.current = state.shown
      })
    } else setInner(next)
    state.onChange?.(next)
  }, [])

  return [current, set]
}
