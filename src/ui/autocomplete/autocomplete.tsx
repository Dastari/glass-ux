import { DirectionPortal } from "../../lib/direction-portal.js"
import { useLocale } from "../../lib/locale/use-locale.js"
import { comboboxMessages } from "../combobox/messages.js"
import { useMessages } from "../../lib/i18n/index.js"
import { autocompleteMessages } from "./messages.js"
import { Autocomplete as BaseAutocomplete } from "@base-ui/react/autocomplete"
import { useState, type FocusEvent, type ReactNode, type Ref } from "react"
import { IconClose } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { usePopupMetrics } from "../../lib/popup-metrics.js"
import { Button } from "../button/index.js"
import { OptionMore, OptionRow, OptionStatus, groupOptions, hasSecondLine, optionFilter, statusAnnouncement, useOptionSearch, type OptionItem, type OptionSource } from "../combobox/index.js"
import { widthAttr, type FieldWidth } from "../field/index.js"
import type { SelectSize } from "../select/index.js"
import { popupContainer } from "../../lib/popup-container.js"

export interface AutocompleteProps<V extends string = string> {
  /** Static suggestions, filtered as you type. */
  options?: Array<OptionItem<V>>
  /** Or suggestions searched on a server as you type. */
  source?: OptionSource<V>
  /** The text. Not limited to the suggestions. */
  value?: string
  defaultValue?: string
  /**
   * Called with the raw text on each keystroke, clear, or when a suggestion fills the field (with
   * its label or value, per `fill`). Pair with `value` to control it; use `defaultValue` otherwise.
   */
  onValueChange?: (value: string) => void
  /** Called when a suggestion is chosen, with the option. */
  onPick?: (item: OptionItem<V>) => void
  /** What choosing a suggestion puts in the field: its label (default) or its value. */
  fill?: "label" | "value"
  placeholder?: string
  size?: SelectSize
  /** Content width: short, medium or full (default). */
  width?: FieldWidth
  /** Leading icon. */
  icon?: ReactNode
  /** Text for the empty row (only while a source has answered). Default: none. */
  empty?: (query: string) => ReactNode
  /** A quiet line at the foot of the suggestions: a data source's attribution. */
  footer?: ReactNode
  /** What the list says when a source's search fails, in place of the default "Search failed" text. Retry stays beside it. */
  errorText?: ReactNode
  disabled?: boolean
  readOnly?: boolean
  required?: boolean
  /** Show the Clear button, which empties the text. Default true. */
  clearable?: boolean
  /** Marks the control invalid. Pair it with an accessible validation message. */
  invalid?: boolean
  name?: string
  id?: string
  /** Called when the text input loses focus, so a form can mark the field touched. */
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void
  /** Called when the text input takes focus. */
  onFocus?: (event: FocusEvent<HTMLInputElement>) => void
  /** Open the list on a click in the text, for text that is already there to search from. Default: only when the source has `suggestions`. */
  openOnInputClick?: boolean
  /** Layout only. Applied to the control box. */
  className?: string
  ref?: Ref<HTMLInputElement>
  /** Accessible name when a visible label does not name the control. */
  "aria-label"?: string
}

/**
 * Free text with suggestions as you type: search boxes, hostnames, paths. Choosing a
 * suggestion fills the text; anything else may be typed. Suggestions come from a static
 * list or an async source and use the same rows as Select and Combobox.
 */
export function Autocomplete<V extends string = string>({
  options,
  source,
  value,
  defaultValue,
  onValueChange,
  onPick,
  fill = "label",
  placeholder,
  size = "md",
  width,
  icon,
  empty,
  footer,
  errorText,
  disabled,
  readOnly,
  required,
  clearable = true,
  invalid,
  name,
  id,
  onBlur,
  onFocus,
  openOnInputClick,
  className,
  ref,
  ...aria
}: AutocompleteProps<V>) {
  const messages = useMessages(autocompleteMessages)
 const optionMessages = useMessages(comboboxMessages)
 const optionLocale = useLocale()

  const popup = usePopupMetrics()
  const [inner, setInner] = useState(defaultValue ?? "")
  const text = value ?? inner
  const search = useOptionSearch(source, text)
  const staticItems = options ?? []
  const items = source ? search.items : staticItems.filter((item) => optionFilter(item, text, optionLocale))
  const status = source ? search.status : "idle"
  const twoLine = hasSecondLine(items)
  const groups = groupOptions(items)
  const row = (item: OptionItem<V>) => (
    <BaseAutocomplete.Item
      key={item.value}
      value={item}
      disabled={item.disabled}
      onClick={() => onPick?.(item)}
      className="fa-item fa-select-item fa-option"
      data-two-line={item.description || (item.disabled && item.disabledReason) ? "" : undefined}
    >
      <OptionRow item={item} query={text} />
    </BaseAutocomplete.Item>
  )
  const showEmpty = Boolean(source || empty) && text.trim() !== "" && status === "idle" && search.needsMore === 0
  // With nothing to show the popup stays shut: no empty strip, and Base UI, which hides the
  // rest of the page from assistive technology while a combobox popup is open, hides nothing.
  const [wantsOpen, setWantsOpen] = useState(false)
  const hasContent = items.length > 0 || showEmpty || status !== "idle" || search.needsMore > 0

  return (
    <BaseAutocomplete.Root
      open={wantsOpen && hasContent}
      onOpenChange={setWantsOpen}
      items={(groups ?? items) as Array<OptionItem<V>>}
      value={text}
      onValueChange={(next) => {
        if (value === undefined) setInner(next)
        // Base UI closes on an emptied field only when its popup was showing.
        if (next.trim() === "" && !source?.suggestions?.length) setWantsOpen(false)
        onValueChange?.(next)
      }}
      filter={null}
      itemToStringValue={(item: OptionItem<V>) => (fill === "value" ? item.value : item.label)}
      openOnInputClick={openOnInputClick ?? Boolean(source?.suggestions?.length)}
      autoHighlight
      disabled={disabled}
      readOnly={readOnly}
      required={required}
      name={name}
      id={id}
    >
      <BaseAutocomplete.InputGroup
        className={cx("fa-control fa-input fa-autocomplete", className)}
        data-size={size}
        data-width={widthAttr(width)}
        data-readonly={readOnly ? "" : undefined}
        data-disabled={disabled ? "" : undefined}
        data-invalid={invalid ? "" : undefined}
      >
        {icon}
        <BaseAutocomplete.Input
          {...aria}
          ref={ref}
          placeholder={placeholder}
          aria-invalid={invalid || undefined}
          onFocus={onFocus}
          onBlur={(event) => {
            // Base UI reports no close for a popup held shut, and results may still arrive.
            setWantsOpen(false)
            onBlur?.(event)
          }}
          className="fa-control-input"
        />
        {readOnly || !clearable ? null : (
          <BaseAutocomplete.Clear
            // Base UI's default "x" text is dropped: the Button shows the icon.
            render={({ children: _text, ...props }) => (
              <Button {...props} variant="ghost" size="sm" className="fa-input-btn" icon={<IconClose />} aria-label={messages.clear} />
            )}
            tabIndex={-1}
          />
        )}
      </BaseAutocomplete.InputGroup>
      <BaseAutocomplete.Portal render={<DirectionPortal />} container={popupContainer()}>
        <BaseAutocomplete.Positioner
          className="fa-select-positioner"
          align="start"
          sideOffset={popup.offset}
          collisionPadding={popup.collisionPadding}
        >
          <BaseAutocomplete.Popup
            className="glass-overlay fa-popup fa-combobox-popup"
            aria-busy={status === "loading" || status === "refreshing" || undefined}
            data-status={status}
          >
            <BaseAutocomplete.Status className="sr-only">{statusAnnouncement(status, items.length, text, optionMessages, optionLocale)}</BaseAutocomplete.Status>
            <OptionStatus status={status} twoLine={twoLine} needsMore={search.needsMore} onRetry={search.retry} errorText={errorText} />
            <BaseAutocomplete.Empty className="fa-combobox-empty-slot">
              {showEmpty ? <div className="fa-combobox-empty">{empty ? empty(text) : (text.trim() ? optionMessages.noMatchesFor(text.trim()) : optionMessages.noOptions)}</div> : null}
            </BaseAutocomplete.Empty>
            <BaseAutocomplete.List className="fa-select-list">
              {groups
                ? (group: { value: string; items: Array<OptionItem<V>> }) => (
                    <BaseAutocomplete.Group key={group.value} items={group.items} className="fa-select-group">
                      {group.value ? (
                        <BaseAutocomplete.GroupLabel className="fa-popup-group-label">{group.value}</BaseAutocomplete.GroupLabel>
                      ) : null}
                      <BaseAutocomplete.Collection>{(item: OptionItem<V>) => row(item)}</BaseAutocomplete.Collection>
                    </BaseAutocomplete.Group>
                  )
                : (item: OptionItem<V>) => row(item)}
            </BaseAutocomplete.List>
            <OptionMore more={source ? search.more : 0} />
            {footer ? <div className="fa-autocomplete-footer">{footer}</div> : null}
          </BaseAutocomplete.Popup>
        </BaseAutocomplete.Positioner>
      </BaseAutocomplete.Portal>
    </BaseAutocomplete.Root>
  )
}
