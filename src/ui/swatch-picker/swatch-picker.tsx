import { Toggle } from "@base-ui/react/toggle"
import { ToggleGroup } from "@base-ui/react/toggle-group"
import { useState, type CSSProperties, type FocusEvent } from "react"
import { cx } from "../../lib/cx.js"
import { useSettingRow } from "../setting-row/index.js"
import { Tooltip } from "../tooltip/index.js"

export type SwatchPickerSize = "sm" | "md"

export interface SwatchOption<V extends string = string> {
  value: V
  /** The colour's name: the swatch's accessible name and its tooltip ("Ocean"). */
  label: string
  /**
   * A palette id. The swatch becomes a token island (`data-palette`) and paints that
   * palette's accent gradient, so it is right in both modes without a second colour.
   */
  palette?: string
  /** Otherwise, a colour token for the swatch: `var(--identity-3)`. Never a raw colour. */
  colour?: string
  disabled?: boolean
}

export interface SwatchPickerProps<V extends string = string> {
  options: Array<SwatchOption<V>>
  /** The chosen swatch. `null` when none is (a custom colour is in use). */
  value?: V | null
  defaultValue?: V
  /** Called when value change occurs. The callback type specifies its arguments. */
  onValueChange?: (value: V) => void
  /** sm 32 for toolbars, md 40 beside fields and segmented controls (default). */
  size?: SwatchPickerSize
  disabled?: boolean
  /** Called when blur occurs. The callback type specifies its arguments. */
  onBlur?: (event: FocusEvent<HTMLDivElement>) => void
  /** Layout only. */
  className?: string
  id?: string
  /** Accessible name when a visible label does not name the control. */
  "aria-label"?: string
  /** IDs of elements that provide the accessible name. */
  "aria-labelledby"?: string
}

/**
 * One colour from a small set (a palette, an organisation's tint): round swatches in a
 * recessed track, each named by a tooltip. The chosen swatch takes an accent ring. Arrow
 * keys move between swatches; the group is one tab stop. In a SettingRow the row's label
 * names it, like a segmented control.
 */
export function SwatchPicker<V extends string = string>({
  options,
  value,
  defaultValue,
  onValueChange,
  size = "md",
  disabled,
  onBlur,
  className,
  id,
  ...aria
}: SwatchPickerProps<V>) {
  const [inner, setInner] = useState<V | undefined>(defaultValue)
  const current = value === undefined ? inner : value
  const row = useSettingRow()
  return (
    <ToggleGroup<V>
      aria-labelledby={aria["aria-label"] ? undefined : row?.labelId}
      aria-describedby={row?.descriptionId}
      {...aria}
      id={id}
      value={current == null ? [] : [current]}
      onValueChange={(next) => {
        const picked = next[0]
        if (picked === undefined) return
        if (value === undefined) setInner(picked)
        onValueChange?.(picked)
      }}
      disabled={disabled}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onBlur?.(event)
      }}
      className={cx("fa-swatch-picker", className)}
      data-size={size}
    >
      {options.map((option) => (
        <Tooltip key={option.value} content={option.label}>
          <Toggle value={option.value} disabled={option.disabled} aria-label={option.label} className="fa-swatch-picker-item">
            <span
              className="fa-swatch-picker-dot"
              data-palette={option.palette}
              data-colour={option.colour ? "" : undefined}
              style={option.colour ? ({ "--_swatch": option.colour } as CSSProperties) : undefined}
              aria-hidden
            />
          </Toggle>
        </Tooltip>
      ))}
    </ToggleGroup>
  )
}
