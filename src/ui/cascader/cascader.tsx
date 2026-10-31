import { Field as BaseField } from "@base-ui/react/field"
import { Popover as BasePopover } from "@base-ui/react/popover"
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
  type RefObject,
} from "react"
import { IconCheck, IconChevronLeft, IconChevronRight, IconError } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { readingKey } from "../../lib/direction.js"
import { useMessages } from "../../lib/i18n/use-messages.js"
import { useLocale } from "../../lib/locale/use-locale.js"
import { popupContainer } from "../../lib/popup-container.js"
import { usePopupMetrics } from "../../lib/popup-metrics.js"
import { useControllable } from "../../lib/use-controllable.js"
import { useElementSize } from "../../lib/use-element-size.js"
import { usePhoneLayout } from "../../lib/use-media-query.js"
import { Button } from "../button/index.js"
import { ChipMeasure } from "../combobox/index.js"
import { Field, type FieldWidth } from "../field/index.js"
import { useBoundField, type FieldChrome } from "../form/context.js"
import { SearchField } from "../input/index.js"
import { useChipFit } from "../multi-select/index.js"
import { ProgressRing } from "../progress/index.js"
import type { SelectSize } from "../select/index.js"
import { checkDisabled, checkStates, indexChecks, setAllChecks, toggleCheck, type CheckState, type CheckStrategy } from "../tree-select/check.js"
import { CheckMark } from "../tree-select/check-mark.js"
import { PickerTrigger } from "../tree-select/picker-trigger.js"
import { TruncatedText } from "../truncated-text/index.js"
import { cascaderMessages } from "./messages.js"
import { columnsFor, fitPath, keyPath, opens, pathKey, resolvePath, searchPaths, toCheckNodes, type CascaderMatch, type CascaderOption } from "./paths.js"
import { listFormat } from "../../lib/locale/intl.js"

/** Props shared by single and multiple Cascader. */
export interface CascaderCommonProps {
  /** The hierarchy: each level a short list (country → region → site). Values are unique among siblings. */
  options: CascaderOption[]
  /** Single choice: any level can be chosen, not only the last. Choosing a level also opens it. */
  changeOnSelect?: boolean
  /**
   * Multiple choice: which checked paths the value lists. `parent` (default) lists a fully
   * checked level instead of everything under it; `child` lists last levels only; `all` lists both.
   */
  checkStrategy?: CheckStrategy
  /**
   * Load a level the first time it opens (an option with `hasChildren` and no `children`):
   * update `options`, then resolve. Receives the option and its value path. A rejection shows Retry.
   */
  onLoadChildren?: (option: CascaderOption, path: string[]) => Promise<void> | void
  /** Show a search field that lists matching full paths. Default true. */
  searchable?: boolean
  /** The most search results listed; the rest are counted. Default 50. */
  searchLimit?: number
  /**
   * columns: levels side by side. list: one level at a time with a Back button, in a popup
   * as wide as the screen allows. auto (default): list on phone-sized viewports.
   */
  layout?: "auto" | "columns" | "list"
  /** Shown while nothing is chosen. Name the choice ("Choose a site"). */
  placeholder?: string
  size?: SelectSize
  /** Content width: short, medium or full (default). */
  width?: FieldWidth
  /** A fixed leading icon in the trigger. */
  icon?: ReactNode
  /** Multiple choice: let chips wrap onto more lines (forms). */
  wrap?: boolean
  disabled?: boolean
  readOnly?: boolean
  required?: boolean
  /** Marks the control invalid outside a Field. */
  invalid?: boolean
  /** Native form field name: one hidden input per chosen path, its values joined with "/". */
  name?: string
  id?: string
  /** Called when focus leaves the trigger while the popup is closed, so a form can mark the field touched. */
  onBlur?: (event: FocusEvent<HTMLButtonElement>) => void
  /** Called with true when the popup opens and false when it closes. */
  onOpenChange?: (open: boolean) => void
  /** Layout only. Applied to the trigger. */
  className?: string
  ref?: Ref<HTMLButtonElement>
  /** Wording for this instance, over the language pack and `MessagesProvider`. */
  labels?: Partial<typeof cascaderMessages.defaults>
  /** BCP 47 locale for search matching and wording. Default: the nearest `LocaleProvider`. */
  locale?: string
  /** Accessible name when a visible label does not name the control. */
  "aria-label"?: string
  /** IDs of elements that provide the accessible name. */
  "aria-labelledby"?: string
}

/** One path. */
export interface CascaderSingleProps extends CascaderCommonProps {
  /** Several paths, with checkboxes. */
  multiple?: false
  /** The chosen path of option values from the top level, or null. Controlled while defined. */
  value?: string[] | null
  defaultValue?: string[] | null
  /** Called with the chosen path when a last level (or any level with `changeOnSelect`) is picked. */
  onValueChange?: (value: string[] | null) => void
}

/** Several paths, with checkboxes and mixed levels. */
export interface CascaderMultipleProps extends CascaderCommonProps {
  /** Several paths, with checkboxes. */
  multiple: true
  /** The checked paths in `checkStrategy` form, in tree order. Controlled while defined. */
  value?: string[][]
  defaultValue?: string[][]
  /** Called with every checked path (in `checkStrategy` form) after each check, uncheck or Clear. */
  onValueChange?: (value: string[][]) => void
}

export type CascaderProps = CascaderSingleProps | CascaderMultipleProps

type Messages = typeof cascaderMessages.defaults

function Highlight({ text, range }: { text: string; range: readonly [number, number] | null }) {
  if (!range) return <>{text}</>
  return (
    <>
      {text.slice(0, range[0])}
      <mark className="fa-tree-mark">{text.slice(range[0], range[1])}</mark>
      {text.slice(range[1])}
    </>
  )
}

/** The tab stop among the options (not the Back button). */
const ITEM_STOP = '[role^="menuitem"][tabindex="0"], [role="option"][tabindex="0"]'

const useIsomorphicLayoutEffect = typeof window === "undefined" ? () => {} : useLayoutEffect

/** Labels along a path: options that resolve, then the raw values of levels not loaded. */
function pathLabels(options: readonly CascaderOption[], path: readonly string[]) {
  const resolved = resolvePath(options, path)
  return path.map((value, at) => resolved[at]?.label ?? value)
}

/**
 * Choose from a deep hierarchy where each level is a short list (country → region → site):
 * columns open to the right as you choose. One path by default, any level with
 * `changeOnSelect`, or several with `multiple` (checkboxes, mixed levels). The search lists
 * matching full paths ("Australia / New South Wales / Parramatta"). Levels can load on
 * demand. The trigger shows the path and drops middle levels when it does not fit.
 *
 * Keyboard: ↑ ↓ move within a column, → opens the next level, ← returns to the previous one,
 * Home / End, Enter chooses (a single choice closes the popup), Space checks with `multiple`,
 * typing jumps within a column. On phones the columns become one list with a Back button.
 */
export function Cascader(props: CascaderProps) {
  const {
    options,
    multiple = false,
    changeOnSelect = false,
    checkStrategy = "parent",
    onLoadChildren,
    searchable = true,
    searchLimit = 50,
    layout = "auto",
    placeholder: placeholderProp,
    size = "md",
    width,
    icon,
    wrap = false,
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
    labels,
    locale: localeProp,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledby,
  } = props
  const t = useMessages(cascaderMessages, { labels, locale: localeProp })
  const locale = useLocale(localeProp)
  const phone = usePhoneLayout()
  const list = layout === "list" || (layout === "auto" && phone)

  const asKeys = (value: string[] | string[][] | null | undefined) =>
    value === undefined ? undefined : value === null ? [] : multiple ? (value as string[][]).map(pathKey) : (value as string[]).length ? [pathKey(value as string[])] : []
  const [keys, commitKeys] = useControllable<string[]>(asKeys(props.value), asKeys(props.defaultValue) ?? [], (next) => {
    if (props.multiple) props.onValueChange?.(next.map(keyPath))
    else props.onValueChange?.(next[0] === undefined ? null : keyPath(next[0]))
  })
  const index = useMemo(() => indexChecks(toCheckNodes(options)), [options])
  const states = useMemo(() => (multiple ? checkStates(index, keys) : null), [multiple, index, keys])
  const chosenPath = !multiple && keys[0] !== undefined ? keyPath(keys[0]) : null

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [active, setActive] = useState<string[]>([])
  const [depth, setDepth] = useState(0)
  const changeOpen = (next: boolean) => {
    if (next && (readOnly || disabled)) return
    if (next) {
      // Open on the chosen path (its last level focused), or at the top.
      const start = chosenPath ?? (multiple && keys[0] !== undefined ? keyPath(keys[0]) : [])
      const resolved = resolvePath(options, start).map((option) => option.value)
      setActive(resolved)
      setDepth(Math.max(0, resolved.length - 1))
    } else setQuery("")
    setOpen(next)
    onOpenChange?.(next)
  }

  const searchRef = useRef<HTMLInputElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const labelIdRef = useRef<string | undefined>(undefined)
  const valueId = useId()
  const popup = usePopupMetrics()

  const commitPath = (path: string[], close: boolean) => {
    commitKeys([pathKey(path)])
    if (close) changeOpen(false)
  }
  const toggleKey = (key: string) => commitKeys((previous) => toggleCheck(index, previous, key, checkStrategy))
  const removeLast = () => {
    const last = keys.at(-1)
    if (last === undefined) return
    commitKeys(multiple && index.byId.has(last) ? toggleCheck(index, keys, last, checkStrategy) : keys.slice(0, -1))
  }

  // ── Lazy levels ───────────────────────────────────────────────────────────
  const [loading, setLoading] = useState<ReadonlySet<string>>(new Set())
  const [failed, setFailed] = useState<ReadonlySet<string>>(new Set())
  const inflight = useRef(new Set<string>())
  const load = useCallback(
    (option: CascaderOption, path: string[]) => {
      const key = pathKey(path)
      if (!onLoadChildren || inflight.current.has(key)) return
      inflight.current.add(key)
      setLoading((set) => new Set([...set, key]))
      setFailed((set) => new Set([...set].filter((item) => item !== key)))
      let pending: Promise<void> | void
      try {
        pending = onLoadChildren(option, path)
      } catch (error) {
        pending = Promise.reject(error)
      }
      Promise.resolve(pending)
        .then(
          () => true,
          () => false,
        )
        .then((ok) => {
          inflight.current.delete(key)
          setLoading((set) => new Set([...set].filter((item) => item !== key)))
          if (!ok) setFailed((set) => new Set([...set, key]))
        })
    },
    [onLoadChildren],
  )
  const columns = useMemo(() => columnsFor(options, active), [options, active])
  const activeOptions = useMemo(() => resolvePath(options, active), [options, active])
  useEffect(() => {
    if (!open) return
    columns.forEach((column, at) => {
      if (column !== null || at === 0) return
      const path = active.slice(0, at)
      const key = pathKey(path)
      if (!loading.has(key) && !failed.has(key)) load(activeOptions[at - 1]!, path)
    })
  }, [open, columns, active, activeOptions, loading, failed, load])

  // ── Navigation ────────────────────────────────────────────────────────────
  const shouldFocus = useRef(false)
  const searching = query.trim() !== ""
  const selectable = (option: CascaderOption) => !option.disabled && (multiple || changeOnSelect || !opens(option))
  const enabledIn = (column: readonly CascaderOption[] | null) => (column ?? []).filter((option) => !option.disabled)

  const focusItem = (nextActive: string[], nextDepth: number) => {
    shouldFocus.current = true
    setActive(nextActive)
    setDepth(nextDepth)
  }
  useIsomorphicLayoutEffect(() => {
    // Keyboard moves focus; so does a level that finished loading under the focus.
    const lost = open && document.activeElement === document.body && bodyRef.current !== null
    if (!shouldFocus.current && !lost) return
    shouldFocus.current = false
    bodyRef.current?.querySelector<HTMLElement>(`[data-depth="${depth}"] [tabindex="0"]`)?.focus()
  })

  /** Open the next level of the option at `at`: focus its first enabled option. */
  const enter = (at: number, path: string[]) => {
    const option = resolvePath(options, path).at(-1)
    if (!option || !opens(option)) return false
    const children = option.children ?? null
    const first = enabledIn(children)[0]
    focusItem(first ? [...path, first.value] : path, at + 1)
    return true
  }

  const activate = (option: CascaderOption, at: number, how: "click" | "enter" | "space") => {
    const path = [...active.slice(0, at), option.value]
    if (option.disabled) return
    if (multiple) {
      if (how === "click" && opens(option)) {
        if (list) enter(at, path)
        else focusItem(path, at)
        return
      }
      setActive(path)
      setDepth(at)
      toggleKey(pathKey(path))
      return
    }
    if (!opens(option)) return commitPath(path, true)
    if (changeOnSelect) commitPath(path, how !== "click")
    if (how === "click" || !changeOnSelect) {
      if (list || how !== "click") enter(at, path)
      else focusItem(path, at)
    }
  }

  const onColumnsKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const column = columns[depth] ?? null
    const items = column ?? []
    const currentValue = active[depth]
    const currentIndex = items.findIndex((option) => option.value === currentValue)
    const move = (to: number) => {
      const option = items[to]
      if (option) focusItem([...active.slice(0, depth), option.value], depth)
    }
    const step = (from: number, by: number) => {
      for (let at = from + by; at >= 0 && at < items.length; at += by) if (!items[at]!.disabled) return move(at)
    }
    switch (readingKey(event.key, event.currentTarget)) {
      case "ArrowDown":
        step(currentIndex, 1)
        break
      case "ArrowUp":
        if (currentIndex <= 0 && searchRef.current) searchRef.current.focus()
        else step(currentIndex, -1)
        break
      case "Home":
        step(-1, 1)
        break
      case "End":
        step(items.length, -1)
        break
      case "ArrowRight":
        if (currentValue === undefined || !enter(depth, active.slice(0, depth + 1))) return
        break
      case "ArrowLeft":
        if (depth === 0) return
        focusItem(active.slice(0, depth), depth - 1)
        break
      case "Enter":
      case " ": {
        const option = items[currentIndex]
        if (!option) return
        if (event.key === " " && !multiple && !selectable(option)) enter(depth, [...active.slice(0, depth), option.value])
        else activate(option, depth, event.key === " " ? "space" : "enter")
        break
      }
      default: {
        if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) return
        if (searchRef.current) {
          searchRef.current.focus()
          return
        }
        const needle = event.key.toLocaleLowerCase(locale)
        for (let offset = 1; offset <= items.length; offset++) {
          const at = (currentIndex + offset) % items.length
          if (!items[at]!.disabled && items[at]!.label.toLocaleLowerCase(locale).startsWith(needle)) {
            move(at)
            event.preventDefault()
            return
          }
        }
        return
      }
    }
    event.preventDefault()
  }

  // ── Trigger value ─────────────────────────────────────────────────────────
  const placeholder = placeholderProp ?? t.placeholder
  const chipPaths = multiple ? keys.map(keyPath) : []
  const chipLabels = chipPaths.map((path) => pathLabels(options, path).at(-1) ?? "")
  const { chipsRef, measureRef, visible } = useChipFit(chipLabels, multiple && !wrap, false)
  const fullPath = (path: readonly string[]) => pathLabels(options, path).join(t.separator)

  const valueNode = multiple ? (
    keys.length === 0 ? (
      <span className="fa-select-text" data-placeholder="">
        {placeholder}
      </span>
    ) : (
      <span ref={chipsRef} className="fa-multi-chips fa-tree-select-chips">
        {chipPaths.slice(0, visible).map((path, at) => (
          <span key={keys[at]} className="fa-chip" title={fullPath(path)}>
            <TruncatedText className="fa-chip-label">{chipLabels[at]}</TruncatedText>
          </span>
        ))}
        {keys.length > visible ? (
          <span className="fa-chip" data-overflow="" title={listFormat(locale, { type: "unit" }).format(chipPaths.slice(visible).map(fullPath))}>
            <span className="fa-chip-label" aria-hidden>
              +{keys.length - visible}
            </span>
            <span className="sr-only">{t.more(keys.length - visible, listFormat(locale, { type: "unit" }).format(chipPaths.slice(visible).map(fullPath)))}</span>
          </span>
        ) : null}
      </span>
    )
  ) : chosenPath ? (
    <>
      {icon}
      <PathText labels={pathLabels(options, chosenPath)} separator={t.separator} />
    </>
  ) : (
    <>
      {icon}
      <span className="fa-select-text" data-placeholder="">
        {placeholder}
      </span>
    </>
  )

  const popupName = ariaLabel ?? (labelIdRef.current ? undefined : t.options)
  const search = useMemo(
    () => (searching ? searchPaths(options, query, { anyLevel: changeOnSelect || multiple, limit: searchLimit, locale }) : null),
    [searching, options, query, changeOnSelect, multiple, searchLimit, locale],
  )
  const shownColumns = list ? [depth] : columns.map((_, at) => at)

  return (
    <BasePopover.Root open={open} onOpenChange={(next) => changeOpen(next)}>
      {name ? keys.map((key) => <input key={key} type="hidden" name={name} value={keyPath(key).join("/")} />) : null}
      <PickerTrigger
        value={keys.join(",")}
        open={open}
        onOpen={() => changeOpen(true)}
        onRemoveLast={multiple ? removeLast : required ? undefined : () => commitKeys([])}
        disabled={disabled}
        readOnly={readOnly}
        required={required}
        invalid={invalid}
        id={id}
        size={size}
        width={width}
        multiple={multiple}
        wrap={wrap}
        className={cx("fa-tree-select-trigger fa-cascader-trigger", className)}
        onBlur={onBlur}
        ref={ref}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledby}
        labelIdRef={labelIdRef}
        valueId={valueId}
      >
        {multiple && !wrap ? (
          <span ref={measureRef} className="fa-multi-measure" aria-hidden>
            {chipLabels.map((label, at) => (
              <ChipMeasure key={keys[at]} label={label} removable={false} />
            ))}
            <span className="fa-chip" data-measure="overflow" data-overflow="">
              <span className="fa-chip-label">+{Math.max(keys.length, 9)}</span>
            </span>
          </span>
        ) : null}
        <span id={valueId} className="fa-select-value">
          {valueNode}
          {multiple && keys.length > 0 ? <span className="sr-only">{t.selected(keys.length)}</span> : null}
        </span>
      </PickerTrigger>
      <BasePopover.Portal container={popupContainer()}>
        <BasePopover.Positioner className="fa-select-positioner" side="bottom" align="start" sideOffset={popup.offset} collisionPadding={popup.collisionPadding}>
          <BasePopover.Popup
            className="glass-overlay fa-popup fa-cascader-popup"
            data-layout={list ? "list" : "columns"}
            initialFocus={() => (searchable ? searchRef.current : bodyRef.current?.querySelector<HTMLElement>(ITEM_STOP)) ?? true}
            aria-label={popupName}
            aria-labelledby={ariaLabel ? undefined : labelIdRef.current}
          >
            {/* A field of its own: the search must not become the outer Field's control. */}
            <BaseField.Root className="fa-cascader-body">
              {searchable ? (
                <SearchField
                  ref={searchRef}
                  size="sm"
                  aria-label={t.search}
                  placeholder={t.search}
                  value={query}
                  onValueChange={(next) => setQuery(String(next))}
                  onClear={() => setQuery("")}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown" || event.key === "Enter") {
                      event.preventDefault()
                      bodyRef.current?.querySelector<HTMLElement>(ITEM_STOP)?.focus()
                    }
                  }}
                  className="fa-cascader-search"
                />
              ) : null}
              <div ref={bodyRef} className="fa-cascader-panes">
                {search && list ? <div className="fa-cascader-list-head" aria-hidden /> : null}
                {search ? (
                  <SearchResults
                    search={search}
                    query={query}
                    multiple={multiple}
                    chosen={chosenPath ? pathKey(chosenPath) : null}
                    states={states}
                    disabledOf={(key) => checkDisabled(index, key)}
                    separator={t.separator}
                    messages={t}
                    searchRef={searchRef}
                    onChoose={(match) => {
                      const path = match.path.map((option) => option.value)
                      if (multiple) toggleKey(pathKey(path))
                      else commitPath(path, true)
                    }}
                  />
                ) : (
                  <>
                    {list ? (
                      <div className="fa-cascader-list-head">
                        {depth > 0 ? (
                          <Button variant="ghost" size="sm" icon={<IconChevronLeft className="fa-cascader-back-icon" />} onClick={() => focusItem(active.slice(0, depth), depth - 1)}>
                            {t.back}
                          </Button>
                        ) : null}
                        <span className="fa-cascader-list-title">{depth > 0 ? activeOptions[depth - 1]?.label : null}</span>
                      </div>
                    ) : null}
                    {/* oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- keys from the focused menu item bubble here; each column is a menu */}
                    <div className="fa-cascader-columns" onKeyDown={onColumnsKeyDown}>
                      {shownColumns.map((at) => {
                        const column = columns[at] ?? null
                        const path = active.slice(0, at)
                        const key = pathKey(path)
                        return (
                          <CascaderColumn
                            key={list ? "list" : at}
                            depth={at}
                            column={column}
                            label={at === 0 ? (popupName ?? t.options) : (activeOptions[at - 1]?.label ?? t.options)}
                            labelledBy={at === 0 && !ariaLabel ? labelIdRef.current : undefined}
                            activeValue={active[at]}
                            focused={at === depth}
                            chosenValue={chosenPath && pathKey(chosenPath.slice(0, at)) === key ? chosenPath[at] : undefined}
                            path={path}
                            multiple={multiple}
                            changeOnSelect={changeOnSelect}
                            list={list}
                            states={states}
                            disabledOf={(value) => (multiple ? checkDisabled(index, pathKey([...path, value])) : false)}
                            status={loading.has(key) ? "loading" : failed.has(key) ? "error" : null}
                            messages={t}
                            onRetry={() => activeOptions[at - 1] && load(activeOptions[at - 1]!, path)}
                            onItem={(option, how) => activate(option, at, how)}
                            onCheck={(option) => toggleKey(pathKey([...path, option.value]))}
                            onFocusItem={(option) => {
                              if (active[at] !== option.value || depth !== at) {
                                setDepth(at)
                                if (active[at] !== option.value) setActive([...path, option.value])
                              }
                            }}
                          />
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
              {multiple ? (
                <div className="fa-tree-select-footer">
                  <span className="fa-tree-select-count" aria-live="polite" data-numeric>
                    {t.selected(keys.length)}
                  </span>
                  <Button variant="ghost" size="sm" disabled={keys.length === 0} onClick={() => commitKeys((previous) => setAllChecks(index, previous, false, checkStrategy))}>
                    {t.clear}
                  </Button>
                </div>
              ) : null}
            </BaseField.Root>
          </BasePopover.Popup>
        </BasePopover.Positioner>
      </BasePopover.Portal>
    </BasePopover.Root>
  )
}

interface CascaderColumnProps {
  depth: number
  /** The options, or null while the level loads. */
  column: readonly CascaderOption[] | null
  label: string
  labelledBy?: string
  /** The option on the active path in this column. */
  activeValue?: string
  /** This column holds the tab stop. */
  focused: boolean
  /** The chosen path's option in this column, when the chosen path runs through it. */
  chosenValue?: string
  path: string[]
  multiple: boolean
  changeOnSelect: boolean
  list: boolean
  states: ReadonlyMap<string, CheckState> | null
  disabledOf: (value: string) => boolean
  status: "loading" | "error" | null
  messages: Messages
  onRetry: () => void
  onItem: (option: CascaderOption, how: "click" | "enter" | "space") => void
  onCheck: (option: CascaderOption) => void
  onFocusItem: (option: CascaderOption) => void
}

/** One level: a menu of options; the option on the active path is open (its level shows to the right). */
function CascaderColumn({
  depth,
  column,
  label,
  labelledBy,
  activeValue,
  focused,
  chosenValue,
  path,
  multiple,
  changeOnSelect,
  list,
  states,
  disabledOf,
  status,
  messages: t,
  onRetry,
  onItem,
  onCheck,
  onFocusItem,
}: CascaderColumnProps) {
  const ref = useRef<HTMLDivElement>(null)
  // Keep the active option in view when the column opens.
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>("[data-popup-open], [data-selected]")?.scrollIntoView({ block: "nearest" })
  }, [])
  const items = column ?? []
  const tabStop = items.find((option) => option.value === activeValue && !option.disabled) ?? items.find((option) => !option.disabled)
  return (
    <div ref={ref} className="fa-cascader-column" role="menu" aria-label={labelledBy ? undefined : label} aria-labelledby={labelledBy} data-depth={depth} aria-busy={status === "loading" || undefined} data-scroll-container>
      {column === null ? (
        status === "error" ? (
          <button type="button" role="menuitem" className="fa-item fa-cascader-item" data-status="error" tabIndex={focused ? 0 : -1} onClick={onRetry}>
            <IconError />
            <span className="fa-item-label">{t.loadFailed}</span>
            <span className="fa-tree-retry">{t.retry}</span>
          </button>
        ) : (
          <div role="menuitem" aria-disabled className="fa-item fa-cascader-item" data-status="loading" tabIndex={focused ? 0 : -1}>
            <ProgressRing value={null} size="sm" aria-label={t.loading} />
            <span className="fa-item-label">{t.loading}</span>
          </div>
        )
      ) : (
        items.map((option) => {
          const key = pathKey([...path, option.value])
          const branch = opens(option)
          const disabled = Boolean(option.disabled) || disabledOf(option.value)
          const state = states?.get(key) ?? "unchecked"
          const isActive = option.value === activeValue
          const chosen = !multiple && option.value === chosenValue
          const radio = !multiple && (!branch || changeOnSelect)
          return (
            // oxlint-disable-next-line jsx-a11y/click-events-have-key-events -- keys are handled once on the columns (roving focus)
            <div
              key={option.value}
              role={multiple ? "menuitemcheckbox" : radio ? "menuitemradio" : "menuitem"}
              className="fa-item fa-cascader-item"
              tabIndex={focused && option === tabStop ? 0 : -1}
              data-value={option.value}
              data-popup-open={isActive && branch && !list ? "" : undefined}
              data-selected={chosen ? "" : undefined}
              data-disabled={disabled ? "" : undefined}
              aria-disabled={disabled || undefined}
              aria-checked={multiple ? (state === "mixed" ? "mixed" : state === "checked") : radio ? chosen : undefined}
              aria-haspopup={branch ? "menu" : undefined}
              aria-expanded={branch && !list ? isActive : undefined}
              onFocus={() => onFocusItem(option)}
              onClick={() => onItem(option, "click")}
            >
              {multiple ? (
                // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- Space on the item checks it
                <span
                  className="fa-cascader-check"
                  onClick={(event) => {
                    event.stopPropagation()
                    if (!disabled) onCheck(option)
                  }}
                >
                  <CheckMark state={state} disabled={disabled} />
                </span>
              ) : null}
              {option.icon}
              <TruncatedText className="fa-item-label">{option.label}</TruncatedText>
              {branch ? (
                <IconChevronRight className="fa-cascader-chevron" />
              ) : !multiple ? (
                <span className="fa-select-check" aria-hidden>
                  {chosen ? <IconCheck /> : null}
                </span>
              ) : null}
            </div>
          )
        })
      )}
    </div>
  )
}

interface SearchResultsProps {
  search: { matches: CascaderMatch[]; total: number }
  query: string
  multiple: boolean
  chosen: string | null
  states: ReadonlyMap<string, CheckState> | null
  disabledOf: (key: string) => boolean
  separator: string
  messages: Messages
  searchRef: RefObject<HTMLInputElement | null>
  onChoose: (match: CascaderMatch) => void
}

/** Matching full paths, one option each; ↑ ↓ move, Enter or Space chooses. */
function SearchResults({ search, query, multiple, chosen, states, disabledOf, separator, messages: t, searchRef, onChoose }: SearchResultsProps) {
  const [focused, setFocused] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => setFocused(0), [query])
  const focusAt = (at: number) => {
    setFocused(at)
    ref.current?.querySelectorAll<HTMLElement>('[role="option"]')[at]?.focus()
  }
  if (search.matches.length === 0)
    return (
      <div className="fa-cascader-results" data-empty="">
        <div className="fa-tree-select-empty">{t.noMatch(query.trim())}</div>
        <span className="sr-only" role="status">
          {t.noMatch(query.trim())}
        </span>
      </div>
    )
  return (
    <div className="fa-cascader-results">
      <span className="sr-only" role="status">
        {t.matches(search.total)}
      </span>
      <div
        ref={ref}
        className="fa-cascader-results-list"
        role="listbox"
        aria-label={t.search}
        aria-multiselectable={multiple || undefined}
        data-scroll-container
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") focusAt(Math.min(search.matches.length - 1, focused + 1))
          else if (event.key === "ArrowUp") {
            if (focused === 0) searchRef.current?.focus()
            else focusAt(focused - 1)
          }
          else if (event.key === "Home") focusAt(0)
          else if (event.key === "End") focusAt(search.matches.length - 1)
          else if (event.key === "Enter" || event.key === " ") {
            const match = search.matches[focused]
            if (match && !disabledOf(pathKey(match.path.map((option) => option.value)))) onChoose(match)
          } else return
          event.preventDefault()
        }}
      >
        {search.matches.map((match, at) => {
          const key = pathKey(match.path.map((option) => option.value))
          const state = states?.get(key) ?? "unchecked"
          const disabled = multiple && disabledOf(key)
          const selected = multiple ? state === "checked" : key === chosen
          return (
            // oxlint-disable-next-line jsx-a11y/click-events-have-key-events -- keys are handled once on the list (roving focus)
            <div
              key={key}
              role="option"
              className="fa-item fa-cascader-result"
              tabIndex={at === focused ? 0 : -1}
              aria-selected={selected}
              aria-disabled={disabled || undefined}
              data-selected={!multiple && selected ? "" : undefined}
              data-disabled={disabled ? "" : undefined}
              onFocus={() => setFocused(at)}
              onClick={() => !disabled && onChoose(match)}
            >
              {multiple ? <CheckMark state={state} disabled={disabled} /> : null}
              <span className="fa-item-label">
                {match.path.map((option, level) => (
                  <span key={option.value}>
                    {level > 0 ? <span className="fa-cascader-separator">{separator}</span> : null}
                    <Highlight text={option.label} range={match.ranges[level] ?? null} />
                  </span>
                ))}
              </span>
            </div>
          )
        })}
        {search.total > search.matches.length ? (
          <div className="fa-cascader-more" role="presentation">
            {t.moreMatches(search.matches.length, search.total)}
          </div>
        ) : null}
      </div>
    </div>
  )
}

/**
 * A path in the trigger: every level when it fits, else the first and as many last levels
 * as fit with "…" between (and the last truncates when even that is too wide). Measured
 * before paint from a hidden twin; the full path is the tooltip and the accessible text.
 */
function PathText({ labels, separator }: { labels: string[]; separator: string }) {
  const boxRef = useRef<HTMLSpanElement>(null)
  const measureRef = useRef<HTMLSpanElement>(null)
  const { width } = useElementSize(boxRef)
  const [fit, setFit] = useState({ head: labels.length, tail: 0 })
  const key = labels.join("\u0000")
  useIsomorphicLayoutEffect(() => {
    const layer = measureRef.current
    if (!layer || width === 0) return
    const widths = [...layer.querySelectorAll<HTMLElement>("[data-measure='segment']")].map((node) => node.getBoundingClientRect().width)
    const sep = layer.querySelector<HTMLElement>("[data-measure='separator']")?.getBoundingClientRect().width ?? 0
    const ellipsis = layer.querySelector<HTMLElement>("[data-measure='ellipsis']")?.getBoundingClientRect().width ?? 0
    const next = fitPath(widths, width, sep, ellipsis)
    setFit((current) => (current.head === next.head && current.tail === next.tail ? current : next))
    // oxlint-disable-next-line react/exhaustive-effect-dependencies -- key: re-measure when the labels change
  }, [width, key, separator])
  const all = fit.tail === 0
  const parts: Array<{ text: string; ellipsis?: boolean }> = all
    ? labels.map((text) => ({ text }))
    : [...labels.slice(0, fit.head).map((text) => ({ text })), { text: "…", ellipsis: true }, ...labels.slice(labels.length - fit.tail).map((text) => ({ text }))]
  return (
    <span ref={boxRef} className="fa-select-text fa-cascader-path" title={labels.join(separator)}>
      <span ref={measureRef} className="fa-cascader-measure" aria-hidden>
        {labels.map((text, at) => (
          <span key={at} data-measure="segment">
            {text}
          </span>
        ))}
        <span data-measure="separator">{separator}</span>
        <span data-measure="ellipsis">…</span>
      </span>
      <span className="sr-only">{labels.join(separator)}</span>
      <span className="fa-cascader-segments" aria-hidden>
        {parts.map((part, at) => (
          <span key={at} className="fa-cascader-segment" data-ellipsis={part.ellipsis ? "" : undefined} data-last={at === parts.length - 1 ? "" : undefined}>
            {at > 0 ? <span className="fa-cascader-separator">{separator}</span> : null}
            {part.text}
          </span>
        ))}
      </span>
    </span>
  )
}

/** Cascader props for the bound field: everything but the value, name and validation state. */
export interface CascaderFieldProps extends FieldChrome, Omit<CascaderCommonProps, "name" | "onBlur" | "invalid" | "required" | "disabled" | "className"> {
  /** Several paths, with checkboxes. Bind it to a `string[][]` field; a single path binds to `string[] | null`. */
  multiple?: boolean
}

/**
 * Cascader bound to a form field: a path (`string[] | null`), or `string[][]` with
 * `multiple`. Use it inside `form.AppField`; label, hint and the first error come from the field.
 */
export function CascaderField({ label, hint, warning, optional, required, aside, className, disabled, multiple = false, wrap = true, ...control }: CascaderFieldProps) {
  const { field, error, root } = useBoundField<string[] | null | string[][]>()
  const shared = { ...control, name: field.name, onBlur: field.handleBlur, required, disabled, invalid: Boolean(error) }
  return (
    <Field {...root} label={label} hint={hint} warning={warning} optional={optional} required={required} aside={aside} className={className} disabled={disabled} nativeLabel={false}>
      {multiple ? (
        <Cascader {...shared} multiple wrap={wrap} value={(field.state.value as string[][] | null) ?? []} onValueChange={(next) => field.handleChange(next)} />
      ) : (
        <Cascader {...shared} value={field.state.value as string[] | null} onValueChange={(next) => field.handleChange(next)} />
      )}
    </Field>
  )
}
