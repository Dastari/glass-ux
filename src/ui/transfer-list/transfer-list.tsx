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
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from "react"
import { IconChevronLeft, IconChevronRight, IconChevronsLeft, IconChevronsRight, IconGrip } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { useMessages } from "../../lib/i18n/use-messages.js"
import { useLocale } from "../../lib/locale/use-locale.js"
import { useControllable } from "../../lib/use-controllable.js"
import { useElementSize } from "../../lib/use-element-size.js"
import { useScrollEdges } from "../../lib/use-scroll-edges.js"
import { Button } from "../button/index.js"
import { Checkbox } from "../checkbox/index.js"
import { DragDropProvider, DropZoneScope, useDraggable, useDropZone, type DropEvent } from "../drag-drop/index.js"
import { SearchField } from "../input/index.js"
import { Tooltip } from "../tooltip/index.js"
import { CheckMark } from "../tree-select/check-mark.js"
import { transferListMessages } from "./messages.js"
import { assignValues, filterTransferItems, rangeValues, reorderValues, transferRows, unassignValues, type TransferItem, type TransferRow } from "./transfer.js"

export interface TransferListProps {
  /** Every item that can be assigned. Values must be unique. */
  items: TransferItem[]
  /** The assigned values, in order. Controlled while defined. */
  value?: string[]
  defaultValue?: string[]
  /** Called with the assigned values (in order) after each move or reorder. */
  onValueChange?: (value: string[]) => void
  /**
   * The assigned list's order is meaningful: rows carry a grip to drag them, and Alt+↑ / Alt+↓
   * moves the focused row. Reordering is off while the list is searched. An orderable list
   * renders every row; keep it to a few hundred.
   */
  orderable?: boolean
  /** List items under their `group` headings. Default true. The assigned list keeps its own order when orderable. */
  grouped?: boolean
  /** A search field above each list. Default true. */
  searchable?: boolean
  /** Nothing can be selected or moved. */
  disabled?: boolean
  /** Native form field name: one hidden input per assigned value. */
  name?: string
  /** Layout only. Set a height here (the lists fill it); the default is the `--_h` component token. */
  className?: string
  /** Wording for this instance (list titles, counts), over the language pack and `MessagesProvider`. */
  labels?: Partial<typeof transferListMessages.defaults>
  /** BCP 47 locale for search matching and wording. Default: the nearest `LocaleProvider`. */
  locale?: string
  /** Names the whole control ("Role permissions"). */
  "aria-label"?: string
}

type Side = "available" | "assigned"
type Messages = typeof transferListMessages.defaults

/**
 * Assign items between two lists: Available and Assigned (permissions, group members). Each
 * list has a search field, checkboxes with a select-all box, and a count in its header; the
 * buttons between them move the selected items or all listed items. Disabled items stay put
 * and say why in a tooltip. Lists are virtualised, so thousands of items cost only the rows
 * on screen. With `orderable` the assigned list can be reordered by dragging or Alt+↑ / ↓.
 * In a narrow container the lists stack and the move buttons turn to point down and up.
 *
 * Keyboard: ↑ ↓ move, Shift extends the selection, Space checks, Ctrl/⌘+A selects all,
 * Enter moves the selection (or the focused item) to the other list, Esc clears the selection.
 */
export function TransferList({
  items,
  value,
  defaultValue,
  onValueChange,
  orderable = false,
  grouped = true,
  searchable = true,
  disabled = false,
  name,
  className,
  labels,
  locale: localeProp,
  "aria-label": ariaLabel,
}: TransferListProps) {
  const t = useMessages(transferListMessages, { labels, locale: localeProp })
  const locale = useLocale(localeProp)
  const [assigned, commit] = useControllable<string[]>(value, defaultValue ?? [], onValueChange)
  const byValue = useMemo(() => new Map(items.map((item) => [item.value, item])), [items])
  const assignedSet = useMemo(() => new Set(assigned), [assigned])
  const lists: Record<Side, TransferItem[]> = {
    available: useMemo(() => items.filter((item) => !assignedSet.has(item.value)), [items, assignedSet]),
    assigned: useMemo(() => assigned.map((key) => byValue.get(key) ?? { value: key, label: key }), [assigned, byValue]),
  }
  const [queries, setQueries] = useState<Record<Side, string>>({ available: "", assigned: "" })
  const [selection, setSelection] = useState<Record<Side, ReadonlySet<string>>>({ available: new Set(), assigned: new Set() })
  const [announcement, setAnnouncement] = useState("")
  const titles: Record<Side, string> = { available: t.available, assigned: t.assigned }
  const other = (side: Side): Side => (side === "available" ? "assigned" : "available")

  const shown = (side: Side) => filterTransferItems(lists[side], queries[side], locale)
  const filtered: Record<Side, TransferItem[]> = { available: shown("available"), assigned: shown("assigned") }
  // Selections only hold values still listed on their side.
  const selected: Record<Side, ReadonlySet<string>> = {
    available: new Set([...selection.available].filter((key) => !assignedSet.has(key))),
    assigned: new Set([...selection.assigned].filter((key) => assignedSet.has(key))),
  }

  const move = (from: Side, values: Iterable<string>) => {
    if (disabled) return
    const moving = [...values].filter((key) => byValue.has(key) && !byValue.get(key)!.disabled && (from === "assigned") === assignedSet.has(key))
    if (!moving.length) return
    commit(from === "available" ? assignValues(assigned, moving, items) : unassignValues(assigned, moving))
    setSelection((current) => ({ ...current, [from]: new Set([...current[from]].filter((key) => !moving.includes(key))) }))
    setAnnouncement(t.moved(moving.length, titles[other(from)]))
  }
  const movable = (side: Side, values: Iterable<string>) => [...values].filter((key) => !byValue.get(key)?.disabled)
  const allMovable = (side: Side) => movable(side, filtered[side].map((item) => item.value))

  const pane = (side: Side) => (
    <TransferPane
      side={side}
      title={titles[side]}
      items={filtered[side]}
      total={lists[side].length}
      grouped={grouped && !(orderable && side === "assigned")}
      selected={selected[side]}
      setSelected={(update) => setSelection((current) => ({ ...current, [side]: update(selected[side]) }))}
      query={queries[side]}
      setQuery={(query) => setQueries((current) => ({ ...current, [side]: query }))}
      searchable={searchable}
      disabled={disabled}
      orderable={orderable && side === "assigned"}
      onMove={(values) => move(side, values)}
      onReorder={(from, to) => {
        const next = reorderValues(assigned, from, to)
        commit(next)
        const item = byValue.get(next[to]!)
        setAnnouncement(t.reordered(item?.label ?? next[to]!, to + 1, next.length))
      }}
      messages={t}
    />
  )

  const button = (from: Side, all: boolean) => {
    const values = all ? allMovable(from) : movable(from, selected[from])
    const to = titles[other(from)]
    const reason = disabled ? undefined : values.length ? undefined : all ? t.nothingToMove(titles[from]) : t.nothingSelected
    const toAssigned = from === "available"
    return (
      <Button
        variant="secondary"
        size="sm"
        className="fa-transfer-move"
        data-direction={toAssigned ? "forward" : "back"}
        icon={toAssigned ? all ? <IconChevronsRight /> : <IconChevronRight /> : all ? <IconChevronsLeft /> : <IconChevronLeft />}
        aria-label={all ? t.moveAll(to) : t.moveSelected(to)}
        disabled={disabled}
        disabledReason={reason}
        onClick={() => move(from, values)}
      />
    )
  }

  return (
    <div className={cx("fa-transfer", className)} role="group" aria-label={ariaLabel} data-disabled={disabled ? "" : undefined}>
      {name ? assigned.map((key) => <input key={key} type="hidden" name={name} value={key} />) : null}
      <div className="fa-transfer-grid">
        {pane("available")}
        <div className="fa-transfer-actions">
          {button("available", true)}
          {button("available", false)}
          {button("assigned", false)}
          {button("assigned", true)}
        </div>
        {pane("assigned")}
      </div>
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </span>
    </div>
  )
}

interface TransferPaneProps {
  side: Side
  title: string
  /** The listed items (after the search). */
  items: TransferItem[]
  /** Every item on this side, before the search. */
  total: number
  grouped: boolean
  selected: ReadonlySet<string>
  setSelected: (update: (current: ReadonlySet<string>) => ReadonlySet<string>) => void
  query: string
  setQuery: (query: string) => void
  searchable: boolean
  disabled: boolean
  orderable: boolean
  onMove: (values: Iterable<string>) => void
  onReorder: (from: number, to: number) => void
  messages: Messages
}

const useIsomorphicLayoutEffect = typeof window === "undefined" ? () => {} : useLayoutEffect

/** One list: header (select all, title, count), search and the rows. */
function TransferPane({ side, title, items, total, grouped, selected, setSelected, query, setQuery, searchable, disabled, orderable, onMove, onReorder, messages: t }: TransferPaneProps) {
  const listId = useId()
  const hintId = useId()
  const rows = useMemo(() => transferRows(items, grouped), [items, grouped])
  // Display order of the items, for ranges and keyboard movement.
  const ordered = useMemo(() => rows.flatMap((row) => (row.kind === "item" ? [row.item] : [])), [rows])
  const enabled = ordered.filter((item) => !item.disabled)
  const selectedShown = enabled.filter((item) => selected.has(item.value)).length
  const allState = selectedShown === 0 ? false : selectedShown === enabled.length ? true : "mixed"
  const searching = query.trim() !== ""

  const [focusedKey, setFocusedKey] = useState<string | null>(null)
  const anchor = useRef<string | null>(null)
  const focusIndex = Math.max(
    0,
    ordered.findIndex((item) => item.value === focusedKey),
  )
  const focused = ordered[focusIndex]
  const shouldFocus = useRef(false)
  const lastIndex = useRef(focusIndex)
  const listRef = useRef<HTMLDivElement>(null)

  // A focused row that moved away hands focus to the row now at its place (R20.3).
  useIsomorphicLayoutEffect(() => {
    const list = listRef.current
    if (!list) return
    const gone = focusedKey !== null && !ordered.some((item) => item.value === focusedKey)
    if (gone) {
      const next = ordered[Math.min(lastIndex.current, ordered.length - 1)]
      const had = list.contains(document.activeElement) || document.activeElement === document.body
      setFocusedKey(next?.value ?? null)
      if (had && next) shouldFocus.current = true
      return
    }
    lastIndex.current = focusIndex
    if (!shouldFocus.current || !focused) return
    shouldFocus.current = false
    list.querySelector<HTMLElement>(`[data-key="${CSS.escape(focused.value)}"]`)?.focus({ preventScroll: true })
  })

  const toggle = (key: string) => {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
    anchor.current = key
  }
  const selectRange = (to: string) => {
    const range = rangeValues(ordered, anchor.current ?? to, to)
    setSelected((current) => new Set([...current, ...range]))
  }

  const onRowClick = (item: TransferItem, event: MouseEvent<HTMLElement>) => {
    setFocusedKey(item.value)
    if (disabled || item.disabled) return
    if (event.shiftKey && anchor.current) selectRange(item.value)
    else toggle(item.value)
  }

  const focusAt = (at: number, scroll: (index: number) => void) => {
    const item = ordered[at]
    if (!item) return
    shouldFocus.current = true
    setFocusedKey(item.value)
    scroll(rows.findIndex((row) => row.key === item.value))
  }

  const keyDown = (event: KeyboardEvent<HTMLDivElement>, scroll: (index: number) => void) => {
    if (!focused) return
    const step = event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0
    if (step && event.altKey) {
      if (!orderable || searching || disabled) return
      const to = focusIndex + step
      if (to < 0 || to >= ordered.length) return event.preventDefault()
      shouldFocus.current = true
      onReorder(focusIndex, to)
      scroll(to)
      return event.preventDefault()
    }
    if (step) {
      const to = Math.max(0, Math.min(ordered.length - 1, focusIndex + step))
      focusAt(to, scroll)
      if (event.shiftKey && !disabled) {
        if (!anchor.current) anchor.current = focused.value
        selectRange(ordered[to]!.value)
      }
    } else if (event.key === "Home") focusAt(0, scroll)
    else if (event.key === "End") focusAt(ordered.length - 1, scroll)
    else if (event.key === " ") {
      if (!disabled && !focused.disabled) toggle(focused.value)
    } else if (event.key === "Enter") onMove(selected.size ? selected : [focused.value])
    else if ((event.key === "a" || event.key === "A") && (event.ctrlKey || event.metaKey)) {
      if (!disabled) setSelected((current) => new Set([...current, ...enabled.map((item) => item.value)]))
    } else if (event.key === "Escape" && selected.size) {
      setSelected(() => new Set())
      event.stopPropagation()
    } else return
    event.preventDefault()
  }

  const rowProps = (item: TransferItem, at: number): RowProps => ({
    item,
    tabIndex: item.value === (focused?.value ?? null) ? 0 : -1,
    checked: selected.has(item.value),
    disabled: disabled || Boolean(item.disabled),
    reason: item.disabledReason,
    groupName: grouped ? item.group : undefined,
    position: at,
    orderable,
    messages: t,
    onClick: (event) => onRowClick(item, event),
    onDoubleClick: () => !disabled && !item.disabled && onMove([item.value]),
    onFocus: () => setFocusedKey(item.value),
  })

  const empty = ordered.length === 0 ? (searching ? t.noMatch(query.trim()) : side === "available" ? t.emptyAvailable : t.emptyAssigned) : null

  return (
    <div className="fa-transfer-pane glass-inset" role="group" aria-labelledby={`${listId}-title`} data-side={side}>
      <div className="fa-transfer-head">
        <Checkbox
          size="sm"
          checked={allState === true}
          indeterminate={allState === "mixed"}
          disabled={disabled || enabled.length === 0}
          aria-label={t.selectAll(title)}
          onCheckedChange={() =>
            // A full list clears; an empty or mixed one selects every enabled item listed.
            setSelected((current) => {
              const next = new Set(current)
              for (const item of enabled) {
                if (allState === true) next.delete(item.value)
                else next.add(item.value)
              }
              return next
            })
          }
        />
        <span id={`${listId}-title`} className="fa-transfer-title">
          {title}
        </span>
        <span className="fa-transfer-count" data-numeric>
          {t.count(selected.size, total)}
        </span>
      </div>
      {searchable ? <SearchField size="sm" aria-label={t.search(title)} placeholder={t.search(title)} value={query} onValueChange={(next) => setQuery(String(next))} onClear={() => setQuery("")} className="fa-transfer-search" /> : null}
      {orderable ? (
        <span id={hintId} hidden>
          {t.reorderHint}
        </span>
      ) : null}
      {orderable ? (
        <OrderableRows
          listRef={listRef}
          label={title}
          hintId={hintId}
          ordered={ordered}
          rowProps={rowProps}
          empty={empty}
          disabled={disabled || searching}
          onKeyDown={(event) => keyDown(event, () => {})}
          onReorder={onReorder}
        />
      ) : (
        <VirtualRows listRef={listRef} label={title} rows={rows} rowProps={rowProps} ordered={ordered} empty={empty} focusIndex={focusIndex} onKeyDown={keyDown} />
      )}
    </div>
  )
}

interface RowProps {
  item: TransferItem
  tabIndex: number
  checked: boolean
  disabled: boolean
  reason?: string
  /** The row's group, read after its label (headings are not part of the listbox). */
  groupName?: string
  position: number
  orderable: boolean
  messages: Messages
  onClick: (event: MouseEvent<HTMLElement>) => void
  onDoubleClick: () => void
  onFocus: () => void
  style?: CSSProperties
  /** The drag grip (orderable rows). */
  gripRef?: (element: HTMLElement | null) => void
  rowRef?: (element: HTMLElement | null) => void
}

/** One option row: the check box, icon, label and description, and a grip when orderable. */
function Row({ item, tabIndex, checked, disabled, reason, groupName, orderable, messages: t, onClick, onDoubleClick, onFocus, style, gripRef, rowRef }: RowProps) {
  const row = (
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events -- keys are handled once on the listbox (roving focus)
    <div
      ref={rowRef}
      role="option"
      className="fa-item fa-transfer-row"
      style={style}
      tabIndex={tabIndex}
      data-key={item.value}
      data-two-line={item.description ? "" : undefined}
      data-disabled={disabled ? "" : undefined}
      aria-selected={checked}
      aria-disabled={disabled || undefined}
      aria-description={reason}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onFocus={onFocus}
    >
      <CheckMark state={checked ? "checked" : "unchecked"} disabled={disabled} />
      {item.icon ? <span className="fa-transfer-icon">{item.icon}</span> : null}
      <span className="fa-transfer-text">
        <span className="fa-transfer-label">
          {item.label}
          {groupName ? <span className="sr-only">, {groupName}</span> : null}
        </span>
        {item.description ? <span className="fa-transfer-description">{item.description}</span> : null}
      </span>
      {orderable ? (
        <span ref={gripRef} className="fa-transfer-grip" aria-hidden title={t.reorder(item.label)}>
          <IconGrip />
        </span>
      ) : null}
    </div>
  )
  return reason ? (
    <Tooltip content={reason} side="top" describe={false}>
      {row}
    </Tooltip>
  ) : (
    row
  )
}

interface VirtualRowsProps {
  listRef: RefObject<HTMLDivElement | null>
  label: string
  rows: TransferRow[]
  ordered: TransferItem[]
  rowProps: (item: TransferItem, at: number) => RowProps
  empty: ReactNode
  focusIndex: number
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>, scroll: (index: number) => void) => void
}

/** The rows, virtualised: heights come from probe rows, so density and touch sizes apply. */
function VirtualRows({ listRef, label, rows, ordered, rowProps, empty, focusIndex, onKeyDown }: VirtualRowsProps) {
  const groupProbe = useRef<HTMLDivElement>(null)
  const oneProbe = useRef<HTMLDivElement>(null)
  const twoProbe = useRef<HTMLDivElement>(null)
  const groupHeight = useElementSize(groupProbe).height || 28
  const oneHeight = useElementSize(oneProbe).height || 36
  const twoHeight = useElementSize(twoProbe).height || 44
  const edges = useScrollEdges(listRef)
  const focusedRow = rows.findIndex((row) => row.key === ordered[focusIndex]?.value)
  const keep = useRef(focusedRow)
  keep.current = focusedRow
  // oxlint-disable-next-line react/incompatible-library -- the app does not use the React Compiler; TanStack Virtual is the sanctioned virtualiser
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => listRef.current,
    estimateSize: (at) => {
      const row = rows[at]
      return !row ? oneHeight : row.kind === "group" ? groupHeight : row.item.description ? twoHeight : oneHeight
    },
    getItemKey: (at) => rows[at]?.key ?? at,
    overscan: 8,
    // The focused row stays mounted so keyboard focus is never lost.
    rangeExtractor: (range: Range) => {
      const indexes = defaultRangeExtractor(range)
      if (keep.current >= 0 && !indexes.includes(keep.current)) indexes.push(keep.current)
      return indexes.toSorted((a, b) => a - b)
    },
  })
  useEffect(() => {
    virtualizer.measure()
  }, [virtualizer, groupHeight, oneHeight, twoHeight, rows])
  const scroll = useCallback((at: number) => at >= 0 && virtualizer.scrollToIndex(at, { align: "auto" }), [virtualizer])
  let position = -1
  const positions = rows.map((row) => (row.kind === "item" ? ++position : -1))
  return (
    <div className="fa-transfer-body">
      <div
        ref={listRef}
        className="fa-transfer-list"
        role="listbox"
        aria-label={label}
        aria-multiselectable
        tabIndex={-1}
        onKeyDown={(event) => onKeyDown(event, scroll)}
        data-scroll-container
        data-scrolled-top={edges.top ? "" : undefined}
        data-scrolled-bottom={edges.bottom ? "" : undefined}
      >
        <div role="presentation" className="fa-transfer-canvas" style={{ height: virtualizer.getTotalSize() }}>
          {virtualizer.getVirtualItems().map((virtual) => {
            const row = rows[virtual.index]
            if (!row) return null
            const style = { transform: `translateY(${virtual.start}px)` } as CSSProperties
            if (row.kind === "group")
              return (
                <div key={virtual.key} className="fa-popup-group-label fa-transfer-group" style={style} role="presentation" aria-hidden>
                  {row.label}
                </div>
              )
            return <Row key={virtual.key} {...rowProps(row.item, positions[virtual.index]!)} style={style} />
          })}
        </div>
        {empty ? <div className="fa-transfer-empty">{empty}</div> : null}
      </div>
      <div className="fa-transfer-probes" aria-hidden>
        <div ref={groupProbe}>
          <div className="fa-popup-group-label fa-transfer-group">&nbsp;</div>
        </div>
        <div ref={oneProbe}>
          <div className="fa-item fa-transfer-row" />
        </div>
        <div ref={twoProbe}>
          <div className="fa-item fa-transfer-row" data-two-line="" />
        </div>
      </div>
    </div>
  )
}

interface OrderableRowsProps {
  listRef: RefObject<HTMLDivElement | null>
  label: string
  hintId: string
  ordered: TransferItem[]
  rowProps: (item: TransferItem, at: number) => RowProps
  empty: ReactNode
  /** Dragging is off (disabled, or the list is searched). */
  disabled: boolean
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void
  onReorder: (from: number, to: number) => void
}

/** The assigned list when its order matters: every row rendered, in a sortable drop zone. */
function OrderableRows(props: OrderableRowsProps) {
  return (
    <DragDropProvider>
      <OrderableZone {...props} />
    </DragDropProvider>
  )
}

function OrderableZone({ listRef, label, hintId, ordered, rowProps, empty, disabled, onKeyDown, onReorder }: OrderableRowsProps) {
  const zoneId = useId()
  const edges = useScrollEdges(listRef)
  const zone = useDropZone(
    {
      id: zoneId,
      label,
      sort: "vertical",
      accept: zoneId,
      disabled,
      onDrop: (event: DropEvent) => {
        if (event.source.index === null || event.target.index === null) return false
        onReorder(event.source.index, event.target.index)
      },
    },
    { trackState: false },
  )
  return (
    <div className="fa-transfer-body">
      <div
        ref={(element) => {
          listRef.current = element
          zone.ref(element)
        }}
        className="fa-transfer-list"
        role="listbox"
        aria-label={label}
        aria-multiselectable
        aria-describedby={hintId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        data-flow=""
        data-scroll-container
        data-scrolled-top={edges.top ? "" : undefined}
        data-scrolled-bottom={edges.bottom ? "" : undefined}
      >
        <DropZoneScope zoneId={zoneId}>
          {ordered.map((item, at) => (
            <OrderableRow key={item.value} type={zoneId} disabled={disabled} props={rowProps(item, at)} />
          ))}
        </DropZoneScope>
        {empty ? <div className="fa-transfer-empty">{empty}</div> : null}
      </div>
    </div>
  )
}

function OrderableRow({ type, disabled, props }: { type: string; disabled: boolean; props: RowProps }): ReactElement {
  const draggable = useDraggable({ id: props.item.value, type, label: props.item.label, disabled })
  return <Row {...props} rowRef={draggable.ref} gripRef={draggable.handleRef} />
}
