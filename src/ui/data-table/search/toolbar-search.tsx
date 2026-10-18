/**
 * The table's search field (R16.8): the shared SearchField at the start of the toolbar.
 *
 * Wide     [🔍 Search rows…  /]  a fixed width, so typing never moves the toolbar.
 * Narrow   [🔍] an icon button, or the "Search: q3" chip while a query is active; either
 *          opens the field over the toolbar line (the line keeps its height and its
 *          controls keep their places underneath). Esc on an empty field, or leaving it,
 *          closes it again.
 *
 * Typing waits SEARCH_DEBOUNCE_MS before the query runs; Enter and leaving the field run it
 * at once; the clear button and Esc clear it at once.
 */
import { useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type KeyboardEvent, type Ref, type RefObject } from "react"
import { IconClose, IconSearch } from "../../../icons/generated/icons.js"
import { Button } from "../../button/index.js"
import { SearchField } from "../../input/index.js"
import { TruncatedText } from "../../truncated-text/index.js"
import { MAX_SEARCH_LENGTH, normalizeSearch, SEARCH_DEBOUNCE_MS } from "./types.js"

/** Focus the search: the field (`/`, which opens it first on a narrow toolbar), or with `open: false` its button there (after Clear search). */
export interface SearchHandle {
  focus: (options?: { open?: boolean }) => void
}

/** What the toolbar needs to draw the search: the committed query and how to change it. */
export interface ToolbarSearchBinding {
  /** The committed query (the `search` state slice), "" when none. */
  value: string
  /** Run a query now: it becomes the state, and the table returns to the first page. */
  onChange: (query: string) => void
  /** "Search rows" (from the table's noun): the field's accessible name. */
  label: string
  placeholder: string
  handle?: RefObject<SearchHandle | null>
}

interface SearchBoxProps {
  binding: ToolbarSearchBinding
  inputRef?: Ref<HTMLInputElement>
  /** Esc in an empty field (a narrow toolbar closes the field). */
  onEscapeEmpty?: () => void
}

/** The debounced field: local text while typing, the committed query once typing pauses. */
function SearchBox({ binding, inputRef, onEscapeEmpty }: SearchBoxProps) {
  const { value, label, placeholder } = binding
  const [text, setText] = useState(value)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const latest = useRef(binding)
  useLayoutEffect(() => {
    latest.current = binding
  })

  // A query changed from outside (Back, Clear search) replaces the text, unless the text
  // already says it (a trailing space being typed stays).
  const [synced, setSynced] = useState(value)
  if (synced !== value) {
    setSynced(value)
    if (normalizeSearch(text) !== value) setText(value)
  }

  useEffect(() => () => clearTimeout(timer.current), [])

  const commit = (next: string) => {
    clearTimeout(timer.current)
    timer.current = undefined
    const query = normalizeSearch(next)
    if (query !== latest.current.value) latest.current.onChange(query)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault()
      commit(event.currentTarget.value)
    } else if (event.key === "Escape" && event.currentTarget.value === "" && onEscapeEmpty) {
      event.preventDefault()
      event.stopPropagation()
      onEscapeEmpty()
    }
  }

  return (
    <SearchField
      ref={inputRef}
      size="sm"
      className="fa-dt-search-field"
      value={text}
      onValueChange={(next) => {
        setText(next)
        clearTimeout(timer.current)
        timer.current = setTimeout(() => commit(next), SEARCH_DEBOUNCE_MS)
      }}
      onClear={() => commit("")}
      onKeyDown={onKeyDown}
      onBlur={(event) => {
        if (timer.current !== undefined) commit(event.currentTarget.value)
      }}
      placeholder={placeholder}
      aria-label={label}
      shortcut="/"
      aria-keyshortcuts="/"
      enterKeyHint="search"
      maxLength={MAX_SEARCH_LENGTH}
    />
  )
}

/** The active query on a narrow toolbar: opens the field; ✕ clears it. */
function SearchChip({ query, onOpen, onClear, triggerRef }: { query: string; onOpen: () => void; onClear: () => void; triggerRef: Ref<HTMLButtonElement> }) {
  const summary = `Search: ${query}`
  return (
    <span className="fa-dt-filter-chip fa-dt-search-chip">
      <button ref={triggerRef} type="button" className="fa-dt-filter-chip-body fa-pressable" aria-label={`Edit search: ${query}`} aria-keyshortcuts="/" onClick={onOpen}>
        <IconSearch />
        <TruncatedText className="fa-dt-filter-chip-label">{summary}</TruncatedText>
      </button>
      <Button variant="ghost" size="xs" shape="circle" className="fa-dt-filter-chip-remove" icon={<IconClose />} aria-label="Clear search" onClick={onClear} />
    </span>
  )
}

export interface ToolbarSearchProps {
  binding: ToolbarSearchBinding
  /** The toolbar is too narrow for the field: an icon button (or the chip) opens it. */
  narrow: boolean
  expanded: boolean
  /** Called with `true` when the narrow field opens (the button or chip, or a focus request) and `false` when focus leaves it or Escape is pressed in an empty field. Pair with `expanded`. */
  onExpandedChange: (expanded: boolean) => void
  ref?: Ref<HTMLDivElement>
}

export function ToolbarSearch({ binding, narrow, expanded, onExpandedChange, ref }: ToolbarSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const focusTrigger = useRef(false)
  const focusInput = useRef(false)
  const open = narrow && expanded
  const active = binding.value !== ""

  useImperativeHandle(
    binding.handle,
    () => ({
      focus: ({ open: openField = true } = {}) => {
        if (narrow && !expanded) {
          if (!openField) {
            // The chip may be giving way to the button: focus whichever is drawn next.
            focusTrigger.current = true
            triggerRef.current?.focus()
            return
          }
          focusInput.current = true
          onExpandedChange(true)
          return
        }
        inputRef.current?.focus()
        inputRef.current?.select()
      },
    }),
    [narrow, expanded, onExpandedChange]
  )

  // Opening moves focus into the field; closing returns it to the button or chip.
  useLayoutEffect(() => {
    if (open && focusInput.current) {
      focusInput.current = false
      inputRef.current?.focus()
      inputRef.current?.select()
    }
    if (!open && focusTrigger.current) {
      focusTrigger.current = false
      triggerRef.current?.focus()
    }
  })

  const expand = () => {
    focusInput.current = true
    onExpandedChange(true)
  }
  const collapse = (returnFocus: boolean) => {
    focusTrigger.current = returnFocus
    onExpandedChange(false)
  }

  if (!narrow) {
    return (
      <div ref={ref} className="fa-dt-search" data-mode="field">
        <SearchBox binding={binding} inputRef={inputRef} />
      </div>
    )
  }

  return (
    <div ref={ref} className="fa-dt-search" data-mode="collapsed" data-expanded={open ? "" : undefined}>
      {active ? (
        <SearchChip
          query={binding.value}
          triggerRef={triggerRef}
          onOpen={expand}
          onClear={() => {
            focusTrigger.current = true
            binding.onChange("")
          }}
        />
      ) : (
        <Button
          ref={triggerRef}
          size="sm"
          variant="secondary"
          className="fa-dt-search-button"
          icon={<IconSearch />}
          aria-label={binding.label}
          aria-expanded={open}
          aria-keyshortcuts="/"
          shortcut="/"
          onClick={expand}
        />
      )}
      {open ? (
        <div
          className="fa-dt-search-overlay"
          onBlur={(event) => {
            const next = event.relatedTarget
            if (next instanceof Node && event.currentTarget.contains(next)) return
            collapse(false)
          }}
        >
          <SearchBox binding={binding} inputRef={inputRef} onEscapeEmpty={() => collapse(true)} />
        </div>
      ) : null}
    </div>
  )
}
