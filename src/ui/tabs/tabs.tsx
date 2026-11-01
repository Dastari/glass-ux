import { useMessages } from "../../lib/i18n/index.js"
import { tabsMessages } from "./messages.js"
import { Menu } from "@base-ui/react/menu"
import { Tabs as BaseTabs } from "@base-ui/react/tabs"
import {
  Fragment,
  Suspense,
  createContext,
  lazy,
  use,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
  type RefObject,
} from "react"
import { IconChevronDown, IconClose } from "../../icons/generated/icons.js"
import { readingKey } from "../../lib/direction.js"
import { cx } from "../../lib/cx.js"
import { useGlide } from "../../lib/glide.js"
import { numberFormat } from "../../lib/locale/intl.js"
import { useLocale } from "../../lib/locale/use-locale.js"
import { observeElementSize } from "../../lib/use-element-size.js"
import { CountBadge } from "../badge/index.js"
import type { DropEvent } from "../drag-drop/index.js"
import { Skeleton } from "../skeleton/index.js"
import { VisuallyHidden } from "../visually-hidden/index.js"
import { NavMenuPopup } from "./nav-menu.js"
import { fitItems, useChildWidths } from "./overflow.js"
import { rovingKeyDown } from "./roving.js"
import type { TabMenuProps, TabMenuRow, WrapTab } from "./tab-extras.js"

const TabExtras = /* @__PURE__ */ lazy(() => import("./tab-extras.js"))

export interface TabItem {
  value: string
  label: string
  /** Leading icon. Pass it without a size; the tab sizes it. */
  icon?: ReactNode
  /** A count after the label ("Alerts 3"). */
  count?: number
  disabled?: boolean
  /** The tab can be closed; needs `onClose` on the list. */
  closable?: boolean
  /** Unsaved changes: a dot where the close mark sits, named in the tab's accessible name. */
  unsaved?: boolean
  /** A tab the next open replaces: its label is italic until `onKeep`. The host does the replacing. */
  preview?: boolean
  /** Menu rows for this tab's context menu (`Menu.Item`), above the rows the strip adds. */
  contextMenu?: ReactNode
}

/** The default `dragType`: strips with the same type exchange tabs. */
export const TAB_DRAG_TYPE = "glass-ux/tab"

/** `DragItem.data` of a dragged tab, for a DropZone outside a strip. `DragItem.id` is `value`. */
export interface TabDragData {
  /** The tab's value. */
  value: string
  /** The `zoneId` of the strip it came from. */
  stripId: string
}

/**
 * A tab moved: within a strip, or into this one from another. The strip owns no list, so it
 * only reports; update `items` to apply it.
 */
export interface TabMove {
  /** The tab's value. */
  value: string
  /** The `zoneId` of the strip it left. */
  from: string
  /** The `zoneId` of the strip it joined. */
  to: string
  /** Its index in `to`'s items once it is there, with the tab itself left out of the count. */
  index: number
  /** What moved it. */
  input: "pointer" | "keyboard" | "menu"
}

/** Why a tab asks to close. */
export interface TabCloseDetails {
  reason: "button" | "middle-click" | "keyboard" | "menu"
}

/** The handle `Tabs.List` gives through `ref`. */
export interface TabListHandle {
  /**
   * Move focus to a tab of this strip, now or as soon as it renders, such as just after a
   * host adds it. Every tab also carries `data-value`.
   */
  focusTab: (value: string) => void
}

/**
 * The attributes a link-mode tab (or its More-menu row) must carry. `renderLink` spreads them
 * onto the router's link element, so the design system never imports a router.
 */
export interface TabLinkRenderProps {
  className: string
  "data-value": string
  "data-active"?: ""
  "data-roving"?: ""
  "aria-current"?: "page"
  tabIndex?: number
  /** The roving-focus key handler (arrow keys move between tabs). Pass it to the link's `onKeyDown`, chaining any handler of your own. */
  onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void
  children?: ReactNode
}

/** Render one tab as a link (a TanStack Router `<Link>` in the app; see RouteTabs). */
export type RenderTabLink<T extends TabItem> = (item: T, props: TabLinkRenderProps) => ReactElement

// ── Shared pieces ───────────────────────────────────────────────────────────

function TabContent({ item }: { item: TabItem }) {
  return (
    <>
      {item.icon}
      <span className="fa-tab-label">{item.label}</span>
      {item.count !== undefined ? <CountBadge value={item.count} /> : null}
    </>
  )
}

function MenuRowContent({ item }: { item: TabItem }) {
  const messages = useMessages(tabsMessages)
  return (
    <>
      {item.icon}
      <span className="fa-item-label">
        {item.label}
        {item.unsaved ? <> <VisuallyHidden>{messages.unsaved}</VisuallyHidden></> : null}
      </span>
      {item.count !== undefined ? <CountBadge value={item.count} className="fa-item-trail" /> : null}
    </>
  )
}

/**
 * The marks after a tab's label. A tab's children are presentational to assistive technology
 * (ARIA `tab`), so no real button can sit inside one: the close mark is a pointer target
 * hidden from the accessibility tree, and the keyboard, screen readers and touch screen
 * readers use Delete, the context menu or the strip's Close button. The marks hold the same
 * box whichever shows, so hover never moves anything (R9.6).
 */
function TabMarks({ item, closable, onClose }: { item: TabItem; closable: boolean; onClose?: () => void }) {
  const messages = useMessages(tabsMessages)
  const stop = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation()
    if (event.button === 0) event.preventDefault()
  }
  return (
    <>
      {/* The spaces keep the words apart in the accessible name; flex layout drops them. */}
      {item.preview ? <> <VisuallyHidden>{messages.preview}</VisuallyHidden></> : null}
      {item.unsaved ? <> <VisuallyHidden>{messages.unsaved}</VisuallyHidden></> : null}
      {closable || item.unsaved ? (
        <span className="fa-tab-marks">
          {item.unsaved ? <span className="fa-tab-unsaved" aria-hidden /> : null}
          {closable ? (
            // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- pointer only: Delete and the Close button are the keyboard routes, and a tab may hold no control
            <span
              className="fa-tab-close"
              aria-hidden
              data-dnd-ignore=""
              title={messages.closeTab(item.label)}
              onPointerDown={(event) => event.stopPropagation()}
              onMouseDown={stop}
              onClick={(event) => {
                event.stopPropagation()
                onClose?.()
              }}
            >
              <IconClose />
            </span>
          ) : null}
        </span>
      ) : null}
    </>
  )
}

/** How a strip draws each tab's face and its More-menu row; VerticalTabs adds its markers. */
interface StripFaces<T extends TabItem> {
  /** The tab's face (also measured, so it must match what renders). */
  content?: (item: T) => ReactNode
  /** The item's row in the More menu. */
  menuContent?: (item: T) => ReactNode
}

const defaultContent = (item: TabItem) => <TabContent item={item} />
const defaultMenuContent = (item: TabItem) => <MenuRowContent item={item} />

function MoreFace() {
  const messages = useMessages(tabsMessages)

  return (
    <>
      <span className="fa-tab-label">{messages.more}</span>
      <IconChevronDown className="fa-tabs-more-chevron" />
    </>
  )
}

interface Overflow {
  barRef: { current: HTMLDivElement | null }
  measureRef: RefObject<HTMLDivElement | null>
  visible: Set<number>
  /** Keeps the item out of the visible layout. */
  hidden: number[]
  solo: boolean
}

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect

/**
 * Measure the strip and decide which tabs stay inline; `keep` is never hidden. Only a width that
 * changes which tabs fit renders, so a strip in a pane resized by drag stays still (R18.5).
 */
function useTabOverflow(items: TabItem[], keep: number): Overflow {
  const barRef = useRef<HTMLDivElement | null>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const signature = items.map((item) => `${item.value}:${item.label}:${item.count ?? ""}:${item.closable ? "c" : ""}:${item.unsaved ? "u" : ""}`).join("|")
  const { widths, gap } = useChildWidths(measureRef, signature)
  const available = useRef(0)
  const shown = useRef<number[]>([])
  const [fitChange, bumpFit] = useReducer((count: number) => count + 1, 0)

  const fit = (width: number) => {
    const itemWidths = widths.slice(0, items.length)
    if (itemWidths.length !== items.length || width <= 0) return items.map((_, index) => index)
    return fitItems({ widths: itemWidths, available: width, gap, moreWidth: widths[items.length] ?? 0, keep })
  }
  const latestFit = useRef(fit)
  latestFit.current = fit

  useIsomorphicLayoutEffect(() => {
    const bar = barRef.current
    if (!bar) return
    const update = (width: number) => {
      available.current = width
      const next = latestFit.current(width)
      if (next.length !== shown.current.length || next.some((index, at) => index !== shown.current[at])) bumpFit()
    }
    update(bar.getBoundingClientRect().width)
    return observeElementSize(bar, (entry) => update(entry.contentBoxSize?.[0]?.inlineSize ?? entry.contentRect.width))
  }, [])

  return useMemo(() => {
    const indices = fit(available.current)
    shown.current = indices
    const visible = new Set(indices)
    const hidden = items.flatMap((_, index) => (visible.has(index) ? [] : [index]))
    return { barRef, measureRef, visible, hidden, solo: hidden.length > 0 && visible.size === 1 }
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- fit is built from these, and fitChange reports a new width
  }, [widths, gap, items, keep, fitChange])
}

/** The off-screen row the strip measures: every tab plus the More trigger at natural width. */
function MeasureRow<T extends TabItem>({
  items,
  measureRef,
  activeIndex,
  content,
  marks,
}: {
  items: T[]
  measureRef: RefObject<HTMLDivElement | null>
  activeIndex: number
  content: (item: T) => ReactNode
  /** The marks after the label, so the widths count them. */
  marks?: (item: T) => ReactNode
}) {
  return (
    <div className="fa-tabs-measure" aria-hidden>
      <div className="fa-tabs-measure-row" ref={measureRef}>
        {items.map((item, index) => (
          <span key={item.value} className="fa-tab" data-active={index === activeIndex ? "" : undefined}>
            {content(item)}
            {marks?.(item)}
          </span>
        ))}
        <span className="fa-tab fa-tabs-more">
          <MoreFace />
        </span>
      </div>
    </div>
  )
}

// ── Tabs (Base UI, panels on the same page) ─────────────────────────────────

interface TabsContextValue {
  value: string
  select: (value: string) => void
}

const TabsContext = /* @__PURE__ */ createContext<TabsContextValue | null>(null)

function useTabsContext() {
  const context = use(TabsContext)
  if (!context) throw new Error("Tabs.List must be inside Tabs.Root")
  return context
}

export interface TabsRootProps extends Omit<ComponentProps<typeof BaseTabs.Root>, "value" | "defaultValue" | "onValueChange" | "className" | "orientation"> {
  className?: string
  value?: string
  defaultValue?: string
  /** Called with the next tab. Write it to the URL when the tab is a place (R6.2). */
  onValueChange?: (value: string) => void
}

function TabsRoot({ value, defaultValue, onValueChange, className, children, ...rest }: TabsRootProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? "")
  const current = value ?? uncontrolled
  const select = useCallback(
    (next: string) => {
      if (value === undefined) setUncontrolled(next)
      onValueChange?.(next)
    },
    [value, onValueChange]
  )
  const context = useMemo(() => ({ value: current, select }), [current, select])

  return (
    <TabsContext value={context}>
      <BaseTabs.Root
        {...rest}
        value={current}
        onValueChange={(next) => select(String(next))}
        className={cx("fa-tabs", className)}
      >
        {children}
      </BaseTabs.Root>
    </TabsContext>
  )
}

export interface TabsListProps {
  items: TabItem[]
  /** Names the tab list for assistive tech, e.g. "NST-C106 sections". */
  "aria-label"?: string
  className?: string
  /**
   * A closable tab asks to close: from its close mark, a middle-click, Delete, its context
   * menu or the strip's Close button. Remove it from `items` to close it, or keep it (ask
   * first when it is `unsaved`, R13.7). When the active tab goes, its neighbour is selected,
   * and focus that was on it moves to the tab now in its place.
   */
  onClose?: (value: string, details: TabCloseDetails) => void
  /** A `preview` tab should stay: double-clicked, or Keep open in its menu. Clear `preview` in response. */
  onKeep?: (value: string) => void
  /**
   * Makes tabs reorderable: by drag on a pointer that hovers, Shift with the arrow keys (in
   * reading direction), Shift+Home and Shift+End, and Move rows in the context menu, the
   * single-pointer route (WCAG 2.5.7). The strip owns no list: each move reports here, once,
   * on the strip it lands on, and `items` changes when you change it. A keyboard move selects
   * the tab, so it stays visible (R6.6). Dragging is off where nothing hovers (touch).
   */
  onTabMove?: (move: TabMove) => void
  /**
   * What a dragged tab carries. Strips with the same type under one DragDropProvider exchange
   * tabs, and a DropZone with this `accept` anywhere under it takes them as an ordinary drop:
   * `event.item.id` is the value and `event.item.data` is {@link TabDragData}. Each value must
   * be unique under the provider. A strip with no provider above brings its own.
   */
  dragType?: string
  /** This strip's id in the drag system, and `from` and `to` in {@link TabMove}. Default generated. */
  zoneId?: string
  /**
   * The id of a tab's panel when panels render outside `Tabs.Panel`: sets the tab's
   * `aria-controls`. Return undefined for a panel that is not in the document, since the
   * attribute must name an element that exists.
   */
  panelId?: (value: string) => string | undefined
  /** The strip's handle: {@link TabListHandle}. */
  ref?: Ref<TabListHandle>
}

/** A tab strip inside a Base UI Tabs root, told its value and how to select. */
export interface TabStripProps<T extends TabItem> extends StripFaces<T>, Pick<TabsListProps, "onClose" | "onKeep" | "onTabMove" | "dragType" | "zoneId" | "panelId" | "ref"> {
  items: T[]
  value: string
  select: (value: string) => void
  "aria-label"?: string
  className?: string
}

/** A request to focus a tab that may not have rendered yet lapses after this long. */
const FOCUS_REQUEST_MS = 1000
const noWrap: WrapTab = (_, tab) => tab(undefined)

/**
 * The strip behind `Tabs.List`, for other components that hold their own Base UI Tabs root
 * (VerticalTabs in a narrow container). Not part of the package's public API.
 */
export function TabStrip<T extends TabItem>(props: TabStripProps<T>) {
  const { items, onClose, onKeep, onTabMove, dragType = TAB_DRAG_TYPE, zoneId, "aria-label": label } = props
  const generatedId = useId()
  const stripId = zoneId ?? generatedId
  const dropHandler = useRef<((event: DropEvent<TabDragData>) => void) | null>(null)
  const extended = Boolean(onClose || onKeep || onTabMove) || items.some((item) => item.contextMenu)
  // The extras load with a plain strip in their place; once they are in, the strip mounts
  // anew under them, and measures itself again.
  if (!extended) return <StripBody {...props} stripId={stripId} extended={false} dropHandler={dropHandler} wrapTab={noWrap} />
  const zone = onTabMove ? { id: stripId, label: label ?? stripId, type: dragType, onDrop: (event: DropEvent<TabDragData>) => dropHandler.current?.(event) } : null
  return (
    <Suspense fallback={<StripBody {...props} stripId={stripId} extended dropHandler={dropHandler} wrapTab={noWrap} />}>
      <TabExtras zone={zone}>{(wrapTab, zoneRef, tabMenu) => <StripBody {...props} stripId={stripId} extended dropHandler={dropHandler} wrapTab={wrapTab} zoneRef={zoneRef} tabMenu={tabMenu} />}</TabExtras>
    </Suspense>
  )
}

interface StripBodyProps<T extends TabItem> extends TabStripProps<T> {
  stripId: string
  /** Close, keep, move or a context menu is in use. */
  extended: boolean
  /** Filled here: the zone is above the strip, and the visible tabs are known here. */
  dropHandler: { current: ((event: DropEvent<TabDragData>) => void) | null }
  wrapTab: WrapTab
  zoneRef?: Ref<HTMLElement> | undefined
  /** The context menu, once loaded. */
  tabMenu?: (props: TabMenuProps) => ReactNode
}

function StripBody<T extends TabItem>({ items, value, select, className, content = defaultContent, menuContent = defaultMenuContent, onClose, onKeep, onTabMove, panelId, ref, stripId, extended, dropHandler, wrapTab, zoneRef, tabMenu, ...rest }: StripBodyProps<T>) {
  const messages = useMessages(tabsMessages)
  const locale = useLocale()

  const activeIndex = items.findIndex((item) => item.value === value)
  const { barRef, measureRef, visible, hidden, solo } = useTabOverflow(items, activeIndex)
  const pendingFocus = useRef<string | null>(null)
  const hintId = `${useId()}-hint`
  const [announcement, setAnnouncement] = useState("")

  const tabFor = (next: string) => barRef.current?.querySelector<HTMLElement>(`.fa-tabs-list [data-value="${CSS.escape(next)}"]`)

  // A tab chosen from More is swapped into the strip; keyboard focus follows it there.
  useEffect(() => {
    if (pendingFocus.current === value) tabFor(value)?.focus()
  })

  // Focus for a tab that a move re-inserts, or that a host adds after a drop.
  const focusRequest = useRef<{ value: string; at: number } | null>(null)
  const requestFocus = useCallback((next: string) => {
    focusRequest.current = { value: next, at: Date.now() }
  }, [])
  useEffect(() => {
    const request = focusRequest.current
    if (!request) return
    if (Date.now() - request.at > FOCUS_REQUEST_MS) {
      focusRequest.current = null
      return
    }
    const tab = tabFor(request.value)
    if (!tab) return
    focusRequest.current = null
    tab.focus()
  })
  useImperativeHandle(
    ref,
    () => ({
      focusTab: (next) => {
        const tab = tabFor(next)
        if (tab) tab.focus()
        else requestFocus(next)
      },
    }),
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- tabFor reads the ref
    [requestFocus]
  )

  // ── Closing ───────────────────────────────────────────────────────────────
  const closable = (item: T) => Boolean(item.closable && onClose)
  const closing = useRef<{ value: string; index: number } | null>(null)
  const requestClose = (item: T, reason: TabCloseDetails["reason"]) => {
    closing.current = { value: item.value, index: items.indexOf(item) }
    onClose?.(item.value, { reason })
  }
  const lastActive = useRef(activeIndex)
  useEffect(() => {
    const previous = lastActive.current
    lastActive.current = activeIndex
    const closed = closing.current
    closing.current = null
    if (!onClose && !onTabMove) return
    const present = closed && items.some((item) => item.value === closed.value)
    const place = closed && !present ? closed.index : previous
    const neighbour = (at: number) => items.slice(at).find((item) => !item.disabled) ?? items.slice(0, at).findLast((item) => !item.disabled)
    // The active tab went (closed, or dragged to another strip): its neighbour takes over.
    const next = activeIndex < 0 && previous >= 0 ? neighbour(previous) : null
    if (next) select(next.value)
    // Focus was on a tab that has gone, so it fell to the page.
    if (closed && !present && (document.activeElement === document.body || barRef.current?.contains(document.activeElement))) {
      const target = next ?? neighbour(place ?? 0)
      if (target) requestFocus(target.value)
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- runs when the list or the active tab changes
  }, [items, activeIndex])

  // ── Moving ────────────────────────────────────────────────────────────────
  const moveTab = (item: T, index: number, input: TabMove["input"]) => {
    if (!onTabMove) return
    const from = items.indexOf(item)
    const bounded = Math.max(0, Math.min(items.length - 1, index))
    if (bounded === from) return
    if (item.value !== value) select(item.value)
    requestFocus(item.value)
    onTabMove({ value: item.value, from: stripId, to: stripId, index: bounded, input })
    setAnnouncement(messages.movedTo({ label: item.label, position: numberFormat(locale).format(bounded + 1), total: numberFormat(locale).format(items.length) }))
  }
  const onDrop = (event: DropEvent<TabDragData>) => {
    const moved = event.item.data.value
    const rest_ = items.filter((item) => item.value !== moved)
    // The zone counts the tabs in the strip, not those in More; past the last is the very end.
    const shown = rest_.filter((item) => visible.has(items.indexOf(item)))
    const at = shown[event.target.index ?? shown.length]
    const index = at ? rest_.indexOf(at) : rest_.length
    onTabMove?.({ value: moved, from: event.item.data.stripId, to: stripId, index, input: event.input })
    requestFocus(moved)
  }
  dropHandler.current = onDrop

  const onTabKeyDown = (event: KeyboardEvent<HTMLElement>, item: T) => {
    if ((event.key === "Delete" || event.key === "Backspace") && closable(item) && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault()
      requestClose(item, "keyboard")
      return
    }
    if (!onTabMove || !event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return
    const index = items.indexOf(item)
    const key = readingKey(event.key, event.currentTarget)
    const target = key === "ArrowLeft" ? index - 1 : key === "ArrowRight" ? index + 1 : key === "Home" ? 0 : key === "End" ? items.length - 1 : null
    if (target === null) return
    event.preventDefault()
    event.stopPropagation()
    moveTab(item, target, "keyboard")
  }

  const marks = (item: T, close?: () => void) => <TabMarks item={item} closable={closable(item)} onClose={close} />
  const active = items[activeIndex]
  const hint = onClose && onTabMove ? messages.closeAndMoveHint : onClose ? messages.closeHint : onTabMove ? messages.moveHint : null

  const tabElement = (item: T, dragRef: Ref<HTMLElement> | undefined) => {
    const index = items.indexOf(item)
    const opts: Partial<ComponentProps<typeof BaseTabs.Tab>> & Record<string, unknown> = extended
      ? {
          "aria-controls": panelId?.(item.value),
          "aria-describedby": hint ? hintId : undefined,
          "aria-keyshortcuts": closable(item) ? "Delete" : undefined,
          "data-preview": item.preview ? "" : undefined,
          "data-unsaved": item.unsaved ? "" : undefined,
          onKeyDown: (event) => onTabKeyDown(event, item),
          onMouseDown: (event) => {
            // A middle press would start autoscroll.
            if (event.button === 1 && closable(item)) event.preventDefault()
          },
          onAuxClick: (event) => {
            if (event.button === 1 && closable(item)) requestClose(item, "middle-click")
          },
          onDoubleClick: () => {
            if (item.preview) onKeep?.(item.value)
          },
        }
      : panelId
        ? { "aria-controls": panelId(item.value) }
        : {}
    const tab = (
      <BaseTabs.Tab {...opts} key={item.value} ref={dragRef as Ref<HTMLElement & HTMLButtonElement>} value={item.value} disabled={item.disabled} className="fa-tab" data-value={item.value}>
        {content(item)}
        {extended ? marks(item, () => requestClose(item, "button")) : null}
      </BaseTabs.Tab>
    )
    const rows: TabMenuRow[] = []
    if (item.preview && onKeep) rows.push({ label: messages.keepOpen, run: () => onKeep(item.value) })
    if (onTabMove && items.length > 1) {
      rows.push({ label: messages.moveEarlier, disabled: index === 0, run: () => moveTab(item, index - 1, "menu") })
      rows.push({ label: messages.moveLater, disabled: index === items.length - 1, run: () => moveTab(item, index + 1, "menu") })
    }
    if (closable(item)) rows.push({ label: messages.close, shortcut: "delete", run: () => requestClose(item, "menu") })
    return tabMenu && (rows.length > 0 || item.contextMenu) ? tabMenu({ label: messages.tabActions(item.label), tab, rows, extra: item.contextMenu }) : tab
  }

  return (
    <div
      ref={(element) => {
        barRef.current = element
        if (typeof zoneRef === "function") zoneRef(element)
      }}
      className={cx("fa-tabs-bar", className)}
    >
      <BaseTabs.List className="fa-tabs-list" aria-label={rest["aria-label"]} data-solo={solo ? "" : undefined}>
        {items.map((item, index) => (visible.has(index) ? <Fragment key={item.value}>{wrapTab(item, (ref_) => tabElement(item, ref_))}</Fragment> : null))}
        <BaseTabs.Indicator className="fa-tabs-indicator fa-glide" />
      </BaseTabs.List>
      {hidden.length > 0 ? (
        <Menu.Root>
          <Menu.Trigger className="fa-tab fa-tabs-more" aria-label={messages.moreTabs(hidden.length)}>
            <MoreFace />
          </Menu.Trigger>
          <NavMenuPopup
            align="end"
            finalFocus={() => {
              const chosen = pendingFocus.current
              pendingFocus.current = null
              return chosen === null ? true : (tabFor(chosen) ?? false)
            }}
          >
            {hidden.map((index) => {
              const item = items[index]
              if (!item) return null
              return (
                <Menu.Item
                  key={item.value}
                  className="fa-item fa-menu-item"
                  disabled={item.disabled}
                  onClick={() => {
                    pendingFocus.current = item.value
                    select(item.value)
                  }}
                >
                  {menuContent(item)}
                </Menu.Item>
              )
            })}
          </NavMenuPopup>
        </Menu.Root>
      ) : null}
      {active && closable(active) ? (
        // Outside the tablist, which may hold only tabs: the route for screen readers on touch,
        // and shown to the keyboard on focus.
        <button type="button" className="fa-tabs-close-active" aria-label={messages.closeTab(active.label)} onClick={() => requestClose(active, "button")}>
          <IconClose />
        </button>
      ) : null}
      {extended ? (
        <>
          {hint ? (
            <span id={hintId} hidden>
              {hint}
            </span>
          ) : null}
          <span className="fa-tabs-announcer" aria-live="polite" aria-atomic="true">
            {announcement}
          </span>
        </>
      ) : null}
      <MeasureRow items={items} measureRef={measureRef} activeIndex={activeIndex} content={content} marks={extended ? (item) => marks(item) : undefined} />
    </div>
  )
}

/**
 * The L2 tab strip. Tabs never wrap: whatever does not fit moves into a trailing "More"
 * menu, and the active tab is always swapped back in so it stays visible (R6.6).
 */
function TabsList(props: TabsListProps) {
  const { value, select } = useTabsContext()
  return <TabStrip {...props} value={value} select={select} />
}

function TabsPanel({ className, ...rest }: ComponentProps<typeof BaseTabs.Panel> & { className?: string }) {
  return <BaseTabs.Panel {...rest} className={cx("fa-tabs-panel", className)} />
}

/**
 * In-page tabs on Base UI's tabs: `Root` (selected value, controlled or uncontrolled),
 * `List` (the tab strip from `items`; tabs that do not fit move to a More menu) and
 * `Panel`. For tabs that are routes, use `TabNav`.
 */
export const Tabs = {
  Root: TabsRoot,
  List: TabsList,
  Panel: TabsPanel,
}

// ── TabNav (link mode, router-agnostic) ─────────────────────────────────────

export interface TabNavProps<T extends TabItem> {
  items: T[]
  /** The active tab's value — derived from the location by the route adapter. */
  value: string | null
  /** Renders a tab or More-menu row as a link, spreading the props given. */
  renderLink: RenderTabLink<T>
  /** Accessible name when a visible label does not name the control. */
  "aria-label": string
  className?: string
}

/**
 * The same strip as `Tabs.List` for tabs that are places (R6.2: routes by default). Renders
 * links in a `<nav>`: the active one carries `aria-current="page"`, one link is tabbable,
 * and the arrow keys, Home / End and Space work exactly as in `Tabs`. Overflow moves into the
 * same "More" menu, whose rows are links too. Router-agnostic: `RouteTabs` adapts it to
 * TanStack Router.
 */
export function TabNav<T extends TabItem>(props: TabNavProps<T>) {
  return <TabNavStrip {...props} />
}

/** `TabNav` with its faces drawn by the caller (VerticalTabNav's markers). Not part of the package's public API. */
export function TabNavStrip<T extends TabItem>({
  items,
  value,
  renderLink,
  className,
  content = defaultContent,
  menuContent = defaultMenuContent,
  ...rest
}: TabNavProps<T> & StripFaces<T>) {
  const messages = useMessages(tabsMessages)

  const activeIndex = items.findIndex((item) => item.value === value)
  const { barRef, measureRef, visible, hidden, solo } = useTabOverflow(items, activeIndex)
  const listRef = useRef<HTMLDivElement>(null)
  const indicatorRef = useRef<HTMLSpanElement>(null)
  const tabbable = activeIndex >= 0 ? activeIndex : items.findIndex((_, index) => visible.has(index))

  // The same glide as Base UI's indicator, placed on the active link.
  const placed = useGlide(indicatorRef, "[data-active]", "x", [value, activeIndex, visible.size, solo])

  return (
    <nav aria-label={rest["aria-label"]} className={cx("fa-tabs", className)}>
      <div ref={barRef} className="fa-tabs-bar">
        <div ref={listRef} className="fa-tabs-list" data-solo={solo ? "" : undefined} data-roving-group="">
          {items.map((item, index) => {
            if (!visible.has(index)) return null
            const active = index === activeIndex
            return (
              <Fragment key={item.value}>
                {renderLink(item, {
                  className: "fa-tab",
                  "data-value": item.value,
                  "data-active": active ? "" : undefined,
                  "data-roving": "",
                  "aria-current": active ? "page" : undefined,
                  tabIndex: index === tabbable ? 0 : -1,
                  onKeyDown: (event) => rovingKeyDown(event, "horizontal"),
                  children: content(item),
                })}
              </Fragment>
            )
          })}
          {activeIndex >= 0 ? <span ref={indicatorRef} className="fa-tabs-indicator fa-glide" aria-hidden hidden={!placed} /> : null}
        </div>
        {hidden.length > 0 ? (
          <Menu.Root>
            <Menu.Trigger className="fa-tab fa-tabs-more" aria-label={messages.moreTabs(hidden.length)}>
              <MoreFace />
            </Menu.Trigger>
            <NavMenuPopup align="end">
              {hidden.map((index) => {
                const item = items[index]
                if (!item) return null
                return (
                  <Menu.LinkItem
                    key={item.value}
                    closeOnClick
                    label={item.label}
                    render={renderLink(item, { className: "fa-item fa-menu-item", "data-value": item.value })}
                  >
                    {menuContent(item)}
                  </Menu.LinkItem>
                )
              })}
            </NavMenuPopup>
          </Menu.Root>
        ) : null}
        <MeasureRow items={items} measureRef={measureRef} activeIndex={activeIndex} content={content} />
      </div>
    </nav>
  )
}

// ── Skeleton ────────────────────────────────────────────────────────────────

export interface TabsSkeletonProps {
  /** How many tabs to stand in for. */
  count?: number
  /** Icons supplied for the supported choices. */
  icons?: boolean
  className?: string
}

/** Placeholder strip with the same height and rhythm as the real tabs. */
export function TabsSkeleton({ count = 4, icons = true, className }: TabsSkeletonProps) {
  return (
    <div className={cx("fa-tabs-bar", className)} aria-hidden data-skeleton="">
      <div className="fa-tabs-list">
        {Array.from({ length: count }, (_, index) => (
          <span key={index} className="fa-tab" data-skeleton="">
            {icons ? <Skeleton.Block className="fa-tab-skel-icon" radius="item" /> : null}
            <Skeleton.Text className="fa-tab-skel-label" data-index={index % 3} />
          </span>
        ))}
      </div>
    </div>
  )
}
