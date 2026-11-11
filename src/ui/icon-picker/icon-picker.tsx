import { Field as BaseField } from "@base-ui/react/field"
import {
  memo,
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
  type Ref,
  type RefObject,
} from "react"
import { useAnnounce } from "../../hooks/use-announce.js"
import { IconChevronsUpDown, IconClose, IconSearch } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { readingKey } from "../../lib/direction.js"
import { useMessages } from "../../lib/i18n/index.js"
import { useLocale } from "../../lib/locale/use-locale.js"
import { useControllable } from "../../lib/use-controllable.js"
import { Button } from "../button/index.js"
import { EmptyState } from "../empty-state/index.js"
import { Field, widthAttr, type FieldWidth } from "../field/index.js"
import { useBoundField, type FieldChrome } from "../form/context.js"
import { SearchField } from "../input/index.js"
import { Popover, type PopoverPopupProps } from "../popover/index.js"
import { TruncatedText } from "../truncated-text/index.js"
import { iconCatalogue, searchIcons, type IconCatalogueEntry } from "./catalogue.js"
import { iconPickerMessages } from "./messages.js"

function assign<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") ref(value)
  else if (ref) (ref as { current: T | null }).current = value
}

/** Columns of the wrapped grid, read from the box it was given. */
function columnsOf(list: HTMLElement) {
  return getComputedStyle(list).gridTemplateColumns.split(" ").filter(Boolean).length || 1
}

const Option = /* @__PURE__ */ memo(function Option({ entry, index, active, selected }: { entry: IconCatalogueEntry; index: number; active: boolean; selected: boolean }) {
  const { Icon } = entry
  return (
    // Keys and pointer are handled once on the list (roving focus), as EmojiPicker does.
    <div className="fa-icon-option" role="option" aria-selected={selected} aria-label={entry.name} tabIndex={active ? 0 : -1} data-index={index}>
      <Icon />
    </div>
  )
})

export interface IconPickerProps extends Omit<ComponentProps<"div">, "children" | "defaultValue" | "onChange"> {
  /** The chosen icon's name ("air-start"), controlled; null for none. */
  value?: string | null
  /** The chosen icon when uncontrolled. */
  defaultValue?: string | null
  /** Called with the name a person picks by click, Enter or Space. */
  onValueChange?: (name: string) => void
  /** The icons to offer, in order. Default every icon (`iconCatalogue`); pass a filtered copy to offer fewer. */
  icons?: readonly IconCatalogueEntry[]
  /** Focus the search when the picker mounts. */
  autoFocus?: boolean
}

/**
 * A searchable grid of icons. The grid is one tab stop: arrow keys move through it in reading
 * order, Home and End go to its ends, Enter or Space picks, and typing returns to the search. ↓
 * enters the grid from the search, and Enter there picks the first result. Searches match names
 * and the words people use for an icon (GPU finds ground-power).
 */
export function IconPicker({ value, defaultValue = null, onValueChange, icons = iconCatalogue, autoFocus = false, className, "aria-label": label, ...rest }: IconPickerProps) {
  const messages = useMessages(iconPickerMessages)
  const locale = useLocale()
  const announce = useAnnounce()
  const [chosen, setChosen] = useControllable<string | null>(value, defaultValue, (next) => next && onValueChange?.(next))
  const [query, setQuery] = useState("")
  const searched = useDeferredValue(query)
  const [preview, setPreview] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const searching = searched.trim() !== ""
  const entries = useMemo(() => (searching ? searchIcons(searched, icons) : icons), [searching, searched, icons])

  useEffect(() => {
    if (autoFocus) searchRef.current?.focus()
  }, [autoFocus])
  useEffect(() => {
    if (searching) announce(messages.results(entries.length, locale), { key: "icon-results" })
  }, [searching, entries.length, announce, messages, locale])

  const pick = (entry: IconCatalogueEntry) => setChosen(entry.name)

  return (
    <div {...rest} className={cx("fa-icon-picker", className)} role="group" aria-label={label ?? messages.picker}>
      <SearchField
        ref={searchRef}
        aria-label={messages.searchLabel}
        placeholder={messages.searchPlaceholder}
        value={query}
        onValueChange={setQuery}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            listRef.current?.querySelector<HTMLElement>('[tabindex="0"]')?.focus()
            event.preventDefault()
          } else if (event.key === "Enter") {
            // The grid follows the field at low priority: pick from what was typed.
            const first = query.trim() ? searchIcons(query, icons)[0] : entries[0]
            if (!first) return
            pick(first)
            event.preventDefault()
          }
        }}
      />
      <div className="fa-icon-picker-body">
        {searching && entries.length === 0 ? (
          <EmptyState icon={<IconSearch />} action={<Button size="sm" onClick={() => setQuery("")}>{messages.clearSearch}</Button>}>
            {messages.noResults(searched.trim())}
          </EmptyState>
        ) : (
          <IconList
            key={searching ? `search:${searched}` : "all"}
            entries={entries}
            chosen={chosen}
            label={messages.icons}
            listRef={listRef}
            onPick={pick}
            onPreview={setPreview}
            onLeaveTop={() => searchRef.current?.focus()}
          />
        )}
      </div>
      {/* The focused option already says its name; this line is for the eye. */}
      <div className="fa-icon-picker-foot" aria-hidden>
        <TruncatedText>{preview ?? chosen ?? ""}</TruncatedText>
      </div>
    </div>
  )
}

interface IconListProps {
  entries: readonly IconCatalogueEntry[]
  chosen: string | null
  label: string
  listRef: RefObject<HTMLDivElement | null>
  onPick: (entry: IconCatalogueEntry) => void
  onPreview: (name: string) => void
  onLeaveTop: () => void
}

/** One tab stop (R11.5): arrow keys move through the wrapped grid. It starts on the chosen icon. */
function IconList({ entries, chosen, label, listRef, onPick, onPreview, onLeaveTop }: IconListProps) {
  const [active, setActive] = useState(() => Math.max(0, entries.findIndex((entry) => entry.name === chosen)))
  const indexOf = (target: EventTarget) => {
    const index = Number((target as HTMLElement).closest<HTMLElement>("[data-index]")?.dataset.index)
    return Number.isInteger(index) ? index : -1
  }
  const move = (list: HTMLElement, next: number) => {
    const index = Math.max(0, Math.min(entries.length - 1, next))
    list.querySelector<HTMLElement>(`[data-index="${index}"]`)?.focus()
  }
  // The chosen icon is in view when the grid opens.
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[tabindex="0"]')?.scrollIntoView({ block: "nearest" })
  }, [listRef])

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const list = event.currentTarget
    const index = indexOf(event.target)
    if (index < 0) return
    const columns = columnsOf(list)
    const key = readingKey(event.key, list)
    if (key === "ArrowRight") move(list, index + 1)
    else if (key === "ArrowLeft") move(list, index - 1)
    else if (key === "ArrowDown") move(list, index + columns)
    else if (key === "ArrowUp") {
      if (index < columns) onLeaveTop()
      else move(list, index - columns)
    } else if (key === "Home") move(list, 0)
    else if (key === "End") move(list, entries.length - 1)
    else if (key === "Enter" || key === " ") onPick(entries[index]!)
    else {
      // Typing anywhere in the grid searches: the key lands in the field it just focused.
      if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) onLeaveTop()
      return
    }
    event.preventDefault()
  }
  const preview = (target: EventTarget) => {
    const entry = entries[indexOf(target)]
    if (entry) onPreview(entry.name)
  }

  return (
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events -- keys are handled on the list, for every option
    <div
      ref={listRef}
      className="fa-icon-list"
      role="listbox"
      aria-label={label}
      onKeyDown={onKeyDown}
      onClick={(event) => {
        const entry = entries[indexOf(event.target)]
        if (entry) onPick(entry)
      }}
      onFocus={(event: FocusEvent) => {
        const index = indexOf(event.target)
        if (index >= 0) setActive(index)
        preview(event.target)
      }}
      onPointerOver={(event: PointerEvent) => preview(event.target)}
    >
      {entries.map((entry, index) => (
        <Option key={entry.name} entry={entry} index={index} active={index === active} selected={entry.name === chosen} />
      ))}
    </div>
  )
}

export interface IconInputProps extends Pick<PopoverPopupProps, "side" | "align"> {
  /** The chosen icon's name, controlled; null for none. */
  value?: string | null
  /** The chosen icon when uncontrolled. Default none. */
  defaultValue?: string | null
  /** Called with the chosen name, or null when the person clears it. */
  onValueChange?: (name: string | null) => void
  /** The icons to offer. Default every icon (`iconCatalogue`). */
  icons?: readonly IconCatalogueEntry[]
  /** Shown while no icon is chosen. Default "Choose an icon". */
  placeholder?: string
  /** Offer No icon in the picker, which clears the value. Default false. */
  clearable?: boolean
  /** Content width: short, medium (default) or full. */
  width?: FieldWidth
  disabled?: boolean
  readOnly?: boolean
  /** Invalid outside a Field. */
  invalid?: boolean
  required?: boolean
  /** Submits the chosen name with a native form. */
  name?: string
  id?: string
  /** Called when focus leaves the trigger, so a form can mark the field touched. */
  onBlur?: (event: FocusEvent<HTMLButtonElement>) => void
  /** Accessible name when a visible label does not name the control. */
  "aria-label"?: string
  /** Layout only. */
  className?: string
  ref?: Ref<HTMLButtonElement>
}

/**
 * A field that holds an icon's name: a box showing the chosen icon that opens an IconPicker in a
 * popover. Use it to let people give a category, asset type or list its own icon; store the name
 * and draw it with `iconCatalogue` (or a map of your own icons) where the item is shown.
 */
export function IconInput({
  value,
  defaultValue = null,
  onValueChange,
  icons = iconCatalogue,
  placeholder,
  clearable = false,
  width = "medium",
  disabled,
  readOnly,
  invalid,
  required,
  name,
  id,
  onBlur,
  side,
  align = "start",
  "aria-label": ariaLabel,
  className,
  ref,
}: IconInputProps) {
  const messages = useMessages(iconPickerMessages)
  const [chosen, setChosen] = useControllable<string | null>(value, defaultValue, onValueChange)
  const [open, setOpen] = useState(false)
  const entry = useMemo(() => (chosen ? icons.find((candidate) => candidate.name === chosen) ?? iconCatalogue.find((candidate) => candidate.name === chosen) : undefined), [chosen, icons])
  const Chosen = entry?.Icon
  const valueId = useId()
  return (
    <span className={cx("fa-icon-input-frame", className)} data-width={widthAttr(width)}>
      <Popover.Root open={open && !readOnly} onOpenChange={(next: boolean) => setOpen(next)}>
        <Popover.Trigger
          disabled={disabled}
          render={(triggerProps) => (
            // A Field control, so the field's label names it and its hint and error describe it.
            <BaseField.Control
              {...(triggerProps as BaseField.Control.Props)}
              id={id}
              value={chosen ?? ""}
              disabled={disabled}
              render={(controlProps) => {
                const props = controlProps as Record<string, unknown> & { "aria-labelledby"?: string; "aria-invalid"?: boolean; ref?: Ref<HTMLButtonElement>; onBlur?: (event: FocusEvent<HTMLButtonElement>) => void }
                const labelled = props["aria-labelledby"]
                return (
                  <button
                    {...props}
                    ref={(element: HTMLButtonElement | null) => {
                      assign(props.ref, element)
                      assign(ref, element)
                    }}
                    type="button"
                    className="fa-control fa-input fa-icon-input fa-pressable"
                    data-size="md"
                    data-filled={chosen ? "" : undefined}
                    data-invalid={invalid || props["data-invalid"] !== undefined ? "" : undefined}
                    data-readonly={readOnly ? "" : undefined}
                    aria-invalid={invalid || props["aria-invalid"] || undefined}
                    aria-required={required || undefined}
                    aria-readonly={readOnly || undefined}
                    // The name is the label and the chosen icon: "Icon, forklift".
                    aria-labelledby={ariaLabel ? `${valueId}-name ${valueId}` : labelled ? `${labelled} ${valueId}` : undefined}
                    onBlur={(event) => {
                      props.onBlur?.(event)
                      if (!open) onBlur?.(event)
                    }}
                  >
                    {ariaLabel ? (
                      <span id={`${valueId}-name`} hidden>
                        {ariaLabel}
                      </span>
                    ) : null}
                    {Chosen ? <Chosen className="fa-icon-input-glyph" /> : null}
                    <span id={valueId} className="fa-icon-input-text" data-placeholder={chosen ? undefined : ""}>
                      {chosen ?? placeholder ?? messages.chooseIcon}
                    </span>
                    {readOnly ? null : <IconChevronsUpDown className="fa-icon-input-chevron" />}
                  </button>
                )
              }}
            />
          )}
        />
        <Popover.Popup size="lg" side={side} align={align} aria-label={messages.picker} className="fa-icon-popup">
          {/* Its own Field, so the search never takes the field's label or id. */}
          <BaseField.Root render={<div />} className="fa-icon-popup-field">
            <IconPicker
              value={chosen}
              icons={icons}
              autoFocus
              onValueChange={(next) => {
                setChosen(next)
                setOpen(false)
              }}
            />
            {clearable && chosen ? (
              <Button
                size="sm"
                variant="ghost"
                icon={<IconClose />}
                className="fa-icon-popup-clear"
                onClick={() => {
                  setChosen(null)
                  setOpen(false)
                }}
              >
                {messages.noIcon}
              </Button>
            ) : null}
          </BaseField.Root>
        </Popover.Popup>
      </Popover.Root>
      {name ? <input type="hidden" name={name} value={chosen ?? ""} /> : null}
    </span>
  )
}

export interface IconFieldProps extends FieldChrome, Omit<IconInputProps, "value" | "defaultValue" | "onValueChange" | "name" | "onBlur" | "invalid" | "required" | "disabled" | "className"> {}

/** IconInput bound to a `string | null` form field: the chosen icon's name. */
export function IconField({ label, hint, optional, required, aside, className, disabled, ...control }: IconFieldProps) {
  const { field, error, root } = useBoundField<string | null>()
  return (
    <Field {...root} label={label} hint={hint} optional={optional} required={required} aside={aside} className={className} disabled={disabled} nativeLabel={false}>
      <IconInput
        {...control}
        name={field.name}
        value={field.state.value ?? null}
        onValueChange={(next) => field.handleChange(next)}
        onBlur={field.handleBlur}
        required={required}
        disabled={disabled}
        invalid={Boolean(error)}
      />
    </Field>
  )
}
