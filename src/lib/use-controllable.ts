import { useState } from "react"

/**
 * A value that is controlled when `value` is given and uncontrolled otherwise: the same
 * component works bound to a form (value + onChange) and on its own (defaultValue).
 */
export function useControllable<T>(value: T | undefined, defaultValue: T, onChange?: (next: T) => void): [T, (next: T) => void] {
  const [inner, setInner] = useState<T>(defaultValue)
  const controlled = value !== undefined
  const current = controlled ? value : inner
  const set = (next: T) => {
    if (!controlled) setInner(next)
    onChange?.(next)
  }
  return [current, set]
}
