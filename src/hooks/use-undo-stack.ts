import { useCallback, useMemo, useRef, useState } from "react"
import { createUndoState, pushUndo, redoState, undoState, type UndoOptions, type UndoState } from "../lib/undo-stack.js"

export type { UndoOptions, UndoState } from "../lib/undo-stack.js"
export { createUndoState, pushUndo, redoState, undoState } from "../lib/undo-stack.js"

/** What `useUndoStack` returns. The functions keep one identity for the component's lifetime. */
export interface UndoStack<T> {
  /** The current value. */
  value: T
  /** Earlier values, oldest first. */
  past: readonly T[]
  /** Values undone, nearest first. */
  future: readonly T[]
  /** There is a step to take back. */
  canUndo: boolean
  /** There is an undone step to take again. */
  canRedo: boolean
  /** Record a new value, or derive it from the current one, and drop anything undone. */
  push: (next: T | ((current: T) => T)) => void
  /** Step back. Does nothing when `canUndo` is false. */
  undo: () => void
  /** Step forward. Does nothing when `canRedo` is false. */
  redo: () => void
  /** Start again from a value, with nothing to undo or redo: after a save, or a new document. */
  reset: (value: T) => void
}

/**
 * A generic undo and redo stack for one value: a form's draft, a board's columns, a schedule.
 * Keep the value small and treat it as immutable; each step holds a reference, so structural
 * sharing makes history cheap. Wire `undo` and `redo` to `useHotkeys`, and call `push` on commit,
 * not on every frame of a drag. It holds no engine: `createUndoState`, `pushUndo`, `undoState` and
 * `redoState` are the same transitions for a store or a reducer of your own.
 *
 *   const { value, push, undo, canUndo } = useUndoStack(columns, { limit: 50 })
 */
export function useUndoStack<T>(initial: T, options: UndoOptions<T> = {}): UndoStack<T> {
  const [state, setState] = useState<UndoState<T>>(() => createUndoState(initial))
  const latest = useRef(options)
  latest.current = options
  // Several calls in one event build on each other.
  const current = useRef(state)
  const apply = useCallback((next: UndoState<T>) => {
    current.current = next
    setState(next)
  }, [])

  const push = useCallback(
    (next: T | ((value: T) => T)) => {
      const value = typeof next === "function" ? (next as (value: T) => T)(current.current.present) : next
      apply(pushUndo(current.current, value, latest.current, Date.now()))
    },
    [apply],
  )
  const undo = useCallback(() => apply(undoState(current.current)), [apply])
  const redo = useCallback(() => apply(redoState(current.current)), [apply])
  const reset = useCallback((value: T) => apply(createUndoState(value)), [apply])

  return useMemo(
    () => ({ value: state.present, past: state.past, future: state.future, canUndo: state.past.length > 0, canRedo: state.future.length > 0, push, undo, redo, reset }),
    [state, push, undo, redo, reset],
  )
}
