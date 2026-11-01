import { useCallback, useEffect, useRef, useState } from "react"
import { writeClipboardText } from "../lib/clipboard.js"

/** Settings for {@link useClipboard}. */
export interface ClipboardOptions {
  /** How long `copied` stays true after a copy, in milliseconds. @defaultValue 2000 */
  timeout?: number
}

/** What {@link useClipboard} returns. */
export interface ClipboardState {
  /**
   * Copy text, or the text a function returns (built only when the copy happens). Resolves
   * `true` when the text was copied and `false` when it was not; the reason is in `error`.
   * Call it from a user gesture.
   */
  copy: (text: string | (() => string)) => Promise<boolean>
  /** True for `timeout` milliseconds after a successful copy. Show a confirmation while it is. */
  copied: boolean
  /** The last copy's failure, until the next copy or `reset`. The API refused, or the page cannot copy. */
  error: Error | null
  /** Clear `copied` and `error` now. */
  reset: () => void
}

/**
 * Copy text to the clipboard with a timed `copied` state and a failure state. It works where
 * the async Clipboard API does not (an `http:` page on a LAN host) by falling back to a
 * hidden textarea, as CopyButton does. A second copy restarts the timer, and the timer stops
 * with the component. Announce the outcome in your own words, for example with `useAnnounce`.
 *
 * @example
 * const { copy, copied, error } = useClipboard()
 * <Button onClick={() => void copy(address)}>{copied ? "Copied" : "Copy address"}</Button>
 */
export function useClipboard({ timeout = 2000 }: ClipboardOptions = {}): ClipboardState {
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const mounted = useRef(true)
  // A copy that finishes after a newer one started must not overwrite it.
  const latest = useRef(0)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      clearTimeout(timer.current)
    }
  }, [])

  const copy = useCallback(
    async (text: string | (() => string)) => {
      const attempt = ++latest.current
      clearTimeout(timer.current)
      try {
        await writeClipboardText(typeof text === "function" ? text() : text)
      } catch (caught) {
        if (mounted.current && attempt === latest.current) {
          setCopied(false)
          setError(caught instanceof Error ? caught : new Error(String(caught)))
        }
        return false
      }
      if (mounted.current && attempt === latest.current) {
        setError(null)
        setCopied(true)
        timer.current = setTimeout(() => setCopied(false), timeout)
      }
      return true
    },
    [timeout],
  )

  const reset = useCallback(() => {
    latest.current++
    clearTimeout(timer.current)
    setCopied(false)
    setError(null)
  }, [])

  return { copy, copied, error, reset }
}
