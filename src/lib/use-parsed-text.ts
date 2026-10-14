import { useState } from "react"
import { useControllable } from "./use-controllable.js"

export interface ParsedTextOptions<T> {
  value: T | undefined
  defaultValue: T
  /** Called when value change occurs. The callback type specifies its arguments. */
  onValueChange?: (value: T) => void
  /** Text → value. Empty text and unreadable text map to whatever the control stores for them (null, NaN…). */
  parse: (text: string) => T
  /** The canonical text of a readable value; "" for an empty or unreadable one. */
  format: (value: T) => string
  /** Whether two values are the same (NaN-aware for numbers). */
  same?: (a: T, b: T) => boolean
}

const defaultSame = <T,>(a: T, b: T) => Object.is(a, b)

/**
 * Text typed into a box whose value is not text (a duration in seconds, a size in bytes, a
 * point). While typing, the value follows the text — the parsed value, or the control's
 * "empty" or "unreadable" value so a schema can say so. On blur, readable text is rewritten
 * canonically. When the value changes from outside (a reset, a map pin), the text follows.
 */
export function useParsedText<T>({ value, defaultValue, onValueChange, parse, format, same = defaultSame }: ParsedTextOptions<T>) {
  const [current, setCurrent] = useControllable(value, defaultValue, onValueChange)
  const [state, setState] = useState(() => ({ text: format(current), value: current }))
  let text = state.text
  if (!same(state.value, current)) {
    // Changed from outside: show the new value.
    text = format(current)
    setState({ text, value: current })
  }
  return {
    text,
    value: current,
    onTextChange: (next: string) => {
      const parsed = parse(next)
      setState({ text: next, value: parsed })
      setCurrent(parsed)
    },
    /** Rewrite readable text canonically ("90" → "1h 30m"); unreadable text stays as typed. */
    tidy: () => {
      const parsed = parse(text)
      const canonical = format(parsed)
      if (canonical && canonical !== text) setState({ text: canonical, value: parsed })
    },
  }
}

/** NaN-aware equality for number | null values. */
export const sameNumber = (a: number | null, b: number | null) => a === b || (Number.isNaN(a) && Number.isNaN(b))
