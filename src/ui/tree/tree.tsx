import { readingKey } from "../../lib/direction.js"
import { badgeMessages } from "../badge/messages.js"
import { useMessages } from "../../lib/i18n/index.js"
import { treeMessages } from "./messages.js"
import { defaultRangeExtractor, useVirtualizer, type Range } from "@tanstack/react-virtual"
import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react"
import { IconCheck, IconChevronDown, IconChevronRight, IconError, IconFile, IconFolder, IconSearch } from "../../icons/generated/icons.js"
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
import { numberFormat } from "../../lib/locale/intl.js"
import { Menu } from "../menu/index.js"
import { flattenTree, rowKey, STATUS_SEPARATOR, treePath, typeahead, type FlatRow, type TreeLoadState, type TreeMove } from "./flatten.js"
import type { TreeDragRow, TreeDropPlan } from "./tree-drag.js"

const TreeDrag = /* @__PURE__ */ lazy(() => import("./tree-drag.js"))

/** The default `dragType` of rows, for a DropZone outside the tree. */
export const TREE_DRAG_TYPE = "glass-ux/tree-node"

/** `DragItem.data` of dragged rows. `DragItem.id` is the row under the pointer. */
export interface TreeDragData {
  /** Everything that moves: the selection when the row is in it, otherwise the row. */
  ids: string[]
}

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
  /** False keeps this row from being renamed. Default true with the Tree's `onRename`. */
  renamable?: boolean
  /** False keeps this row where it is. Default true with the Tree's `onMove`. */
  movable?: boolean
}

/** One row's selection model. */
export type TreeSelectionMode = "single" | "multiple"

/** The second argument of `onSelectedIdsChange`. */
export interface TreeSelectionDetails {
  /** A click, Enter or Space on a row, or a key that selects a range. */
  reason: "item-press" | "keyboard"
  /** The DOM event behind the change. */
  event: Event | undefined
  /**
   * Branches in what was just selected whose children are not all loaded. Selection names
   * rows, never descendants: a selected branch stands for itself, and the host decides
   * whether it means everything under it, here and on the server.
   */
  unloaded: string[]
  /** `selectionLimit` cut a range or Select All short. */
  limited: boolean
}

/** The second argument of `onRename`. */
export interface TreeRenameDetails {
  /** The node as it was. */
  node: TreeNode
}

/** A direction for `TreeHandle.move`, which also works from a Move menu. */
export type TreeMoveDirection = "up" | "down" | "in" | "out"

/** Options for `TreeHandle.reveal`. */
export interface TreeRevealOptions {
  /**
   * The ids from the top level down to the row's parent, for a row that is not loaded yet:
   * each opens in turn and loads its children, paging through a branch's `hasMore` until the
   * row appears. Without it, the loaded part of the tree is searched.
   */
  path?: readonly string[]
  /** Give the row focus. Default false. */
  focus?: boolean
  /** Select the row. Default false. */
  select?: boolean
  /** Where the row lands in the scroller. Default "center". */
  align?: "auto" | "start" | "center" | "end"
}

/** The handle `Tree` gives through `ref`. */
export interface TreeHandle {
  /**
   * Bring a row into view, opening and loading what it takes. Resolves true once the row is
   * there, and false when it is not found, its branch failed to load, a search hides it, or
   * another reveal replaced this one.
   */
  reveal: (id: string, options?: TreeRevealOptions) => Promise<boolean>
  /** Start renaming a row (from a menu, say). Reveals it first. */
  rename: (id: string) => Promise<void>
  /** Move a row one step, as the keyboard does. Resolves to whether it moved. */
  move: (id: string, direction: TreeMoveDirection, input?: TreeMove["input"]) => boolean
  /** Whether that move is possible now. */
  canMove: (id: string, direction: TreeMoveDirection) => boolean
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
  /**
   * `multiple` selects several rows (R11.8): a click replaces, ⌘/Ctrl-click toggles,
   * Shift-click takes a range. Keyboard: Space toggles, Shift with the arrows, Home or End
   * extends, ⌘/Ctrl+A selects all loaded rows. The selection is a list of ids, so it costs
   * nothing to hold and may name rows that are not loaded or are scrolled out of view.
   * `selectedId` keeps reporting the row last pressed without a modifier.
   */
  selectionMode?: TreeSelectionMode
  /** The selected rows in `multiple` mode. Controlled while defined. */
  selectedIds?: readonly string[]
  /** The rows selected at first when uncontrolled. */
  defaultSelectedIds?: readonly string[]
  /** Called with the whole selection after each change in `multiple` mode. */
  onSelectedIdsChange?: (ids: string[], details: TreeSelectionDetails) => void
  /** The most rows a range or Select All takes; the rest stay out and `details.limited` is true. Default none. */
  selectionLimit?: number
  /** Show a check mark on each selectable row in `multiple` mode, which toggles it: the route on touch. */
  checkboxes?: boolean
  /**
   * Content at the row's end: a badge, a size, a sync state. It may be anything, but the rows
   * are one tab stop (R11.5), so give a button `tabIndex={-1}` and repeat its action in
   * `rowWrapper`'s context menu. Clicking a control here does not select the row.
   */
  renderTrailing?: (node: TreeNode, content: TreeRowContent) => ReactNode
  /** `hover` shows trailing content on hover, focus and selection, and always on touch (R11.7). Default `always`. */
  trailingVisibility?: "always" | "hover"
  /**
   * Makes rows renamable in place: F2, or `TreeHandle.rename` from a menu. Enter or leaving
   * the field commits, Escape cancels. Update `nodes` to apply it. Return false, or a message
   * saying why, to stay in the field; a promise holds the field until it settles, and a
   * rejection says "Couldn't rename".
   */
  onRename?: (id: string, label: string, details: TreeRenameDetails) => void | boolean | string | Promise<void | boolean | string>
  /** The row being renamed, or null. Controlled while defined. */
  renamingId?: string | null
  /** The row being renamed at first. */
  defaultRenamingId?: string | null
  /** Called when renaming starts or ends. */
  onRenamingIdChange?: (id: string | null) => void
  /**
   * Makes rows movable: by drag on a pointer that hovers, Alt with the arrow keys (↑ ↓ among
   * siblings, reading direction into and out of a branch), and `TreeMoveItems` in a menu, the
   * single-pointer route (WCAG 2.5.7). A selected row moves with the selection. The host owns
   * the data: apply the move to `nodes`, with `moveTreeNodes` or on the server. Unavailable
   * while searching, when the rows shown are not the real order (R16.10).
   */
  onMove?: (move: TreeMove) => void
  /** Refuse a move: return false, or a sentence saying why. A row never moves into itself. */
  canMove?: (move: TreeMove) => boolean | string
  /** What dragged rows carry, for a DropZone outside the tree. Default `TREE_DRAG_TYPE`. */
  dragType?: string
  /** The tree's handle: {@link TreeHandle}. */
  ref?: Ref<TreeHandle>
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
const NO_IDS: readonly string[] = []
/** How long a dragged row waits over a closed branch before it opens. */
const SPRING_OPEN_MS = 700
/** Pages a reveal loads while looking for a row in a branch with `hasMore`. */
const REVEAL_PAGES = 50
const CONTROL = "button, a[href], input, select, textarea, [role='button']"
const notLoaded = (row: FlatRow<TreeNode>) => row.node.hasMore === true || (row.node.hasChildren === true && row.node.children === undefined)

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
 *
 * Opt in to multi-select with `selectionMode`, to reordering with `onMove`, to renaming with
 * `onRename` and to trailing content with `renderTrailing`; `ref` gives `reveal`. All of them
 * work on ids and the rows on screen, never by walking every node.
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
  selectionMode = "single",
  selectedIds: selectedIdsProp,
  defaultSelectedIds,
  onSelectedIdsChange,
  selectionLimit,
  checkboxes = false,
  renderTrailing,
  trailingVisibility = "always",
  onRename,
  renamingId: renamingIdProp,
  defaultRenamingId,
  onRenamingIdChange,
  onMove,
  canMove,
  dragType = TREE_DRAG_TYPE,
  ref,
}: TreeProps) {
  const messages = useMessages(treeMessages)
  const hintId = `${useId()}-hint`
  const [liveHost, setLiveHost] = useState<HTMLElement | null>(null)
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
  const [focusedId, setFocusedId] = useState<string | null>(selectedId ?? defaultSelectedIds?.[0] ?? null)
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
  // Rows a gesture needs on screen: the one being dragged and the one being renamed.
  const keepIds = useRef(new Set<string>())

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
  const keptIndex = useRef(indexById)
  keptIndex.current = indexById
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
      for (const id of keepIds.current) {
        const index = keptIndex.current.get(id)
        if (index !== undefined && !indexes.includes(index)) indexes.push(index)
      }
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

  // ── Multiple selection: a list of ids, never a walk of the tree ──────────
  const multiple = selectionMode === "multiple"
  const [idList, setIdList] = useControllable<readonly string[]>(selectedIdsProp, defaultSelectedIds ?? NO_IDS)
  const idSet = useMemo(() => new Set(idList), [idList])
  const anchor = useRef<string | null>(defaultSelectedIds?.at(-1) ?? null)
  const setSelection = (ids: string[], event: Event | undefined, reason: TreeSelectionDetails["reason"], picked: readonly FlatRow<TreeNode>[], limited = false) => {
    setIdList(ids)
    onSelectedIdsChange?.(ids, { reason, event, unloaded: picked.filter(notLoaded).map((row) => row.node.id), limited })
  }
  const announcer = useRef<HTMLSpanElement>(null)
  const announce = (text: string) => {
    if (announcer.current) announcer.current.textContent = text
  }
  const locale_ = numberFormat(locale)
  const selectRange = (to: number, event: Event, reason: TreeSelectionDetails["reason"]) => {
    const from = anchor.current !== null ? (indexById.get(anchor.current) ?? to) : to
    const span = rows.slice(Math.min(from, to), Math.max(from, to) + 1).filter((row) => selectable(row) && !row.node.disabled)
    const picked = selectionLimit !== undefined ? span.slice(0, selectionLimit) : span
    const limited = picked.length < span.length
    if (limited) announce(messages.selectionLimited(locale_.format(picked.length)))
    setSelection(
      picked.map((row) => row.node.id),
      event,
      reason,
      picked,
      limited
    )
  }
  const toggleSelected = (row: FlatRow<TreeNode>, event: Event, reason: TreeSelectionDetails["reason"]) => {
    const id = row.node.id
    anchor.current = id
    setSelection(idSet.has(id) ? idList.filter((other) => other !== id) : [...idList, id], event, reason, [row])
  }
  const selectOnly = (row: FlatRow<TreeNode>, event: Event, reason: TreeSelectionDetails["reason"]) => {
    anchor.current = row.node.id
    if (idList.length !== 1 || idList[0] !== row.node.id) setSelection([row.node.id], event, reason, [row])
  }

  const activate = (row: FlatRow<TreeNode>, event: Event) => {
    if (row.status) return runStatus(row)
    if (row.node.disabled) return
    if (selectable(row)) {
      if (multiple) {
        const keys = event as globalThis.MouseEvent
        const index = indexById.get(rowKey(row)) ?? 0
        if (keys.shiftKey) return selectRange(index, event, "item-press")
        if (keys.ctrlKey || keys.metaKey) return toggleSelected(row, event, "item-press")
        selectOnly(row, event, "item-press")
      }
      select(row.node.id, { reason: "item-press", event, item: row.node })
    } else if (row.hasChildren) toggle(row)
  }

  /** Enter or Space on a row: a linked row follows its link (its click selects the row). */
  const activateFromKeyboard = (row: FlatRow<TreeNode>, event: Event) => {
    const element = scrollRef.current?.querySelector<HTMLElement>(`[data-row-id="${CSS.escape(rowKey(row))}"]`)
    if (selectable(row) && element instanceof HTMLAnchorElement && !row.node.disabled) element.click()
    else activate(row, event)
  }

  // ── Renaming ─────────────────────────────────────────────────────────────
  const [renamingId, setRenamingId] = useControllable<string | null>(renamingIdProp, defaultRenamingId ?? null, onRenamingIdChange)
  const [renameError, setRenameError] = useState<string | null>(null)
  const [renamePending, setRenamePending] = useState(false)
  keepIds.current = new Set(renamingId !== null ? [renamingId] : [])
  const startRename = (node: TreeNode) => {
    if (!onRename || node.disabled || node.renamable === false) return
    setRenameError(null)
    setFocusedId(node.id)
    setRenamingId(node.id)
  }
  const endRename = (id: string, refocus: boolean) => {
    setRenameError(null)
    setRenamePending(false)
    setRenamingId(null)
    if (refocus) {
      shouldFocus.current = true
      setFocusedId(id)
    }
  }
  const commitRename = (node: TreeNode, value: string, refocus: boolean) => {
    const label = value.trim()
    if (renamePending) return
    if (!label || label === node.label) return endRename(node.id, refocus)
    const settle = (result: void | boolean | string) => {
      setRenamePending(false)
      if (typeof result === "string") setRenameError(result)
      else if (result === false) setRenameError(messages.renameFailed)
      else endRename(node.id, refocus)
    }
    const result = onRename?.(node.id, label, { node })
    if (result instanceof Promise) {
      setRenamePending(true)
      result.then(settle, () => {
        setRenamePending(false)
        setRenameError(messages.renameFailed)
      })
    } else settle(result)
  }
  // A row removed from the tree while it is renamed takes the field with it.
  const renamingGone = renamingId !== null && !indexById.has(renamingId)
  useEffect(() => {
    if (renamingGone && rows.length > 0) setRenamingId(null)
  }, [renamingGone, rows.length, setRenamingId])

  // ── Moving ───────────────────────────────────────────────────────────────
  const movingIds = (id: string) => (multiple && idSet.has(id) ? [...rows.flatMap((row) => (!row.status && idSet.has(row.node.id) ? [row.node.id] : [])), ...idList.filter((other) => !indexById.has(other))] : [id])
  const childrenOf = (parentId: string | null) => (parentId === null ? nodes : (rows[indexById.get(parentId) ?? -1]?.node.children ?? []))
  /** The move a place would make, in its final form, or null when a row cannot go there. */
  const planMove = (ids: string[], parentId: string | null, beforeId: string | null, input: TreeMove["input"]): TreeMove | null => {
    for (let at = parentId; at !== null; at = rows[indexById.get(at) ?? -1]?.parentId ?? null) if (ids.includes(at)) return null
    const siblings = childrenOf(parentId).filter((node) => !ids.includes(node.id))
    const before = beforeId === null ? -1 : siblings.findIndex((node) => node.id === beforeId)
    return { ids, parentId, beforeId, index: before < 0 ? siblings.length : before, input }
  }
  const movePlan = (id: string, direction: TreeMoveDirection, input: TreeMove["input"]): TreeMove | null => {
    const index = indexById.get(id)
    const row = index === undefined ? undefined : rows[index]
    if (!row || searching || !onMove || row.node.movable === false || row.node.disabled) return null
    const ids = movingIds(id)
    const siblings = childrenOf(row.parentId)
    const place = siblings.findIndex((node) => node.id === id)
    const free = siblings.filter((node) => !ids.includes(node.id))
    const previous = siblings.slice(0, place).findLast((node) => !ids.includes(node.id))
    const next = siblings.slice(place + 1).find((node) => !ids.includes(node.id))
    let plan: TreeMove | null = null
    if (direction === "up" && previous) plan = planMove(ids, row.parentId, previous.id, input)
    else if (direction === "down" && next) plan = planMove(ids, row.parentId, free[free.indexOf(next) + 1]?.id ?? null, input)
    else if (direction === "in" && previous && (previous.children !== undefined || previous.hasChildren)) plan = planMove(ids, previous.id, null, input)
    else if (direction === "out" && row.parentId !== null) {
      const parent = rows[indexById.get(row.parentId) ?? -1]
      if (parent) {
        const outer = childrenOf(parent.parentId)
        plan = planMove(ids, parent.parentId, outer[outer.findIndex((node) => node.id === parent.node.id) + 1]?.id ?? null, input)
      }
    }
    return plan
  }
  const applyMove = (move: TreeMove) => {
    const verdict = canMove?.(move)
    if (verdict === false || typeof verdict === "string") {
      announce(typeof verdict === "string" ? verdict : messages.cannotMove)
      return false
    }
    onMove?.(move)
    const first = rows[indexById.get(move.ids[0] ?? "") ?? -1]?.node.label ?? move.ids[0] ?? ""
    const parent = move.parentId === null ? null : rows[indexById.get(move.parentId) ?? -1]?.node.label
    const same = rows[indexById.get(move.ids[0] ?? "") ?? -1]?.parentId === move.parentId
    if (same) announce(messages.movedWithin({ label: first, position: locale_.format(move.index + 1), total: locale_.format(childrenOf(move.parentId).length) }))
    else announce(parent ? messages.movedInto({ label: first, parent }) : messages.movedToTop(first))
    return true
  }
  const moveRow = (id: string, direction: TreeMoveDirection, input: TreeMove["input"]) => {
    if (searching) {
      announce(messages.clearSearchToMove)
      return false
    }
    const plan = movePlan(id, direction, input)
    if (!plan) {
      announce(messages.cannotMove)
      return false
    }
    shouldFocus.current = input === "keyboard"
    return applyMove(plan)
  }

  // ── Reveal ───────────────────────────────────────────────────────────────
  interface Revealing {
    id: string
    path: readonly string[]
    options: TreeRevealOptions
    resolve: (found: boolean) => void
    pages: number
  }
  const revealing = useRef<Revealing | null>(null)
  const advanceReveal = () => {
    const job = revealing.current
    if (!job) return
    const finish = (found: boolean) => {
      revealing.current = null
      job.resolve(found)
    }
    const index = indexById.get(job.id)
    const row = index === undefined ? undefined : rows[index]
    if (index !== undefined && row) {
      virtualizer.scrollToIndex(index, { align: job.options.align ?? "center" })
      if (job.options.select) {
        if (multiple) selectOnly(row, new Event("reveal"), "item-press")
        select(row.node.id, { reason: "item-press", event: undefined, item: row.node })
      }
      if (job.options.focus) {
        shouldFocus.current = true
        setFocusedId(job.id)
      }
      return finish(true)
    }
    if (searching) return finish(false)
    let deepest: FlatRow<TreeNode> | undefined
    for (const ancestor of job.path) {
      const current = rows[indexById.get(ancestor) ?? -1]
      if (!current) break
      deepest = current
      if (load.failed.has(ancestor)) return finish(false)
      if (load.loading.has(ancestor)) return
      if (current.hasChildren && !current.expanded) return setExpanded(new Set([...expanded, ancestor]))
    }
    const parent = deepest?.node
    if (parent?.hasMore && onLoadMore && job.pages > 0) {
      if (load.moreLoading.has(parent.id)) return
      if (load.moreFailed.has(parent.id)) return finish(false)
      job.pages -= 1
      return loadMore(parent)
    }
    if (parent && rows.some((candidate) => candidate.status === "loading" && candidate.node.id === parent.id)) return
    finish(false)
  }
  const advance = useRef(advanceReveal)
  advance.current = advanceReveal
  useEffect(() => advance.current(), [rows, load])
  useEffect(
    () => () => {
      revealing.current?.resolve(false)
      revealing.current = null
    },
    []
  )
  const startRenameRef = useRef(startRename)
  startRenameRef.current = startRename
  const moveRef = useRef({ moveRow, movePlan })
  moveRef.current = { moveRow, movePlan }
  const nodesRef = useRef(nodes)
  nodesRef.current = nodes
  const handle = useMemo<TreeHandle>(() => {
    const reveal: TreeHandle["reveal"] = (id, options = {}) => {
      revealing.current?.resolve(false)
      const path = options.path ?? treePath(nodesRef.current, id)
      if (path === null) {
        revealing.current = null
        return Promise.resolve(false)
      }
      return new Promise<boolean>((resolve) => {
        revealing.current = { id, path, options, resolve, pages: REVEAL_PAGES }
        advance.current()
      })
    }
    return {
      reveal,
      rename: async (id) => {
        if (!(await reveal(id, { focus: false }))) return
        const find = (list: readonly TreeNode[]): TreeNode | undefined => {
          for (const node of list) {
            if (node.id === id) return node
            const below = node.children && find(node.children)
            if (below) return below
          }
          return undefined
        }
        const node = find(nodesRef.current)
        if (node) startRenameRef.current(node)
      },
      move: (id, direction, input = "menu") => moveRef.current.moveRow(id, direction, input),
      canMove: (id, direction) => moveRef.current.movePlan(id, direction, "menu") !== null,
    }
  }, [])
  useImperativeHandle(ref, () => handle, [handle])

  // ── Dragging: plans on arithmetic, so rows out of view take part (R18.5) ──
  const dropPlan = (clientY: number, ids: string[]): TreeDropPlan | null => {
    const scroller = scrollRef.current
    if (!scroller || rows.length === 0) return null
    const offset = clientY - scroller.getBoundingClientRect().top + scroller.scrollTop
    const item = virtualizer.getVirtualItemForOffset(offset)
    const row = item ? rows[item.index] : undefined
    if (!item || !row) return null
    const fraction = (offset - item.start) / item.size
    const target = row.status ? rows[item.index - 1] : row
    if (!target) return null
    const branch = target.branch && !row.status
    const place = branch ? (fraction < 0.25 ? "before" : fraction > 0.75 && !target.expanded ? "after" : "inside") : fraction < 0.5 ? "before" : "after"
    const siblings = childrenOf(target.parentId)
    const after = siblings[siblings.findIndex((node) => node.id === target.node.id) + 1]?.id ?? null
    const move = place === "inside" ? planMove(ids, target.node.id, null, "pointer") : planMove(ids, target.parentId, place === "before" ? target.node.id : after, "pointer")
    if (!move) return null
    const verdict = canMove?.(move)
    return {
      move,
      place,
      rowId: target.node.id,
      top: place === "after" ? item.start + item.size : item.start,
      level: place === "inside" ? target.level + 1 : target.level,
      refused: verdict === false || typeof verdict === "string",
      openable: place === "inside" && target.hasChildren && !target.expanded ? target.node.id : null,
    }
  }

  // ── Keyboard ─────────────────────────────────────────────────────────────
  const buffer = useRef({ text: "", timer: 0 as ReturnType<typeof setTimeout> | 0 })
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const row = rows[focusedIndex]
    if (!row) return
    // A control inside trailing content keeps its keys.
    if (event.target instanceof Element && event.target.closest(".fa-tree-trailing")) return
    const key = readingKey(event.key, event.currentTarget)
    const extend = multiple && event.shiftKey ? (index: number) => selectRange(index, event.nativeEvent, "keyboard") : null
    if (multiple && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a") {
      event.preventDefault()
      anchor.current = rows.find((candidate) => selectable(candidate) && !candidate.node.disabled)?.node.id ?? null
      return selectRange(rows.length - 1, event.nativeEvent, "keyboard")
    }
    if (event.key === "F2" && onRename && !row.status) {
      event.preventDefault()
      return startRename(row.node)
    }
    if (onMove && event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
      const direction = key === "ArrowUp" ? "up" : key === "ArrowDown" ? "down" : key === "ArrowRight" ? "in" : key === "ArrowLeft" ? "out" : null
      if (direction) {
        event.preventDefault()
        moveRow(row.node.id, direction, "keyboard")
        return
      }
    }
    switch (key) {
      case "ArrowDown": {
        const next = Math.min(rows.length - 1, focusedIndex + 1)
        moveTo(next)
        extend?.(next)
        break
      }
      case "ArrowUp": {
        const next = Math.max(0, focusedIndex - 1)
        moveTo(next)
        extend?.(next)
        break
      }
      case "Home":
        moveTo(0)
        extend?.(0)
        break
      case "End":
        moveTo(rows.length - 1)
        extend?.(rows.length - 1)
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
        if (multiple && selectable(row) && !row.node.disabled) toggleSelected(row, event.nativeEvent, "keyboard")
        else if (row.status || selectable(row) || !row.hasChildren) activateFromKeyboard(row, event.nativeEvent)
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

  const items = virtualizer.getVirtualItems()
  const hint = onRename && onMove ? messages.renameAndMoveHint : onRename ? messages.renameHint : onMove ? messages.moveHint : null
  // Drag support loads with a plain copy of the rows in its place, and the rows mount anew
  // under it. A row focused in that moment goes with them, so the new canvas takes focus back.
  const focusedKey = useRef(focusedId)
  focusedKey.current = focusedId
  const takeFocusBack = useCallback((element: HTMLDivElement | null) => {
    if (!element || !focusWithin.current) return
    const active = element.ownerDocument.activeElement
    if (active && active !== element.ownerDocument.body) return
    const key = focusedKey.current
    if (key) element.querySelector<HTMLElement>(`[data-row-id="${CSS.escape(key)}"]`)?.focus({ preventScroll: true })
  }, [])

  // After every hook, so a search that empties the tree or fills it again keeps their order.
  if (rows.length === 0 && searching) {
    return (
      <div className={cx("fa-tree", className)} data-empty="">
        <EmptyState icon={<IconSearch />}>{emptyText(query.trim())}</EmptyState>
      </div>
    )
  }

  const canvas = (dragRow: TreeDragRow | null, dropLine: ReactNode) => (
    <div ref={takeFocusBack} role="presentation" className="fa-tree-canvas" style={{ height: virtualizer.getTotalSize() }}>
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
            selected={canSelect && (multiple ? idSet.has(row.node.id) : row.node.id === selectedId)}
            focused={item.index === focusedIndex}
            busy={load.loading.has(row.node.id)}
            counted={groupCounts}
            renderLink={renderLink}
            rowWrapper={rowWrapper}
            renderContent={renderContent}
            renderTrailing={renderTrailing}
            check={multiple && checkboxes && canSelect}
            renaming={row.node.id === renamingId}
            renameError={renameError}
            renamePending={renamePending}
            onRenameCommit={commitRename}
            onRenameCancel={(id) => endRename(id, true)}
            dragRow={!searching && row.node.movable !== false ? dragRow : null}
            movingIds={movingIds}
            onClick={(event) => {
              setFocusedId(key)
              const target = event.target instanceof Element ? event.target : null
              // A control in the trailing content keeps the click.
              if (target?.closest(".fa-tree-trailing")?.contains(target.closest(CONTROL))) return
              if (target?.closest(".fa-tree-rename")) return
              if (target?.closest(".fa-tree-check")) {
                event.preventDefault()
                if (!row.node.disabled) toggleSelected(row, event.nativeEvent, "item-press")
                return
              }
              // A disabled link, or a link's chevron, must not navigate.
              const chevron = target !== null && target.closest(".fa-tree-chevron") !== null
              if (row.node.disabled || (chevron && canSelect && row.hasChildren)) event.preventDefault()
              if (chevron && canSelect && row.hasChildren) toggle(row)
              else {
                // A modified click extends the selection; it does not open a link in a new tab.
                if (multiple && canSelect && (event.shiftKey || event.ctrlKey || event.metaKey)) event.preventDefault()
                activate(row, event.nativeEvent)
              }
            }}
            onDoubleClick={(event) => {
              if (!canSelect || !row.hasChildren || row.node.disabled) return
              if (event.target instanceof Element && event.target.closest(".fa-tree-chevron, .fa-tree-trailing, .fa-tree-rename, .fa-tree-check")) return
              toggle(row)
            }}
            onFocus={onFocus}
          />
        )
      })}
      {dropLine}
    </div>
  )
  return (
    <div className={cx("fa-tree", className)} data-trailing={renderTrailing ? trailingVisibility : undefined}>
      <div
        ref={scrollRef}
        className="fa-tree-scroll"
        role="tree"
        aria-label={label}
        aria-multiselectable={multiple || undefined}
        aria-describedby={hint ? hintId : undefined}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        onFocus={() => (focusWithin.current = true)}
        onBlur={(event) => {
          // A row removed while focused blurs with no target: the tree keeps focus to hand on.
          if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) focusWithin.current = false
        }} data-scroll-container data-scrolled-top={edges.top ? "" : undefined} data-scrolled-bottom={edges.bottom ? "" : undefined}>
        {onMove ? (
          <Suspense fallback={canvas(null, null)}>
            <TreeDrag scroller={scrollRef} label={label} type={dragType} plan={dropPlan} open={(id) => setExpanded(new Set([...expanded, id]))} commit={applyMove} keepIds={keepIds} springMs={SPRING_OPEN_MS} liveHost={liveHost}>
              {canvas}
            </TreeDrag>
          </Suspense>
        ) : (
          canvas(null, null)
        )}
      </div>
      {hint ? (
        <span id={hintId} hidden>
          {hint}
        </span>
      ) : null}
      {onMove || onRename || selectionLimit !== undefined ? <span ref={announcer} className="fa-tree-announcer" aria-live="polite" aria-atomic="true" /> : null}
      {onMove ? <span ref={setLiveHost} /> : null}
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
  renderTrailing?: TreeProps["renderTrailing"]
  /** Show the selection check mark. */
  check: boolean
  /** The row's label is the rename field. */
  renaming: boolean
  renameError: string | null
  renamePending: boolean
  onRenameCommit: (node: TreeNode, value: string, refocus: boolean) => void
  onRenameCancel: (id: string) => void
  /** Attaches the row to the drag, once that has loaded. */
  dragRow: TreeDragRow | null
  movingIds: (id: string) => string[]
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
function TreeRow({ row, start, selectable, selected, focused, busy, counted, renderLink, rowWrapper, renderContent, renderTrailing, check, renaming, renameError, renamePending, onRenameCommit, onRenameCancel, dragRow, movingIds, onClick, onDoubleClick, onFocus }: TreeRowProps) {
  const statusMessages = useMessages(badgeMessages)
  const { node } = row
  const rename = renaming ? <TreeRenameField node={node} error={renameError} pending={renamePending} onCommit={(value, refocus) => onRenameCommit(node, value, refocus)} onCancel={() => onRenameCancel(node.id)} /> : null
  const style = { "--_level": row.level, transform: `translateY(${start}px)` } as CSSProperties
  const twoLine = !row.branch && Boolean(node.description || row.keywordMatch)
  // A keyword match shows the keyword in place of the description.
  const description = row.keywordMatch ? (
    <Highlight text={row.keywordMatch.text} range={row.keywordMatch.range} />
  ) : (
    <Highlight text={node.description ?? ""} range={row.descriptionMatch} />
  )
  const content: TreeRowContent = {
    label: rename ?? <Highlight text={node.label} range={row.labelMatch} />,
    description: twoLine ? description : null,
    matched: Boolean(row.labelMatch || row.descriptionMatch || row.keywordMatch),
    level: row.level,
    group: row.branch,
  }
  const custom = renderContent?.(node, content)
  const trailing = renderTrailing?.(node, content)
  const tail = trailing !== undefined && trailing !== null ? <span className="fa-tree-trailing" data-dnd-ignore="">{trailing}</span> : null
  const mark = check ? (
    <span className="fa-tree-check" aria-hidden data-checked={selected ? "" : undefined}>
      {selected ? <IconCheck /> : null}
    </span>
  ) : null
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
      {mark}
      {custom}
      {count}
      {tail}
    </>
  ) : (
    <>
      {chevron}
      {mark}
      <span className="fa-tree-icon">
        {node.icon ?? (row.branch ? <IconFolder /> : <IconFile />)}
        {node.status ? <StatusDot status={node.status} label={statusMessages[node.status]} overlay /> : null}
      </span>
      <span className="fa-tree-text">
        {rename ?? (
          <span className="fa-tree-label" title={node.label}>
            <Highlight text={node.label} range={row.labelMatch} />
          </span>
        )}
        {twoLine ? (
          <span className="fa-tree-description" title={row.keywordMatch?.text ?? node.description}>
            {description}
          </span>
        ) : null}
      </span>
      {count}
      {tail}
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
  const build = (ref: Ref<HTMLElement> | undefined) => {
    // Not in the public type: it stays spreadable onto any router's link element.
    const attached = (ref ? { ...props, ref } : props) as TreeRowRenderProps
    // A field cannot sit inside a link, so a row being renamed is plain for the moment.
    const linked = selectable && renderLink && !renaming ? renderLink(node, attached) : null
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events -- keys are handled once on the tree (roving focus)
    const element = linked ?? <div {...attached} />
    return rowWrapper ? rowWrapper(node, element) : element
  }
  if (!dragRow || renaming || node.disabled) return build(undefined)
  const DragRow = dragRow
  return <DragRow id={node.id} label={node.label} ids={movingIds} render={build} />
}

/** The label as a field. It takes focus once and holds it while the list scrolls or refreshes. */
function TreeRenameField({ node, error, pending, onCommit, onCancel }: { node: TreeNode; error: string | null; pending: boolean; onCommit: (value: string, refocus: boolean) => void; onCancel: () => void }) {
  const messages = useMessages(treeMessages)
  const errorId = useId()
  const input = useRef<HTMLInputElement>(null)
  const cancelled = useRef(false)
  useIsomorphicLayoutEffect(() => {
    const element = input.current
    if (!element) return
    element.focus({ preventScroll: true })
    // The name without its extension, as a file manager does.
    const dot = node.label.lastIndexOf(".")
    element.setSelectionRange(0, dot > 0 ? dot : node.label.length)
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- once, when the field opens
  }, [])
  return (
    <span className="fa-tree-rename">
      <input
        ref={input}
        className="fa-tree-rename-input"
        defaultValue={node.label}
        readOnly={pending}
        aria-label={messages.rename(node.label)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onKeyDown={(event) => {
          // Typing belongs to the field: not to the tree's typeahead, and Escape to nothing above.
          event.stopPropagation()
          if (event.nativeEvent.isComposing) return
          if (event.key === "Enter") {
            event.preventDefault()
            onCommit(event.currentTarget.value, true)
          } else if (event.key === "Escape") {
            event.preventDefault()
            event.nativeEvent.stopPropagation()
            cancelled.current = true
            onCancel()
          }
        }}
        onBlur={(event) => {
          // Another window taking focus leaves the field as it is.
          if (cancelled.current || !document.hasFocus()) return
          onCommit(event.currentTarget.value, false)
        }}
      />
      {error ? (
        <span id={errorId} className="fa-tree-rename-error" role="alert">
          {error}
        </span>
      ) : null}
    </span>
  )
}

/** Props for {@link TreeMoveItems}. */
export interface TreeMoveItemsProps {
  /** The Tree's handle. */
  tree: { readonly current: TreeHandle | null }
  /** The row the menu is for. */
  id: string
}

/**
 * Move Up, Down, In and Out as menu rows, for a row's context menu or ⋯ menu: the
 * single-pointer alternative to dragging (WCAG 2.5.7). The same moves as the keyboard.
 */
export function TreeMoveItems({ tree, id }: TreeMoveItemsProps) {
  const messages = useMessages(treeMessages)
  const row = (direction: TreeMoveDirection, label: string) => (
    <Menu.Item disabled={!tree.current?.canMove(id, direction)} onClick={() => tree.current?.move(id, direction, "menu")}>
      {label}
    </Menu.Item>
  )
  return (
    <>
      {row("up", messages.moveUp)}
      {row("down", messages.moveDown)}
      {row("in", messages.moveIn)}
      {row("out", messages.moveOut)}
    </>
  )
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
        {loading ? <ProgressRing value={null} size="sm" aria-label={messages.loadingStatus} /> : failed ? <IconError /> : <IconChevronDown />}
      </span>
      <span className="fa-tree-text">
        <span className="fa-tree-label">{text}</span>
      </span>
      {failed ? <span className="fa-tree-retry">{messages.retryAction}</span> : null}
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
