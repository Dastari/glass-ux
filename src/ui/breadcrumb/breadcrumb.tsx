import { DirectionPortal } from "../../lib/direction-portal.js"
import { Menu } from "@base-ui/react/menu"
import { Popover } from "@base-ui/react/popover"
import {
  createContext,
  use,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from "react"
import {
  IconCheck,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsUpDown,
  IconMoreHorizontal,
  IconSearch,
} from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { usePopupMetrics } from "../../lib/popup-metrics.js"
import { useElementSize } from "../../lib/use-element-size.js"
import { NavMenuPopup } from "../tabs/nav-menu.js"
import { Tooltip } from "../tooltip/index.js"
import { TruncatedText } from "../truncated-text/index.js"
import { useChildWidths } from "../tabs/overflow.js"
import { popupContainer } from "../../lib/popup-container.js"

/** Where a crumb (or one of its siblings) goes: `link` (route options for the link
 *  renderer — see RouteBreadcrumb), `href`, or `onSelect`. */
export interface CrumbTarget {
  id: string
  label: string
  /** Leading icon. Pass it without a size. */
  icon?: ReactNode
  /** Opaque route options, rendered by `renderLink` (RouteBreadcrumb: TanStack link options). */
  link?: object
  href?: string
  /** Called with no arguments when the person activates the crumb or menu row; used only when neither `link` (with a renderer) nor `href` applies, so the target renders as a button. */
  onSelect?: () => void
}

/** The attributes a crumb link (or a crumb-menu row) must carry. */
export interface CrumbLinkRenderProps {
  className: string
  title?: string
  /** Accessible name when a visible label does not name the control. */
  "aria-label"?: string
  children?: ReactNode
}

/** Render a target that has `link` as a router link; return null to fall back to href / onSelect. */
export type RenderCrumbLink = (target: CrumbTarget, props: CrumbLinkRenderProps) => ReactElement | null

const RenderLinkContext = createContext<RenderCrumbLink | undefined>(undefined)

export interface CrumbSibling extends CrumbTarget {
  /** Trailing data in the switcher, e.g. the signed-in user or a status. */
  meta?: string
}

export interface Crumb extends CrumbTarget {
  /** Other places at this level (other endpoints in the organisation, other tabs). Include
   *  this crumb itself; it is marked current in the switcher. */
  siblings?: CrumbSibling[]
  /** Accessible name for the switcher button, e.g. "Switch endpoint". */
  siblingsLabel?: string
}

/** Switchers with more siblings than this get a search field. */
export const BREADCRUMB_SEARCH_THRESHOLD = 7

export type BreadcrumbMode = { kind: "full" } | { kind: "middle"; suffix: number } | { kind: "compact" } | { kind: "current" }

/** The least a compact form's "‹ parent" may shrink to before the trail folds to its current crumb. */
export const BREADCRUMB_BACK_MIN = 56

/**
 * Pick the widest form that fits. `widths[i]` is crumb i at full size including its leading
 * separator; `ellipsis` is the ellipsis crumb with its separator.
 *   full     every crumb
 *   middle   first › … › the longest tail of at least two crumbs that fits
 *   compact  ‹ parent · current, ancestors behind an ellipsis menu
 *   current  only the current crumb, a button that opens the whole trail; when even the
 *            compact form cannot show the current place and a readable "‹ parent"
 */
export function collapseCrumbs(widths: number[], ellipsis: number, available: number, backMin = BREADCRUMB_BACK_MIN): BreadcrumbMode {
  const n = widths.length
  const sum = (from: number) => widths.slice(from).reduce((total, width) => total + width, 0)
  if (n <= 1 || sum(0) <= available + 0.5) return { kind: "full" }
  for (let suffix = n - 2; suffix >= 2; suffix--) {
    if ((widths[0] ?? 0) + ellipsis + sum(n - suffix) <= available + 0.5) return { kind: "middle", suffix }
  }
  const compact = (n > 2 ? ellipsis : 0) + Math.min(widths[n - 2] ?? 0, backMin) + (widths[n - 1] ?? 0)
  return compact <= available + 0.5 ? { kind: "compact" } : { kind: "current" }
}

/**
 * The scope above the trail (the organisation), shown first in the trail popup when the host
 * has folded its own scope control into the breadcrumb (the top bar on a phone). Choosing it
 * opens the host's switcher.
 */
export interface BreadcrumbScope {
  label: string
  /** Its avatar. */
  icon?: ReactNode
  /** Accessible name of the row: "Organisation: Northstar Studio. Switch organisation". */
  "aria-label"?: string
  /** Opens the host's switcher (after the trail popup has closed). */
  onSelect: () => void
}

/**
 * Set by a host that has folded its context into the breadcrumb (the top bar on a phone):
 * the trail shows only its current crumb, and its popup also holds the host's `header` (the
 * module switch) and `scope` (the organisation). `anchor` is the box the popup drops from.
 */
export interface BreadcrumbFold {
  folded: boolean
  /** Anchor used to position floating content. */
  anchor?: RefObject<HTMLElement | null>
}

/** Context through which a host folds itself into the breadcrumb; defaults to `{ folded: false }`. Provide it with a `BreadcrumbFold` value. */
export const BreadcrumbFoldContext = createContext<BreadcrumbFold>({ folded: false })

export interface BreadcrumbProps {
  /** Root first, current place last. Feed it from the router's matches. */
  items: Crumb[]
  /** Renders crumbs with `link` as router links (RouteBreadcrumb supplies this). */
  renderLink?: RenderCrumbLink
  /**
   * "auto" (default): measured, full → middle → compact → current. "current": always only the
   * current crumb with the trail in its popup (a host that has measured, as the top bar does
   * through BreadcrumbFoldContext).
   */
  collapse?: "auto" | "current"
  /** First in the trail popup when the context is folded into it: the module switch. */
  header?: ReactNode
  /** The scope row above the trail when folded into it: the organisation. */
  scope?: BreadcrumbScope
  /** Accessible name when a visible label does not name the control. */
  "aria-label"?: string
  className?: string
}

/**
 * The universal breadcrumb (R6.4): one line at --control-h-sm in the top bar. Every crumb
 * but the current one navigates; a crumb with siblings carries a switcher. It collapses
 * against its own width — first the middle crumbs, then to `‹ parent · current` — and each
 * crumb truncates with an ellipsis at a maximum width.
 */
export function Breadcrumb({ items, renderLink, collapse = "auto", header, scope, className, "aria-label": label = "Breadcrumb" }: BreadcrumbProps) {
  const fold = use(BreadcrumbFoldContext)
  const folded = collapse === "current" || fold.folded
  const navRef = useRef<HTMLElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const size = useElementSize(navRef)
  const signature = items.map((item) => `${item.id}:${item.label}:${item.siblings ? 1 : 0}`).join("|")
  const { widths, gap } = useChildWidths(measureRef, signature)

  const crumbWidths = useMemo(
    () => (widths.length === items.length + 1 ? widths.slice(0, items.length).map((width, index) => width + (index > 0 ? gap : 0)) : null),
    [widths, gap, items.length]
  )
  const mode = useMemo<BreadcrumbMode>(() => {
    if (folded && items.length > 0) return { kind: "current" }
    if (!crumbWidths || size.width === 0) return { kind: "full" }
    return collapseCrumbs(crumbWidths, (widths[items.length] ?? 0) + gap, size.width)
  }, [folded, crumbWidths, widths, gap, items.length, size.width])
  // The full trail's width, for a container that gives the breadcrumb its natural width before
  // anything else grows (the top bar, R5.2).
  const natural = crumbWidths ? Math.ceil(crumbWidths.reduce((total, width) => total + width, 0)) : undefined

  const last = items.length - 1
  let content: ReactNode
  if (mode.kind === "current") {
    content = (
      <li className="fa-crumb" data-current="">
        <TrailMenu items={items} label={label} header={folded ? header : undefined} scope={folded ? scope : undefined} anchor={folded ? fold.anchor : undefined} />
      </li>
    )
  } else if (mode.kind === "compact" && items.length > 1) {
    const parent = items[last - 1]!
    const current = items[last]!
    const ancestors = items.slice(0, last - 1)
    content = (
      <>
        {ancestors.length > 0 ? (
          <li className="fa-crumb">
            <EllipsisMenu crumbs={ancestors} />
          </li>
        ) : null}
        <li className="fa-crumb" data-back="">
          <CrumbAnchor crumb={parent} className="fa-crumb-link" aria-label={`Back to ${parent.label}`}>
            <IconChevronLeft className="fa-crumb-back" />
            <span className="fa-crumb-label">{parent.label}</span>
          </CrumbAnchor>
        </li>
        <li className="fa-crumb" data-current="">
          <span className="fa-crumb-dot" aria-hidden>
            ·
          </span>
          <CurrentCrumb crumb={current} />
        </li>
      </>
    )
  } else if (mode.kind === "middle") {
    const tailStart = items.length - mode.suffix
    content = (
      <>
        <CrumbItem crumb={items[0]!} separator={false} current={false} />
        <li className="fa-crumb">
          <Separator />
          <EllipsisMenu crumbs={items.slice(1, tailStart)} />
        </li>
        {items.slice(tailStart).map((crumb, offset) => (
          <CrumbItem key={crumb.id} crumb={crumb} separator current={tailStart + offset === last} />
        ))}
      </>
    )
  } else {
    content = items.map((crumb, index) => (
      <CrumbItem key={crumb.id} crumb={crumb} separator={index > 0} current={index === last} />
    ))
  }

  return (
    <RenderLinkContext value={renderLink}>
      <nav ref={navRef} aria-label={label} className={cx("fa-breadcrumb", className)} data-mode={mode.kind} data-natural-width={natural}>
        <ol className="fa-breadcrumb-list">{content}</ol>
        <div className="fa-breadcrumb-measure" aria-hidden>
          <div ref={measureRef} className="fa-breadcrumb-list fa-breadcrumb-measure-row">
            {items.map((crumb, index) => (
              <span key={crumb.id} className="fa-crumb" data-current={index === last ? "" : undefined}>
                {index > 0 ? <Separator /> : null}
                <span className="fa-crumb-link">
                  {crumb.icon}
                  <span className="fa-crumb-label">{crumb.label}</span>
                </span>
                {crumb.siblings?.length ? (
                  <span className="fa-crumb-switch">
                    <IconChevronsUpDown />
                  </span>
                ) : null}
              </span>
            ))}
            <span className="fa-crumb">
              <Separator />
              <span className="fa-crumb-link fa-crumb-ellipsis">
                <IconMoreHorizontal />
              </span>
            </span>
          </div>
        </div>
      </nav>
    </RenderLinkContext>
  )
}

function Separator() {
  return <IconChevronRight className="fa-crumb-sep" />
}

function CrumbItem({ crumb, separator, current }: { crumb: Crumb; separator: boolean; current: boolean }) {
  return (
    <li className="fa-crumb" data-current={current ? "" : undefined}>
      {separator ? <Separator /> : null}
      {current ? (
        <CurrentCrumb crumb={crumb} />
      ) : (
        <>
          <CrumbAnchor crumb={crumb} className="fa-crumb-link" title={crumb.label}>
            {crumb.icon}
            <span className="fa-crumb-label">{crumb.label}</span>
          </CrumbAnchor>
          {crumb.siblings?.length ? <SiblingMenu crumb={crumb} /> : null}
        </>
      )}
    </li>
  )
}

function CurrentCrumb({ crumb }: { crumb: Crumb }) {
  return (
    <>
      <span className="fa-crumb-link" aria-current="page" title={crumb.label}>
        {crumb.icon}
        <span className="fa-crumb-label">{crumb.label}</span>
      </span>
      {crumb.siblings?.length ? <SiblingMenu crumb={crumb} /> : null}
    </>
  )
}

interface AnchorProps {
  crumb: CrumbTarget
  className: string
  children: ReactNode
  title?: string
  /** Accessible name when a visible label does not name the control. */
  "aria-label"?: string
  /** Runs after the crumb's own onSelect (a button crumb): the trail popup closes. */
  onSelect?: () => void
}

function CrumbAnchor({ crumb, className, children, onSelect, ...rest }: AnchorProps) {
  const renderLink = use(RenderLinkContext)
  const linked = crumb.link && renderLink ? renderLink(crumb, { ...rest, className: cx(className, "fa-pressable"), children }) : null
  if (linked) return linked
  if (crumb.href) {
    return (
      <a href={crumb.href} {...rest} className={cx(className, "fa-pressable")}>
        {children}
      </a>
    )
  }
  return (
    <button
      type="button"
      onClick={() => {
        crumb.onSelect?.()
        onSelect?.()
      }}
      {...rest}
      className={cx(className, "fa-pressable")}
    >
      {children}
    </button>
  )
}

/** A menu row that goes somewhere: router link, plain link or callback. */
function TargetItem({ target, children, selected, onChoose }: { target: CrumbTarget; children: ReactNode; selected?: boolean; onChoose?: () => void }) {
  const renderLink = use(RenderLinkContext)
  const shared = { className: "fa-item fa-menu-item", "data-selected": selected ? "" : undefined, label: target.label }
  const linked = target.link && renderLink ? renderLink(target, { className: "fa-item fa-menu-item" }) : null
  if (linked) return <Menu.LinkItem {...shared} closeOnClick render={linked}>{children}</Menu.LinkItem>
  if (target.href) return <Menu.LinkItem {...shared} closeOnClick href={target.href}>{children}</Menu.LinkItem>
  return (
    <Menu.Item
      {...shared}
      onClick={() => {
        target.onSelect?.()
        onChoose?.()
      }}
    >
      {children}
    </Menu.Item>
  )
}

function EllipsisMenu({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <Menu.Root>
      <Tooltip content={crumbs.map((crumb) => crumb.label).join(" › ")}>
        <Menu.Trigger className="fa-crumb-link fa-crumb-ellipsis fa-pressable" aria-label={`Show ${crumbs.length} more`}>
          <IconMoreHorizontal />
        </Menu.Trigger>
      </Tooltip>
      <NavMenuPopup align="start">
        {crumbs.map((crumb) => (
          <TargetItem key={crumb.id} target={crumb}>
            {crumb.icon}
            <span className="fa-item-label">{crumb.label}</span>
          </TargetItem>
        ))}
      </NavMenuPopup>
    </Menu.Root>
  )
}

/**
 * A crumb's sibling switcher. In the bar, a small chevrons-up-down button beside the crumb; in
 * the trail popup ("trail"), a trailing "Switch" button at full touch height. `onChoose`
 * runs after a sibling that is a callback (links close the trail by navigating).
 */
function SiblingMenu({ crumb, variant = "bar", onChoose }: { crumb: Crumb; variant?: "bar" | "trail"; onChoose?: () => void }) {
  const siblings = crumb.siblings ?? []
  const searchable = siblings.length > BREADCRUMB_SEARCH_THRESHOLD
  const [query, setQuery] = useState("")
  const name = crumb.siblingsLabel ?? `Switch from ${crumb.label}`

  const menu = (
    <Menu.Root>
      {variant === "trail" ? (
        <Menu.Trigger className="fa-crumb-tree-switch fa-pressable" aria-label={name}>
          <span aria-hidden>Switch</span>
          <IconChevronsUpDown />
        </Menu.Trigger>
      ) : (
        <Tooltip content={name}>
          <Menu.Trigger className="fa-crumb-switch fa-pressable" aria-label={name}>
            <IconChevronsUpDown />
          </Menu.Trigger>
        </Tooltip>
      )}
      <NavMenuPopup align={variant === "trail" ? "end" : "start"} className="fa-crumb-menu" data-searchable={searchable ? "" : undefined}>
        {searchable ? (
          <>
            <div className="fa-control fa-crumb-search" data-size="sm">
              <IconSearch />
              <Menu.Input className="fa-control-input" placeholder="Search" aria-label={name} />
            </div>
            <Menu.Empty className="fa-crumb-empty">No match for “{query.trim()}”</Menu.Empty>
          </>
        ) : null}
        <Menu.List className="fa-crumb-menu-list">
          {siblings.map((sibling) => (
            <TargetItem key={sibling.id} target={sibling} selected={sibling.id === crumb.id} onChoose={onChoose}>
              {sibling.icon}
              <span className="fa-item-label">{sibling.label}</span>
              {sibling.meta ? <span className="fa-item-trail fa-crumb-meta">{sibling.meta}</span> : null}
              {sibling.id === crumb.id ? <IconCheck className="fa-crumb-check" /> : null}
            </TargetItem>
          ))}
        </Menu.List>
      </NavMenuPopup>
    </Menu.Root>
  )

  return searchable ? (
    <Menu.FilterProvider value={query} onValueChange={setQuery} autoHighlight>
      {menu}
    </Menu.FilterProvider>
  ) : (
    menu
  )
}

/* ── Current crumb with the trail in a popup ──────────────────────────────── */

interface TrailMenuProps {
  items: Crumb[]
  label: string
  header?: ReactNode
  /** Tenant, organisation or entity scope supplied by the application. */
  scope?: BreadcrumbScope
  /** Anchor used to position floating content. */
  anchor?: RefObject<HTMLElement | null>
}

/**
 * Only the current place, its icon and a chevron, as one button. It opens the trail: the
 * host's header (the module switch) and scope (the organisation) when they are folded into
 * it, then every crumb as an indented tree, root first. Each level navigates; a level with
 * siblings carries its switcher. Dropped from the host's anchor (the top bar) it spans it like
 * a sheet from the top; otherwise it is a popover under the button. Esc closes it and focus
 * returns to the button.
 */
function TrailMenu({ items, label, header, scope, anchor }: TrailMenuProps) {
  const popup = usePopupMetrics()
  const [open, setOpen] = useState(false)
  const after = useRef<(() => void) | null>(null)
  const current = items[items.length - 1]!
  const signature = items.map((item) => item.id).join("|")
  // Going somewhere from the trail (a level, a sibling, the module switch) closes it.
  const seen = useRef(signature)
  useEffect(() => {
    if (seen.current === signature) return
    seen.current = signature
    setOpen(false)
  }, [signature])
  const depthOffset = scope ? 1 : 0

  return (
    <Popover.Root
      open={open}
      onOpenChange={setOpen}
      onOpenChangeComplete={(next) => {
        if (next) return
        const run = after.current
        after.current = null
        run?.()
      }}
    >
      <Popover.Trigger className="fa-crumb-link fa-crumb-trail fa-pressable" aria-current="page">
        {current.icon}
        <TruncatedText className="fa-crumb-label" tooltipSide="bottom">
          {current.label}
        </TruncatedText>
        <IconChevronDown className="fa-crumb-trail-chevron" />
      </Popover.Trigger>
      <Popover.Portal render={<DirectionPortal />} container={popupContainer()}>
        <Popover.Positioner
          className="fa-crumb-trail-positioner"
          side="bottom"
          align="start"
          sideOffset={anchor ? 0 : popup.offset}
          collisionPadding={popup.collisionPadding}
          anchor={anchor}
          data-anchored={anchor ? "" : undefined}
        >
          <Popover.Popup className="glass-overlay fa-popup fa-crumb-trail-popup" aria-label={label}>
            {header ? <div className="fa-crumb-trail-header">{header}</div> : null}
            <ol className="fa-crumb-tree">
              {scope ? (
                <li className="fa-crumb-tree-row" style={{ "--_depth": 0 } as CSSProperties}>
                  <button
                    type="button"
                    className="fa-item fa-crumb-tree-link fa-pressable"
                    aria-label={scope["aria-label"]}
                    aria-haspopup="dialog"
                    onClick={() => {
                      after.current = scope.onSelect
                      setOpen(false)
                    }}
                  >
                    {scope.icon}
                    <span className="fa-item-label">{scope.label}</span>
                    <IconChevronsUpDown className="fa-crumb-tree-switch-icon" />
                  </button>
                </li>
              ) : null}
              {items.map((crumb, index) => (
                <TrailRow key={crumb.id} crumb={crumb} depth={index + depthOffset} current={index === items.length - 1} onLeave={() => setOpen(false)} />
              ))}
            </ol>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}

function TrailRow({ crumb, depth, current, onLeave }: { crumb: Crumb; depth: number; current: boolean; onLeave: () => void }) {
  const body = (
    <>
      {crumb.icon}
      <span className="fa-item-label">{crumb.label}</span>
    </>
  )
  return (
    <li className="fa-crumb-tree-row" style={{ "--_depth": depth } as CSSProperties}>
      {current ? (
        <span className="fa-item fa-crumb-tree-link" aria-current="page">
          {body}
        </span>
      ) : (
        <CrumbAnchor crumb={crumb} className="fa-item fa-crumb-tree-link" onSelect={crumb.onSelect ? onLeave : undefined}>
          {body}
        </CrumbAnchor>
      )}
      {crumb.siblings?.length ? <SiblingMenu crumb={crumb} variant="trail" onChoose={onLeave} /> : null}
    </li>
  )
}
