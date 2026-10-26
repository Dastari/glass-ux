import { useLocale } from "../../lib/locale/use-locale.js"
import { useMessages } from "../../lib/i18n/index.js"
import { tagInputMessages } from "./messages.js"
import { Combobox as BaseCombobox } from "@base-ui/react/combobox"
import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from "react"
import { IconPlus } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { tokenDuration } from "../../lib/motion.js"
import { useControllable } from "../../lib/use-controllable.js"
import {
  ChipMeasure,
  ComboboxPopup,
  OptionChip,
  optionFilter,
  useOptionCollection,
  useOptionData,
  type OptionItem,
  type OptionSource,
} from "../combobox/index.js"
import { widthAttr, type FieldWidth } from "../field/index.js"
import { useChipFit } from "../multi-select/index.js"
import type { SelectSize } from "../select/index.js"

/** Characters that commit the typed text as a chip, and that split pasted text. */
const SEPARATORS = /[,;\n\r\t]+/
const CREATE = "\u0000create:"

/** Split pasted or typed text into candidate values. */
export const splitValues = (text: string) =>
  text
    .split(SEPARATORS)
    .map((part) => part.trim())
    .filter(Boolean)

export interface TagInputProps {
  value?: string[]
  defaultValue?: string[]
  /**
   * Called with the full list of tags whenever one is added, edited or removed; typing alone does
   * not call it. Pair with `value` to control it; use `defaultValue` otherwise.
   */
  onValueChange?: (values: string[]) => void
  /** Static suggestions, filtered as you type. Optional: free entry works without any. */
  suggestions?: OptionItem[]
  /** Or suggestions searched on a server. */
  source?: OptionSource
  /** Offer “Create "x"” when the text matches no suggestion (default on). */
  allowCreate?: boolean
  /** Tidy a value before it becomes a chip (trim is always applied): lowercase an email… */
  normalize?: (value: string) => string
  /** Why a value is not valid, or nothing. Invalid chips turn danger; the reason is their tooltip. */
  validate?: (value: string) => string | null | undefined
  /** Most chips allowed. */
  max?: number
  /** The first problem (an invalid chip, or the limit) — show it in the field's message line. */
  onErrorChange?: (message: string | undefined) => void
  /** Let chips wrap onto more lines (default). Off: one line that folds into "+N". */
  wrap?: boolean
  placeholder?: string
  size?: SelectSize
  /** Available width or named width tier. */
  width?: FieldWidth
  icon?: ReactNode
  disabled?: boolean
  readOnly?: boolean
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
 * Free-entry chips: email recipients, IP addresses, labels. Enter, comma, semicolon or
 * Tab turns the text into a chip; pasting a list adds every value at once. Values are
 * normalised and de-duplicated (adding one again flashes the existing chip); invalid ones
 * stay visible in danger with the reason. Chips are edited in place with Enter or a
 * double-click. With suggestions or a source, the list offers matches and “Create "x"”.
 */
export function TagInput({
  value,
  defaultValue,
  onValueChange,
  suggestions,
  source,
  allowCreate = true,
  normalize,
  validate,
  max,
  onErrorChange,
  wrap = true,
  placeholder,
  size = "md",
  width,
  icon,
  disabled,
  readOnly,
  invalid,
  name,
  id,
  onBlur,
  className,
  ref,
  ...aria
}: TagInputProps) {
  const messages = useMessages(tagInputMessages)
 const locale = useLocale()

  const [current, commit] = useControllable<string[]>(value ?? undefined, defaultValue ?? [], onValueChange)
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)
  const [editing, setEditing] = useState<{ index: number; text: string } | null>(null)
  const [limitHit, setLimitHit] = useState(false)
  const highlighted = useRef<string | undefined>(undefined)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(flashTimer.current), [])

  const tidy = (raw: string) => {
    const trimmed = raw.trim()
    return normalize ? normalize(trimmed) : trimmed
  }
  const same = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: "accent" }) === 0
  const reasons = current.map((item) => validate?.(item) ?? undefined)

  // ── Options: suggestions (static or searched) plus “Create "x"” ─────────────
  const data = useOptionData(suggestions, source, query, [])
  const typed = tidy(query)
  const offered = source ? data.items : data.items.filter((item) => optionFilter(item, query))
  const exact = offered.some((item) => same(item.value, typed) || same(item.label, typed))
  const hasList = Boolean(suggestions?.length || source)
  const createRow: OptionItem | null =
    hasList && allowCreate && typed && !exact && !current.some((item) => same(item, typed))
      ? { value: `${CREATE}${typed}`, label: messages.create(typed), icon: <IconPlus /> }
      : null
  const items = createRow ? [createRow, ...offered] : offered
  const collection = useOptionCollection(items)

  const flashChip = (item: string) => {
    clearTimeout(flashTimer.current)
    setFlash(null)
    requestAnimationFrame(() => setFlash(item))
    // The flash runs --duration-slower (multi-select.css); clear it just after.
    flashTimer.current = setTimeout(() => setFlash(null), tokenDuration("--duration-slower", 450) + 50)
  }

  /** Add values, skipping blanks and duplicates (which flash), up to `max`. */
  const add = (raws: string[]) => {
    const next = [...current]
    for (const raw of raws) {
      const candidate = tidy(raw)
      if (!candidate) continue
      const existing = next.find((item) => same(item, candidate))
      if (existing !== undefined) {
        flashChip(existing)
        continue
      }
      if (max !== undefined && next.length >= max) {
        setLimitHit(true)
        break
      }
      next.push(candidate)
    }
    if (next.length !== current.length) commit(next)
    setQuery("")
  }

  const remove = (index: number) => {
    setLimitHit(false)
    commit(current.filter((_, at) => at !== index))
  }

  const finishEdit = (save: boolean) => {
    if (!editing) return
    const { index, text } = editing
    setEditing(null)
    if (!save) return
    const candidate = tidy(text)
    if (!candidate) return remove(index)
    const duplicate = current.findIndex((item, at) => at !== index && same(item, candidate))
    if (duplicate !== -1) {
      flashChip(current[duplicate] ?? candidate)
      return remove(index)
    }
    commit(current.map((item, at) => (at === index ? candidate : item)))
  }

  // ── The first problem goes to the field's message line ─────────────────────
  const firstInvalid = reasons.findIndex(Boolean)
  const message =
    firstInvalid !== -1
      ? `${current[firstInvalid]}: ${reasons[firstInvalid]}`
      : limitHit && max !== undefined
        ? messages.limit(max, locale)
        : undefined
  useEffect(() => {
    onErrorChange?.(message)
  }, [message, onErrorChange])

  const { chipsRef, measureRef, visible } = useChipFit(current, !wrap && editing === null, focused)
  const shown = wrap ? current : current.slice(0, visible)
  const hidden = wrap ? [] : current.slice(visible)

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement> & { preventBaseUIHandler: () => void }) => {
    const text = event.currentTarget.value
    if ((event.key === "," || event.key === ";") && text.trim()) {
      event.preventDefault()
      event.preventBaseUIHandler()
      add([text])
      return
    }
    if (event.key === "Enter" && text.trim() && !(open && highlighted.current !== undefined)) {
      event.preventDefault()
      event.preventBaseUIHandler()
      add([text])
      return
    }
    if (event.key === "Tab" && text.trim()) {
      add([text])
      return
    }
    if (event.key === "Backspace" && text === "" && current.length > 0) {
      event.preventBaseUIHandler()
      remove(current.length - 1)
    }
  }

  const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const text = event.clipboardData.getData("text")
    if (!SEPARATORS.test(text)) return
    event.preventDefault()
    add(splitValues(`${query}${text}`))
  }

  return (
    <BaseCombobox.Root
      multiple
      items={collection}
      value={current}
      onValueChange={(next) => {
        const values = next as string[]
        const created = values.find((item) => item.startsWith(CREATE))
        if (created !== undefined) return add([created.slice(CREATE.length)])
        const picked = values.filter((item) => !current.includes(item))
        if (picked.length) return add(picked)
        commit(values)
        setLimitHit(false)
      }}
      inputValue={query}
      onInputValueChange={(next, details) => {
        if (details.reason === "item-press") return
        setQuery(next)
      }}
      open={open && hasList && (items.length > 0 || (data.search?.status ?? "idle") !== "idle")}
      onOpenChange={setOpen}
      onItemHighlighted={(item) => {
        highlighted.current = item as string | undefined
      }}
      filter={null}
      itemToStringLabel={(item: string) => (item.startsWith(CREATE) ? item.slice(CREATE.length) : data.labelOf(item))}
      autoHighlight
      disabled={disabled}
      readOnly={readOnly}
      name={name}
      id={id}
    >
      <BaseCombobox.InputGroup
        className={cx("fa-control fa-input fa-multi fa-tag-input", className)}
        data-size={size}
        data-width={widthAttr(width)}
        data-wrap={wrap ? "" : undefined}
        data-readonly={readOnly ? "" : undefined}
        data-disabled={disabled ? "" : undefined}
        data-invalid={invalid || firstInvalid !== -1 ? "" : undefined}
        data-has-value={current.length > 0 ? "" : undefined}
        onFocus={() => setFocused(true)}
        onBlur={(event) => {
          if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
          setFocused(false)
          if (query.trim()) add([query])
        }}
      >
        {wrap ? null : (
          <div ref={measureRef} className="fa-multi-measure" aria-hidden>
            {current.map((item) => (
              <ChipMeasure key={item} label={item} removable={!readOnly} />
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
          aria-label={current.length > 0 ? messages.valueCount(current.length, locale) : undefined}
        >
          {shown.map((item, index) =>
            editing?.index === index ? (
              <input
                key={`edit-${item}`}
                className="fa-chip fa-chip-edit"
                aria-label={messages.edit(item)}
                value={editing.text}
                size={Math.max(editing.text.length, 4)}
                autoFocus
                onChange={(event) => setEditing({ index, text: event.currentTarget.value })}
                onKeyDown={(event) => {
                  event.stopPropagation()
                  if (event.key === "Enter") {
                    event.preventDefault()
                    finishEdit(true)
                  } else if (event.key === "Escape") {
                    event.preventDefault()
                    finishEdit(false)
                  }
                }}
                onBlur={() => finishEdit(true)}
              />
            ) : (
              <OptionChip
                key={item}
                label={data.labelOf(item)}
                icon={data.itemOf(item)?.icon}
                invalid={reasons[index] ?? undefined}
                flash={flash === item}
                readOnly={readOnly}
                onEdit={readOnly ? undefined : () => setEditing({ index, text: item })}
              />
            )
          )}
          {hidden.length > 0 ? (
            <span className="fa-chip" data-overflow="" title={new Intl.ListFormat(locale, { type: "unit" }).format(hidden.map(data.labelOf))}>
              <span className="fa-chip-label" aria-hidden>
                +{hidden.length}
              </span>
              <span className="sr-only">
                {messages.more(hidden.length, new Intl.ListFormat(locale, { type: "unit" }).format(hidden.map(data.labelOf)))}
              </span>
            </span>
          ) : null}
          <BaseCombobox.Input
            {...aria}
            ref={ref}
            placeholder={current.length > 0 ? undefined : placeholder}
            aria-invalid={invalid || firstInvalid !== -1 || undefined}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            className="fa-control-input fa-multi-input"
          />
        </BaseCombobox.Chips>
      </BaseCombobox.InputGroup>
      {hasList ? <ComboboxPopup items={items} query={query} search={data.search} /> : null}
    </BaseCombobox.Root>
  )
}
