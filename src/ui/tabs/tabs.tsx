import { Menu } from "@base-ui/react/menu"
import { Tabs as BaseTabs } from "@base-ui/react/tabs"
import {
  Fragment,
  createContext,
  use,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from "react"
import { IconChevronDown } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { useElementSize } from "../../lib/use-element-size.js"
import { CountBadge } from "../badge/index.js"
import { Skeleton } from "../skeleton/index.js"
import { NavMenuPopup } from "./nav-menu.js"
import { fitItems, useChildWidths } from "./overflow.js"
import { rovingKeyDown } from "./roving.js"

const useIsomorphicLayoutEffect = typeof window === "undefined" ? () => {} : useLayoutEffect

export interface TabItem {
  value: string
  label: string
  /** Leading icon. Pass it without a size; the tab sizes it. */
  icon?: ReactNode
  /** A count after the label ("Alerts 3"). */
  count?: number
  disabled?: boolean
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
  /** Called when key down occurs. The callback type specifies its arguments. */
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

function MoreFace() {
  return (
    <>
      <span className="fa-tab-label">More</span>
      <IconChevronDown className="fa-tabs-more-chevron" />
    </>
  )
}

interface Overflow {
  barRef: RefObject<HTMLDivElement | null>
  measureRef: RefObject<HTMLDivElement | null>
  visible: Set<number>
  /** Keeps the item out of the visible layout. */
  hidden: number[]
  solo: boolean
}

/** Measure the strip and decide which tabs stay inline; `keep` is never hidden. */
function useTabOverflow(items: TabItem[], keep: number): Overflow {
  const barRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const bar = useElementSize(barRef)
  const signature = items.map((item) => `${item.value}:${item.label}:${item.count ?? ""}`).join("|")
  const { widths, gap } = useChildWidths(measureRef, signature)

  return useMemo(() => {
    const itemWidths = widths.slice(0, items.length)
    const measured = itemWidths.length === items.length && bar.width > 0
    const indices = measured
      ? fitItems({
          widths: itemWidths,
          available: bar.width,
          gap,
          moreWidth: widths[items.length] ?? 0,
          keep,
        })
      : items.map((_, index) => index)
    const visible = new Set(indices)
    const hidden = items.flatMap((_, index) => (visible.has(index) ? [] : [index]))
    return { barRef, measureRef, visible, hidden, solo: hidden.length > 0 && visible.size === 1 }
  }, [widths, gap, items, bar.width, keep])
}

/** The off-screen row the strip measures: every tab plus the More trigger at natural width. */
function MeasureRow({ items, measureRef, activeIndex }: { items: TabItem[]; measureRef: RefObject<HTMLDivElement | null>; activeIndex: number }) {
  return (
    <div className="fa-tabs-measure" aria-hidden>
      <div className="fa-tabs-measure-row" ref={measureRef}>
        {items.map((item, index) => (
          <span key={item.value} className="fa-tab" data-active={index === activeIndex ? "" : undefined}>
            <TabContent item={item} />
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

const TabsContext = createContext<TabsContextValue | null>(null)

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
}

/**
 * The L2 tab strip. Tabs never wrap: whatever does not fit moves into a trailing "More"
 * menu, and the active tab is always swapped back in so it stays visible (R6.6).
 */
function TabsList({ items, className, ...rest }: TabsListProps) {
  const { value, select } = useTabsContext()
  const activeIndex = items.findIndex((item) => item.value === value)
  const { barRef, measureRef, visible, hidden, solo } = useTabOverflow(items, activeIndex)
  const pendingFocus = useRef<string | null>(null)

  const tabFor = (next: string) => barRef.current?.querySelector<HTMLElement>(`.fa-tabs-list [data-value="${CSS.escape(next)}"]`)

  // A tab chosen from More is swapped into the strip; keyboard focus follows it there.
  useEffect(() => {
    if (pendingFocus.current === value) tabFor(value)?.focus()
  })

  return (
    <div ref={barRef} className={cx("fa-tabs-bar", className)}>
      <BaseTabs.List className="fa-tabs-list" aria-label={rest["aria-label"]} data-solo={solo ? "" : undefined}>
        {items.map((item, index) =>
          visible.has(index) ? (
            <BaseTabs.Tab key={item.value} value={item.value} disabled={item.disabled} className="fa-tab" data-value={item.value}>
              <TabContent item={item} />
            </BaseTabs.Tab>
          ) : null
        )}
        <BaseTabs.Indicator className="fa-tabs-indicator" />
      </BaseTabs.List>
      {hidden.length > 0 ? (
        <Menu.Root>
          <Menu.Trigger className="fa-tab fa-tabs-more" aria-label={`More tabs (${hidden.length})`}>
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
                  {item.icon}
                  <span className="fa-item-label">{item.label}</span>
                  {item.count !== undefined ? <CountBadge value={item.count} className="fa-item-trail" /> : null}
                </Menu.Item>
              )
            })}
          </NavMenuPopup>
        </Menu.Root>
      ) : null}
      <MeasureRow items={items} measureRef={measureRef} activeIndex={activeIndex} />
    </div>
  )
}

function TabsPanel({ className, ...rest }: ComponentProps<typeof BaseTabs.Panel> & { className?: string }) {
  return <BaseTabs.Panel {...rest} className={cx("fa-tabs-panel", className)} />
}

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
export function TabNav<T extends TabItem>({ items, value, renderLink, className, ...rest }: TabNavProps<T>) {
  const activeIndex = items.findIndex((item) => item.value === value)
  const { barRef, measureRef, visible, hidden, solo } = useTabOverflow(items, activeIndex)
  const listRef = useRef<HTMLDivElement>(null)
  const [indicator, setIndicator] = useState<CSSProperties>({})
  const tabbable = activeIndex >= 0 ? activeIndex : items.findIndex((_, index) => visible.has(index))

  // Mirror Base UI's indicator variables so the same CSS slides the underline.
  useIsomorphicLayoutEffect(() => {
    const list = listRef.current
    const active = list?.querySelector<HTMLElement>("[data-active]")
    if (!list || !active) {
      setIndicator((current) => (Object.keys(current).length ? {} : current))
      return
    }
    const next = { "--active-tab-left": `${active.offsetLeft}px`, "--active-tab-width": `${active.offsetWidth}px` } as CSSProperties
    setIndicator((current) => (JSON.stringify(current) === JSON.stringify(next) ? current : next))
  })

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
                  children: <TabContent item={item} />,
                })}
              </Fragment>
            )
          })}
          {activeIndex >= 0 ? <span className="fa-tabs-indicator" style={indicator} aria-hidden /> : null}
        </div>
        {hidden.length > 0 ? (
          <Menu.Root>
            <Menu.Trigger className="fa-tab fa-tabs-more" aria-label={`More tabs (${hidden.length})`}>
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
                    {item.icon}
                    <span className="fa-item-label">{item.label}</span>
                    {item.count !== undefined ? <CountBadge value={item.count} className="fa-item-trail" /> : null}
                  </Menu.LinkItem>
                )
              })}
            </NavMenuPopup>
          </Menu.Root>
        ) : null}
        <MeasureRow items={items} measureRef={measureRef} activeIndex={activeIndex} />
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
