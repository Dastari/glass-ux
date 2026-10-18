import { Toggle } from "@base-ui/react/toggle"
import { ToggleGroup } from "@base-ui/react/toggle-group"
import { use, useId, useRef, type CSSProperties, type FocusEvent } from "react"
import { IconCheck, IconChevronDown } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { overflowsOwnBox, useFitForm } from "../../lib/fit-form.js"
import { useControllable } from "../../lib/use-controllable.js"
import { Menu, MenuPrimitive } from "../menu/index.js"
import { SegmentedCollapseContext } from "../segmented/index.js"
import { useSettingRow } from "../setting-row/index.js"
import { Tooltip } from "../tooltip/index.js"

export type SwatchPickerSize = "sm" | "md"

/**
 * How the picker is drawn (`data-form`):
 *   full   every swatch in the track
 *   menu   one button showing the chosen swatch and a chevron; its menu lists every swatch
 *          with its name and a check on the chosen one
 */
export type SwatchPickerForm = "full" | "menu"

/**
 * What the picker does when its swatches do not fit:
 *   auto   (default) measure against the container: every swatch while they fit, else the menu
 *   menu   always the menu: for a host that has already measured and decided
 *   none   never collapse: the swatches wrap onto more lines
 */
export type SwatchPickerCollapse = "auto" | "menu" | "none"

export interface SwatchOption<V extends string = string> {
  value: V
  /** The colour's name: the swatch's accessible name and its tooltip ("Ocean"), and its label in the menu form. */
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
  /** Called with the chosen swatch's `value` when the person picks one (a swatch, or a menu item in the menu form); pressing the current swatch does not deselect it. Pair with `value` to control it. */
  onValueChange?: (value: V) => void
  /** sm 32 for toolbars, md 40 beside fields and segmented controls (default). */
  size?: SwatchPickerSize
  /**
   * What happens when the swatches do not fit: "auto" (default) folds to one menu button
   * showing the chosen swatch; "menu" always shows it; "none" wraps the swatches. Default:
   * the host's SegmentedCollapseContext, else "auto".
   */
  collapse?: SwatchPickerCollapse
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

const SWATCH_FORMS = ["full", "menu"] as const satisfies readonly SwatchPickerForm[]

/** A swatch's dot: a palette island's accent gradient, a colour token, or an empty ring when nothing is chosen. */
function SwatchDot({ option }: { option: SwatchOption | undefined }) {
  return (
    <span
      className="fa-swatch-picker-dot"
      data-palette={option?.palette}
      data-colour={option?.colour ? "" : undefined}
      data-empty={option ? undefined : ""}
      style={option?.colour ? ({ "--_swatch": option.colour } as CSSProperties) : undefined}
      aria-hidden
    />
  )
}

/**
 * One colour from a small set (a palette, an organisation's tint): round swatches in a
 * recessed track, each named by a tooltip. The chosen swatch takes an accent ring. Arrow
 * keys move between swatches; the group is one tab stop. In a SettingRow the row's label
 * names it, like a segmented control.
 *
 * Container-aware (R7), like Segmented: when the swatches do not fit the box it is given,
 * the track holds one button showing the chosen swatch and a chevron, whose menu lists every
 * swatch with its name and a check on the chosen one. The button keeps its width whatever
 * the value. The value, onValueChange and the group's accessible name are the same in both
 * forms.
 */
export function SwatchPicker<V extends string = string>({
  options,
  value,
  defaultValue,
  onValueChange,
  size = "md",
  collapse: collapseProp,
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
  const hostCollapse = use(SegmentedCollapseContext)
  const collapse = collapseProp ?? hostCollapse ?? "auto"
  const auto = collapse === "auto"
  const rootRef = useRef<HTMLDivElement | null>(null)
  const measureRef = useRef<HTMLSpanElement | null>(null)
  const valueId = useId()
  const signature = options.map((option) => option.value).join("|")

  // The natural width of every swatch in one line, from an off-screen row (known in either form).
  const measured = useFitForm<SwatchPickerForm>({
    forms: SWATCH_FORMS,
    enabled: auto,
    ref: rootRef,
    observe: [measureRef],
    signature: `${signature}|${size}`,
    measure: (root, shown) => {
      const last = root.querySelector<HTMLElement>(":scope > .fa-swatch-picker-item:last-of-type")
      return { widths: { full: measureRef.current?.scrollWidth ?? 0 }, overflowing: shown === "full" && overflowsOwnBox(root, last) }
    },
  })
  const form: SwatchPickerForm = collapse === "menu" ? "menu" : auto ? measured : "full"

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onBlur?.(event)
  }
  const shared = {
    id,
    "data-size": size,
    "data-form": form,
    "data-collapse": collapse === "none" ? undefined : collapse,
  }
  // The track with every swatch, measured off-screen whatever the form (auto only).
  const measureRow = auto ? (
    <span className="fa-swatch-picker-measure" aria-hidden>
      <span ref={measureRef} className="fa-swatch-picker fa-swatch-picker-measure-row" data-size={size}>
        {options.map((option) => (
          <span key={option.value} className="fa-swatch-picker-item" />
        ))}
      </span>
    </span>
  ) : null

  if (form === "menu") {
    const chosen = options.find((option) => option.value === current)
    const groupLabel = aria["aria-label"]
    const labelledBy = aria["aria-labelledby"] ?? (groupLabel ? undefined : row?.labelId)
    const chosenName = chosen?.label ?? "none"
    return (
      <div
        ref={rootRef}
        role="group"
        aria-label={groupLabel}
        aria-labelledby={labelledBy}
        aria-describedby={row?.descriptionId}
        onBlur={handleBlur}
        className={cx("fa-swatch-picker", className)}
        {...shared}
        data-disabled={disabled ? "" : undefined}
      >
        <Menu.Root>
          <Tooltip content={chosen?.label ?? "None chosen"} describe={false}>
            <MenuPrimitive.Trigger
              className="fa-swatch-picker-trigger fa-pressable fa-lit"
              disabled={disabled}
              // The group's name and the chosen colour ("Palette: Ocean"), as the full form reads.
              aria-label={groupLabel ? `${groupLabel}: ${chosenName}` : undefined}
              aria-labelledby={groupLabel ? undefined : cx(labelledBy, valueId) || undefined}
            >
              <SwatchDot option={chosen} />
              <IconChevronDown className="fa-swatch-picker-chevron" />
            </MenuPrimitive.Trigger>
          </Tooltip>
          <Menu.Popup align="start" className="fa-swatch-picker-menu">
            <MenuPrimitive.RadioGroup value={current ?? null} onValueChange={(next: V) => setCurrent(next)}>
              {options.map((option) => (
                <MenuPrimitive.RadioItem
                  key={option.value}
                  value={option.value}
                  label={option.label}
                  disabled={option.disabled}
                  closeOnClick
                  className="fa-item fa-menu-item"
                  data-selected={option.value === current ? "" : undefined}
                >
                  <SwatchDot option={option} />
                  <span className="fa-item-label">{option.label}</span>
                  <MenuPrimitive.RadioItemIndicator className="fa-swatch-picker-check">
                    <IconCheck />
                  </MenuPrimitive.RadioItemIndicator>
                </MenuPrimitive.RadioItem>
              ))}
            </MenuPrimitive.RadioGroup>
          </Menu.Popup>
        </Menu.Root>
        {/* Named by aria-labelledby; hidden text still counts towards a name. */}
        <span id={valueId} hidden>
          {chosenName}
        </span>
        {measureRow}
      </div>
    )
  }

  return (
    <ToggleGroup<V>
      aria-labelledby={aria["aria-label"] ? undefined : row?.labelId}
      aria-describedby={row?.descriptionId}
      {...aria}
      ref={rootRef}
      value={current == null ? [] : [current]}
      onValueChange={(next) => {
        const picked = next[0]
        if (picked === undefined) return
        setCurrent(picked)
      }}
      disabled={disabled}
      onBlur={handleBlur}
      className={cx("fa-swatch-picker", className)}
      {...shared}
    >
      {options.map((option) => (
        <Tooltip key={option.value} content={option.label}>
          <Toggle value={option.value} disabled={option.disabled} aria-label={option.label} className="fa-swatch-picker-item">
            <SwatchDot option={option} />
          </Toggle>
        </Tooltip>
      ))}
      {measureRow}
    </ToggleGroup>
  )
}
