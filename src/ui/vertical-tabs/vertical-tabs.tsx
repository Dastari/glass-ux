import { Menu } from "@base-ui/react/menu"
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
import { IconChevronsUpDown } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { useElementSize } from "../../lib/use-element-size.js"
import { useScrollEdges } from "../../lib/use-scroll-edges.js"
import { CountBadge } from "../badge/index.js"
import { NavMenuPopup } from "../tabs/nav-menu.js"
import { rovingKeyDown } from "../tabs/roving.js"
import { Tooltip } from "../tooltip/index.js"

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

const MARKER_TEXT: Record<VerticalTabMarker, string> = { dirty: "unsaved changes", error: "has errors", saved: "saved" }

/** The section's marker: a dot, named for assistive tech. */
function Marker({ marker }: { marker?: VerticalTabMarker }) {
  if (!marker) return null
  return (
    <span className="fa-vtab-marker" data-marker={marker}>
      <span className="sr-only">, {MARKER_TEXT[marker]}</span>
    </span>
  )
}

/** rail · chips · select follow the container; `icons` is chosen by the caller (a collapsed
 *  side nav): square icon rows, the label kept as the accessible name and shown as a tooltip. */
export type VerticalTabsLayout = "rail" | "icons" | "chips" | "select"

/** Below this container width (in rem) the rail gives way to chips or a picker (R6.8). */
export const VERTICAL_TABS_COLLAPSE_REM = 36
/** More items than this become a picker instead of chips when collapsed. */
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
  if (typeof window === "undefined") return rem * 16
  return rem * Number.parseFloat(getComputedStyle(document.documentElement).fontSize || "16")
}

/** Pick the layout from the root's own width (a decision CSS cannot make: it changes the
 *  keyboard axis and swaps the list for a picker). */
function useLayout(rootRef: RefObject<HTMLDivElement | null>, count: number, forced?: VerticalTabsLayout): VerticalTabsLayout {
  const size = useElementSize(rootRef)
  if (forced) return forced
  const narrow = size.width > 0 && size.width < remToPx(VERTICAL_TABS_COLLAPSE_REM)
  return narrow ? (count > VERTICAL_TABS_MAX_CHIPS ? "select" : "chips") : "rail"
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

function PickerFace({ item }: { item: VerticalTabItem | undefined }) {
  return (
    <>
      {item?.icon}
      <span className="fa-vtabs-picker-label">{item?.label}</span>
      <Marker marker={item?.marker} />
      <IconChevronsUpDown className="fa-vtabs-picker-chevron" />
    </>
  )
}

/** The scrolling list wrapper: scroll-edge attributes and keeping the current row in view. */
function ListScroller({
  hidden,
  value,
  layout,
  children,
  as = "div",
  label,
}: {
  /** Keeps the item out of the visible layout. */
  hidden: boolean
  value: string | null
  /** Layout or presentation mode. */
  layout: VerticalTabsLayout
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
      hidden={hidden}
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
  /** Called when value change occurs. The callback type specifies its arguments. */
  onValueChange?: (value: string) => void
  /** Names the rail, e.g. "Agent settings sections". */
  "aria-label": string
  /** Force a layout instead of following the container. */
  layout?: VerticalTabsLayout
}

/**
 * L3 sections held in component state — the lightweight exception (R6.2). For sections that
 * are places, use `RouteVerticalTabs`; it looks and behaves identically. Lays out against its
 * own width: a rail when there is room, a chip strip when narrow, a picker when narrow with
 * more than six sections. Children are `VerticalTabs.Panel`s.
 */
function VerticalTabsRoot({ items, value, defaultValue, onValueChange, layout: forced, className, children, "aria-label": label, ...rest }: VerticalTabsRootProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const layout = useLayout(rootRef, items.length, forced)
  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? items[0]?.value ?? "")
  const current = value ?? uncontrolled
  const select = useCallback(
    (next: string) => {
      if (value === undefined) setUncontrolled(next)
      onValueChange?.(next)
    },
    [value, onValueChange]
  )
  const activeItem = items.find((item) => item.value === current)

  return (
    <div {...rest} ref={rootRef} className={cx("fa-vtabs", className)} data-layout={layout}>
      <BaseTabs.Root
        value={current}
        onValueChange={(next) => select(String(next))}
        orientation={layout === "rail" || layout === "icons" ? "vertical" : "horizontal"}
        className="fa-vtabs-root"
      >
        {layout === "select" ? (
          <Menu.Root>
            <Menu.Trigger className="fa-control fa-vtabs-picker fa-pressable" aria-label={label} data-size="sm">
              <PickerFace item={activeItem} />
            </Menu.Trigger>
            <NavMenuPopup align="start">
              <Menu.RadioGroup value={current} onValueChange={(next) => select(String(next))}>
                {items.map((item) => (
                  <Menu.RadioItem
                    key={item.value}
                    value={item.value}
                    disabled={item.disabled}
                    className="fa-item fa-menu-item"
                    data-selected={item.value === current ? "" : undefined}
                  >
                    <MenuRowContent item={item} />
                  </Menu.RadioItem>
                ))}
              </Menu.RadioGroup>
            </NavMenuPopup>
          </Menu.Root>
        ) : null}
        <ListScroller hidden={layout === "select"} value={current} layout={layout}>
          <BaseTabs.List className="fa-vtabs-list" aria-label={label}>
            {items.map((item) => (
              <Tooltip key={item.value} content={item.label} side="right" enabled={layout === "icons"}>
                <BaseTabs.Tab value={item.value} disabled={item.disabled} className="fa-item fa-vtab">
                  <ItemContent item={item} />
                </BaseTabs.Tab>
              </Tooltip>
            ))}
          </BaseTabs.List>
        </ListScroller>
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
  /** Called when key down occurs. The callback type specifies its arguments. */
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
 * Route navigation for sections, with an active location indicator and responsive rail, chip and picker layouts. Links in a `<nav>`, the
 * current one with `aria-current="page"`; one row is tabbable and the arrow keys (↑ ↓ in the
 * rail, ← → as chips), Home / End and Space behave as in `VerticalTabs`. Collapses to chips
 * or a picker whose rows are links. Router-agnostic: `RouteVerticalTabs` adapts it.
 */
export function VerticalTabNav<T extends VerticalTabItem>({ items, value, renderLink, layout: forced, className, children, "aria-label": label }: VerticalTabNavProps<T>) {
  const rootRef = useRef<HTMLDivElement>(null)
  const layout = useLayout(rootRef, items.length, forced)
  const activeIndex = items.findIndex((item) => item.value === value)
  const tabbable = activeIndex >= 0 ? activeIndex : 0
  const orientation = layout === "chips" ? "horizontal" : "vertical"

  return (
    <div ref={rootRef} className={cx("fa-vtabs", className)} data-layout={layout}>
      <div className="fa-vtabs-root">
        {layout === "select" ? (
          <Menu.Root>
            <Menu.Trigger className="fa-control fa-vtabs-picker fa-pressable" aria-label={label} data-size="sm">
              <PickerFace item={items[activeIndex]} />
            </Menu.Trigger>
            <NavMenuPopup align="start">
              {items.map((item, index) => (
                <Menu.LinkItem
                  key={item.value}
                  closeOnClick
                  label={item.label}
                  data-selected={index === activeIndex ? "" : undefined}
                  render={renderLink(item, { className: "fa-item fa-menu-item", "data-value": item.value })}
                >
                  <MenuRowContent item={item} />
                </Menu.LinkItem>
              ))}
            </NavMenuPopup>
          </Menu.Root>
        ) : null}
        <ListScroller as="nav" label={label} hidden={layout === "select"} value={value} layout={layout}>
          <div className="fa-vtabs-list" data-roving-group="">
            {items.map((item, index) => {
              const active = index === activeIndex
              return (
                <Fragment key={item.value}>
                  <Tooltip content={item.label} side="right" enabled={layout === "icons"}>
                    {renderLink(item, {
                      className: "fa-item fa-vtab",
                      "data-value": item.value,
                      "data-active": active ? "" : undefined,
                      "data-roving": "",
                      "aria-current": active ? "page" : undefined,
                      tabIndex: index === tabbable ? 0 : -1,
                      onKeyDown: (event) => rovingKeyDown(event, orientation),
                      children: <ItemContent item={item} />,
                    })}
                  </Tooltip>
                </Fragment>
              )
            })}
          </div>
        </ListScroller>
        <div className="fa-vtabs-content" data-scroll-container>
          {children}
        </div>
      </div>
    </div>
  )
}
