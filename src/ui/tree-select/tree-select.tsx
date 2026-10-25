import { Field as BaseField } from "@base-ui/react/field"
import { Popover as BasePopover } from "@base-ui/react/popover"
import { defaultRangeExtractor, useVirtualizer, type Range } from "@tanstack/react-virtual"
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
  type RefObject,
} from "react"
import { IconChevronRight, IconError, IconFolder } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { useMessages } from "../../lib/i18n/use-messages.js"
import { useLocale } from "../../lib/locale/use-locale.js"
import { popupContainer } from "../../lib/popup-container.js"
import { usePopupMetrics } from "../../lib/popup-metrics.js"
import { useControllable } from "../../lib/use-controllable.js"
import { useElementSize } from "../../lib/use-element-size.js"
import { CountBadge } from "../badge/index.js"
import { Button } from "../button/index.js"
import { ChipMeasure } from "../combobox/index.js"
import { Field, type FieldWidth } from "../field/index.js"
import { useBoundField, type FieldChrome } from "../form/context.js"
import { SearchField } from "../input/index.js"
import { useChipFit } from "../multi-select/index.js"
import { ProgressRing } from "../progress/index.js"
import type { SelectSize } from "../select/index.js"
import { flattenTree, typeahead, type FlatRow } from "../tree/index.js"
import type { TreeNode } from "../tree/index.js"
import { TruncatedText } from "../truncated-text/index.js"
import { checkDisabled, checkStates, indexChecks, setAllChecks, toggleCheck, type CheckState, type CheckStrategy } from "./check.js"
import { CheckMark } from "./check-mark.js"
import { PickerTrigger } from "./picker-trigger.js"
import { treeSelectMessages } from "./messages.js"

/** Props shared by single and multiple TreeSelect. */
export interface TreeSelectCommonProps {
  /** The tree of options: folders, org units, device groups. Ids must be unique. */
  nodes: TreeNode[]
  /** Shown while nothing is chosen. Name the choice ("Choose a team"), not "Select…". */
  placeholder?: string
  size?: SelectSize
  /** Content width: short, medium or full (default). */
  width?: FieldWidth
  /** A fixed leading icon in the trigger, for a single choice whose node has none. */
  icon?: ReactNode
  /** Show a search field above the tree. Default true. Matches keep their ancestors and are highlighted. */
  searchable?: boolean
  /** Single choice: branches can be chosen as well as opened. Per node with `TreeNode.selectable`. */
  selectableGroups?: boolean
  /**
   * Multiple choice: which checked nodes the value lists. `parent` (default) lists a fully
   * checked branch instead of its children; `child` lists leaves only; `all` lists every
   * checked node.
   */
  checkStrategy?: CheckStrategy
  /**
   * Load a branch's children the first time it opens (a node with `hasChildren` and no
   * `children`): update `nodes`, then resolve. A rejection shows Retry. Same contract as Tree.
   */
  onLoadChildren?: (node: TreeNode) => Promise<void> | void
  /** Show each group's count of leaves. Default true; lazily loaded branches never show one. */
  groupCounts?: boolean
  /** Groups open at first. Default: the ancestors of the chosen values. */
  defaultExpanded?: string[]
  /** The line shown when the search matches nothing. Default: No match for “query”. */
  emptyText?: (query: string) => ReactNode
  /** Multiple choice: let chips wrap onto more lines (forms). Off: one line that folds the rest into "+N". */
  wrap?: boolean
  disabled?: boolean
  readOnly?: boolean
  required?: boolean
  /** Marks the control invalid outside a Field. */
  invalid?: boolean
  /** Native form field name: one hidden input per chosen id. */
  name?: string
  id?: string
  /** Called when focus leaves the trigger while the tree is closed, so a form can mark the field touched. */
  onBlur?: (event: FocusEvent<HTMLButtonElement>) => void
  /** Called with true when the tree opens and false when it closes. */
  onOpenChange?: (open: boolean) => void
  /** Layout only. Applied to the trigger. */
  className?: string
  ref?: Ref<HTMLButtonElement>
  /** Wording for this instance, over the language pack and `MessagesProvider`. */
  labels?: Partial<typeof treeSelectMessages.defaults>
  /** BCP 47 locale for search matching and wording. Default: the nearest `LocaleProvider`. */
  locale?: string
  /** Accessible name when a visible label does not name the control. */
  "aria-label"?: string
  /** IDs of elements that provide the accessible name. */
  "aria-labelledby"?: string
}

/** One node from the tree. */
export interface TreeSelectSingleProps extends TreeSelectCommonProps {
  /** Several nodes, with checkboxes. */
  multiple?: false
  /** The chosen node's id, or null. Controlled while defined. */
  value?: string | null
  defaultValue?: string | null
  /** Called with the chosen node's id when one is picked by click, Enter or Space. */
  onValueChange?: (value: string | null) => void
}

/** Several nodes, with checkboxes and parent/mixed states. */
export interface TreeSelectMultipleProps extends TreeSelectCommonProps {
  /** Several nodes, with checkboxes. */
  multiple: true
  /** The checked ids in `checkStrategy` form, in tree order. Controlled while defined. */
  value?: string[]
  defaultValue?: string[]
  /** Called with every checked id (in `checkStrategy` form, tree order) after each check, uncheck or Clear. */
  onValueChange?: (value: string[]) => void
}

export type TreeSelectProps = TreeSelectSingleProps | TreeSelectMultipleProps

const TYPEAHEAD_RESET_MS = 500

interface LoadState {
  loading: ReadonlySet<string>
  failed: ReadonlySet<string>
  loaded: ReadonlySet<string>
  moreLoading: ReadonlySet<string>
  moreFailed: ReadonlySet<string>
}
const EMPTY_LOAD: LoadState = { loading: new Set(), failed: new Set(), loaded: new Set(), moreLoading: new Set(), moreFailed: new Set() }
const added = (set: ReadonlySet<string>, id: string) => (set.has(id) ? set : new Set([...set, id]))
const removed = (set: ReadonlySet<string>, id: string) => {
  if (!set.has(id)) return set
  const next = new Set(set)
  next.delete(id)
  return next
}
const rowKey = (row: FlatRow<TreeNode>) => (row.status ? `${row.node.id}␞${row.status}` : row.node.id)

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

/** Ancestor ids of each id, so the chosen nodes are in view when the tree opens. */
function ancestorsOf(parentOf: ReadonlyMap<string, string | null>, ids: readonly string[]) {
  const out = new Set<string>()
  for (const id of ids) {
    let parent = parentOf.get(id)
    while (parent) {
      out.add(parent)
      parent = parentOf.get(parent)
    }
  }
  return out
}

/**
 * A select whose options are a tree: folders, org units, device groups. One node, or with
 * `multiple` several, with checkboxes whose branches show the mixed state and a
 * `checkStrategy` for what the value lists. The tree opens on glass below the trigger with
 * a search field (matches keep their ancestors and are highlighted); lazily loaded branches
 * use Tree's `onLoadChildren`. Chosen nodes show as chips that fold into "+N".
 *
 * Keyboard (the ARIA tree pattern): ↓ from the search enters the tree; ↑ ↓ move, → opens or
 * enters a group, ← closes or returns to the parent, Home / End, Enter or Space chooses (a
 * single choice closes the tree), typing returns to the search. Backspace on the trigger
 * removes the last chosen node; Esc closes and returns focus to the trigger.
 */
export function TreeSelect(props: TreeSelectProps) {
  const {
    nodes,
    multiple = false,
    placeholder: placeholderProp,
    size = "md",
    width,
    icon,
    searchable = true,
    selectableGroups = false,
    checkStrategy = "parent",
    onLoadChildren,
    groupCounts = true,
    defaultExpanded,
    emptyText,
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
  const t = useMessages(treeSelectMessages, { labels, locale: localeProp })
  const locale = useLocale(localeProp)
  const asList = (value: string | string[] | null | undefined) => (value === undefined ? undefined : value === null ? [] : Array.isArray(value) ? value : [value])
  const [current, commit] = useControllable<string[]>(asList(props.value), asList(props.defaultValue) ?? [], (next) => {
    if (props.multiple) props.onValueChange?.(next)
    else props.onValueChange?.(next[0] ?? null)
  })
  const index = useMemo(() => indexChecks(nodes), [nodes])
  const states = useMemo(() => (multiple ? checkStates(index, current) : null), [multiple, index, current])
  const labelOf = useCallback((key: string) => index.byId.get(key)?.label ?? key, [index])

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set(defaultExpanded ?? ancestorsOf(index.parentOf, current)))
  const changeOpen = (next: boolean) => {
    if (next && (readOnly || disabled)) return
    if (next) setExpanded((previous) => new Set([...previous, ...ancestorsOf(index.parentOf, current)]))
    else setQuery("")
    setOpen(next)
    onOpenChange?.(next)
  }

  const searchRef = useRef<HTMLInputElement>(null)
  const treeRef = useRef<HTMLDivElement>(null)
  const labelIdRef = useRef<string | undefined>(undefined)
  const valueId = useId()
  const popup = usePopupMetrics()

  const choose = (node: TreeNode) => {
    if (multiple) commit((previous) => toggleCheck(index, previous, node.id, checkStrategy))
    else {
      commit([node.id])
      changeOpen(false)
    }
  }

  const removeLast = () => {
    const last = current.at(-1)
    if (last === undefined) return
    commit(multiple && index.byId.has(last) ? toggleCheck(index, current, last, checkStrategy) : current.slice(0, -1))
  }

  // ── Trigger value ─────────────────────────────────────────────────────────
  const chipLabels = multiple ? current.map(labelOf) : []
  const { chipsRef, measureRef, visible } = useChipFit(chipLabels, multiple && !wrap, false)
  const shown = current.slice(0, visible)
  const hidden = current.slice(visible)
  const placeholder = placeholderProp ?? t.placeholder
  const singleNode = !multiple && current[0] !== undefined ? index.byId.get(current[0]) : undefined

  const valueNode = multiple ? (
    current.length === 0 ? (
      <span className="fa-select-text" data-placeholder="">
        {placeholder}
      </span>
    ) : (
      <span ref={chipsRef} className="fa-multi-chips fa-tree-select-chips">
        {shown.map((key) => (
          <span key={key} className="fa-chip">
            {index.byId.get(key)?.icon}
            <TruncatedText className="fa-chip-label">{labelOf(key)}</TruncatedText>
          </span>
        ))}
        {hidden.length > 0 ? (
          <span className="fa-chip" data-overflow="" title={new Intl.ListFormat(locale, { type: "unit" }).format(hidden.map(labelOf))}>
            <span className="fa-chip-label" aria-hidden>
              +{hidden.length}
            </span>
            <span className="sr-only">{t.more(hidden.length, new Intl.ListFormat(locale, { type: "unit" }).format(hidden.map(labelOf)))}</span>
          </span>
        ) : null}
      </span>
    )
  ) : current[0] === undefined ? (
    <>
      {icon}
      <span className="fa-select-text" data-placeholder="">
        {placeholder}
      </span>
    </>
  ) : (
    <>
      {singleNode?.icon ?? icon}
      <span className="fa-select-text">{labelOf(current[0])}</span>
    </>
  )

  return (
    <BasePopover.Root open={open} onOpenChange={(next) => changeOpen(next)}>
      {name ? current.map((key) => <input key={key} type="hidden" name={name} value={key} />) : null}
      <PickerTrigger
        value={current.join(",")}
        open={open}
        onOpen={() => changeOpen(true)}
        onRemoveLast={multiple ? removeLast : required ? undefined : () => commit([])}
        disabled={disabled}
        readOnly={readOnly}
        required={required}
        invalid={invalid}
        id={id}
        size={size}
        width={width}
        multiple={multiple}
        wrap={wrap}
        className={cx("fa-tree-select-trigger", className)}
        onBlur={onBlur}
        ref={ref}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledby}
        labelIdRef={labelIdRef}
        valueId={valueId}
      >
        {multiple && !wrap ? (
          <span ref={measureRef} className="fa-multi-measure" aria-hidden>
            {current.map((key) => (
              <ChipMeasure key={key} label={labelOf(key)} icon={index.byId.get(key)?.icon} removable={false} />
            ))}
            <span className="fa-chip" data-measure="overflow" data-overflow="">
              <span className="fa-chip-label">+{Math.max(current.length, 9)}</span>
            </span>
          </span>
        ) : null}
        <span id={valueId} className="fa-select-value">
          {valueNode}
          {multiple && current.length > 0 ? <span className="sr-only">{t.selected(current.length)}</span> : null}
        </span>
      </PickerTrigger>
      <BasePopover.Portal container={popupContainer()}>
        <BasePopover.Positioner className="fa-select-positioner" side="bottom" align="start" sideOffset={popup.offset} collisionPadding={popup.collisionPadding}>
          <BasePopover.Popup
            className="glass-overlay fa-popup fa-tree-select-popup"
            data-multiple={multiple ? "" : undefined}
            initialFocus={() => (searchable ? searchRef.current : treeRef.current?.querySelector<HTMLElement>("[tabindex='0']")) ?? true}
            aria-label={ariaLabel ?? (labelIdRef.current ? undefined : t.options)}
            aria-labelledby={ariaLabel ? undefined : labelIdRef.current}
          >
            {/* A field of its own: the search must not become the outer Field's control. */}
            <BaseField.Root className="fa-tree-select-body">
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
                    if (event.key === "ArrowDown") {
                      event.preventDefault()
                      treeRef.current?.querySelector<HTMLElement>("[tabindex='0']")?.focus()
                    } else if (event.key === "Enter") {
                      event.preventDefault()
                      treeRef.current?.querySelector<HTMLElement>("[tabindex='0']")?.focus()
                    }
                  }}
                  className="fa-tree-select-search"
                />
              ) : null}
              <TreeSelectList
                nodes={nodes}
                treeRef={treeRef}
                searchRef={searchable ? searchRef : undefined}
                query={query}
                locale={locale}
                expanded={expanded}
                setExpanded={setExpanded}
                multiple={multiple}
                selectedId={multiple ? null : (current[0] ?? null)}
                states={states}
                disabledOf={(node) => (multiple ? checkDisabled(index, node.id) : Boolean(node.disabled))}
                selectableGroups={selectableGroups}
                groupCounts={groupCounts}
                onLoadChildren={onLoadChildren}
                onChoose={choose}
                label={ariaLabel ?? t.options}
                labelledBy={ariaLabel ? undefined : labelIdRef.current}
                emptyText={emptyText ?? t.noMatch}
                messages={t}
              />
              {multiple ? (
                <div className="fa-tree-select-footer">
                  <span className="fa-tree-select-count" aria-live="polite" data-numeric>
                    {t.selected(current.length)}
                  </span>
                  <Button variant="ghost" size="sm" disabled={current.length === 0} onClick={() => commit((previous) => setAllChecks(index, previous, false, checkStrategy))}>
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

interface TreeSelectListProps {
  nodes: TreeNode[]
  treeRef: RefObject<HTMLDivElement | null>
  /** Typing in the tree returns here. */
  searchRef?: RefObject<HTMLInputElement | null>
  query: string
  locale: string
  expanded: ReadonlySet<string>
  setExpanded: (next: ReadonlySet<string>) => void
  multiple: boolean
  selectedId: string | null
  states: ReadonlyMap<string, CheckState> | null
  disabledOf: (node: TreeNode) => boolean
  selectableGroups: boolean
  groupCounts: boolean
  onLoadChildren?: (node: TreeNode) => Promise<void> | void
  onChoose: (node: TreeNode) => void
  label: string
  labelledBy?: string
  emptyText: (query: string) => ReactNode
  messages: typeof treeSelectMessages.defaults
}

const useIsomorphicLayoutEffect = typeof window === "undefined" ? () => {} : useLayoutEffect

/** The virtualised tree inside the popup: roving focus, checkboxes or single selection, lazy branches. */
function TreeSelectList({
  nodes,
  treeRef,
  searchRef,
  query,
  locale,
  expanded,
  setExpanded,
  multiple,
  selectedId,
  states,
  disabledOf,
  selectableGroups,
  groupCounts,
  onLoadChildren,
  onChoose,
  label,
  labelledBy,
  emptyText,
  messages: t,
}: TreeSelectListProps) {
  const [load, setLoad] = useState<LoadState>(EMPTY_LOAD)
  const rows = useMemo(() => flattenTree(nodes, expanded, query, locale, load), [nodes, expanded, query, locale, load])
  const searching = query.trim() !== ""
  const selectable = useCallback(
    (row: FlatRow<TreeNode>) => !row.status && (multiple || (row.node.selectable ?? (row.branch ? selectableGroups : true))),
    [multiple, selectableGroups],
  )

  // ── Lazy children (Tree's contract) ───────────────────────────────────────
  const inflight = useRef(new Set<string>())
  const loadChildren = useCallback(
    (node: TreeNode) => {
      if (!onLoadChildren || inflight.current.has(node.id)) return
      inflight.current.add(node.id)
      setLoad((state) => ({ ...state, loading: added(state.loading, node.id), failed: removed(state.failed, node.id) }))
      let pending: Promise<void> | void
      try {
        pending = onLoadChildren(node)
      } catch (error) {
        pending = Promise.reject(error)
      }
      Promise.resolve(pending)
        .then(
          () => true,
          () => false,
        )
        .then((ok) => {
          inflight.current.delete(node.id)
          setLoad((state) => ({
            ...state,
            loading: removed(state.loading, node.id),
            ...(ok ? { loaded: added(state.loaded, node.id) } : { failed: added(state.failed, node.id) }),
          }))
        })
    },
    [onLoadChildren],
  )
  useEffect(() => {
    for (const row of rows) if (row.status === "loading" && !load.loading.has(row.node.id)) loadChildren(row.node)
  }, [rows, load.loading, loadChildren])

  const toggle = (row: FlatRow<TreeNode>, open = !row.expanded) => {
    if (!row.hasChildren || row.status || searching) return
    const next = new Set(expanded)
    if (open) next.add(row.node.id)
    else next.delete(row.node.id)
    setExpanded(next)
  }

  // ── Focus (roving tabindex) ───────────────────────────────────────────────
  const [focusedId, setFocusedId] = useState<string | null>(() => selectedId ?? (states ? ([...states].find(([, state]) => state !== "unchecked")?.[0] ?? null) : null))
  const indexById = useMemo(() => new Map(rows.map((row, at) => [rowKey(row), at])), [rows])
  const focusedIndex = focusedId !== null && indexById.has(focusedId) ? indexById.get(focusedId)! : rows.length ? 0 : -1
  const shouldFocus = useRef(false)
  // A new search starts at the first result.
  useEffect(() => {
    if (query.trim()) setFocusedId(null)
  }, [query])

  // ── Geometry from tokens (probes), then virtualisation ────────────────────
  const groupProbe = useRef<HTMLDivElement>(null)
  const leafProbe = useRef<HTMLDivElement>(null)
  const twoLineProbe = useRef<HTMLDivElement>(null)
  const groupHeight = useElementSize(groupProbe).height || 36
  const leafHeight = useElementSize(leafProbe).height || 36
  const twoLineHeight = useElementSize(twoLineProbe).height || 44
  const sizeOf = (row: FlatRow<TreeNode> | undefined) =>
    !row || row.status ? leafHeight : row.branch ? groupHeight : row.node.description || row.keywordMatch ? twoLineHeight : leafHeight
  const focusedRef = useRef(focusedIndex)
  focusedRef.current = focusedIndex
  const keyAt = useCallback((at: number) => (rows[at] ? rowKey(rows[at]) : at), [rows])
  // oxlint-disable-next-line react/incompatible-library -- the app does not use the React Compiler; TanStack Virtual is the sanctioned virtualiser
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => treeRef.current,
    estimateSize: (at) => sizeOf(rows[at]),
    getItemKey: keyAt,
    overscan: 6,
    rangeExtractor: (range: Range) => {
      const indexes = defaultRangeExtractor(range)
      const keep = focusedRef.current
      if (keep >= 0 && !indexes.includes(keep)) indexes.push(keep)
      return indexes.toSorted((a, b) => a - b)
    },
  })
  useEffect(() => {
    virtualizer.measure()
  }, [virtualizer, groupHeight, leafHeight, twoLineHeight, rows])

  // The list keeps the height it opened with, so filtering never moves the search field
  // (the popup may sit above its trigger) or the footer.
  const [minHeight, setMinHeight] = useState(0)
  const total = virtualizer.getTotalSize()
  useIsomorphicLayoutEffect(() => {
    // The rendered height, which the list's max-height has already clamped.
    if (minHeight === 0 && total > 0 && treeRef.current) setMinHeight(treeRef.current.offsetHeight)
  }, [total, minHeight, treeRef])

  // Bring the initially focused row (the chosen node) into view.
  useEffect(() => {
    if (focusedIndex > 0) virtualizer.scrollToIndex(focusedIndex, { align: "center" })
    // oxlint-disable-next-line react/exhaustive-effect-dependencies -- only on open
  }, [])

  useIsomorphicLayoutEffect(() => {
    if (!shouldFocus.current || focusedIndex < 0) return
    shouldFocus.current = false
    const row = rows[focusedIndex]
    treeRef.current?.querySelector<HTMLElement>(`[data-row-id="${CSS.escape(row ? rowKey(row) : "")}"]`)?.focus({ preventScroll: true })
  })

  const moveTo = (at: number) => {
    const row = rows[at]
    if (!row) return
    shouldFocus.current = true
    setFocusedId(rowKey(row))
    virtualizer.scrollToIndex(at, { align: "auto" })
  }

  const activate = (row: FlatRow<TreeNode>) => {
    if (row.status === "error") return loadChildren(row.node)
    if (row.status) return
    if (disabledOf(row.node)) return
    if (selectable(row)) onChoose(row.node)
    else if (row.hasChildren) toggle(row)
  }

  const buffer = useRef({ text: "", timer: 0 as ReturnType<typeof setTimeout> | 0 })
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const row = rows[focusedIndex]
    if (!row) return
    switch (event.key) {
      case "ArrowDown":
        moveTo(Math.min(rows.length - 1, focusedIndex + 1))
        break
      case "ArrowUp":
        if (focusedIndex === 0 && searchRef?.current) searchRef.current.focus()
        else moveTo(Math.max(0, focusedIndex - 1))
        break
      case "Home":
        moveTo(0)
        break
      case "End":
        moveTo(rows.length - 1)
        break
      case "ArrowRight":
        if (row.hasChildren && !row.expanded) toggle(row, true)
        else if (row.hasChildren) moveTo(focusedIndex + 1)
        else return
        break
      case "ArrowLeft":
        if (row.hasChildren && row.expanded && !searching) toggle(row, false)
        else if (row.parentId !== null) moveTo(indexById.get(row.parentId) ?? focusedIndex)
        else return
        break
      case "Enter":
      case " ":
        activate(row)
        break
      default: {
        if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) return
        // With a search field, typing searches; the key lands in the field.
        if (searchRef?.current) {
          searchRef.current.focus()
          return
        }
        clearTimeout(buffer.current.timer)
        buffer.current.text += event.key
        buffer.current.timer = setTimeout(() => (buffer.current.text = ""), TYPEAHEAD_RESET_MS)
        const next = typeahead(rows, buffer.current.text.length > 1 ? focusedIndex - 1 : focusedIndex, buffer.current.text, locale)
        if (next >= 0) moveTo(next)
      }
    }
    event.preventDefault()
  }

  const items = virtualizer.getVirtualItems()
  return (
    <div className="fa-tree fa-tree-select-tree">
      <div
        ref={treeRef}
        className="fa-tree-scroll fa-tree-select-scroll"
        role="tree"
        aria-label={labelledBy ? undefined : label}
        aria-labelledby={labelledBy}
        aria-multiselectable={multiple || undefined}
        tabIndex={-1}
        style={minHeight ? ({ "--_locked": `${minHeight}px` } as CSSProperties) : undefined}
        onKeyDown={onKeyDown}
        data-scroll-container
      >
        {rows.length === 0 && searching ? (
          <div className="fa-tree-select-empty" role="presentation">
            {emptyText(query.trim())}
          </div>
        ) : null}
        <div role="presentation" className="fa-tree-canvas" style={{ height: total }}>
          {items.map((item) => {
            const row = rows[item.index]
            if (!row) return null
            const key = rowKey(row)
            const focused = item.index === focusedIndex
            const style = { "--_level": row.level, transform: `translateY(${item.start}px)` } as CSSProperties
            if (row.status) {
              const loading = row.status === "loading"
              return (
                // oxlint-disable-next-line jsx-a11y/click-events-have-key-events -- keys are handled once on the tree (roving focus)
                <div
                  key={item.key}
                  role="treeitem"
                  className="fa-item fa-tree-row"
                  style={style}
                  tabIndex={focused ? 0 : -1}
                  data-row-id={key}
                  data-kind="leaf"
                  data-status={row.status}
                  aria-level={row.level}
                  aria-setsize={row.setsize}
                  aria-posinset={row.posinset}
                  aria-disabled={loading || undefined}
                  aria-label={loading ? undefined : `${t.loadFailed} · ${t.retry}`}
                  onClick={loading ? undefined : () => (setFocusedId(key), loadChildren(row.node))}
                  onFocus={() => setFocusedId(key)}
                >
                  <span className="fa-tree-chevron" aria-hidden />
                  <span className="fa-tree-icon" aria-hidden>
                    {loading ? <ProgressRing value={null} size="sm" aria-label={t.loading} /> : <IconError />}
                  </span>
                  <span className="fa-tree-text">
                    <span className="fa-tree-label">{loading ? t.loading : t.loadFailed}</span>
                  </span>
                  {loading ? null : <span className="fa-tree-retry">{t.retry}</span>}
                </div>
              )
            }
            const { node } = row
            const disabled = disabledOf(node)
            const canSelect = selectable(row)
            const state = states?.get(node.id) ?? "unchecked"
            const selected = !multiple && canSelect && node.id === selectedId
            const twoLine = !row.branch && Boolean(node.description || row.keywordMatch)
            const description = row.keywordMatch ? (
              <Highlight text={row.keywordMatch.text} range={row.keywordMatch.range} />
            ) : (
              <Highlight text={node.description ?? ""} range={row.descriptionMatch} />
            )
            const count = groupCounts && row.hasChildren && node.hasChildren === undefined && !node.hasMore ? <CountBadge value={row.leaves} className="fa-tree-count" /> : null
            return (
              // oxlint-disable-next-line jsx-a11y/click-events-have-key-events -- keys are handled once on the tree (roving focus)
              <div
                key={item.key}
                role="treeitem"
                className="fa-item fa-tree-row fa-tree-select-row"
                style={style}
                tabIndex={focused ? 0 : -1}
                data-row-id={key}
                data-kind={row.branch ? "group" : "leaf"}
                data-two-line={twoLine ? "" : undefined}
                data-selected={selected ? "" : undefined}
                data-disabled={disabled ? "" : undefined}
                data-check={multiple ? "" : undefined}
                aria-level={row.level}
                aria-setsize={row.setsize}
                aria-posinset={row.posinset}
                aria-selected={!multiple && canSelect ? selected : undefined}
                aria-checked={multiple ? (state === "mixed" ? "mixed" : state === "checked") : undefined}
                aria-disabled={disabled || undefined}
                aria-expanded={row.hasChildren ? row.expanded : undefined}
                aria-busy={load.loading.has(node.id) || undefined}
                onFocus={() => setFocusedId(key)}
                onClick={(event) => {
                  setFocusedId(key)
                  const chevron = event.target instanceof Element && event.target.closest(".fa-tree-chevron") !== null
                  if (chevron && row.hasChildren) toggle(row)
                  else activate(row)
                }}
              >
                <span className="fa-tree-chevron" aria-hidden>
                  {row.hasChildren ? <IconChevronRight /> : null}
                </span>
                {multiple ? <CheckMark state={state} disabled={disabled} /> : null}
                {node.icon ? <span className="fa-tree-icon">{node.icon}</span> : row.branch && !multiple ? (
                  <span className="fa-tree-icon">
                    <IconFolder />
                  </span>
                ) : null}
                <span className="fa-tree-text">
                  <span className="fa-tree-label" title={node.label}>
                    <Highlight text={node.label} range={row.labelMatch} />
                  </span>
                  {twoLine ? <span className="fa-tree-description">{description}</span> : null}
                </span>
                {count}
              </div>
            )
          })}
        </div>
      </div>
      <div className="fa-tree-probes" aria-hidden>
        <div ref={groupProbe}>
          <div className="fa-item fa-tree-row" data-kind="group" />
        </div>
        <div ref={leafProbe}>
          <div className="fa-item fa-tree-row" data-kind="leaf" />
        </div>
        <div ref={twoLineProbe}>
          <div className="fa-item fa-tree-row" data-kind="leaf" data-two-line="" />
        </div>
      </div>
    </div>
  )
}

/** TreeSelect props for the bound field: everything but the value, name and validation state. */
export interface TreeSelectFieldProps extends FieldChrome, Omit<TreeSelectCommonProps, "name" | "onBlur" | "invalid" | "required" | "disabled" | "className"> {
  /** Several nodes, with checkboxes. Bind it to a `string[]` field; a single choice binds to `string | null`. */
  multiple?: boolean
}

/**
 * TreeSelect bound to a form field: `string | null`, or `string[]` with `multiple`. Use it
 * inside `form.AppField`; label, hint and the first error come from the field.
 */
export function TreeSelectField({ label, hint, warning, optional, required, aside, className, disabled, multiple = false, wrap = true, ...control }: TreeSelectFieldProps) {
  const { field, error, root } = useBoundField<string | null | string[]>()
  const shared = { ...control, name: field.name, onBlur: field.handleBlur, required, disabled, invalid: Boolean(error) }
  return (
    <Field {...root} label={label} hint={hint} warning={warning} optional={optional} required={required} aside={aside} className={className} disabled={disabled} nativeLabel={false}>
      {multiple ? (
        <TreeSelect {...shared} multiple wrap={wrap} value={(field.state.value as string[] | null) ?? []} onValueChange={(next) => field.handleChange(next)} />
      ) : (
        <TreeSelect {...shared} value={field.state.value as string | null} onValueChange={(next) => field.handleChange(next)} />
      )}
    </Field>
  )
}
