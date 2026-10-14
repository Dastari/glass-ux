import { Field as BaseField } from "@base-ui/react/field"
import { useLayoutEffect, useRef, type ComponentProps, type CSSProperties, type Ref } from "react"
import { cx } from "../../lib/cx.js"
import { Skeleton } from "../skeleton/index.js"

export interface TextareaProps
  extends Omit<ComponentProps<"textarea">, "className" | "ref" | "rows" | "value" | "defaultValue"> {
  ref?: Ref<HTMLTextAreaElement>
  /** Layout only. Applied to the control box. */
  className?: string
  value?: string
  defaultValue?: string
  /** Called when value change occurs. The callback type specifies its arguments. */
  onValueChange?: (value: string) => void
  /** Rows shown when empty. One row is exactly one control height. */
  minRows?: number
  /** Grows with its content up to this many rows, then scrolls. */
  maxRows?: number
  /** Show the vertical resize grip. */
  resize?: boolean
  /** Invalid outside a Field. */
  invalid?: boolean
}

const supportsFieldSizing = () => typeof CSS !== "undefined" && CSS.supports("field-sizing", "content")

/**
 * Multi-line text. Grows between `minRows` and `maxRows` as you type (field-sizing with a
 * measured fallback), then scrolls inside itself. Pair with Field's `counter` for limits.
 */
export function Textarea({
  ref,
  className,
  minRows = 3,
  maxRows = 8,
  resize = true,
  invalid,
  readOnly,
  disabled,
  onValueChange,
  onChange,
  style,
  ...rest
}: TextareaProps) {
  const innerRef = useRef<HTMLTextAreaElement | null>(null)

  const fit = () => {
    const element = innerRef.current
    if (!element || supportsFieldSizing()) return
    element.style.height = "auto"
    element.style.height = `${element.scrollHeight + element.offsetHeight - element.clientHeight}px`
  }

  // oxlint-disable-next-line react-hooks/exhaustive-deps -- re-measure whenever the value changes
  useLayoutEffect(fit, [rest.value])

  const setRefs = (node: HTMLTextAreaElement | null) => {
    innerRef.current = node
    if (typeof ref === "function") ref(node)
    else if (ref) ref.current = node
  }

  return (
    <div
      className={cx("fa-control fa-textarea", className)}
      data-readonly={readOnly ? "" : undefined}
      data-disabled={disabled ? "" : undefined}
      data-invalid={invalid ? "" : undefined}
      data-resize={resize ? "" : undefined}
      style={{ ...style, "--_min-rows": minRows, "--_max-rows": maxRows } as CSSProperties}
    >
      <BaseField.Control
        {...(rest as Omit<BaseField.Control.Props, "ref">)}
        ref={setRefs as Ref<HTMLInputElement>}
        readOnly={readOnly}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        render={<textarea />}
        className="fa-control-input fa-textarea-input"
        onChange={(event) => {
          onChange?.(event as never)
          fit()
        }}
        onValueChange={(value) => onValueChange?.(value)}
      />
    </div>
  )
}

export interface TextareaSkeletonProps {
  /** Records or matrix rows in display order. */
  rows?: number
  className?: string
}

/** The loading box of a Textarea at `rows` (its minRows). */
export function TextareaSkeleton({ rows = 3, className }: TextareaSkeletonProps) {
  return (
    <Skeleton.Block
      width="100%"
      height={`calc(${rows} * var(--type-body-line) + var(--control-h-md) - var(--type-body-line))`}
      radius="control"
      className={className}
    />
  )
}
