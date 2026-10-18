import { Toggle } from "@base-ui/react/toggle"
import { ToggleGroup } from "@base-ui/react/toggle-group"
import type { CSSProperties, FocusEvent } from "react"
import { cx } from "../../lib/cx.js"
import { useControllable } from "../../lib/use-controllable.js"
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
  /** Called with the chosen swatch's `value` when the person picks one; pressing the current swatch does not deselect it. Pair with `value` to control it. */
  onValueChange?: (value: V) => void
  /** sm 32 for toolbars, md 40 beside fields and segmented controls (default). */
  size?: SwatchPickerSize
  disabled?: boolean
  /** Called with the focus event when focus leaves the whole picker, not when it moves between swatches. For form libraries' touched state. */
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
  // null is a controlled "nothing picked"; only undefined leaves the picker uncontrolled.
  const [current, setCurrent] = useControllable<V | null | undefined>(value, defaultValue, (next) => {
    if (next != null) onValueChange?.(next)
  })
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
        setCurrent(picked)
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
