import { Combobox as BaseCombobox } from "@base-ui/react/combobox"
import { useLayoutEffect, useRef, useState, type FocusEvent, type ReactNode, type Ref } from "react"
import { IconChevronsUpDown } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { useElementSize } from "../../lib/use-element-size.js"
import { Button } from "../button/index.js"
import {
  ChipMeasure,
  ComboboxPopup,
  OptionChip,
  optionFilter,
  useOptionCollection,
  useOptionData,
  type ComboboxOption,
  type OptionItem,
  type OptionSource,
} from "../combobox/index.js"
import { widthAttr, type FieldWidth } from "../field/index.js"
import type { SelectSize } from "../select/index.js"

export interface MultiSelectProps<V extends string = string> {
  /** A static list, filtered as you type. */
  options?: Array<ComboboxOption<V>>
  /** Or search a server as you type. */
  source?: OptionSource<V>
  value?: V[]
  defaultValue?: V[]
  /** Called when value change occurs. The callback type specifies its arguments. */
  onValueChange?: (value: V[]) => void
  /** Shown while nothing is chosen. */
  placeholder?: string
  size?: SelectSize
  /** Content width: medium or full (default). */
  width?: FieldWidth
  /**
   * Let chips wrap onto more lines (forms: growth the user caused). Off: one line that
   * folds the overflow into "+N" (toolbars, table filters, rows).
   */
  wrap?: boolean
  icon?: ReactNode
  /** Skeleton rows while static options load elsewhere. */
  loading?: boolean
  /** Content shown when there are no matching items. */
  empty?: (query: string) => ReactNode
  disabled?: boolean
  readOnly?: boolean
  required?: boolean
  /** Marks the control invalid. Pair it with an accessible validation message. */
  invalid?: boolean
  name?: string
  id?: string
  /** Called when blur occurs. The callback type specifies its arguments. */
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void
  /** Layout only. Applied to the control box. */
  className?: string
  ref?: Ref<HTMLInputElement>
  /** Accessible name when a visible label does not name the control. */
  "aria-label"?: string
}

/**
 * How many chips fit beside a minimum-width input, given measured chip widths. When not
 * all fit, room is kept for the "+N" chip.
 */
export function fitChips(widths: number[], available: number, gap: number, overflowWidth: number, inputMin: number) {
  const total = widths.reduce((sum, width) => sum + width + gap, 0)
  if (total + inputMin <= available) return widths.length
  let used = overflowWidth + gap + inputMin
  let count = 0
  for (const width of widths) {
    if (used + width + gap > available) break
    used += width + gap
    count += 1
  }
  return count
}

/**
 * Fold chips that do not fit one line into "+N". Measures a hidden twin of the chips
 * before paint; the typing area only claims its minimum while the field is focused.
 */
export function useChipFit(labels: string[], enabled: boolean, focused: boolean) {
  const chipsRef = useRef<HTMLDivElement | null>(null)
  const measureRef = useRef<HTMLDivElement | null>(null)
  const { width: available } = useElementSize(chipsRef)
  const [visible, setVisible] = useState(labels.length)
  const key = labels.join("\u0000")
  const hasValue = labels.length > 0

  useLayoutEffect(() => {
    const layer = measureRef.current
    const chips = chipsRef.current
    if (!enabled || !layer || !chips || available === 0) return
    const widths = [...layer.querySelectorAll<HTMLElement>("[data-measure='chip']")].map((node) => node.getBoundingClientRect().width)
    const overflow = layer.querySelector<HTMLElement>("[data-measure='overflow']")?.getBoundingClientRect().width ?? 0
    const inputMin =
      focused || !hasValue ? (layer.querySelector<HTMLElement>("[data-measure='input']")?.getBoundingClientRect().width ?? 0) : 0
    const gap = Number.parseFloat(getComputedStyle(chips).columnGap) || 0
    setVisible(fitChips(widths, available, gap, overflow, inputMin))
    // oxlint-disable-next-line react/exhaustive-effect-dependencies -- key: re-measure when the chosen labels change
  }, [available, key, focused, hasValue, enabled])

  return { chipsRef, measureRef, visible: enabled ? visible : labels.length }
}

/**
 * Several choices from a list, shown as chips inside the field. Static options or an
 * async source. One line by default (overflow folds into "+N", its tooltip lists them);
 * `wrap` lets chips flow onto more lines in forms. Backspace in the empty input removes
 * the last choice; ← walks the chips.
 */
export function MultiSelect<V extends string = string>({
  options,
  source,
  value,
  defaultValue,
  onValueChange,
  placeholder,
  size = "md",
  width,
  wrap = false,
  icon,
  loading = false,
  empty,
  disabled,
  readOnly,
  required,
  invalid,
  name,
  id,
  onBlur,
  className,
  ref,
  ...aria
}: MultiSelectProps<V>) {
  const [inner, setInner] = useState<V[]>(defaultValue ?? [])
  const [query, setQuery] = useState("")
  const [focused, setFocused] = useState(false)
  const current = value ?? inner
  const data = useOptionData(options, source, query, current)
  const items = useOptionCollection(data.items)
  const labels = current.map(data.labelOf)
  const { chipsRef, measureRef, visible } = useChipFit(labels, !wrap, focused)

  const commit = (next: V[]) => {
    if (value === undefined) setInner(next)
    onValueChange?.(next)
  }

  const shown = current.slice(0, visible)
  const hidden = current.slice(visible)

  return (
    <BaseCombobox.Root
      multiple
      items={items}
      value={current}
      onValueChange={(next) => commit(next as V[])}
      onInputValueChange={(next) => setQuery(next)}
      filter={source ? null : (item: OptionItem<V>, q: string) => optionFilter(item, q)}
      itemToStringLabel={(itemValue: V) => data.labelOf(itemValue)}
      autoHighlight
      disabled={disabled}
      readOnly={readOnly}
      required={required}
      name={name}
      id={id}
    >
      <BaseCombobox.InputGroup
        className={cx("fa-control fa-input fa-multi", className)}
        data-size={size}
        data-width={widthAttr(width)}
        data-wrap={wrap ? "" : undefined}
        data-readonly={readOnly ? "" : undefined}
        data-disabled={disabled ? "" : undefined}
        data-invalid={invalid ? "" : undefined}
        data-has-value={current.length > 0 ? "" : undefined}
        onFocus={() => setFocused(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false)
        }}
      >
        {wrap ? null : (
          <div ref={measureRef} className="fa-multi-measure" aria-hidden>
            {current.map((key) => (
              <ChipMeasure key={key} label={data.labelOf(key)} icon={data.itemOf(key)?.icon} removable={!readOnly} />
            ))}
            <span className="fa-chip" data-measure="overflow" data-overflow="">
              <span className="fa-chip-label">+{Math.max(current.length, 9)}</span>
            </span>
            <span className="fa-multi-input-min" data-measure="input" />
          </div>
        )}
        {icon}
        <BaseCombobox.Chips
          ref={chipsRef}
          className="fa-multi-chips"
          aria-label={current.length > 0 ? `${current.length} selected` : undefined}
        >
          {shown.map((key) => (
            <OptionChip key={key} label={data.labelOf(key)} icon={data.itemOf(key)?.icon} readOnly={readOnly} />
          ))}
          {hidden.length > 0 ? (
            <span className="fa-chip" data-overflow="" title={hidden.map(data.labelOf).join(", ")}>
              <span className="fa-chip-label" aria-label={`${hidden.length} more: ${hidden.map(data.labelOf).join(", ")}`}>
                +{hidden.length}
              </span>
            </span>
          ) : null}
          <BaseCombobox.Input
            {...aria}
            ref={ref}
            placeholder={current.length > 0 ? undefined : placeholder}
            aria-invalid={invalid || undefined}
            onBlur={onBlur}
            onKeyDown={(event) => {
              // Backspace removes the last choice, including ones folded into "+N".
              if (event.key !== "Backspace" || event.currentTarget.value !== "" || current.length === 0) return
              event.preventBaseUIHandler()
              commit(current.slice(0, -1))
            }}
            className="fa-control-input fa-multi-input"
          />
        </BaseCombobox.Chips>
        {readOnly ? null : (
          <BaseCombobox.Trigger
            render={<Button variant="ghost" size="sm" className="fa-input-btn" icon={<IconChevronsUpDown />} aria-label="Show options" />}
            tabIndex={-1}
          />
        )}
      </BaseCombobox.InputGroup>
      <ComboboxPopup items={data.items} query={query} search={data.search} loading={loading} empty={empty} />
    </BaseCombobox.Root>
  )
}
