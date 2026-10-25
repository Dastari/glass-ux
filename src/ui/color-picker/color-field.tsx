import { useEffect, useState, type CSSProperties, type FocusEvent, type Ref } from "react"
import { cx } from "../../lib/cx.js"
import { useMessages } from "../../lib/i18n/use-messages.js"
import { useControllable } from "../../lib/use-controllable.js"
import type { FieldWidth } from "../field/index.js"
import { Input, type InputSize } from "../input/index.js"
import { Popover } from "../popover/index.js"
import { ColorPicker, type ColorPickerBaseProps } from "./color-picker.js"
import { cssColor, formatHex, parseHex } from "./color.js"
import { colorPickerMessages } from "./messages.js"

export interface ColorFieldProps extends Omit<ColorPickerBaseProps, "value" | "defaultValue" | "onValueChange"> {
  /** The colour as hex, or null for none. Pair with `onValueChange` to control it. */
  value?: string | null
  /** The starting colour when uncontrolled; null for none. */
  defaultValue?: string | null
  /** Called with the new hex colour, or null when cleared. */
  onValueChange?: (value: string | null) => void
  /** Allow clearing to no colour. Default false. */
  clearable?: boolean
  /** Control height: sm, md (default) or lg. */
  size?: InputSize
  /** short or medium; full width by default. */
  width?: FieldWidth
  /** Show the invalid state (set by Field when its error shows). */
  invalid?: boolean
  /** Name for a native form submission (a hidden input carries the hex value). */
  name?: string
  placeholder?: string
  id?: string
  ref?: Ref<HTMLInputElement>
  /** Called when focus leaves the field, for form libraries' touched state. */
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void
  className?: string
  /** Accessible name when no visible label names the field. */
  "aria-label"?: string
  /** IDs of elements that name the field (Field sets it). */
  "aria-labelledby"?: string
  /** IDs of elements that describe the field (Field sets it). */
  "aria-describedby"?: string
}

/**
 * A colour as a form field: the hex value is typed in place, and the swatch at its start
 * opens a ColorPicker in a popover. Works inside `Field` like any input.
 */
export function ColorField({
  value: valueProp,
  defaultValue = null,
  onValueChange,
  onValueCommit,
  clearable = false,
  alpha = false,
  swatches,
  eyeDropper,
  disabled,
  locale,
  labels,
  size = "md",
  width,
  invalid,
  name,
  placeholder,
  id,
  ref,
  onBlur,
  className,
  ...aria
}: ColorFieldProps) {
  const t = useMessages(colorPickerMessages, { labels, locale })
  const [value, setValue] = useControllable<string | null>(valueProp, defaultValue, onValueChange)
  const [draft, setDraft] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  useEffect(() => setDraft(null), [value])

  const parsed = value ? parseHex(value) : null
  const shown = draft ?? (parsed ? formatHex(parsed, alpha) : "")
  const finish = () => {
    if (draft === null) return
    const text = draft.trim()
    if (text === "" && clearable) setValue(null)
    else {
      const next = parseHex(text)
      if (next) {
        const hex = formatHex(alpha ? next : { ...next, a: 1 }, alpha)
        setValue(hex)
        onValueCommit?.(hex)
      }
    }
    setDraft(null)
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Input
        ref={ref}
        id={id}
        size={size}
        width={width}
        className={cx("fa-color-field", className)}
        disabled={disabled}
        invalid={invalid || (draft !== null && draft.trim() !== "" && !parseHex(draft))}
        placeholder={placeholder ?? (clearable ? t.none : undefined)}
        spellCheck={false}
        autoComplete="off"
        value={shown}
        clearable={clearable}
        onClear={() => setValue(null)}
        onValueChange={(next) => setDraft(String(next))}
        onBlur={(event) => {
          finish()
          onBlur?.(event)
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault()
            finish()
          }
        }}
        icon={
          <Popover.Trigger
            className="fa-color-field-swatch fa-pressable"
            disabled={disabled}
            aria-label={t.open}
            data-empty={parsed ? undefined : ""}
            style={parsed ? ({ "--_swatch": cssColor(parsed) } as CSSProperties) : undefined}
          />
        }
        {...aria}
      />
      {name ? <input type="hidden" name={name} value={value ?? ""} /> : null}
      <Popover.Popup align="start" aria-label={t.picker}>
        <ColorPicker
          value={value ?? undefined}
          defaultValue={value ?? undefined}
          alpha={alpha}
          swatches={swatches}
          eyeDropper={eyeDropper}
          disabled={disabled}
          locale={locale}
          labels={labels}
          onValueChange={setValue}
          onValueCommit={onValueCommit}
        />
      </Popover.Popup>
    </Popover.Root>
  )
}
