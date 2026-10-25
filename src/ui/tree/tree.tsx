import { readingKey } from "../../lib/direction.js"
import { badgeMessages } from "../badge/messages.js"
import { useMessages } from "../../lib/i18n/index.js"
import { treeMessages } from "./messages.js"
import { defaultRangeExtractor, useVirtualizer, type Range } from "@tanstack/react-virtual"
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from "react"
import { IconChevronDown, IconChevronRight, IconError, IconFile, IconFolder, IconSearch } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { useControllable } from "../../lib/use-controllable.js"
import { useSelectedId, type SelectionChangeDetails } from "../../lib/use-selected-id.js"
import { useElementSize } from "../../lib/use-element-size.js"
import { useScrollEdges } from "../../lib/use-scroll-edges.js"
import { CountBadge, StatusDot, type StatusKind } from "../badge/index.js"
import { EmptyState } from "../empty-state/index.js"
import { ProgressRing } from "../progress/index.js"
import { Skeleton } from "../skeleton/index.js"
import { useLocale } from "../../lib/locale/use-locale.js"
import { flattenTree, rowKey, STATUS_SEPARATOR, typeahead, type FlatRow, type TreeLoadState } from "./flatten.js"

export interface TreeNode {
  id: string
  label: string
  /** A second line of data: the signed-in user, a model. Makes the row two lines tall. */
  description?: string
  /**
   * Text the search also matches that the row does not show (an IP address). A keyword
   * match takes the row's second line, highlighted, so the reason it matched is visible.
   */
  keywords?: readonly string[]
  /** Leading icon. Defaults: a folder for groups, a file for leaves. Supply a domain icon per node. */
  icon?: ReactNode
  /** A status dot on the icon's corner. */
  status?: StatusKind
  children?: TreeNode[]
  /**
   * The node may have children that are not loaded: with `children` undefined it shows a
   * chevron, and the Tree calls `onLoadChildren` on first expand. A branch whose load ends
   * with no children keeps its folder and loses its chevron. False makes the node a leaf.
   */
  hasChildren?: boolean
  /** More children exist than `children` holds: a "Load more" row after them calls `onLoadMore`. */
  hasMore?: boolean
  /**
   * Whether a click, Enter or Space selects the row. Leaves default to true; a branch to the
   * Tree's `selectableGroups`. A selectable branch opens and closes with its chevron, → and ←,
   * or a double-click.
   */
  selectable?: boolean
  disabled?: boolean
}

/**
 * The attributes a linked row must carry. `renderLink` spreads them onto the router's link
 * element (`<a role="treeitem">`, the navigation-tree pattern), so the tree never imports a
 * router.
 */
export interface TreeRowRenderProps {
  role: "treeitem"
  className: string
  style: CSSProperties
  tabIndex: number
  "data-row-id": string
  "data-kind": "group" | "leaf"
  "data-two-line"?: ""
  "data-selected"?: ""
  "data-disabled"?: ""
  "aria-level": number
  "aria-setsize": number
  "aria-posinset": number
  "aria-selected"?: boolean
  "aria-disabled"?: boolean
  /** Set on a row that opens and closes. */
  "aria-expanded"?: boolean
  /** Set while the row's children load. */
  "aria-busy"?: boolean
  /** Called with the click event; the tree selects a selectable row or toggles a group (and a selectable branch from its chevron), and prevents navigation for a disabled row or a chevron click. */
  onClick: (event: MouseEvent<HTMLElement>) => void
  /** Called with the double-click event; a selectable branch opens or closes. */
  onDoubleClick: (event: MouseEvent<HTMLElement>) => void
  /** Called with no arguments when the row takes focus; it becomes the tree's tab stop. */
  onFocus: () => void
  children: ReactNode
}

/** A row's label and description, with the search match highlighted, for `renderContent`. */
export interface TreeRowContent {
  label: ReactNode
  description: ReactNode | null
  /** The search matched this row's label or description (draw the highlighted nodes). */
  matched: boolean
  level: number
  group: boolean
}

export interface TreeProps {
  /** Graph or tree nodes with stable identifiers and relationships. */
  nodes: TreeNode[]
  /** Names the tree: "Endpoints". */
  "aria-label": string
  /** The selected row's id, or null for none. Controlled while defined; leave it undefined to use `defaultSelectedId`. */
  selectedId?: string | null
  /** The row selected at first when the selection is uncontrolled. */
  defaultSelectedId?: string | null
  /**
   * Called with the id of the row the person selects by click, Enter or Space, and details
   * whose `item` is the node: an endpoint (leaf), or a branch when branches are selectable.
   * Not for a group that toggles, a disabled row or the row already selected. A linked row
   * also navigates.
   */
  onSelectedIdChange?: (id: string | null, details: SelectionChangeDetails<TreeNode>) => void
  /**
   * Branches can be selected as well as opened (an explorer: a folder, a registry key). A
   * click, Enter or Space selects the row and fires `onSelectedIdChange`; the chevron, → and
   * ←, or a double-click, open and close it. Per node with `TreeNode.selectable`.
   */
  selectableGroups?: boolean
  /**
   * Load a branch's children the first time it opens (a node with `hasChildren` and no
   * `children`): update `nodes` with them, then resolve. A loading row shows meanwhile; a
   * rejection shows an error row whose Retry calls this again. Without it, the loading row
   * shows until `nodes` gives the branch its children.
   */
  onLoadChildren?: (node: TreeNode) => Promise<void> | void
  /** Load the next page of a branch's children (a node with `hasMore`): append them to `nodes`, then resolve. A rejection offers Retry. */
  onLoadMore?: (node: TreeNode) => Promise<void> | void
  /**
   * Show each group's count of endpoints (leaves). Default true. Turn it off where a count
   * would mislead, such as an explorer whose branches are still loading. Lazily loaded and
   * paged branches never show one.
   */
  groupCounts?: boolean
  /**
   * Render selectable rows as links (a TanStack Router `<Link>` in the app). Return null to
   * keep a row a plain item. A linked row navigates natively (click, middle-click, Enter);
   * a click or Enter also selects it.
   */
  renderLink?: (node: TreeNode, props: TreeRowRenderProps) => ReactElement | null
  /**
   * Wrap each row element, e.g. in ActionContextMenu so right-click, long-press, Shift+F10
   * and the Menu key open the row's actions (R11.6). Must render the row it is given.
   */
  rowWrapper?: (node: TreeNode, row: ReactElement) => ReactElement
  /**
   * Draw a row's content (after the chevron) yourself, e.g. an entity identity's row tier,
   * so a tree row is the same object as the entity's table cell and header. The row keeps
   * its own states (fa-item: hover, focus, selected) and height. Return null for the
   * default icon, label and description.
   */
  renderContent?: (node: TreeNode, content: TreeRowContent) => ReactNode | null
  /** Open groups. Uncontrolled with `defaultExpanded`. */
  expanded?: string[]
  /** Initially expanded nodes when expansion is uncontrolled. */
  defaultExpanded?: string[]
  /** Called with the full list of open group ids whenever a group opens or closes (click, Enter, Space or the arrow keys); groups do not toggle while searching. Pair with `expanded` to control it. */
  onExpandedChange?: (expanded: string[]) => void
  /** Filter text from the search field above the tree. Matching branches open and the
   *  match is highlighted. */
  query?: string
  /** The line shown when nothing matches. Default: No match for “query”. */
  emptyText?: (query: string) => ReactNode
  className?: string
}

const TYPEAHEAD_RESET_MS = 500
const EMPTY_LOAD: TreeLoadState = { loading: new Set(), failed: new Set(), loaded: new Set(), moreLoading: new Set(), moreFailed: new Set() }
const added = (set: ReadonlySet<string>, id: string) => (set.has(id) ? set : new Set([...set, id]))
const removed = (set: ReadonlySet<string>, id: string) => {
  if (!set.has(id)) return set
  const next = new Set(set)
  next.delete(id)
  return next
}
const useIsomorphicLayoutEffect = typeof window === "undefined" ? () => {} : useLayoutEffect

/** Render `text` with the [start, end) range wrapped in a highlight. */
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

/**
 * The navigation tree (a sidebar's records grouped by owner). Groups collapse; leaf rows
 * are fa-item rows, two lines with a description, with an optional status dot on the icon. Keyboard: ↑ ↓ move,
 * → opens or enters a group, ← closes or returns to the parent, Home / End, Enter selects
 * (toggles a group), and typing jumps to the next matching name. One row is tabbable (roving
 * tabindex). Rows are virtualised, so thousands of rows cost only the rows on screen.
 *
 * With `selectableGroups` a branch is selected like a leaf and opens from its chevron. Large
 * trees load lazily: `hasChildren` marks a branch whose children `onLoadChildren` fetches on
 * first open, and `hasMore` with `onLoadMore` pages them in.
 */
export function Tree({
  nodes,
  selectedId: selectedIdProp,
  defaultSelectedId,
  onSelectedIdChange,
  renderLink,
  rowWrapper,
  renderContent,
  expanded: expandedProp,
  defaultExpanded,
  onExpandedChange,
  query = "",
  emptyText: emptyTextProp,
  selectableGroups = false,
  onLoadChildren,
  onLoadMore,
  groupCounts = true,
  className,
  "aria-label": label,
}: TreeProps) {
  const messages = useMessages(treeMessages)
  const emptyText = emptyTextProp ?? ((q: string) => messages.noMatchFor(q))

  const [expandedList, setExpandedList] = useControllable<string[]>(expandedProp ?? undefined, defaultExpanded ?? [], onExpandedChange)
  const [selectedId, select] = useSelectedId(selectedIdProp, defaultSelectedId, onSelectedIdChange)
  const expanded = useMemo(() => new Set(expandedList), [expandedList])
  const locale = useLocale()
  const [load, setLoad] = useState<TreeLoadState>(EMPTY_LOAD)
  const rows = useMemo(() => flattenTree(nodes, expanded, query, locale, load), [nodes, expanded, query, locale, load])
  const searching = query.trim() !== ""
  const selectable = useCallback(
    (row: FlatRow<TreeNode>) => !row.status && (row.node.selectable ?? (row.branch ? selectableGroups : true)),
    [selectableGroups]
  )

  // ── Lazy children ────────────────────────────────────────────────────────
  const inflight = useRef(new Set<string>())
  const settle = useCallback((key: string, task: () => Promise<void> | void, start: (state: TreeLoadState) => TreeLoadState, done: (state: TreeLoadState, ok: boolean) => TreeLoadState) => {
    if (inflight.current.has(key)) return
    inflight.current.add(key)
    setLoad(start)
    let pending: Promise<void> | void
    try {
      pending = task()
    } catch (error) {
      pending = Promise.reject(error)
    }
    Promise.resolve(pending)
      .then(
        () => true,
        () => false
      )
      .then((ok) => {
        inflight.current.delete(key)
        setLoad((state) => done(state, ok))
      })
  }, [])
  const loadChildren = useCallback(
    (node: TreeNode) => {
      if (!onLoadChildren) return
      settle(
        `children:${node.id}`,
        () => onLoadChildren(node),
        (state) => ({ ...state, loading: added(state.loading, node.id), failed: removed(state.failed, node.id) }),
        (state, ok) => ({ ...state, loading: removed(state.loading, node.id), ...(ok ? { loaded: added(state.loaded, node.id) } : { failed: added(state.failed, node.id) }) })
      )
    },
    [onLoadChildren, settle]
  )
  const loadMore = useCallback(
    (node: TreeNode) => {
      if (!onLoadMore) return
      settle(
        `more:${node.id}`,
        () => onLoadMore(node),
        (state) => ({ ...state, moreLoading: added(state.moreLoading, node.id), moreFailed: removed(state.moreFailed, node.id) }),
        (state, ok) => ({ ...state, moreLoading: removed(state.moreLoading, node.id), moreFailed: ok ? state.moreFailed : added(state.moreFailed, node.id) })
      )
    },
    [onLoadMore, settle]
  )
  // An open branch without its children (opened now, or open from the start) loads them.
  useEffect(() => {
    for (const row of rows) if (row.status === "loading" && !load.loading.has(row.node.id)) loadChildren(row.node)
  }, [rows, load.loading, loadChildren])

  const setExpanded = useCallback((next: Set<string>) => setExpandedList([...next]), [setExpandedList])
  const toggle = useCallback(
    (row: FlatRow<TreeNode>, open = !row.expanded) => {
      if (!row.hasChildren || row.status || searching) return
      const next = new Set(expanded)
      if (open) next.add(row.node.id)
      else next.delete(row.node.id)
      setExpanded(next)
    },
    [expanded, searching, setExpanded]
  )

  // ── Focus (roving tabindex) ──────────────────────────────────────────────
  // Keyed by rowKey: a status row's key is its parent's id and its kind.
  const [focusedId, setFocusedId] = useState<string | null>(selectedId)
  const indexById = useMemo(() => new Map(rows.map((row, index) => [rowKey(row), index])), [rows])
  // A status row that went away (its children loaded, the last page arrived) hands the tab stop to its parent.
  const statusParent = focusedId?.split(STATUS_SEPARATOR)[0]
  const focusedIndex =
    focusedId !== null && indexById.has(focusedId)
      ? indexById.get(focusedId)!
      : statusParent !== undefined && statusParent !== focusedId && indexById.has(statusParent)
        ? indexById.get(statusParent)!
        : rows.length
          ? 0
          : -1
  const shouldFocus = useRef(false)
  const focusWithin = useRef(false)

  // ── Row geometry from tokens (probes), then virtualisation ───────────────
  const scrollRef = useRef<HTMLDivElement>(null)
  // Published on the scroller: it contains the wheel only while its rows overflow.
  const edges = useScrollEdges(scrollRef)
  const groupProbe = useRef<HTMLDivElement>(null)
  const leafProbe = useRef<HTMLDivElement>(null)
  const twoLineProbe = useRef<HTMLDivElement>(null)
  const groupHeight = useElementSize(groupProbe).height || 36
  const leafHeight = useElementSize(leafProbe).height || 36
  const twoLineHeight = useElementSize(twoLineProbe).height || 44
  const sizeOf = useCallback(
    (row: FlatRow<TreeNode> | undefined) => (!row || row.status ? leafHeight : row.branch ? groupHeight : row.node.description || row.keywordMatch ? twoLineHeight : leafHeight),
    [groupHeight, leafHeight, twoLineHeight]
  )

  const focusedRef = useRef(focusedIndex)
  focusedRef.current = focusedIndex
  // Changing getItemKey invalidates all measurements, even when only the scroll range moves.
  const keyAt = useCallback((index: number) => (rows[index] ? rowKey(rows[index]) : index), [rows])
  // oxlint-disable-next-line react/incompatible-library -- the app does not use the React Compiler; TanStack Virtual is the sanctioned virtualiser
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => sizeOf(rows[index]),
    getItemKey: keyAt,
    overscan: 6,
    // The focused row always stays mounted so keyboard focus is never lost.
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

  // A new search starts at the first result.
  useEffect(() => {
    if (query.trim() && scrollRef.current) scrollRef.current.scrollTop = 0
  }, [query])

  // Move DOM focus after keyboard navigation, as soon as the row is committed; and when the
  // focused status row is replaced (by children, or when the last page arrived), to its stand-in.
  useIsomorphicLayoutEffect(() => {
    const lost = focusWithin.current && focusedId !== null && !indexById.has(focusedId) && !scrollRef.current?.contains(document.activeElement)
    if ((!shouldFocus.current && !lost) || focusedIndex < 0) return
    shouldFocus.current = false
    const row = rows[focusedIndex]
    if (row && focusedId !== rowKey(row)) setFocusedId(rowKey(row))
    scrollRef.current?.querySelector<HTMLElement>(`[data-row-id="${CSS.escape(row ? rowKey(row) : "")}"]`)?.focus({ preventScroll: true })
  })

  const moveTo = (index: number) => {
    const row = rows[index]
    if (!row) return
    shouldFocus.current = true
    setFocusedId(rowKey(row))
    virtualizer.scrollToIndex(index, { align: "auto" })
  }

  /** A status row: Retry, or load the next page. */
  const runStatus = (row: FlatRow<TreeNode>) => {
    if (row.status === "error") loadChildren(row.node)
    else if (row.status === "more" || row.status === "more-error") loadMore(row.node)
  }

  const activate = (row: FlatRow<TreeNode>, event: Event) => {
    if (row.status) return runStatus(row)
    if (row.node.disabled) return
    if (selectable(row)) select(row.node.id, { reason: "item-press", event, item: row.node })
    else if (row.hasChildren) toggle(row)
  }

  /** Enter or Space on a row: a linked row follows its link (its click selects the row). */
  const activateFromKeyboard = (row: FlatRow<TreeNode>, event: Event) => {
    const element = scrollRef.current?.querySelector<HTMLElement>(`[data-row-id="${CSS.escape(rowKey(row))}"]`)
    if (selectable(row) && element instanceof HTMLAnchorElement && !row.node.disabled) element.click()
    else activate(row, event)
  }

  // ── Keyboard ─────────────────────────────────────────────────────────────
  const buffer = useRef({ text: "", timer: 0 as ReturnType<typeof setTimeout> | 0 })
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const row = rows[focusedIndex]
    if (!row) return
    switch (readingKey(event.key, event.currentTarget)) {
      case "ArrowDown":
        moveTo(Math.min(rows.length - 1, focusedIndex + 1))
        break
      case "ArrowUp":
        moveTo(Math.max(0, focusedIndex - 1))
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
        activateFromKeyboard(row, event.nativeEvent)
        break
      case " ":
        if (row.status || selectable(row) || !row.hasChildren) activateFromKeyboard(row, event.nativeEvent)
        else toggle(row)
        break
      default: {
        if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) return
        clearTimeout(buffer.current.timer)
        buffer.current.text += event.key
        buffer.current.timer = setTimeout(() => (buffer.current.text = ""), TYPEAHEAD_RESET_MS)
        const next = typeahead(rows, buffer.current.text.length > 1 ? focusedIndex - 1 : focusedIndex, buffer.current.text, locale)
        if (next >= 0) moveTo(next)
      }
    }
    event.preventDefault()
  }

  if (rows.length === 0 && searching) {
    return (
      <div className={cx("fa-tree", className)} data-empty="">
        <EmptyState icon={<IconSearch />}>{emptyText(query.trim())}</EmptyState>
      </div>
    )
  }

  const items = virtualizer.getVirtualItems()
  return (
    <div className={cx("fa-tree", className)}>
      <div
        ref={scrollRef}
        className="fa-tree-scroll"
        role="tree"
        aria-label={label}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        onFocus={() => (focusWithin.current = true)}
        onBlur={(event) => {
          // A row removed while focused blurs with no target: the tree keeps focus to hand on.
          if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) focusWithin.current = false
        }} data-scroll-container data-scrolled-top={edges.top ? "" : undefined} data-scrolled-bottom={edges.bottom ? "" : undefined}>
        <div role="presentation" className="fa-tree-canvas" style={{ height: virtualizer.getTotalSize() }}>
          {items.map((item) => {
            const row = rows[item.index]
            if (!row) return null
            const key = rowKey(row)
            const onFocus = () => setFocusedId(key)
            if (row.status) return <TreeStatusRow key={item.key} row={row} start={item.start} focused={item.index === focusedIndex} onClick={() => (setFocusedId(key), runStatus(row))} onFocus={onFocus} />
            const canSelect = selectable(row)
            return (
              <TreeRow
                key={item.key}
                row={row}
                start={item.start}
                selectable={canSelect}
                selected={canSelect && row.node.id === selectedId}
                focused={item.index === focusedIndex}
                busy={load.loading.has(row.node.id)}
                counted={groupCounts}
                renderLink={renderLink}
                rowWrapper={rowWrapper}
                renderContent={renderContent}
                onClick={(event) => {
                  setFocusedId(key)
                  // A disabled link, or a link's chevron, must not navigate.
                  const chevron = event.target instanceof Element && event.target.closest(".fa-tree-chevron") !== null
                  if (row.node.disabled || (chevron && canSelect && row.hasChildren)) event.preventDefault()
                  if (chevron && canSelect && row.hasChildren) toggle(row)
                  else activate(row, event.nativeEvent)
                }}
                onDoubleClick={(event) => {
                  if (!canSelect || !row.hasChildren || row.node.disabled) return
                  if (event.target instanceof Element && event.target.closest(".fa-tree-chevron")) return
                  toggle(row)
                }}
                onFocus={onFocus}
              />
            )
          })}
        </div>
      </div>
      {/* Probes: one row of each kind, measured so virtual sizes follow tokens and density. */}
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

interface TreeRowProps {
  row: FlatRow<TreeNode>
  start: number
  /** A click, Enter or Space selects the row. */
  selectable: boolean
  /** The selected state or collection. */
  selected: boolean
  focused: boolean
  /** The row's children are loading. */
  busy: boolean
  /** Groups show their count. */
  counted: boolean
  /** Renders a link with the host router. */
  renderLink?: TreeProps["renderLink"]
  rowWrapper?: TreeProps["rowWrapper"]
  renderContent?: TreeProps["renderContent"]
  /** Called with the row's click event: select the row, or toggle a group. */
  onClick: (event: MouseEvent<HTMLElement>) => void
  /** Called with the row's double-click event: a selectable branch toggles. */
  onDoubleClick: (event: MouseEvent<HTMLElement>) => void
  /** Called with no arguments when the row takes focus, to make it the tab stop. */
  onFocus: () => void
}

/**
 * One row. A click on a group (chevron included) toggles it; on a selectable row (an
 * endpoint, or a branch when branches are selectable) it selects, and a selectable branch's
 * chevron toggles.
 */
function TreeRow({ row, start, selectable, selected, focused, busy, counted, renderLink, rowWrapper, renderContent, onClick, onDoubleClick, onFocus }: TreeRowProps) {
  const statusMessages = useMessages(badgeMessages)
  const { node } = row
  const style = { "--_level": row.level, transform: `translateY(${start}px)` } as CSSProperties
  const twoLine = !row.branch && Boolean(node.description || row.keywordMatch)
  // A keyword match shows the keyword in place of the description.
  const description = row.keywordMatch ? (
    <Highlight text={row.keywordMatch.text} range={row.keywordMatch.range} />
  ) : (
    <Highlight text={node.description ?? ""} range={row.descriptionMatch} />
  )
  const custom = renderContent?.(node, {
    label: <Highlight text={node.label} range={row.labelMatch} />,
    description: twoLine ? description : null,
    matched: Boolean(row.labelMatch || row.descriptionMatch || row.keywordMatch),
    level: row.level,
    group: row.branch,
  })
  // A lazily loaded or paged branch shows no count: it would count only what has loaded.
  const count = counted && row.hasChildren && node.hasChildren === undefined && !node.hasMore ? <CountBadge value={row.leaves} className="fa-tree-count" /> : null
  const chevron = row.hasChildren ? (
    <span className="fa-tree-chevron" aria-hidden>
      <IconChevronRight />
    </span>
  ) : (
    <span className="fa-tree-chevron" aria-hidden />
  )
  const children = custom ? (
    <>
      {chevron}
      {custom}
      {count}
    </>
  ) : (
    <>
      {chevron}
      <span className="fa-tree-icon">
        {node.icon ?? (row.branch ? <IconFolder /> : <IconFile />)}
        {node.status ? <StatusDot status={node.status} label={statusMessages[node.status]} overlay /> : null}
      </span>
      <span className="fa-tree-text">
        <span className="fa-tree-label" title={node.label}>
          <Highlight text={node.label} range={row.labelMatch} />
        </span>
        {twoLine ? (
          <span className="fa-tree-description" title={row.keywordMatch?.text ?? node.description}>
            {description}
          </span>
        ) : null}
      </span>
      {count}
    </>
  )
  const props: TreeRowRenderProps = {
    role: "treeitem",
    className: "fa-item fa-tree-row",
    style,
    tabIndex: focused ? 0 : -1,
    "data-row-id": node.id,
    "data-kind": row.branch ? "group" : "leaf",
    "data-two-line": twoLine ? "" : undefined,
    "data-selected": selected ? "" : undefined,
    "data-disabled": node.disabled ? "" : undefined,
    "aria-level": row.level,
    "aria-setsize": row.setsize,
    "aria-posinset": row.posinset,
    "aria-selected": selectable ? selected : undefined,
    "aria-disabled": node.disabled || undefined,
    "aria-expanded": row.hasChildren ? row.expanded : undefined,
    "aria-busy": busy || undefined,
    onClick,
    onDoubleClick,
    onFocus,
    children,
  }
  const linked = selectable && renderLink ? renderLink(node, props) : null
  // oxlint-disable-next-line jsx-a11y/click-events-have-key-events -- keys are handled once on the tree (roving focus)
  const element = linked ?? <div {...props} />
  return rowWrapper ? rowWrapper(node, element) : element
}

/**
 * A row that stands for a branch's loading state: loading its children, an error with Retry,
 * or "Load more" (and its loading and error forms). It moves focus like any row; a click,
 * Enter or Space retries or loads the next page.
 */
function TreeStatusRow({ row, start, focused, onClick, onFocus }: { row: FlatRow<TreeNode>; start: number; focused: boolean; onClick: () => void; onFocus: () => void }) {
  const messages = useMessages(treeMessages)

  const status = row.status!
  const loading = status === "loading" || status === "more-loading"
  const failed = status === "error" || status === "more-error"
  const text = loading ? messages.loading : failed ? (status === "error" ? messages.couldnTLoad : messages.couldnTLoadMore) : messages.loadMore
  return (
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events -- keys are handled once on the tree (roving focus)
    <div
      role="treeitem"
      className="fa-item fa-tree-row"
      style={{ "--_level": row.level, transform: `translateY(${start}px)` } as CSSProperties}
      tabIndex={focused ? 0 : -1}
      data-row-id={rowKey(row)}
      data-kind="leaf"
      data-status={status}
      aria-level={row.level}
      aria-setsize={row.setsize}
      aria-posinset={row.posinset}
      aria-disabled={loading || undefined}
      aria-label={failed ? messages.retry(text) : undefined}
      onClick={loading ? undefined : onClick}
      onFocus={onFocus}
    >
      <span className="fa-tree-chevron" aria-hidden />
      <span className="fa-tree-icon" aria-hidden>
        {loading ? <ProgressRing value={null} size="sm" aria-label={messages.loading2} /> : failed ? <IconError /> : <IconChevronDown />}
      </span>
      <span className="fa-tree-text">
        <span className="fa-tree-label">{text}</span>
      </span>
      {failed ? <span className="fa-tree-retry">{messages.retry2}</span> : null}
    </div>
  )
}

export type TreeSkeletonRow = "group" | "leaf" | "two-line"

export interface TreeSkeletonProps {
  /** The kinds of rows to stand in for, in order. */
  rows?: TreeSkeletonRow[]
  className?: string
}

const DEFAULT_SKELETON: TreeSkeletonRow[] = ["group", "two-line", "two-line", "two-line", "group", "two-line", "two-line"]

/** Placeholder rows with exactly the tree's row heights, icon boxes and text roles. */
export function TreeSkeleton({ rows = DEFAULT_SKELETON, className }: TreeSkeletonProps) {
  return (
    <div className={cx("fa-tree", className)} aria-hidden data-skeleton="">
      <div className="fa-tree-scroll">
        <div className="fa-tree-canvas" data-flow="">
          {rows.map((kind, index) => (
            <div
              key={index}
              className="fa-item fa-tree-row"
              data-kind={kind === "group" ? "group" : "leaf"}
              data-two-line={kind === "two-line" ? "" : undefined}
              style={{ "--_level": kind === "group" ? 1 : 2 } as CSSProperties}
            >
              <span className="fa-tree-chevron" />
              <Skeleton.Block className="fa-tree-icon" radius="item" />
              <span className="fa-tree-text">
                <Skeleton.Text type="body" width={kind === "group" ? "70%" : "55%"} className="fa-tree-label" />
                {kind === "two-line" ? <Skeleton.Text type="caption" width="75%" className="fa-tree-description" /> : null}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
