/**
 * PaneLayout — panels in a JSON tree of splits and stacks, in one bounded box. Stacks can show
 * tabs; a resize-only layout (`locked`) with no tabs suits mail and dashboards.
 *
 * The tree decides where content appears, but it never owns the content's React position: one
 * flat, stable list of portals renders each panel into its own host element (hosts.ts), and only
 * that element moves. Drags write custom properties or data attributes and commit once.
 *
 * The content sees React context from above PaneLayout, not from its stack. React events bubble
 * to the flat list, and native events through the visible stack.
 */
import * as React from "react"
import {
  Suspense,
  createContext,
  lazy,
  memo,
  use,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ComponentType,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react"
import { createPortal } from "react-dom"
import { IconSidebar } from "../../icons/generated/icons.js"
import { isRtl } from "../../lib/direction.js"
import { cx } from "../../lib/cx.js"
import { useMessages } from "../../lib/i18n/index.js"
import { remPx } from "../../lib/rem.js"
import { useStorageScope } from "../../lib/storage-scope.js"
import { useControllable } from "../../lib/use-controllable.js"
import { observeElementSize } from "../../lib/use-element-size.js"
import { useMediaQuery } from "../../lib/use-media-query.js"
import { useScrollEdges } from "../../lib/use-scroll-edges.js"
import { Button } from "../button/index.js"
import { DragDropProvider, useDraggable, useDropZone, type DragEndEvent, type DragInfo, type DragMoveEvent, type DragOverEvent, type DropEvent } from "../drag-drop/index.js"
import { Skeleton } from "../skeleton/index.js"
import { splitPaneMessages } from "../split-pane/messages.js"
import { clampLength, lengthPx, Separator, separatorKeyAction, startSeparatorDrag } from "../split-pane/separator.js"
import { Panel } from "../surface/index.js"
import { Tabs, type TabDragData, type TabItem, type TabListHandle, type TabMove } from "../tabs/index.js"
import { tabsMessages } from "../tabs/messages.js"
import { VisuallyHidden } from "../visually-hidden/index.js"
import { PaneHandleContext, PaneTreeContext, type PaneDefinition, type PaneLayoutHandle, type PaneTree } from "./context.js"
import { HostStore } from "./hosts.js"
import { paneLayoutMessages } from "./messages.js"
import { stackTitle } from "./pane-actions.js"
import {
  closePanel,
  edgeAt,
  emptyLayout,
  movePanel,
  normaliseLayout,
  openPanel,
  panelsOf,
  parsePaneLayout,
  resizedPair,
  revealPanel,
  setMaximised,
  setSizes,
  setStackCollapsed,
  stackOf,
  stacksOf,
  type PaneEdge,
  type PaneLayoutState,
  type PaneNode,
  type PaneSize,
  type PaneSplit,
  type PaneStack,
  type PaneTarget,
} from "./tree.js"

const MenuButton = /* @__PURE__ */ lazy(() => import("./pane-menu.js").then((module) => ({ default: module.PaneMenuButton })))
const TabRows = /* @__PURE__ */ lazy(() => import("./pane-menu.js").then((module) => ({ default: module.PaneTabRows })))
const TitleMenu = /* @__PURE__ */ lazy(() => import("./pane-menu.js").then((module) => ({ default: module.PaneTitleMenu })))
const PaneSheet = /* @__PURE__ */ lazy(() => import("./pane-sheet.js"))

/** The package's peer range starts before Activity: there a hidden panel simply keeps running. */
const Activity = (React as unknown as { Activity?: ComponentType<{ mode: "visible" | "hidden"; children: ReactNode }> }).Activity ?? (({ children }: { children: ReactNode }) => children)

/** What a dragged panel carries, so strips and bodies exchange only each other's. */
const PANE_DRAG = "glass-ux/pane"
const BODY_ZONE = "pane-body:"
const STRIP_ZONE = "pane-strip:"
const DEFAULT_MIN = "12rem" // tokens:allow a prop default, in rem so it follows UI scale
/** Touch keeps long-press for the context menu, as tabs do. */
const TOUCH_ONLY = "(hover: none) and (pointer: coarse)"

/** What changed, passed with each finished change. `move` also covers `setLayout`. */
export interface PaneLayoutChange {
  reason: "resize" | "move" | "open" | "close" | "activate" | "collapse" | "maximise"
}

export interface PaneLayoutProps extends Omit<ComponentProps<"div">, "children" | "defaultValue"> {
  /** Resolves an id. `null` means the id is unknown: it stays in the JSON, dormant and invisible, until it resolves again. Pass a stable function. */
  panel: (id: string) => PaneDefinition | null
  /** The layout, controlled. Pair with `onLayoutChange`. */
  layout?: PaneLayoutState
  /** The layout an uncontrolled PaneLayout starts with when none is remembered. */
  defaultLayout?: PaneLayoutState
  /** Called once per finished change, never during a drag. A phone's collapsed view reports only closes. */
  onLayoutChange?: (layout: PaneLayoutState, change: PaneLayoutChange) => void
  /** Resize only: no moving, closing or tabs drag. For mail and dashboards. */
  locked?: boolean
  /** Below this width the layout collapses to one panel and a strip. Default "40rem", as SplitPane. */
  collapseBelow?: `${number}rem`
  /** Called with ids `panel` could not resolve, and again when that list changes. */
  onUnknownPanels?: (ids: readonly string[]) => void
  /**
   * Where an uncontrolled layout is remembered (localStorage). Inside a window body it defaults
   * to one key per window kind (`glass-ux.panes:window:<kind>:<name>`); elsewhere nothing is
   * remembered unless you pass one. null turns it off.
   */
  storageKey?: string | null
  /** Tells several layouts in one window kind apart in storage. Default "layout". */
  name?: string
  /** `panel` (default): each stack is a Panel with `--gap-panels` between. `flush`: one surface. */
  chrome?: "panel" | "flush"
}

/** The default storage key for a layout inside a window body of `kind`, for clearing it. */
export const paneLayoutStorageKey = (kind: string, name = "layout") => `glass-ux.panes:window:${kind}:${name}`

function readLayout(key: string | null): PaneLayoutState | null {
  if (!key || typeof localStorage === "undefined") return null
  try {
    return parsePaneLayout(JSON.parse(localStorage.getItem(key) ?? "null"))
  } catch {
    return null
  }
}

function writeLayout(key: string | null, layout: PaneLayoutState) {
  if (!key || typeof localStorage === "undefined") return
  try {
    localStorage.setItem(key, JSON.stringify(layout))
  } catch {
    // Private mode or a full store: the layout lasts for this page.
  }
}

// ── What is drawn ───────────────────────────────────────────────────────────

interface ViewStack {
  type: "stack"
  node: PaneStack
  /** The panels `panel` resolves, in tab order. */
  panels: string[]
  active: string | null
}

interface ViewSplit {
  type: "split"
  node: PaneSplit
  /** The children with something to show, and each one's place in `node.children`. */
  items: { view: ViewNode; index: number }[]
}

type ViewNode = ViewStack | ViewSplit

/** The tree as drawn: a stack of only dormant panels takes no space, and siblings absorb the room. */
function viewOf(node: PaneNode, known: (id: string) => boolean): ViewNode | null {
  if (node.type === "stack") {
    const panels = node.panels.filter(known)
    if (!panels.length) return null
    return { type: "stack", node, panels, active: node.active !== null && panels.includes(node.active) ? node.active : panels[0]! }
  }
  const items = node.children.flatMap((child, index) => {
    const view = viewOf(child, known)
    return view ? [{ view, index }] : []
  })
  return items.length ? { type: "split", node, items } : null
}

const viewStacks = (view: ViewNode | null): ViewStack[] => (!view ? [] : view.type === "stack" ? [view] : view.items.flatMap((item) => viewStacks(item.view)))

const isCollapsed = (view: ViewNode) => view.type === "stack" && Boolean(view.node.collapsed)

/** The smallest length of a node along an axis, in rem. */
function minRem(view: ViewNode, horizontal: boolean, definition: PaneTree["definition"]): number {
  if (view.type === "stack") return Math.max(...view.panels.map((id) => Number.parseFloat(definition(id)?.minSize ?? DEFAULT_MIN)))
  const sizes = view.items.map((item) => minRem(item.view, horizontal, definition))
  return (view.node.orientation === "horizontal") === horizontal ? sizes.reduce((sum, size) => sum + size, 0) : Math.max(...sizes)
}

const sizeCss = (size: PaneSize) => (typeof size === "number" ? `${size}fr` : size)

/**
 * The grid's tracks, correct on the first frame. Each is `minmax(floor, size)`, with the size in
 * `--_tN` so a drag can write it. The floor is the stack's minimum but never more than an equal
 * share of the split, so a small box squeezes tracks instead of clipping them (R7.4), and never
 * more than a fixed track's own length, so a 3rem tool rail stays 3rem.
 */
function trackTemplate(view: ViewSplit, horizontal: boolean, definition: PaneTree["definition"]) {
  const count = view.items.length
  const share = `(100% - var(--_handle) * ${count - 1}) / ${count}`
  const sizes = view.items.map((item) => view.node.sizes[item.index] ?? 1)
  // At least one track takes the free space, whatever hidden siblings left behind.
  const open = view.items.flatMap((item, at) => (isCollapsed(item.view) ? [] : [at]))
  const flexible = open.some((at) => typeof sizes[at] === "number") ? null : (open[open.length - 1] ?? null)
  return view.items
    .map((item, at) => {
      if (isCollapsed(item.view)) return "var(--_rail)"
      const size = at === flexible ? 1 : sizes[at]!
      const least = `${minRem(item.view, horizontal, definition)}rem`
      return `minmax(min(${least}, ${share}${typeof size === "string" ? `, ${size}` : ""}), var(--_t${at}, ${sizeCss(size)}))`
    })
    .join(" var(--_handle) ")
}

// ── One panel ───────────────────────────────────────────────────────────────

interface PaneHostProps {
  id: string
  host: HTMLDivElement
  component: ComponentType<{ id: string }>
  /** Effects run: shown, or `whenHidden: "run"`. */
  live: boolean
}

/**
 * The portal, created once per panel. Its element holds still when `live` changes, so showing
 * or hiding a tab never renders the content again, and `run` never touches its effects.
 */
const PaneHost = /* @__PURE__ */ memo(function PaneHost({ id, host, component: Component, live }: PaneHostProps) {
  const content = useMemo(() => <Component id={id} />, [Component, id])
  const hostRef = useMemo(() => ({ current: host }), [host])
  const edges = useScrollEdges(hostRef)
  const overflows = edges.top || edges.bottom || edges.left || edges.right
  // A scrolling host takes focus for the keyboard (R20.6). -1 otherwise: a move can focus it.
  useEffect(() => {
    host.tabIndex = overflows ? 0 : -1
    host.toggleAttribute("data-scrolled-top", edges.top)
  }, [host, overflows, edges.top])
  return createPortal(
    <Activity mode={live ? "visible" : "hidden"}>
      <Suspense fallback={<Skeleton.Block className="fa-pane-skeleton" radius="tile" />}>{content}</Suspense>
    </Activity>,
    host,
    id
  )
})

// ── The tree ────────────────────────────────────────────────────────────────

interface TreeShared {
  tree: PaneTree
  ready: boolean
  chrome: "panel" | "flush"
  maximised: string | null
  /** The stack each edge drag is over, written without React state. */
  bodies: Map<string, HTMLElement>
  strips: Map<string, TabListHandle>
  edge: { current: { zone: string | null; edge: PaneEdge | "centre" | null; rect: DOMRect | null; indicator: Element | null; rtl: boolean } }
  /** Move without an announcement, for a drag, which announces its own drop. */
  place: (id: string, to: PaneTarget) => void
  activate: (stack: PaneStack, id: string) => void
  collapse: (stack: string, collapsed: boolean) => void
  resize: (split: string, sizes: readonly PaneSize[]) => void
  resetPair: (split: PaneSplit, first: number, second: number) => void
}

const SharedContext = /* @__PURE__ */ createContext<TreeShared | null>(null)
const useShared = () => use(SharedContext) as TreeShared

function BodyZone({ view, title, children }: { view: ViewStack; title: string; children: ReactNode }) {
  const shared = useShared()
  const { tree, bodies, edge } = shared
  const messages = useMessages(paneLayoutMessages)
  const { ref } = useDropZone<TabDragData>(
    {
      id: `${BODY_ZONE}${view.node.id}`,
      label: messages.group(title),
      accept: PANE_DRAG,
      // Keyboard drags stop only at strips.
      validate: (drag: DragInfo<TabDragData>) => drag.input !== "keyboard" && tree.definition(drag.item.data.value)?.movable !== false,
      onDrop: (event: DropEvent<TabDragData>) => {
        const landed = edge.current.zone === event.target.zoneId ? edge.current.edge : null
        shared.place(event.item.data.value, landed && landed !== "centre" ? { stack: view.node.id, edge: landed } : { stack: view.node.id })
      },
    },
    { trackState: false }
  )
  const stackId = view.node.id
  const bodyRef = useCallback(
    (element: HTMLDivElement | null) => {
      ref(element)
      if (!element) return
      bodies.set(stackId, element)
      return () => {
        ref(null)
        bodies.delete(stackId)
      }
    },
    [ref, bodies, stackId]
  )
  return (
    <div className="fa-pane-body" ref={bodyRef}>
      {children}
      <div className="fa-pane-drop" aria-hidden />
    </div>
  )
}

/** A panel's title with its drag, for a stack without tabs. */
function Title({ id, definition, stripId }: { id: string; definition: PaneDefinition; stripId: string }) {
  const { unsaved } = useMessages(tabsMessages)
  const touchOnly = useMediaQuery(TOUCH_ONLY)
  const draggable = useDraggable<TabDragData>({ id, type: PANE_DRAG, data: { value: id, stripId }, label: definition.title, disabled: touchOnly || definition.movable === false, liftKeys: [], grip: false })
  const { ref, handleRef } = draggable
  const titleRef = useCallback(
    (node: HTMLDivElement | null) => {
      ref(node)
      handleRef(node)
    },
    [ref, handleRef]
  )
  const element = (
    <div
      ref={titleRef}
      className="fa-pane-title"
      data-movable={definition.movable === false ? undefined : ""}
    >
      {definition.icon}
      <span className="fa-pane-title-text">{definition.title}</span>
      {definition.unsaved ? (
        <>
          <span className="fa-tab-unsaved" aria-hidden />
          <VisuallyHidden>{unsaved}</VisuallyHidden>
        </>
      ) : null}
    </div>
  )
  return (
    <Suspense fallback={element}>
      <TitleMenu id={id} title={definition.title} extra={definition.contextMenu}>
        {element}
      </TitleMenu>
    </Suspense>
  )
}

function Strip({ view, title }: { view: ViewStack; title: string }) {
  const shared = useShared()
  const { tree, strips, activate } = shared
  const messages = useMessages(paneLayoutMessages)
  const { node, panels, active } = view
  const editable = !tree.locked
  const items = panels.map((id): TabItem => {
    const definition = tree.definition(id)!
    const item: TabItem = { value: id, label: definition.title }
    if (definition.icon !== undefined) item.icon = definition.icon
    if (editable && definition.closable !== false) item.closable = true
    if (definition.unsaved) item.unsaved = true
    if (definition.preview) item.preview = true
    const rows = editable ? (
      <>
        {definition.contextMenu}
        <Suspense fallback={null}>
          <TabRows id={id} />
        </Suspense>
      </>
    ) : (
      definition.contextMenu
    )
    if (rows !== undefined) item.contextMenu = rows
    return item
  })
  const stripRef = useCallback(
    (handle: TabListHandle | null) => {
      if (handle) strips.set(node.id, handle)
      return () => void strips.delete(node.id)
    },
    [strips, node.id]
  )
  const onTabMove = ({ value, to, index }: TabMove) => {
    if (tree.definition(value)?.movable === false) return
    // The strip counts what it shows; a dormant id keeps its place in the JSON.
    const target = stacksOf(tree.layout.root).find((entry) => `${STRIP_ZONE}${entry.id}` === to)
    if (!target) return
    const shown = target.panels.filter((id) => id !== value && tree.definition(id))
    const after = shown[index]
    const rest = target.panels.filter((id) => id !== value)
    shared.place(value, { stack: target.id, index: after === undefined ? rest.length : rest.indexOf(after) })
  }
  return (
    <Tabs.Root value={active ?? ""} onValueChange={(value) => activate(node, value)}>
      <Tabs.List
        ref={stripRef}
        items={items}
        aria-label={messages.group(title)}
        panelId={(value) => (tree.store.has(value) ? tree.store.hostFor(value).id : undefined)}
        {...(editable
          ? {
              dragType: PANE_DRAG,
              zoneId: `${STRIP_ZONE}${node.id}`,
              onClose: (value: string) => void tree.close(value),
              onKeep: (value: string) => tree.definition(value)?.onKeep?.(),
              onTabMove,
            }
          : {})}
      />
    </Tabs.Root>
  )
}

function StackView({ view }: { view: ViewStack }) {
  const shared = useShared()
  const { tree, ready, chrome, maximised } = shared
  const { store, locked } = tree
  const { node, panels, active } = view
  const slot = useRef<HTMLDivElement | null>(null)
  const title = stackTitle(tree, node)
  const definition = active === null ? null : tree.definition(active)
  const covered = maximised !== null && maximised !== node.id
  const hidden = Boolean(node.collapsed) || covered
  const strip = panels.length > 0 && (node.tabs === "always" || (node.tabs !== "never" && panels.length > 1))
  const slotRef = useCallback(
    (element: HTMLDivElement | null) => {
      slot.current = element
      if (!element) return
      return () => {
        slot.current = null
        store.park(element)
      }
    },
    [store]
  )
  useLayoutEffect(() => {
    if (slot.current) store.place(slot.current, panels, hidden ? null : active)
    for (const id of panels) store.describe(id, tree.definition(id)?.title ?? "", strip)
  })
  const bar =
    active !== null && definition && (strip || !locked) ? (
      <div className="fa-pane-bar">
        {strip ? <Strip view={view} title={title} /> : <Title id={active} definition={definition} stripId={`${STRIP_ZONE}${node.id}`} />}
        {locked ? null : (
          <Suspense fallback={<span className="fa-pane-menu" />}>
            <MenuButton id={active} title={definition.title} extra={definition.contextMenu} />
          </Suspense>
        )}
      </div>
    ) : null
  const body = (
    <>
      <div ref={slotRef} className="fa-pane-slot" />
      {ready ? null : <Skeleton.Block className="fa-pane-skeleton" radius="tile" />}
    </>
  )
  const props = {
    "aria-label": title || undefined,
    "data-stack": node.id,
    "data-focus-region": "",
    "data-covered": covered ? "" : undefined,
    "data-maximised": maximised === node.id ? "" : undefined,
    hidden: Boolean(node.collapsed) || undefined,
    inert: covered || undefined,
    className: "fa-pane-stack",
  }
  const content = (
    <>
      {bar}
      {locked ? <div className="fa-pane-body">{body}</div> : <BodyZone view={view} title={title}>{body}</BodyZone>}
    </>
  )
  return chrome === "panel" ? <Panel {...props}>{content}</Panel> : <section {...props}>{content}</section>
}

function SplitView({ view }: { view: ViewSplit }) {
  const shared = useShared()
  const { tree, collapse, resize, resetPair } = shared
  const { definition } = tree
  const messages = useMessages(splitPaneMessages)
  const element = useRef<HTMLDivElement>(null)
  const { node, items } = view
  const horizontal = node.orientation === "horizontal"
  const lengthOf = (child: Element) => {
    const box = child.getBoundingClientRect()
    return horizontal ? box.width : box.height
  }
  /** The two tracks beside separator `at`, and where the first can go. Read at the press (R14.5). */
  const pair = (at: number) => {
    const root = element.current!
    const a = lengthOf(root.children[at * 2]!)
    const b = lengthOf(root.children[at * 2 + 2]!)
    const least = (index: number, current: number) => Math.min(current, minRem(items[index]!.view, horizontal, definition) * remPx())
    return { a, b, low: least(at, a), high: a + b - least(at + 1, b), total: lengthOf(root) }
  }
  const signature = `${node.sizes.join()}|${items.map((item) => item.view.node.id).join()}`
  // aria-value* are written here, and never from React, so nothing renders while tracks resize.
  useLayoutEffect(() => {
    const root = element.current
    if (!root) return
    const write = () => {
      for (let at = 0; at < items.length - 1; at += 1) {
        const separator = root.children[at * 2 + 1]
        if (separator?.getAttribute("role") !== "separator") continue
        const { a, low, high, total } = pair(at)
        const percent = (value: number) => String(total > 0 ? Math.round((value / total) * 100) : 0)
        separator.setAttribute("aria-valuemin", percent(low))
        separator.setAttribute("aria-valuemax", percent(high))
        separator.setAttribute("aria-valuenow", percent(a))
      }
    }
    write()
    return observeElementSize(root, write)
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- the signature names what the measurements depend on
  }, [signature])

  const sizePair = (at: number) => [node.sizes[items[at]!.index] ?? 1, node.sizes[items[at + 1]!.index] ?? 1] as const
  const commit = (at: number, first: PaneSize, second: PaneSize) => {
    resize(node.id, node.sizes.map((size, index) => (index === items[at]!.index ? first : index === items[at + 1]!.index ? second : size)))
  }
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>, at: number) => {
    if (event.button !== 0 || !element.current) return
    const root = element.current
    const handle = event.currentTarget
    const { a, b, low, high, total } = pair(at)
    const [first, second] = sizePair(at)
    const rem = remPx()
    let latest = a
    root.toggleAttribute("data-dragging", true)
    handle.toggleAttribute("data-active", true)
    startSeparatorDrag(event, {
      root,
      horizontal,
      onMove: (delta) => {
        latest = clampLength(a + delta, { low, high })
        const [nextFirst, nextSecond] = resizedPair(first, second, a, b, latest - a, rem)
        root.style.setProperty(`--_t${at}`, sizeCss(nextFirst))
        root.style.setProperty(`--_t${at + 1}`, sizeCss(nextSecond))
        handle.setAttribute("aria-valuenow", String(total > 0 ? Math.round((latest / total) * 100) : 0))
      },
      onEnd: (cancelled) => {
        root.style.removeProperty(`--_t${at}`)
        root.style.removeProperty(`--_t${at + 1}`)
        root.removeAttribute("data-dragging")
        handle.removeAttribute("data-active")
        if (cancelled || latest === a) return
        const [nextFirst, nextSecond] = resizedPair(first, second, a, b, latest - a, rem)
        commit(at, nextFirst, nextSecond)
      },
    })
  }
  /** The stack Enter hides: the one before, or after, that does not hold the primary panel. */
  const giving = (at: number) =>
    [items[at]!.view, items[at + 1]!.view].find((item): item is ViewStack => item.type === "stack" && !item.panels.some((id) => definition(id)?.primary))
  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>, at: number) => {
    const action = separatorKeyAction(event, horizontal, element.current)
    if (!action) return
    event.preventDefault()
    if (action.kind === "toggle") {
      const stack = giving(at)
      if (stack) collapse(stack.node.id, true)
      return
    }
    const { a, b, low, high } = pair(at)
    const target = action.kind === "step" ? clampLength(a + action.delta, { low, high }) : action.kind === "low" ? low : high
    if (target === a) return
    const [first, second] = sizePair(at)
    const [nextFirst, nextSecond] = resizedPair(first, second, a, b, target - a, remPx())
    commit(at, nextFirst, nextSecond)
  }

  const label = (item: ViewNode) => stackTitle(tree, item.type === "stack" ? item.node : stacksOf(item.node).find((entry) => entry.panels.some((id) => definition(id)))!)
  const template = trackTemplate(view, horizontal, definition)
  const style: CSSProperties = horizontal ? { gridTemplateColumns: template } : { gridTemplateRows: template }
  return (
    <div ref={element} className="fa-split fa-pane-split" data-orientation={node.orientation} data-split={node.id} style={style}>
      {items.flatMap((item, at) => {
        const next = items[at + 1]
        const track = (
          <div key={item.view.node.id} id={tree.store.domId(`node:${item.view.node.id}`)} className="fa-pane-track">
            {isCollapsed(item.view) ? (
              <div className="fa-split-rail">
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<IconSidebar />}
                  aria-label={messages.showPane(label(item.view))}
                  aria-expanded={false}
                  onClick={() => collapse(item.view.node.id, false)}
                />
              </div>
            ) : null}
            <NodeView view={item.view} />
          </div>
        )
        if (!next) return [track]
        const gap = isCollapsed(item.view) || isCollapsed(next.view)
        return [
          track,
          gap ? (
            <div key={`gap:${item.view.node.id}`} aria-hidden />
          ) : (
            <Separator
              key={`separator:${item.view.node.id}`}
              horizontal={horizontal}
              label={messages.resize(label(item.view))}
              controls={tree.store.domId(`node:${item.view.node.id}`)}
              onPointerDown={(event) => onPointerDown(event, at)}
              onKeyDown={(event) => onKeyDown(event, at)}
              onDoubleClick={() => resetPair(node, item.index, next.index)}
            />
          ),
        ]
      })}
    </div>
  )
}

function NodeView({ view }: { view: ViewNode }) {
  return view.type === "stack" ? <StackView view={view} /> : <SplitView view={view} />
}

// ── A phone ─────────────────────────────────────────────────────────────────

/** The panel that fills a narrow box: a primary, preferring one active in its stack, else the first stack's. */
function primaryOf(stacks: readonly ViewStack[], definition: PaneTree["definition"]) {
  const primary = stacks.flatMap((stack) => (stack.active !== null && definition(stack.active)?.primary ? [stack.active] : []))[0]
  return primary ?? stacks.flatMap((stack) => stack.panels).find((id) => definition(id)?.primary) ?? stacks[0]?.active ?? null
}

interface PhoneState {
  /** The panel filling the box, once a person has chosen one. */
  main: string | null
  /** The panel in the sheet. */
  sheet: string | null
  /** False while the sheet slides away, with the panel still in it. */
  open: boolean
}

interface PhoneViewProps {
  stacks: readonly ViewStack[]
  main: string | null
  phone: PhoneState
  setPhone: (update: (current: PhoneState) => PhoneState) => void
  show: (id: string) => void
}

function PhoneView({ stacks, main, phone, setPhone, show }: PhoneViewProps) {
  const shared = useShared()
  const { tree } = shared
  const { store, definition } = tree
  const messages = useMessages(paneLayoutMessages)
  const panels = stacks.flatMap((stack) => stack.panels)
  const slot = useRef<HTMLDivElement | null>(null)
  const slotRef = useCallback(
    (element: HTMLDivElement | null) => {
      slot.current = element
      if (!element) return
      return () => {
        slot.current = null
        store.park(element)
      }
    },
    [store]
  )
  const { sheet, open } = phone
  useLayoutEffect(() => {
    if (slot.current) store.place(slot.current, panels.filter((id) => id !== sheet), main)
    for (const id of panels) store.describe(id, definition(id)?.title ?? "", true)
  })
  const sheetRef = useCallback(
    (element: HTMLDivElement | null) => {
      if (!element || sheet === null) return
      store.place(element, [sheet], sheet)
      return () => store.park(element)
    },
    [store, sheet]
  )
  const items = panels.map((id): TabItem => {
    const panel = definition(id)!
    const item: TabItem = { value: id, label: panel.title }
    if (panel.icon !== undefined) item.icon = panel.icon
    if (!tree.locked && panel.closable !== false) item.closable = true
    if (panel.unsaved) item.unsaved = true
    return item
  })
  const choose = (id: string) => {
    if (id === main) setPhone((current) => ({ ...current, open: false }))
    else show(id)
  }
  const title = sheet === null ? "" : (definition(sheet)?.title ?? "")
  return (
    <div className="fa-pane-phone">
      <Panel className="fa-pane-phone-main" aria-label={main === null ? undefined : definition(main)?.title} data-focus-region="">
        <div className="fa-pane-body">
          <div ref={slotRef} className="fa-pane-slot" />
        </div>
      </Panel>
      {panels.length > 1 ? (
        <Tabs.Root className="fa-pane-phone-tabs" value={(open ? sheet : main) ?? ""} onValueChange={choose}>
          <Tabs.List
            items={items}
            aria-label={messages.panels}
            panelId={(value) => (store.has(value) ? store.hostFor(value).id : undefined)}
            {...(tree.locked ? {} : { onClose: (value: string) => void tree.close(value) })}
          />
        </Tabs.Root>
      ) : null}
      {sheet === null ? null : (
        <Suspense fallback={null}>
          <PaneSheet
            title={title}
            open={open}
            onOpenChange={(next) => setPhone((current) => ({ ...current, open: next }))}
            onClosed={() => setPhone((current) => (current.open ? current : { ...current, sheet: null }))}
            slotRef={sheetRef}
          />
        </Suspense>
      )}
    </div>
  )
}

// ── The layout ──────────────────────────────────────────────────────────────

/**
 * Panels in a JSON tree of splits and stacks, in one bounded box. Hosts own the panels and their
 * ids; a stack with several shows tabs. Panels move between stacks and splits by drag or the
 * Move to menu without remounting, and a saved layout keeps ids that no longer resolve.
 */
export function PaneLayout({
  panel,
  layout: layoutProp,
  defaultLayout,
  onLayoutChange,
  locked = false,
  collapseBelow = "40rem", // tokens:allow a prop default, in rem so it follows UI scale
  onUnknownPanels,
  storageKey,
  name = "layout",
  chrome = "panel",
  className,
  ...rest
}: PaneLayoutProps) {
  const messages = useMessages(paneLayoutMessages)
  const scope = useStorageScope()
  const key = storageKey === undefined ? (scope ? `glass-ux.panes:${scope}:${name}` : null) : storageKey
  const rootRef = useRef<HTMLDivElement>(null)
  const announcer = useRef<HTMLSpanElement>(null)
  const uid = useId()
  const [store] = useState(() => new HostStore(`pane-${uid}`))
  const [initial] = useState(() => defaultLayout ?? emptyLayout())
  const [baseline] = useState(() => defaultLayout ?? layoutProp ?? initial)

  const change = useRef<PaneLayoutChange["reason"] | null>(null)
  const reported = (next: PaneLayoutState) => {
    const reason = change.current
    if (!reason) return
    change.current = null
    if (layoutProp === undefined) writeLayout(key, next)
    onLayoutChange?.(next, { reason })
  }
  const [value, setValue] = useControllable<PaneLayoutState>(layoutProp, initial, reported)
  const layout = useMemo(() => normaliseLayout(value), [value])

  // Panels mount after the first commit, once the box and any stored layout are known: a phone
  // never mounts what it does not show, and a server render holds skeletons in the final tracks.
  const [ready, setReady] = useState(false)
  const [narrow, setNarrow] = useState(false)
  useLayoutEffect(() => {
    if (layoutProp === undefined) {
      const stored = readLayout(key)
      if (stored) setValue(stored)
    }
    setReady(true)
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- once, as SplitPane reads its storage once
  }, [])
  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    const update = (width: number) => setNarrow(width > 0 && width < lengthPx(collapseBelow, width))
    update(root.getBoundingClientRect().width)
    return observeElementSize(root, (entry) => update(entry.contentRect.width))
  }, [collapseBelow])

  const panelRef = useRef(panel)
  panelRef.current = panel
  const definitions = new Map<string, PaneDefinition>()
  for (const id of panelsOf(layout.root)) {
    const definition = panel(id)
    if (definition) definitions.set(id, definition)
  }
  const definition = (id: string) => definitions.get(id) ?? panelRef.current(id)
  const view = viewOf(layout.root, (id) => definitions.has(id))
  const stacks = viewStacks(view)
  const unknown = panelsOf(layout.root).filter((id) => !definitions.has(id)).join("\n")
  const unknownRef = useRef(onUnknownPanels)
  unknownRef.current = onUnknownPanels
  useEffect(() => {
    if (unknown) unknownRef.current?.(unknown.split("\n"))
  }, [unknown])

  const update = useCallback(
    (reason: PaneLayoutChange["reason"], operation: (current: PaneLayoutState) => PaneLayoutState) => {
      setValue((previous) => {
        const current = normaliseLayout(previous)
        const next = operation(current)
        if (next === current) {
          change.current = null
          return previous
        }
        change.current = reason
        return next
      })
    },
    [setValue]
  )
  const announce = (text: string) => {
    if (announcer.current) announcer.current.textContent = text
  }
  const titleOf = (id: string) => definition(id)?.title ?? id
  const focusAfter = useRef<string | null>(null)
  const move = (id: string, to: PaneTarget) => update("move", (current) => movePanel(current, id, to))
  const movedText = (id: string, to: PaneTarget) => {
    const target = stacksOf(layout.root).find((stack) => stack.id === to.stack)
    return (("edge" in to && to.edge) ? messages.movedBeside : messages.movedTo)({ title: titleOf(id), target: target ? stackTitle({ definition }, target) : "" })
  }
  const bodies = useRef(new Map<string, HTMLElement>()).current
  const strips = useRef(new Map<string, TabListHandle>()).current
  const edge = useRef<TreeShared["edge"]["current"]>({ zone: null, edge: null, rect: null, indicator: null, rtl: false })

  const [phone, setPhone] = useState<PhoneState>({ main: null, sheet: null, open: false })
  const showOnPhone = (id: string) =>
    setPhone((current) => (definition(id)?.primary ? { ...current, main: id, open: false } : { ...current, sheet: id, open: true }))

  const tree: PaneTree = {
    layout,
    store,
    definition,
    locked,
    narrow,
    open: (id, to) => update("open", (current) => openPanel(current, id, to)),
    close: async (id) => {
      const guard = definition(id)?.canClose
      if (guard && !(await guard())) return false
      update("close", (current) => closePanel(current, id))
      return true
    },
    move: (id, to) => {
      move(id, to)
      announce(movedText(id, to))
    },
    moveFocused: (id, to) => {
      focusAfter.current = id
      move(id, to)
      announce(movedText(id, to))
    },
    reveal: (id) => {
      // The collapsed view is a view: showing a panel there writes nothing.
      if (narrow) showOnPhone(id)
      else update("activate", (current) => revealPanel(current, id))
    },
    setLayout: (next) => update("move", () => normaliseLayout(next)),
    maximise: (stack) => update("maximise", (current) => setMaximised(current, stack)),
    rtl: () => (rootRef.current ? isRtl(rootRef.current) : false),
  }
  const treeRef = useRef(tree)
  treeRef.current = tree
  // One object per layout, so a panel reading it renders when the layout changes and not otherwise.
  const handle = useMemo<PaneLayoutHandle>(
    () => ({
      layout,
      open: (id, to) => treeRef.current.open(id, to),
      close: (id) => treeRef.current.close(id),
      move: (id, to) => treeRef.current.move(id, to),
      reveal: (id) => treeRef.current.reveal(id),
      setLayout: (next) => treeRef.current.setLayout(next),
    }),
    [layout]
  )
  const parkingRef = useCallback(
    (element: HTMLDivElement | null) => {
      store.parking = element
    },
    [store]
  )
  // A menu move: its trigger may have gone, so focus goes to the panel in its new place.
  useLayoutEffect(() => {
    const id = focusAfter.current
    if (id === null) return
    focusAfter.current = null
    const holder = stackOf(layout.root, id)
    const strip = holder && strips.get(holder.id)
    if (strip) strip.focusTab(id)
    else if (store.has(id)) store.hostFor(id).focus({ preventScroll: true })
  })

  const shared: TreeShared = {
    tree,
    ready,
    chrome,
    maximised: layout.maximised ?? null,
    bodies,
    strips,
    edge,
    place: move,
    activate: (stack, id) => {
      if (stack.active !== id) update("activate", (current) => revealPanel(current, id))
    },
    collapse: (stack, collapsed) => update("collapse", (current) => setStackCollapsed(current, stack, collapsed)),
    resize: (split, sizes) => update("resize", (current) => setSizes(current, split, sizes)),
    resetPair: (split, first, second) =>
      update("resize", (current) => {
        const initialSplit = baselineSplit(baseline, split.id)
        const sizes = split.sizes.map((size, index) => (index === first || index === second ? resetSize(initialSplit, split, index) : size))
        return setSizes(current, split.id, sizes)
      }),
  }

  // ── Which panels are shown ────────────────────────────────────────────────
  const phoneMain = phone.main !== null && definitions.has(phone.main) ? phone.main : primaryOf(stacks, definition)
  const phoneSheet = phone.sheet !== null && definitions.has(phone.sheet) ? phone.sheet : null
  const shown = new Set<string>()
  if (ready) {
    if (narrow) {
      if (phoneMain !== null) shown.add(phoneMain)
      if (phoneSheet !== null) shown.add(phoneSheet)
    } else {
      for (const stack of stacks) {
        const covered = layout.maximised && layout.maximised !== stack.node.id
        if (!stack.node.collapsed && !covered && stack.active !== null) shown.add(stack.active)
      }
    }
  }

  // Mounted once, on first show, and kept until the panel closes or stops resolving.
  const mounted = useRef(new Set<string>()).current
  for (const id of shown) mounted.add(id)
  for (const id of mounted) if (!definitions.has(id)) mounted.delete(id)
  const hosts = [...mounted].map((id) => {
    const panelDefinition = definitions.get(id)!
    return <PaneHost key={id} id={id} host={store.hostFor(id)} component={panelDefinition.component} live={shown.has(id) || panelDefinition.whenHidden === "run"} />
  })
  useLayoutEffect(() => store.dropExcept(mounted))

  const pointer = useRef<{ x: number; y: number } | null>(null)
  /** Write where a drop would land to the stack's indicator, with no React state (R18.5). */
  const trackEdge = (zone: string | null) => {
    const point = pointer.current
    if (!point) return
    const state = edge.current
    if (zone !== state.zone) {
      state.indicator?.removeAttribute("data-edge")
      const body = zone?.startsWith(BODY_ZONE) ? bodies.get(zone.slice(BODY_ZONE.length)) : undefined
      edge.current = { zone, edge: null, rect: body?.getBoundingClientRect() ?? null, indicator: body?.querySelector(".fa-pane-drop") ?? null, rtl: body ? isRtl(body) : false }
    }
    const { rect, indicator, rtl } = edge.current
    if (!rect) return
    const next = edgeAt(rect, point, rtl)
    if (next === edge.current.edge) return
    edge.current.edge = next
    indicator?.setAttribute("data-edge", next)
  }
  const onDragMove = (event: DragMoveEvent) => {
    pointer.current = event.pointer
    trackEdge(event.target.zoneId)
  }
  // The target changes on the frame after a move, and a pointer that has stopped sends no more.
  const onDragOver = (event: DragOverEvent) => trackEdge(event.target.zoneId)
  const onDragEnd = (_event: DragEndEvent) => {
    edge.current.indicator?.removeAttribute("data-edge")
    edge.current = { zone: null, edge: null, rect: null, indicator: null, rtl: false }
    pointer.current = null
  }

  const desktop = view ? <NodeView view={view} /> : <StackView view={{ type: "stack", node: stacksOf(layout.root)[0]!, panels: [], active: null }} />
  const framed = chrome === "flush" ? <Panel className="fa-pane-surface">{desktop}</Panel> : desktop
  const body = narrow ? (
    <PhoneView stacks={stacks} main={phoneMain} phone={{ ...phone, sheet: phoneSheet }} setPhone={setPhone} show={showOnPhone} />
  ) : locked ? (
    framed
  ) : (
    <DragDropProvider onDragMove={onDragMove} onDragOver={onDragOver} onDragEnd={onDragEnd}>
      {framed}
    </DragDropProvider>
  )
  return (
    <div
      {...rest}
      ref={rootRef}
      className={cx("fa-pane-layout", className)}
      data-chrome={chrome}
      data-locked={locked ? "" : undefined}
      data-narrow={narrow ? "" : undefined}
      data-maximised={layout.maximised ? "" : undefined}
    >
      <PaneTreeContext value={tree}>
        <SharedContext value={shared}>{body}</SharedContext>
        <div ref={parkingRef} className="fa-pane-parking" />
        <PaneHandleContext value={handle}>{hosts}</PaneHandleContext>
      </PaneTreeContext>
      <span ref={announcer} className="fa-pane-announcer" aria-live="polite" aria-atomic="true" />
    </div>
  )
}

function baselineSplit(layout: PaneLayoutState, id: string): PaneSplit | null {
  const find = (node: PaneNode): PaneSplit | null => {
    if (node.type !== "split") return null
    if (node.id === id) return node
    for (const child of node.children) {
      const found = find(child)
      if (found) return found
    }
    return null
  }
  return find(normaliseLayout(layout).root)
}

/** A track's size after a double-click: what the starting layout gave it, else an equal share. */
function resetSize(initial: PaneSplit | null, split: PaneSplit, index: number): PaneSize {
  const id = split.children[index]?.id
  const at = initial?.children.findIndex((child) => child.id === id) ?? -1
  return at >= 0 ? (initial?.sizes[at] ?? 1) : 1
}
