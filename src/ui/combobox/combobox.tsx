import { Combobox as BaseCombobox } from "@base-ui/react/combobox"
import { useMemo, useState, type FocusEvent, type ReactNode, type Ref } from "react"
import { IconCheck, IconChevronsUpDown, IconClose } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { usePopupMetrics } from "../../lib/popup-metrics.js"
import { Button } from "../button/index.js"
import { widthAttr, type FieldWidth } from "../field/index.js"
import type { SelectSize } from "../select/index.js"
import { OptionMore, OptionRow, OptionStatus, groupOptions, hasSecondLine, statusAnnouncement } from "./option-row.js"
import { matches, useOptionSearch, type OptionItem, type OptionSearch, type OptionSource } from "./source.js"
import { popupContainer } from "../../lib/popup-container.js"

export type ComboboxOption<V extends string = string> = OptionItem<V>

/** The default empty row: states the query (R2.5). */
export const noMatches = (query: string) => (query.trim() ? `No matches for “${query.trim()}”` : "No options")

/** Static filtering: label and description, ignoring case and diacritics. */
export const optionFilter = (item: OptionItem, query: string) => matches(`${item.label} ${item.description ?? ""}`, query)

/**
 * Items for a list control from static `options` or an async `source`, plus a memory of
 * every option seen so chosen values keep their labels when they leave the results.
 */
export function useOptionData<V extends string>(
  options: Array<OptionItem<V>> | undefined,
  source: OptionSource<V> | undefined,
  query: string,
  chosen: V[]
) {
  const search = useOptionSearch(source, query)
  // A memory of every option seen (a stable Map kept in state, filled as options arrive).
  const [seen] = useState(() => new Map<string, OptionItem<V>>())
  const base = source ? search.items : (options ?? [])
  for (const item of base) seen.set(item.value, item)
  for (const item of source?.suggestions ?? []) seen.set(item.value, item)
  // Keep chosen options in the list: Base UI needs them to show the selection.
  const missing = source
    ? chosen
        .filter((value) => !base.some((item) => item.value === value))
        .map((value) => seen.get(value))
        .filter((item): item is OptionItem<V> => item !== undefined)
    : []
  const items = missing.length ? [...base, ...missing] : base
  const labelOf = (value: V) => seen.get(value)?.label ?? value
  const itemOf = (value: V) => seen.get(value)
  return { items, search: source ? search : undefined, labelOf, itemOf }
}

/** The Base UI collection (string values and labels), grouped when options name a group. */
export function useOptionCollection<V extends string>(items: Array<OptionItem<V>>) {
  return useMemo(() => {
    const groups = groupOptions(items)
    const accessors = { getValue: (item: OptionItem<V>) => item.value, getLabel: (item: OptionItem<V>) => item.label }
    return groups ? BaseCombobox.createItems(groups, accessors) : BaseCombobox.createItems(items, accessors)
  }, [items])
}

function Row<V extends string>({ item, query, check }: { item: OptionItem<V>; query: string; check: boolean }) {
  return (
    <BaseCombobox.Item
      value={item.value}
      disabled={item.disabled}
      className="fa-item fa-select-item fa-option"
      data-two-line={item.description || (item.disabled && item.disabledReason) ? "" : undefined}
    >
      <OptionRow
        item={item}
        query={query}
        check={
          check ? (
            <BaseCombobox.ItemIndicator className="fa-select-indicator">
              <IconCheck />
            </BaseCombobox.ItemIndicator>
          ) : undefined
        }
      />
    </BaseCombobox.Item>
  )
}

export interface ComboboxPopupProps<V extends string = string> {
  items: Array<OptionItem<V>>
  /** Current search text or typed query state. */
  query: string
  /** The async search, when the list comes from a source. */
  search?: OptionSearch<V>
  /** Show skeleton rows (static lists loading from elsewhere). */
  loading?: boolean
  /** Text for the empty row; receives the current query. */
  empty?: (query: string) => ReactNode
  /** Reserve the ✓ column (single and multiple choice). */
  check?: boolean
}

/**
 * The glass list shared by Combobox, MultiSelect and TagInput: a polite live count, the
 * list state (refresh line, first-load skeleton rows, error with Retry, "type more"),
 * the empty row, options (grouped when they name a group) and the "N more" footer.
 */
export function ComboboxPopup<V extends string = string>({
  items,
  query,
  search,
  loading = false,
  empty = noMatches,
  check = true,
}: ComboboxPopupProps<V>) {
  const status = loading ? "loading" : (search?.status ?? "idle")
  const twoLine = hasSecondLine(items)
  const grouped = groupOptions(items) !== null
  const quiet = status === "loading" || status === "error" || (search?.needsMore ?? 0) > 0
  const popup = usePopupMetrics()
  return (
    <BaseCombobox.Portal container={popupContainer()}>
      <BaseCombobox.Positioner
        className="fa-select-positioner"
        align="start"
        sideOffset={popup.offset}
        collisionPadding={popup.collisionPadding}
      >
        <BaseCombobox.Popup
          className="glass-overlay fa-popup fa-combobox-popup"
          aria-busy={status === "loading" || status === "refreshing" || undefined}
          data-status={status}
        >
          <BaseCombobox.Status className="sr-only">{statusAnnouncement(status, items.length, query)}</BaseCombobox.Status>
          <OptionStatus status={status} twoLine={twoLine} needsMore={search?.needsMore} onRetry={search?.retry} />
          <BaseCombobox.Empty className="fa-combobox-empty-slot">
            {quiet ? null : <div className="fa-combobox-empty">{empty(query)}</div>}
          </BaseCombobox.Empty>
          <BaseCombobox.List className="fa-select-list">
            {grouped
              ? (group: { value: string; items: Array<OptionItem<V>> }) => (
                  <BaseCombobox.Group key={group.value} items={group.items} className="fa-select-group">
                    {group.value ? <BaseCombobox.GroupLabel className="fa-popup-group-label">{group.value}</BaseCombobox.GroupLabel> : null}
                    <BaseCombobox.Collection>
                      {(item: OptionItem<V>) => <Row key={item.value} item={item} query={query} check={check} />}
                    </BaseCombobox.Collection>
                  </BaseCombobox.Group>
                )
              : (item: OptionItem<V>) => <Row key={item.value} item={item} query={query} check={check} />}
          </BaseCombobox.List>
          <OptionMore more={search?.more ?? 0} />
        </BaseCombobox.Popup>
      </BaseCombobox.Positioner>
    </BaseCombobox.Portal>
  )
}

export interface ComboboxProps<V extends string = string> {
  /** A static list, filtered as you type. */
  options?: Array<ComboboxOption<V>>
  /** Or search a server as you type (debounced, cancellable, cached). */
  source?: OptionSource<V>
  value?: V | null
  defaultValue?: V | null
  /**
   * Called with the chosen option's value when one is picked, or null when the selection is
   * cleared. Typing alone does not call it. Pair with `value` to control it; use `defaultValue` otherwise.
   */
  onValueChange?: (value: V | null) => void
  placeholder?: string
  size?: SelectSize
  /** Content width: short (port, PIN), medium (name, hostname), full (default). */
  width?: FieldWidth
  /** Leading icon. */
  icon?: ReactNode
  /** Skeleton rows while static options load elsewhere. */
  loading?: boolean
  /** Text for the empty row. Default: No matches for “query”. */
  empty?: (query: string) => ReactNode
  disabled?: boolean
  readOnly?: boolean
  required?: boolean
  /** Marks the control invalid. Pair it with an accessible validation message. */
  invalid?: boolean
  name?: string
  id?: string
  /** Called when the text input loses focus, so a form can mark the field touched. */
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void
  /** Layout only. Applied to the control box. */
  className?: string
  ref?: Ref<HTMLInputElement>
  /** Accessible name when a visible label does not name the control. */
  "aria-label"?: string
}

/**
 * Choose exactly one item from a long list by typing. Same box as Input, same list as
 * Select; static options or an async source. Arrow keys move, Enter chooses, Esc closes
 * then clears.
 */
export function Combobox<V extends string = string>({
  options,
  source,
  value,
  defaultValue,
  onValueChange,
  placeholder,
  size = "md",
  width,
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
}: ComboboxProps<V>) {
  const [query, setQuery] = useState("")
  const [inner, setInner] = useState<V | null>(defaultValue ?? null)
  const current = value === undefined ? inner : value
  const data = useOptionData(options, source, query, current === null ? [] : [current])
  const items = useOptionCollection(data.items)

  return (
    <BaseCombobox.Root
      items={items}
      value={current}
      onValueChange={(next) => {
        const chosen = (next ?? null) as V | null
        if (value === undefined) setInner(chosen)
        onValueChange?.(chosen)
      }}
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
        className={cx("fa-control fa-input fa-combobox", className)}
        data-size={size}
        data-width={widthAttr(width)}
        data-readonly={readOnly ? "" : undefined}
        data-disabled={disabled ? "" : undefined}
        data-invalid={invalid ? "" : undefined}
      >
        {icon}
        <BaseCombobox.Input
          {...aria}
          ref={ref}
          placeholder={placeholder}
          aria-invalid={invalid || undefined}
          onBlur={onBlur}
          className="fa-control-input"
        />
        {readOnly ? null : (
          <>
            <BaseCombobox.Clear
              // Base UI's default "x" text is dropped: the Button shows the icon.
              render={({ children: _text, ...props }) => (
                <Button {...props} variant="ghost" size="sm" className="fa-input-btn" icon={<IconClose />} aria-label="Clear" />
              )}
              tabIndex={-1}
            />
            <BaseCombobox.Trigger
              render={
                <Button variant="ghost" size="sm" className="fa-input-btn" icon={<IconChevronsUpDown />} aria-label="Show options" />
              }
              tabIndex={-1}
            />
          </>
        )}
      </BaseCombobox.InputGroup>
      <ComboboxPopup items={data.items} query={query} search={data.search} loading={loading} empty={empty} />
    </BaseCombobox.Root>
  )
}
