import { Select as BaseSelect } from "@base-ui/react/select"
import { useState, type FocusEvent, type ReactNode, type Ref } from "react"
import { IconCheck, IconChevronsUpDown } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { usePopupMetrics } from "../../lib/popup-metrics.js"
import { widthAttr, type FieldWidth } from "../field/index.js"

/**
 * Gap between a field and its popup, in px, at `--ui-scale: 1`.
 * @deprecated Ignores `--ui-scale`. Library popups now measure `--popup-offset`; this constant
 * remains for consumers that positioned their own popups with it.
 */
export const POPUP_OFFSET = 6
/**
 * Distance a popup keeps from the viewport edge, in px, at `--ui-scale: 1`.
 * @deprecated Ignores `--ui-scale`. Library popups now measure `--popup-collision`; this
 * constant remains for consumers that positioned their own popups with it.
 */
export const POPUP_COLLISION_PADDING = 8

export type SelectSize = "sm" | "md" | "lg"

export interface SelectOption<V extends string = string> {
  value: V
  label: string
  /** Shown in the row and, once chosen, in the trigger. Pass the icon without a size. */
  icon?: ReactNode
  /** Quiet trailing text in the row (a count, a version). Never repeats the label. */
  detail?: string
  disabled?: boolean
}

export interface SelectGroup<V extends string = string> {
  label: string
  options: Array<SelectOption<V>>
}

export type SelectOptions<V extends string = string> = Array<SelectOption<V>> | Array<SelectGroup<V>>

const isGroups = <V extends string>(options: SelectOptions<V>): options is Array<SelectGroup<V>> =>
  options.length > 0 && "options" in (options[0] as object)

/** The options as one flat list: group options in order when grouped, the list unchanged otherwise. */
export function flattenOptions<V extends string>(options: SelectOptions<V>): Array<SelectOption<V>> {
  return isGroups(options) ? options.flatMap((group) => group.options) : options
}

export interface SelectProps<V extends string = string> {
  options: SelectOptions<V>
  value?: V | null
  defaultValue?: V | null
  /** Called with the chosen option's value when one is picked. Pair with `value` to control it; use `defaultValue` otherwise. */
  onValueChange?: (value: V | null) => void
  /** Shown while nothing is chosen. Name the choice ("Choose an environment"), not "Select…". */
  placeholder?: string
  size?: SelectSize
  /** Content width: short (port, PIN), medium (name, hostname), full (default). */
  width?: FieldWidth
  /** A fixed leading icon, for options that have none of their own. */
  icon?: ReactNode
  disabled?: boolean
  readOnly?: boolean
  required?: boolean
  /** Invalid outside a Field. */
  invalid?: boolean
  name?: string
  id?: string
  /** Fires when focus leaves the select while it is closed (not when its popup opens). */
  onBlur?: (event: FocusEvent<HTMLButtonElement>) => void
  /** Called with true when the popup opens and false when it closes. */
  onOpenChange?: (open: boolean) => void
  /** Layout only. Applied to the trigger. */
  className?: string
  ref?: Ref<HTMLButtonElement>
  /** Accessible name when a visible label does not name the control. */
  "aria-label"?: string
  /** IDs of elements that provide the accessible name. */
  "aria-labelledby"?: string
}

function OptionRow<V extends string>({ option }: { option: SelectOption<V> }) {
  return (
    <BaseSelect.Item value={option.value} disabled={option.disabled} label={option.label} className="fa-item fa-select-item">
      {option.icon}
      <BaseSelect.ItemText className="fa-item-label">{option.label}</BaseSelect.ItemText>
      {option.detail ? <span className="fa-item-trail">{option.detail}</span> : null}
      <span className="fa-select-check" aria-hidden>
        <BaseSelect.ItemIndicator className="fa-select-indicator">
          <IconCheck />
        </BaseSelect.ItemIndicator>
      </span>
    </BaseSelect.Item>
  )
}

/**
 * Pick one option from a short, known list. The trigger is a field box (fa-control) that
 * shows the chosen option's icon and label; the list opens on glass below it, at least as
 * wide as the trigger, with a ✓ on the current option. Use Combobox when the list is long
 * enough to need typing.
 */
export function Select<V extends string = string>({
  options,
  value,
  defaultValue,
  onValueChange,
  placeholder = "Choose…",
  size = "md",
  width,
  icon,
  disabled,
  readOnly,
  required,
  invalid,
  name,
  id,
  onBlur,
  onOpenChange,
  className,
  ref,
  ...aria
}: SelectProps<V>) {
  const [open, setOpen] = useState(false)
  const flat = flattenOptions(options)
  const find = (current: V | null) => flat.find((option) => option.value === current)
  const popup = usePopupMetrics()

  return (
    <BaseSelect.Root<V>
      items={flat.map((option) => ({ value: option.value, label: option.label }))}
      value={value}
      defaultValue={defaultValue}
      onValueChange={(next) => onValueChange?.(next as V | null)}
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        onOpenChange?.(next)
      }}
      disabled={disabled}
      readOnly={readOnly}
      required={required}
      name={name}
      id={id}
    >
      <BaseSelect.Trigger
        {...aria}
        ref={ref}
        className={cx("fa-control fa-lit fa-select-trigger", className)}
        data-size={size}
        data-width={widthAttr(width)}
        data-readonly={readOnly ? "" : undefined}
        data-invalid={invalid ? "" : undefined}
        aria-invalid={invalid || undefined}
        onBlur={(event) => {
          if (!open) onBlur?.(event)
        }}
      >
        <BaseSelect.Value className="fa-select-value">
          {(current: V | null) => {
            const option = current === null ? undefined : find(current)
            if (!option) {
              return (
                <>
                  {icon}
                  <span className="fa-select-text" data-placeholder="">
                    {placeholder}
                  </span>
                </>
              )
            }
            return (
              <>
                {option.icon ?? icon}
                <span className="fa-select-text">{option.label}</span>
              </>
            )
          }}
        </BaseSelect.Value>
        <IconChevronsUpDown className="fa-select-chevron" />
      </BaseSelect.Trigger>
      <BaseSelect.Portal>
        <BaseSelect.Positioner
          className="fa-select-positioner"
          alignItemWithTrigger={false}
          align="start"
          sideOffset={popup.offset}
          collisionPadding={popup.collisionPadding}
        >
          <BaseSelect.Popup className="glass-overlay fa-popup fa-select-popup">
            <BaseSelect.List className="fa-select-list">
              {isGroups(options)
                ? options.map((group) => (
                    <BaseSelect.Group key={group.label} className="fa-select-group">
                      <BaseSelect.GroupLabel className="fa-popup-group-label">{group.label}</BaseSelect.GroupLabel>
                      {group.options.map((option) => (
                        <OptionRow key={option.value} option={option} />
                      ))}
                    </BaseSelect.Group>
                  ))
                : options.map((option) => <OptionRow key={option.value} option={option} />)}
            </BaseSelect.List>
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  )
}
