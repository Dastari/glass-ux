import { useEffect, useMemo, useRef, useState } from "react"

/** A debounced function: call it like the original, and control what is waiting. */
export interface DebouncedFunction<Args extends unknown[]> {
  (...args: Args): void
  /** Drop the waiting call, if any. */
  cancel: () => void
  /** Run the waiting call now, if any. */
  flush: () => void
  /** Whether a call is waiting. */
  pending: () => boolean
}

/** Settings for {@link useDebouncedCallback}. */
export interface DebouncedCallbackOptions {
  /** Also call on the first call of a burst, then wait for the quiet. @defaultValue false */
  leading?: boolean
}

/**
 * The value, once it has stopped changing for `delay` milliseconds. The first render returns
 * the value at once; later changes show after the quiet, and a change back to the shown value
 * cancels the wait.
 *
 * @example
 * const query = useDebouncedValue(text, 250) // search with `query`, type into `text`
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [shown, setShown] = useState(value)
  useEffect(() => {
    if (Object.is(value, shown)) return
    const timer = setTimeout(() => setShown(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay, shown])
  return shown
}

/**
 * A function that waits for `delay` milliseconds of quiet before calling `callback` with the
 * arguments of the last call. It keeps one identity for the component's lifetime, always calls
 * the latest `callback`, and drops a waiting call when the component unmounts (call `flush`
 * first to keep it). With `delay` changing, the waiting call keeps its old schedule.
 *
 * @example
 * const search = useDebouncedCallback((text: string) => load(text), 250)
 * <input onChange={(event) => search(event.target.value)} onBlur={() => search.flush()} />
 */
export function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delay: number,
  { leading = false }: DebouncedCallbackOptions = {},
): DebouncedFunction<Args> {
  const latest = useRef({ callback, delay, leading })
  latest.current = { callback, delay, leading }

  const debounced = useMemo(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    let waiting: Args | undefined
    const cancel = () => {
      clearTimeout(timer)
      timer = undefined
      waiting = undefined
    }
    const flush = () => {
      if (waiting === undefined) return
      const args = waiting
      cancel()
      latest.current.callback(...args)
    }
    const call = ((...args: Args) => {
      const starting = timer === undefined
      clearTimeout(timer)
      if (starting && latest.current.leading) {
        latest.current.callback(...args)
        waiting = undefined
      } else waiting = args
      timer = setTimeout(() => {
        timer = undefined
        flush()
      }, latest.current.delay)
    }) as DebouncedFunction<Args>
    call.cancel = cancel
    call.flush = flush
    call.pending = () => waiting !== undefined
    return call
  }, [])

  useEffect(() => debounced.cancel, [debounced])
  return debounced
}
