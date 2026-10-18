import { useControllable } from "../../lib/use-controllable.js"
import { Input, type InputProps } from "./input.js"

export interface NormalisedInputProps extends Omit<InputProps, "value" | "defaultValue" | "onValueChange"> {
  value?: string
  defaultValue?: string
  /**
   * Called with the text as typed on each keystroke, and with its canonical form on blur when that
   * differs. Pair with `value` to control it; use `defaultValue` otherwise.
   */
  onValueChange?: (value: string) => void
  /**
   * The canonical form of the text, or null when it cannot be read (it is then left exactly
   * as typed, for the schema to explain).
   */
  normalise: (text: string) => string | null
  /** Identifiers (addresses, hostnames) get tabular figures (R8.4). Default true. */
  identifier?: boolean
}

/**
 * An Input that tidies its value when focus leaves it, never while typing: the caret is never
 * fought (R15). While typing, the value is the text as typed; on blur, a readable value is
 * replaced by its canonical form before `onBlur` runs, so validation sees the final value.
 */
export function NormalisedInput({ value, defaultValue = "", onValueChange, normalise, identifier = true, onBlur, ...rest }: NormalisedInputProps) {
  const [text, setText] = useControllable(value, defaultValue, onValueChange)
  return (
    <Input
      autoComplete="off"
      spellCheck={false}
      {...rest}
      data-identifier={identifier ? "" : undefined}
      value={text}
      onValueChange={(next) => setText(next)}
      onBlur={(event) => {
        const tidy = text.trim() ? normalise(text) : ""
        if (tidy !== null && tidy !== text) setText(tidy)
        onBlur?.(event)
      }}
    />
  )
}
