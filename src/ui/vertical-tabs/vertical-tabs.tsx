import { useMessages } from "../../lib/i18n/index.js"
import { verticalTabsMessages } from "./messages.js"
import { Tabs as BaseTabs } from "@base-ui/react/tabs"
import {
  Fragment,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from "react"
import { cx } from "../../lib/cx.js"
import { useGlide } from "../../lib/glide.js"
import { useElementSize } from "../../lib/use-element-size.js"
import { useScrollEdges } from "../../lib/use-scroll-edges.js"
import { CountBadge } from "../badge/index.js"
import { rovingKeyDown } from "../tabs/roving.js"
import { TabNavStrip, TabStrip } from "../tabs/tabs.js"
import { Tooltip } from "../tooltip/index.js"
import { remPx } from "../../lib/rem.js"

export interface VerticalTabItem {
  value: string
  label: string
  /** Leading icon. Pass it without a size. */
  icon?: ReactNode
  /** Item count shown by the component. */
  count?: number
  disabled?: boolean
  /** A dot at the trailing edge: unsaved changes in the section, errors to fix there, or just saved. */
  marker?: VerticalTabMarker
}

export type VerticalTabMarker = "dirty" | "error" | "saved"

function getMARKER_TEXT(messages: typeof verticalTabsMessages.defaults): Record<VerticalTabMarker, string> { return { dirty: messages.unsavedChanges, error: messages.hasErrors, saved: messages.saved } }


/** The section's marker: a dot, named for assistive tech. */
function Marker({ marker }: { marker?: VerticalTabMarker }) {
 const messages = useMessages(verticalTabsMessages)

  if (!marker) return null
  return (
    <span className="fa-vtab-marker" data-marker={marker}>
      <span className="sr-only">, {getMARKER_TEXT(messages)[marker]}</span>
    </span>
  )
}

/** rail · tabs follow the container; `icons` is chosen by the caller (a collapsed side nav):
 *  square icon rows, the label kept as the accessible name and shown as a tooltip.
 *  `chips` and `select` are older names for `tabs`. */
export type VerticalTabsLayout =
  | "rail"
  | "icons"
  | "tabs"
  /** @deprecated Renders `tabs`. */
  | "chips"
  /** @deprecated Renders `tabs`. */
  | "select"

/** Below this container width (in rem) the rail gives way to a horizontal tab strip (R6.8). */
export const VERTICAL_TABS_COLLAPSE_REM = 36
/**
 * The most sections the old chip strip showed before it became a picker. No longer used.
 * @deprecated Narrow containers always show the tab strip; sections that do not fit move into its More menu.
 */
export const VERTICAL_TABS_MAX_CHIPS = 6

const useIsomorphicLayoutEffect = typeof window === "undefined" ? () => {} : useLayoutEffect

/** Scroll `child` into view inside `scroller` only — never the page or other ancestors. */
function revealWithin(scroller: HTMLElement, child: HTMLElement) {
  const box = scroller.getBoundingClientRect()
  const item = child.getBoundingClientRect()
  if (item.top < box.top) scroller.scrollTop -= box.top - item.top
  else if (item.bottom > box.bottom) scroller.scrollTop += item.bottom - box.bottom
  if (item.left < box.left) scroller.scrollLeft -= box.left - item.left
  else if (item.right > box.right) scroller.scrollLeft += item.right - box.right
}

function remToPx(rem: number) {
  return rem * remPx()
}

type ResolvedLayout = "rail" | "icons" | "tabs"

/** Pick the layout from the root's own width (a decision CSS cannot make: it changes the
 *  keyboard axis and swaps the rail for a tab strip). */
function useLayout(rootRef: RefObject<HTMLDivElement | null>, forced?: VerticalTabsLayout): ResolvedLayout {
  const size = useElementSize(rootRef)
  if (forced === "chips" || forced === "select") return "tabs"
  if (forced) return forced
  const narrow = size.width > 0 && size.width < remToPx(VERTICAL_TABS_COLLAPSE_REM)
  return narrow ? "tabs" : "rail"
}

function ItemContent({ item }: { item: VerticalTabItem }) {
  return (
    <>
      {item.icon}
      <span className="fa-item-label">{item.label}</span>
      {item.count !== undefined ? <CountBadge value={item.count} className="fa-vtab-count" /> : null}
      <Marker marker={item.marker} />
    </>
  )
}

function MenuRowContent({ item }: { item: VerticalTabItem }) {
  return (
    <>
      {item.icon}
      <span className="fa-item-label">{item.label}</span>
      {item.count !== undefined ? <CountBadge value={item.count} className="fa-item-trail" /> : null}
      <Marker marker={item.marker} />
    </>
  )
}

/** A section's face in the narrow tab strip: the Tabs face plus the marker. */
function StripContent({ item }: { item: VerticalTabItem }) {
  return (
    <>
      {item.icon}
      <span className="fa-tab-label">{item.label}</span>
      {item.count !== undefined ? <CountBadge value={item.count} /> : null}
      <Marker marker={item.marker} />
    </>
  )
}

const stripContent = (item: VerticalTabItem) => <StripContent item={item} />
const menuRowContent = (item: VerticalTabItem) => <MenuRowContent item={item} />

/** The scrolling list wrapper: scroll-edge attributes and keeping the current row in view. */
function ListScroller({
  value,
  layout,
  children,
  as = "div",
  label,
}: {
  value: string | null
  /** Layout or presentation mode. */
  layout: ResolvedLayout
  children: ReactNode
  /** Semantic element rendered by the polymorphic component. */
  as?: "div" | "nav"
  label?: string
}) {
  const scrollRef = useRef<HTMLElement>(null)
  const edges = useScrollEdges(scrollRef)

  useIsomorphicLayoutEffect(() => {
    const scroller = scrollRef.current
    const active = scroller?.querySelector<HTMLElement>("[data-active]")
    if (scroller && active) revealWithin(scroller, active)
  }, [value, layout])

  const Element = as
  return (
    <Element
      ref={scrollRef as RefObject<HTMLDivElement & HTMLElement>}
      className="fa-vtabs-scroll"
      aria-label={label}
      data-scroll-container
      data-scrolled-top={edges.top ? "" : undefined}
      data-scrolled-bottom={edges.bottom ? "" : undefined}
      data-scrolled-left={edges.left ? "" : undefined}
      data-scrolled-right={edges.right ? "" : undefined}
    >
      {children}
    </Element>
  )
}

// ── Local mode (Base UI Tabs) ───────────────────────────────────────────────

export interface VerticalTabsRootProps extends Omit<ComponentProps<"div">, "defaultValue" | "onChange"> {
  items: VerticalTabItem[]
  value?: string
  defaultValue?: string
  /** Called with the chosen section's `value` when the person selects a section. Pair with `value` to control it. */
  onValueChange?: (value: string) => void
  /** Names the rail, e.g. "Agent settings sections". */
  "aria-label": string
  /** Force a layout instead of following the container. */
  layout?: VerticalTabsLayout
}

/**
 * L3 sections held in component state — the lightweight exception (R6.2). For sections that
 * are places, use `RouteVerticalTabs`; it looks and behaves identically. Lays out against its
 * own width: a rail when there is room, and when narrow the horizontal `Tabs` strip above the
 * content, whose sections that do not fit move into a More menu. Children are `VerticalTabs.Panel`s.
 */
function VerticalTabsRoot({ items, value, defaultValue, onValueChange, layout: forced, className, children, "aria-label": label, ...rest }: VerticalTabsRootProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const layout = useLayout(rootRef, forced)
  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? items[0]?.value ?? "")
  const current = value ?? uncontrolled
  const select = useCallback(
    (next: string) => {
      if (value === undefined) setUncontrolled(next)
      onValueChange?.(next)
    },
    [value, onValueChange]
  )
  return (
    <div {...rest} ref={rootRef} className={cx("fa-vtabs", className)} data-layout={layout}>
      <BaseTabs.Root
        value={current}
        onValueChange={(next) => select(String(next))}
        orientation={layout === "rail" || layout === "icons" ? "vertical" : "horizontal"}
        className="fa-vtabs-root"
      >
        {layout === "tabs" ? (
          <div className="fa-tabs fa-vtabs-strip">
            <TabStrip items={items} value={current} select={select} aria-label={label} content={stripContent} menuContent={menuRowContent} />
          </div>
        ) : (
          <ListScroller value={current} layout={layout}>
            <BaseTabs.List className="fa-vtabs-list" aria-label={label}>
              <BaseTabs.Indicator className="fa-vtabs-indicator fa-glide" data-axis="y" />
              {items.map((item) => (
                <Tooltip key={item.value} content={item.label} side="inline-end" enabled={layout === "icons"}>
                  <BaseTabs.Tab value={item.value} disabled={item.disabled} className="fa-item fa-vtab">
                    <ItemContent item={item} />
                  </BaseTabs.Tab>
                </Tooltip>
              ))}
            </BaseTabs.List>
          </ListScroller>
        )}
        <div className="fa-vtabs-content" data-scroll-container>
          {children}
        </div>
      </BaseTabs.Root>
    </div>
  )
}

function VerticalTabsPanel({ className, ...rest }: ComponentProps<typeof BaseTabs.Panel> & { className?: string }) {
  return <BaseTabs.Panel {...rest} className={cx("fa-vtabs-panel", className)} />
}

/**
 * Sections held in component state: `Root` (the selected value, controlled or uncontrolled;
 * a rail or a horizontal tab strip depending on its own width) and `Panel`. For sections that
 * are routes, use `RouteVerticalTabs`.
 */
export const VerticalTabs = {
  Root: VerticalTabsRoot,
  Panel: VerticalTabsPanel,
}

// ── Link mode (router-agnostic) ─────────────────────────────────────────────

/** The attributes a link-mode row must carry; `renderLink` spreads them onto the link. */
export interface VerticalTabLinkRenderProps {
  className: string
  "data-value": string
  "data-active"?: ""
  "data-roving"?: ""
  "aria-current"?: "page"
  tabIndex?: number
  /** The roving-focus key handler (arrow keys move between rows). Pass it to the link's `onKeyDown`, chaining any handler of your own. */
  onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void
  children?: ReactNode
}

export type RenderVerticalTabLink<T extends VerticalTabItem> = (item: T, props: VerticalTabLinkRenderProps) => ReactElement

export interface VerticalTabNavProps<T extends VerticalTabItem> {
  items: T[]
  /** The active section's value — derived from the location by the route adapter. */
  value: string | null
  /** Renders a link with the host router. */
  renderLink: RenderVerticalTabLink<T>
  /** Accessible name when a visible label does not name the control. */
  "aria-label": string
  /** Layout or presentation mode. */
  layout?: VerticalTabsLayout
  /** The section's content (the route's outlet). */
  children?: ReactNode
  className?: string
}

/**
 * Route navigation for sections, with an active location indicator and a responsive rail. Links in a `<nav>`, the
 * current one with `aria-current="page"`; one row is tabbable and the arrow keys (↑ ↓ in the
 * rail, ← → as tabs), Home / End and Space behave as in `VerticalTabs`. In a narrow container
 * it becomes `TabNav`'s horizontal strip, whose More menu rows are links. Router-agnostic:
 * `RouteVerticalTabs` adapts it.
 */
export function VerticalTabNav<T extends VerticalTabItem>({ items, value, renderLink, layout: forced, className, children, "aria-label": label }: VerticalTabNavProps<T>) {
  const rootRef = useRef<HTMLDivElement>(null)
  const layout = useLayout(rootRef, forced)
  const activeIndex = items.findIndex((item) => item.value === value)
  const tabbable = activeIndex >= 0 ? activeIndex : 0
  const indicatorRef = useRef<HTMLSpanElement>(null)
  const placed = useGlide(indicatorRef, "[data-active]", "y", [value, activeIndex, layout, items.length])

  return (
    <div ref={rootRef} className={cx("fa-vtabs", className)} data-layout={layout}>
      <div className="fa-vtabs-root">
        {layout === "tabs" ? (
          <TabNavStrip
            items={items}
            value={value}
            renderLink={renderLink}
            aria-label={label}
            className="fa-vtabs-strip"
            content={stripContent}
            menuContent={menuRowContent}
          />
        ) : (
          <ListScroller as="nav" label={label} value={value} layout={layout}>
            <div className="fa-vtabs-list" data-roving-group="">
              <span ref={indicatorRef} className="fa-vtabs-indicator fa-glide" aria-hidden hidden={!placed} />
              {items.map((item, index) => {
                const active = index === activeIndex
                return (
                  <Fragment key={item.value}>
                    <Tooltip content={item.label} side="inline-end" enabled={layout === "icons"}>
                      {renderLink(item, {
                        className: "fa-item fa-vtab",
                        "data-value": item.value,
                        "data-active": active ? "" : undefined,
                        "data-roving": "",
                        "aria-current": active ? "page" : undefined,
                        tabIndex: index === tabbable ? 0 : -1,
                        onKeyDown: (event) => rovingKeyDown(event, "vertical"),
                        children: <ItemContent item={item} />,
                      })}
                    </Tooltip>
                  </Fragment>
                )
              })}
            </div>
          </ListScroller>
        )}
        <div className="fa-vtabs-content" data-scroll-container>
          {children}
        </div>
      </div>
    </div>
  )
}
