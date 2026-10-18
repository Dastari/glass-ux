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
import { IconChevronRight, IconFile, IconFolder, IconSearch } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { useControllable } from "../../lib/use-controllable.js"
import { useElementSize } from "../../lib/use-element-size.js"
import { useScrollEdges } from "../../lib/use-scroll-edges.js"
import { CountBadge, STATUS, StatusDot, type StatusKind } from "../badge/index.js"
import { EmptyState } from "../empty-state/index.js"
import { Skeleton } from "../skeleton/index.js"
import { flattenTree, typeahead, type FlatRow } from "./flatten.js"

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
  /** Called with the click event; the tree selects an endpoint or toggles a group, and prevents navigation for a disabled row. */
  onClick: (event: MouseEvent<HTMLElement>) => void
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
  /** Stable identifier of the selected item. */
  selectedId?: string | null
  /** Called with the endpoint (leaf) the person activates by click, Enter or Space; not for groups, which toggle, or disabled rows. A linked row also navigates. Pair with `selectedId` to show the selection. */
  onSelect?: (node: TreeNode) => void
  /**
   * Render endpoint rows as links (a TanStack Router `<Link>` in the app). Return null to
   * keep a row a plain item. A linked row navigates natively (click, middle-click, Enter);
   * `onSelect` still fires.
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
 */
export function Tree({
  nodes,
  selectedId = null,
  onSelect,
  renderLink,
  rowWrapper,
  renderContent,
  expanded: expandedProp,
  defaultExpanded,
  onExpandedChange,
  query = "",
  emptyText = (q) => `No match for “${q}”`,
  className,
  "aria-label": label,
}: TreeProps) {
  const [expandedList, setExpandedList] = useControllable<string[]>(expandedProp ?? undefined, defaultExpanded ?? [], onExpandedChange)
  const expanded = useMemo(() => new Set(expandedList), [expandedList])
  const rows = useMemo(() => flattenTree(nodes, expanded, query), [nodes, expanded, query])
  const searching = query.trim() !== ""

  const setExpanded = useCallback((next: Set<string>) => setExpandedList([...next]), [setExpandedList])
  const toggle = useCallback(
    (row: FlatRow<TreeNode>, open = !row.expanded) => {
      if (!row.hasChildren || searching) return
      const next = new Set(expanded)
      if (open) next.add(row.node.id)
      else next.delete(row.node.id)
      setExpanded(next)
    },
    [expanded, searching, setExpanded]
  )

  // ── Focus (roving tabindex) ──────────────────────────────────────────────
  const [focusedId, setFocusedId] = useState<string | null>(selectedId)
  const indexById = useMemo(() => new Map(rows.map((row, index) => [row.node.id, index])), [rows])
  const focusedIndex = focusedId !== null && indexById.has(focusedId) ? indexById.get(focusedId)! : rows.length ? 0 : -1
  const shouldFocus = useRef(false)

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
    (row: FlatRow<TreeNode> | undefined) => (!row ? leafHeight : row.hasChildren ? groupHeight : row.node.description || row.keywordMatch ? twoLineHeight : leafHeight),
    [groupHeight, leafHeight, twoLineHeight]
  )

  const focusedRef = useRef(focusedIndex)
  focusedRef.current = focusedIndex
  // oxlint-disable-next-line react/incompatible-library -- the app does not use the React Compiler; TanStack Virtual is the sanctioned virtualiser
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => sizeOf(rows[index]),
    getItemKey: (index) => rows[index]?.node.id ?? index,
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

  // Move DOM focus after keyboard navigation, as soon as the row is committed.
  useIsomorphicLayoutEffect(() => {
    if (!shouldFocus.current || focusedIndex < 0) return
    shouldFocus.current = false
    const id = rows[focusedIndex]?.node.id
    scrollRef.current?.querySelector<HTMLElement>(`[data-row-id="${CSS.escape(id ?? "")}"]`)?.focus({ preventScroll: true })
  })

  const moveTo = (index: number) => {
    const row = rows[index]
    if (!row) return
    shouldFocus.current = true
    setFocusedId(row.node.id)
    virtualizer.scrollToIndex(index, { align: "auto" })
  }

  const activate = (row: FlatRow<TreeNode>) => {
    if (row.node.disabled) return
    if (row.hasChildren) toggle(row)
    else onSelect?.(row.node)
  }

  /** Enter or Space on a row: a linked row follows its link (the link reports onSelect). */
  const activateFromKeyboard = (row: FlatRow<TreeNode>) => {
    const element = scrollRef.current?.querySelector<HTMLElement>(`[data-row-id="${CSS.escape(row.node.id)}"]`)
    if (!row.hasChildren && element instanceof HTMLAnchorElement && !row.node.disabled) element.click()
    else activate(row)
  }

  // ── Keyboard ─────────────────────────────────────────────────────────────
  const buffer = useRef({ text: "", timer: 0 as ReturnType<typeof setTimeout> | 0 })
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const row = rows[focusedIndex]
    if (!row) return
    switch (event.key) {
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
        activateFromKeyboard(row)
        break
      case " ":
        if (!row.hasChildren) activateFromKeyboard(row)
        else toggle(row)
        break
      default: {
        if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) return
        clearTimeout(buffer.current.timer)
        buffer.current.text += event.key
        buffer.current.timer = setTimeout(() => (buffer.current.text = ""), TYPEAHEAD_RESET_MS)
        const next = typeahead(rows, buffer.current.text.length > 1 ? focusedIndex - 1 : focusedIndex, buffer.current.text)
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
      <div ref={scrollRef} className="fa-tree-scroll" role="tree" aria-label={label} tabIndex={-1} onKeyDown={onKeyDown} data-scroll-container data-scrolled-top={edges.top ? "" : undefined} data-scrolled-bottom={edges.bottom ? "" : undefined}>
        <div role="presentation" className="fa-tree-canvas" style={{ height: virtualizer.getTotalSize() }}>
          {items.map((item) => {
            const row = rows[item.index]
            if (!row) return null
            return (
              <TreeRow
                key={item.key}
                row={row}
                start={item.start}
                selected={!row.hasChildren && row.node.id === selectedId}
                focused={item.index === focusedIndex}
                renderLink={renderLink}
                rowWrapper={rowWrapper}
                renderContent={renderContent}
                onClick={(event) => {
                  setFocusedId(row.node.id)
                  // A disabled link must not navigate.
                  if (row.node.disabled) event.preventDefault()
                  activate(row)
                }}
                onFocus={() => setFocusedId(row.node.id)}
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
  /** The selected state or collection. */
  selected: boolean
  focused: boolean
  /** Renders a link with the host router. */
  renderLink?: TreeProps["renderLink"]
  rowWrapper?: TreeProps["rowWrapper"]
  renderContent?: TreeProps["renderContent"]
  /** Called with the row's click event: select an endpoint or toggle a group. */
  onClick: (event: MouseEvent<HTMLElement>) => void
  /** Called with no arguments when the row takes focus, to make it the tab stop. */
  onFocus: () => void
}

/** One row. A click on a group (chevron included) toggles it; on an endpoint, selects it. */
function TreeRow({ row, start, selected, focused, renderLink, rowWrapper, renderContent, onClick, onFocus }: TreeRowProps) {
  const { node } = row
  const style = { "--_level": row.level, transform: `translateY(${start}px)` } as CSSProperties
  const twoLine = !row.hasChildren && Boolean(node.description || row.keywordMatch)
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
    group: row.hasChildren,
  })
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
      {row.hasChildren ? <CountBadge value={row.leaves} className="fa-tree-count" /> : null}
    </>
  ) : (
    <>
      {chevron}
      <span className="fa-tree-icon">
        {node.icon ?? (row.hasChildren ? <IconFolder /> : <IconFile />)}
        {node.status ? <StatusDot status={node.status} label={STATUS[node.status].label} overlay /> : null}
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
      {row.hasChildren ? <CountBadge value={row.leaves} className="fa-tree-count" /> : null}
    </>
  )
  const props: TreeRowRenderProps = {
    role: "treeitem",
    className: "fa-item fa-tree-row",
    style,
    tabIndex: focused ? 0 : -1,
    "data-row-id": node.id,
    "data-kind": row.hasChildren ? "group" : "leaf",
    "data-two-line": twoLine ? "" : undefined,
    "data-selected": selected ? "" : undefined,
    "data-disabled": node.disabled ? "" : undefined,
    "aria-level": row.level,
    "aria-setsize": row.setsize,
    "aria-posinset": row.posinset,
    "aria-selected": row.hasChildren ? undefined : selected,
    "aria-disabled": node.disabled || undefined,
    onClick,
    onFocus,
    children,
  }
  const linked = !row.hasChildren && renderLink ? renderLink(node, props) : null
  // oxlint-disable-next-line jsx-a11y/click-events-have-key-events -- keys are handled once on the tree (roving focus)
  const element = linked ?? <div {...props} aria-expanded={row.hasChildren ? row.expanded : undefined} />
  return rowWrapper ? rowWrapper(node, element) : element
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
