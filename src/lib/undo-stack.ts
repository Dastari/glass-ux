/**
 * An undo stack as pure transitions: no React, no DOM, and the clock passed in, so a host can
 * run it in a reducer or a store as well as through `useUndoStack`. Each transition returns a
 * new state and never changes the one it was given.
 */

/** Where a stack stands: what was, what is, and what an undo took back. */
export interface UndoState<T> {
  /** Earlier values, oldest first. */
  past: readonly T[]
  /** The current value. */
  present: T
  /** Values undone, nearest first: `redo` takes the first. */
  future: readonly T[]
  /** When the last push happened, in ms; null straight after an undo, redo or reset, so the next push never merges. */
  pushedAt: number | null
}

export interface UndoOptions<T> {
  /** Earlier values to keep; the oldest fall off beyond it. Default 100. */
  limit?: number
  /**
   * Merge a push into the current step instead of adding one, so undo takes back a run of small
   * changes at once: `(previous, next, elapsed) => elapsed < 500`, `elapsed` in ms since the last
   * push. `previous` is the value being replaced.
   */
  coalesce?: (previous: T, next: T, elapsed: number) => boolean
}

const DEFAULT_LIMIT = 100

/** A stack with nothing to undo or redo. */
export const createUndoState = <T,>(present: T): UndoState<T> => ({ past: [], present, future: [], pushedAt: null })

/** Record a new value and drop anything undone. A merged push changes the present and keeps the past. */
export function pushUndo<T>(state: UndoState<T>, next: T, options: UndoOptions<T> = {}, now = 0): UndoState<T> {
  const { limit = DEFAULT_LIMIT, coalesce } = options
  if (Object.is(next, state.present)) return state
  const elapsed = state.pushedAt === null ? null : now - state.pushedAt
  if (elapsed !== null && coalesce?.(state.present, next, elapsed)) return { past: state.past, present: next, future: [], pushedAt: now }
  const past = [...state.past, state.present]
  return { past: past.slice(Math.max(0, past.length - Math.max(0, limit))), present: next, future: [], pushedAt: now }
}

/** Step back; the same state when there is nothing to undo. */
export function undoState<T>(state: UndoState<T>): UndoState<T> {
  const present = state.past.at(-1)
  if (state.past.length === 0) return state
  return { past: state.past.slice(0, -1), present: present as T, future: [state.present, ...state.future], pushedAt: null }
}

/** Step forward; the same state when there is nothing to redo. */
export function redoState<T>(state: UndoState<T>): UndoState<T> {
  if (state.future.length === 0) return state
  const [present, ...future] = state.future
  return { past: [...state.past, state.present], present: present as T, future, pushedAt: null }
}
