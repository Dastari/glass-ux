import { Input as BaseInput } from "@base-ui/react/input"
import { useRef, useState, type MouseEvent, type ReactNode, type Ref } from "react"
import { IconClose, IconEye, IconEyeOff, IconSearch } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { Button } from "../button/index.js"
import { widthAttr, type FieldWidth } from "../field/index.js"
import { Kbd } from "../kbd/index.js"
import { Skeleton } from "../skeleton/index.js"

export type InputSize = "sm" | "md" | "lg"

export interface InputProps extends Omit<BaseInput.Props, "className" | "size" | "render" | "ref"> {
  ref?: Ref<HTMLInputElement>
  /** Layout only (width, grid placement). Applied to the control box. */
  className?: string
  size?: InputSize
  /** Content width: short (port, PIN), medium (name, hostname), full (default). */
  width?: FieldWidth
  /** Leading icon. Pass the icon without a size. */
  icon?: ReactNode
  /** Unit after the value ("GB", "ms", "%"). */
  unit?: ReactNode
  /** Keyboard hint shown while the field is empty and unfocused ("mod+k" → ⌘K / Ctrl K). */
  shortcut?: string
  /** Any other trailing content (a status, a small action). */
  trailing?: ReactNode
  /**
   * Show a clear button while the field has a value. Escape also clears a filled field (and
   * is then not propagated, so an enclosing dialog stays open); the button itself is a
   * pointer affordance outside the tab order.
   */
  clearable?: boolean
  /** Called after the clear button or Escape empties the field. */
  onClear?: () => void
  /** Invalid outside a Field (inside a Field, set `error` on the Field instead). */
  invalid?: boolean
  /** Password boxes: whether the value shows as text. Leave unset for the box's own toggle. */
  revealed?: boolean
  /** Called when revealed change occurs. The callback type specifies its arguments. */
  onRevealedChange?: (revealed: boolean) => void
}

/** Set a React-managed input's value and fire the events React and Base UI listen for. */
function setNativeValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set
  setter?.call(input, value)
  input.dispatchEvent(new Event("input", { bubbles: true }))
}

/**
 * A text field box: `fa-control` with leading icon and trailing unit, keyboard hint,
 * clear button or password reveal. The input fills the box; clicking anywhere in the box
 * focuses it. Put it inside a Field for a label and message line.
 */
export function Input({
  ref,
  size = "md",
  width,
  icon,
  unit,
  shortcut,
  trailing,
  clearable = false,
  onClear,
  invalid,
  className,
  type = "text",
  value,
  defaultValue,
  onValueChange,
  readOnly,
  disabled,
  revealed: revealedProp,
  onRevealedChange,
  onKeyDown,
  ...rest
}: InputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [revealedInner, setRevealedInner] = useState(false)
  const revealed = revealedProp ?? revealedInner
  const setRevealed = (next: boolean) => {
    if (revealedProp === undefined) setRevealedInner(next)
    onRevealedChange?.(next)
  }
  const [innerFilled, setInnerFilled] = useState(() => String(defaultValue ?? "") !== "")
  const filled = value !== undefined ? String(value) !== "" : innerFilled
  const isPassword = type === "password"

  const setRefs = (node: HTMLInputElement | null) => {
    inputRef.current = node
    if (typeof ref === "function") ref(node)
    else if (ref) ref.current = node
  }

  const focusInput = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement
    if (target.closest("input, button, a")) return
    event.preventDefault()
    inputRef.current?.focus()
  }

  const clear = () => {
    const input = inputRef.current
    if (!input) return
    setNativeValue(input, "")
    input.focus()
    onClear?.()
  }

  const showClear = clearable && filled && !readOnly && !disabled

  return (
    // oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- forwards clicks on the box to the input inside
    <div
      className={cx("fa-control fa-input", className)}
      data-size={size}
      data-width={widthAttr(width)}
      data-filled={filled ? "" : undefined}
      data-readonly={readOnly ? "" : undefined}
      data-disabled={disabled ? "" : undefined}
      data-invalid={invalid ? "" : undefined}
      onMouseDown={focusInput}
    >
      {icon}
      <BaseInput
        {...rest}
        ref={setRefs}
        type={isPassword && revealed ? "text" : type}
        value={value}
        defaultValue={defaultValue}
        readOnly={readOnly}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        onKeyDown={(event) => {
          onKeyDown?.(event)
          if (!clearable || readOnly || disabled || event.defaultPrevented || event.key !== "Escape") return
          const input = event.currentTarget
          if (input.value === "") return
          event.preventDefault()
          event.stopPropagation()
          setNativeValue(input, "")
          onClear?.()
        }}
        onValueChange={(next, details) => {
          setInnerFilled(next !== "")
          onValueChange?.(next, details)
        }}
        className="fa-control-input"
      />
      {unit ? <span className="fa-input-unit">{unit}</span> : null}
      {trailing}
      {shortcut && !filled ? (
        <Kbd keys={shortcut} size="sm" className="fa-input-kbd" aria-hidden />
      ) : null}
      {showClear ? (
        <Button variant="ghost" size="sm" className="fa-input-btn" icon={<IconClose />} aria-label="Clear" tabIndex={-1} onClick={clear} />
      ) : null}
      {isPassword && !disabled ? (
        <Button
          variant="ghost"
          size="sm"
          className="fa-input-btn"
          icon={revealed ? <IconEyeOff /> : <IconEye />}
          aria-label={revealed ? "Hide password" : "Show password"}
          aria-pressed={revealed}
          onClick={() => {
            setRevealed(!revealed)
            inputRef.current?.focus()
          }}
        />
      ) : null}
    </div>
  )
}

export interface SearchFieldProps extends Omit<InputProps, "type" | "icon" | "clearable"> {
  /** Accessible name when no visible label is present. */
  "aria-label"?: string
}

/**
 * Search box: magnifier, clear button while filled, Esc clears, optional ⌘K hint for the
 * top bar. Filtering lists, tables and the command palette all use this one field.
 */
export function SearchField({ placeholder = "Search", ...rest }: SearchFieldProps) {
  return (
    <Input
      {...rest}
      type="search"
      icon={<IconSearch />}
      clearable
      placeholder={placeholder}
      autoComplete="off"
      spellCheck={false}
    />
  )
}

export interface InputSkeletonProps {
  size?: InputSize
  className?: string
}

/** The loading box of an Input (no label; use Field.Skeleton for a full field). */
export function InputSkeleton({ size = "md", className }: InputSkeletonProps) {
  return <Skeleton.Block width="100%" height={`var(--control-h-${size})`} radius="control" className={className} />
}
