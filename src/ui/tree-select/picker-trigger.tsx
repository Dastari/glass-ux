import { Field as BaseField } from "@base-ui/react/field"
import { Popover as BasePopover } from "@base-ui/react/popover"
import type { FocusEvent, KeyboardEvent, ReactNode, Ref, RefObject } from "react"
import { IconChevronsUpDown } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { widthAttr, type FieldWidth } from "../field/index.js"
import type { SelectSize } from "../select/index.js"

/** Props for the internal trigger shared by TreeSelect and Cascader. */
export interface PickerTriggerProps {
  /** The value as one string, for the Field (dirty and filled state). */
  value: string
  open: boolean
  onOpen: () => void
  /** Backspace or Delete with a value: remove the last choice. */
  onRemoveLast?: () => void
  disabled?: boolean
  readOnly?: boolean
  required?: boolean
  invalid?: boolean
  id?: string
  size: SelectSize
  width?: FieldWidth
  multiple: boolean
  wrap: boolean
  className: string
  onBlur?: (event: FocusEvent<HTMLButtonElement>) => void
  ref?: Ref<HTMLButtonElement>
  "aria-label"?: string
  "aria-labelledby"?: string
  /** Receives the Field label's id, so the popup can share the control's name. */
  labelIdRef: RefObject<string | undefined>
  /** The id of the element holding the visible value; it joins the accessible name. */
  valueId: string
  /** The value element (with `valueId`) and anything measured beside it. */
  children: ReactNode
}

function assign<T>(ref: Ref<T> | undefined, value: T) {
  if (typeof ref === "function") ref(value)
  else if (ref) (ref as RefObject<T>).current = value
}

/**
 * A select-style trigger (fa-control fa-select-trigger) that opens a Base UI popover and is
 * a Field's control: the Field's label, description and invalid state reach it, and its
 * accessible name is the label followed by the visible value. ↓ or ↑ opens it.
 */
export function PickerTrigger({
  value,
  open,
  onOpen,
  onRemoveLast,
  disabled,
  readOnly,
  required,
  invalid,
  id,
  size,
  width,
  multiple,
  wrap,
  className,
  onBlur,
  ref,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
  labelIdRef,
  valueId,
  children,
}: PickerTriggerProps) {
  return (
    <BasePopover.Trigger
      disabled={disabled}
      render={(triggerProps) => (
        <BaseField.Control
          {...(triggerProps as BaseField.Control.Props)}
          id={id}
          value={value}
          disabled={disabled}
          render={(controlProps) => {
            const props = controlProps as Record<string, unknown> & {
              "aria-labelledby"?: string
              "aria-invalid"?: boolean
              ref?: Ref<HTMLButtonElement>
              onBlur?: (event: FocusEvent<HTMLButtonElement>) => void
              onKeyDown?: (event: KeyboardEvent<HTMLButtonElement>) => void
            }
            const labelled = props["aria-labelledby"]
            labelIdRef.current = ariaLabelledby ?? labelled
            return (
              <button
                {...props}
                ref={(element: HTMLButtonElement | null) => {
                  assign(props.ref, element)
                  assign(ref, element)
                }}
                type="button"
                // A select-only combobox, like Select's trigger: it may be read-only or required.
                role="combobox"
                className={cx("fa-control fa-lit fa-select-trigger", className)}
                data-size={size}
                data-width={widthAttr(width)}
                data-multiple={multiple ? "" : undefined}
                data-wrap={multiple && wrap ? "" : undefined}
                data-readonly={readOnly ? "" : undefined}
                data-invalid={invalid || props["data-invalid"] !== undefined ? "" : undefined}
                aria-invalid={invalid || props["aria-invalid"] || undefined}
                aria-labelledby={ariaLabelledby ? `${ariaLabelledby} ${valueId}` : ariaLabel ? `${valueId}-name ${valueId}` : labelled ? `${labelled} ${valueId}` : undefined}
                aria-readonly={readOnly || undefined}
                aria-required={required || undefined}
                onBlur={(event) => {
                  props.onBlur?.(event)
                  if (!open) onBlur?.(event)
                }}
                onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) => {
                  props.onKeyDown?.(event)
                  if (readOnly || disabled) return
                  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                    event.preventDefault()
                    onOpen()
                  } else if ((event.key === "Backspace" || event.key === "Delete") && value !== "" && onRemoveLast) {
                    event.preventDefault()
                    onRemoveLast()
                  }
                }}
              >
                {/* An aria-label joins the value in the name through this twin. */}
                {ariaLabel && !ariaLabelledby ? (
                  <span id={`${valueId}-name`} hidden>
                    {ariaLabel}
                  </span>
                ) : null}
                {children}
                <IconChevronsUpDown className="fa-select-chevron" />
              </button>
            )
          }}
        />
      )}
    />
  )
}
