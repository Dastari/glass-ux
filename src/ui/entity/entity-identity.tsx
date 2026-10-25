import { useMessages } from "../../lib/i18n/index.js"
import { entityMessages } from "./messages.js"
import { PreviewCard as BasePreviewCard } from "@base-ui/react/preview-card"
import { flushSync } from "react-dom"
import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from "react"
import { IconClose } from "../../icons/generated/icons.js"
import { resolveActions, splitForHeader, type ActionSet } from "../../lib/actions/actions.js"
import { cx } from "../../lib/cx.js"
import { usePopupMetrics } from "../../lib/popup-metrics.js"
import { observeElementSize } from "../../lib/resize-observer.js"
import { useElementSize } from "../../lib/use-element-size.js"
import { ActionBar, ActionContextMenu, ActionMenu, useActionRunner } from "../actions/index.js"
import { Avatar } from "../avatar/index.js"
import { Badge, CountBadge, type BadgeTone } from "../badge/index.js"
import { Button } from "../button/index.js"
import { Skeleton } from "../skeleton/index.js"
import { Tooltip } from "../tooltip/index.js"
import { TruncatedText } from "../truncated-text/index.js"
import { ENTITY_TIER_LIMITS, selectEntityTier, type EntityTier } from "./tier.js"
import { popupContainer } from "../../lib/popup-container.js"
import { useRemPx } from "../../lib/rem.js"

const useIsomorphicLayoutEffect = typeof window === "undefined" ? () => {} : useLayoutEffect

/** Hover delay before a chip's preview card opens: quicker than a tooltip, it is the point of the chip. */
const PREVIEW_DELAY_MS = 400
const PREVIEW_CLOSE_MS = 150

/** A state discovered for the entity: the agent, SNMP, an integration. */
export interface EntityState {
  /** Stable id, rendered as data-state ("printing", "in-call"). */
  id: string
  /** What the state badge says: "Printing", "Toner low 8%". */
  label: string
  tone: BadgeTone
  /** Something is happening (printing, a call, traffic): the mark pulses until the motion switch stops it. */
  activity?: boolean
  /** A paused state (maintenance) draws a hollow ring instead of a dot. */
  paused?: boolean
}

/** A number on the icon's top corner: clients on an access point, open alerts. */
export interface EntityCount {
  value: number
  /** Accessible text: "23 clients". */
  label: string
  tone?: "neutral" | "accent" | "danger"
}

/**
 * A person shown in the entity's icon slot at every tier: an endpoint showing its signed-in
 * user. The photo fills the slot (initials on a tint without one), the entity's glyph stays
 * as a small corner mark so a laptop still reads as a laptop, and the state dot is unchanged.
 */
export interface EntityPortrait {
  /** The person's name: the initials and the tint. The portrait is decorative; the identity names itself. */
  name: string
  /** The photo (an authenticated, same-origin URL). Without one, the initials show. */
  src?: string
}

/** Raw slot content, for callers that already render a part (the shell's EntityHeader). */
export interface EntitySlots {
  /** Replaces the corner badge. */
  badge?: ReactNode
  /** Replaces the state badge (header and compact). */
  state?: ReactNode
  /** Replaces the actions (header: an ActionBar). */
  actions?: ReactNode
}

export type EntityTierProp = EntityTier | "auto"
export type EntityHeading = "h1" | "h2" | "h3" | "h4" | "p"

export interface EntityIdentityProps<T = unknown> extends Omit<HTMLAttributes<HTMLElement>, "title" | "children"> {
  /** A tier, or `auto` (default) to let the container decide on both axes (see tier.ts). */
  tier?: EntityTierProp
  /** `auto` only: the identity fills a box with a definite height, so height takes part. */
  fill?: boolean
  /** The entity's name: accessible names, tooltips, menus ("Actions for NST-C106"). */
  name: string
  /** Rendered instead of the name (search highlights). The name stays the accessible text. */
  title?: ReactNode
  /** Singular noun for accessible names: "Printer" → "Printer HP-LJ-M480, Printing". */
  kind?: string
  /** The glyph (an icon without a size). Rows and chips always draw the glyph. */
  icon?: ReactNode
  /** An illustration or image (`<img alt="">`) for the header, compact and icon tiers. */
  image?: ReactNode
  /** A person in the icon slot at every tier, with the glyph as a corner mark. Beats `image`. */
  portrait?: EntityPortrait
  /** Controlled view state, including loading, empty and error states. */
  state?: EntityState
  /** Item count shown by the component. */
  count?: EntityCount
  /** Data only (R2.2): model · firmware · IP. An array joins with " · ". */
  facts?: ReactNode | readonly string[]
  /** A row's second line. Defaults to the facts. */
  secondary?: ReactNode
  /** One live value for the header (a Metric). Its box is reserved, so updates never shift. */
  metric?: ReactNode
  /** L2 tabs, header only. */
  tabs?: ReactNode
  /** The entity's actions (R12): ActionBar in the header, ⋯ in compact and row, right-click everywhere. */
  actions?: ActionSet<T>
  /** The entity the actions run against. */
  target?: T
  /** Most header buttons (ActionBar maxButtons). */
  maxActions?: number
  /** Where the identity opens. Click and Enter follow it; `onOpen` intercepts plain clicks. */
  href?: string
  /** Called with no arguments when the person opens the identity. With `href`, it intercepts plain left clicks (modified clicks follow the link); without it, the title or row becomes a button. */
  onOpen?: () => void
  /** Header and compact title element. Default: h1 for the header, h2 for compact. */
  heading?: EntityHeading
  /** Chip only: inline sits in a prose line box (20px), sm suits rows and the composer (24px). */
  size?: "inline" | "sm"
  /** Chip only: a removable chip (composer context) with no link. */
  onRemove?: () => void
  /** Chip only: open the preview card on hover and focus (default true). */
  preview?: boolean
  /** Overrides for named content slots. */
  slots?: EntitySlots
}

/* ── Helpers ───────────────────────────────────────────────────────────────── */

function factsText(facts: EntityIdentityProps["facts"]): ReactNode {
  if (Array.isArray(facts)) return facts.filter(Boolean).join(" · ")
  return facts as ReactNode
}

function accessibleName(name: string, kind?: string, state?: EntityState) {
  return `${kind ? `${kind} ` : ""}${name}${state ? `, ${state.label}` : ""}`
}

function stateData(state: EntityState | undefined) {
  return {
    "data-state": state?.id,
    // Not data-tone: tile and badge recipes tint on that, and the state belongs to the dot.
    "data-state-tone": state?.tone,
    "data-activity": state?.activity ? "" : undefined,
  }
}

/** Plain left clicks call onOpen (client navigation); modified clicks keep the link's default. */
function openHandler(onOpen?: () => void) {
  if (!onOpen) return undefined
  return (event: MouseEvent<HTMLElement>) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    onOpen()
  }
}

/** The name, truncating with a tooltip only when cut (R8.1). */
function Name({ name, title, className }: { name: string; title?: ReactNode; className: string }) {
  if (title !== undefined && title !== name) {
    return (
      <span className={className} title={name}>
        {title}
      </span>
    )
  }
  return <TruncatedText className={className}>{name}</TruncatedText>
}

function Line({ children, className }: { children: ReactNode; className: string }) {
  if (typeof children === "string") return <TruncatedText className={className}>{children}</TruncatedText>
  return <span className={className}>{children}</span>
}

/* ── Parts ─────────────────────────────────────────────────────────────────── */

export interface EntityBadgeProps {
  /** Controlled view state, including loading, empty and error states. */
  state?: EntityState
  /** Item count shown by the component. */
  count?: EntityCount
  /** Name the state for assistive tech (rows, icons). Off where a state badge already says it. */
  labelled?: boolean
}

/**
 * The corner marks on the icon: the state dot (pulsing while active, a ring when paused) on
 * the bottom corner and an optional count on the top corner. The dot is the shared status
 * dot, so a device's dot is the tree's and the table's dot.
 */
function EntityBadge({ state, count, labelled = true }: EntityBadgeProps) {
  return (
    <>
      {state ? (
        <span
          className="fa-status-dot fa-entity-dot"
          data-overlay=""
          data-tone={state.tone}
          data-marker={state.activity ? "pulse" : state.paused ? "ring" : "dot"}
          role={labelled ? "img" : undefined}
          aria-label={labelled ? state.label : undefined}
          aria-hidden={labelled ? undefined : true}
        />
      ) : null}
      {count ? (
        <CountBadge overlay value={count.value} max={99} tone={count.tone ?? "neutral"} className="fa-entity-count" role="img" aria-label={count.label} />
      ) : null}
    </>
  )
}

/** A person's photo (or initials) filling the icon slot, the glyph kept as a corner mark. */
function EntityPortraitSlot({ portrait, icon }: { portrait: EntityPortrait; icon?: ReactNode }) {
  return (
    <>
      <Avatar name={portrait.name} src={portrait.src} decorative title="" className="fa-entity-portrait" />
      {icon ? (
        <span className="fa-entity-mark" aria-hidden>
          {icon}
        </span>
      ) : null}
    </>
  )
}

/** The bare glyph with its corner marks: rows, chips and anywhere a small mark names the entity. */
function EntityGlyph({ icon, portrait, state, count, labelled = true, className, badge }: EntityBadgeProps & { icon: ReactNode; portrait?: EntityPortrait; className?: string; badge?: ReactNode }) {
  return (
    <span className={cx("fa-entity-glyph", className)} data-portrait={portrait ? "" : undefined}>
      {portrait ? <EntityPortraitSlot portrait={portrait} icon={icon} /> : icon}
      {badge !== undefined ? badge : <EntityBadge state={state} count={count} labelled={labelled} />}
    </span>
  )
}

/** The icon tile (header, compact, icon): a portrait, else the image when there is one, else the glyph. */
function EntityTile({ icon, image, portrait, state, count, labelled, badge }: EntityBadgeProps & { icon?: ReactNode; image?: ReactNode; portrait?: EntityPortrait; badge?: ReactNode }) {
  return (
    <span className="fa-tile-icon fa-entity-icon" data-image={image && !portrait ? "" : undefined} data-portrait={portrait ? "" : undefined}>
      {portrait ? <EntityPortraitSlot portrait={portrait} icon={icon} /> : (image ?? icon)}
      {badge !== undefined ? badge : <EntityBadge state={state} count={count} labelled={labelled} />}
    </span>
  )
}


/** The state as a pill: the badge's tone and marker. */
function EntityStateBadge({ state, size = "md" }: { state: EntityState; size?: "sm" | "md" }) {
  return (
    <Badge tone={state.tone} size={size} marker={state.activity ? "pulse" : state.paused ? "ring" : "dot"} className="fa-entity-badge" data-state={state.id}>
      {state.label}
    </Badge>
  )
}

/* ── Tiers ─────────────────────────────────────────────────────────────────── */

type DomProps = Omit<HTMLAttributes<HTMLElement>, "title" | "children">

/** What every tier reads: the identity's data, apart from the DOM props spread on its root. */
interface Parts<T> {
  name: string
  title?: ReactNode
  /** Semantic entity or content kind, used to choose labels and rendering. */
  kind?: string
  icon?: ReactNode
  /** Image content or media definition. */
  image?: ReactNode
  portrait?: EntityPortrait
  /** Controlled view state, including loading, empty and error states. */
  state?: EntityState
  /** Item count shown by the component. */
  count?: EntityCount
  facts?: EntityIdentityProps["facts"]
  secondary?: ReactNode
  metric?: ReactNode
  /** Tab definitions in display order. */
  tabs?: ReactNode
  /** Supporting actions rendered in the action slot. */
  actions?: ActionSet<T>
  /** Selected entities passed to action visibility, enablement, confirmation and execution. */
  targets: readonly T[]
  maxActions?: number
  href?: string
  /** Called with no arguments when the person opens the identity. With `href`, it intercepts plain left clicks (modified clicks follow the link); without it, the title or row becomes a button. */
  onOpen?: () => void
  heading?: EntityHeading
  size?: "inline" | "sm"
  /** Chip only: called with no arguments when the person presses the chip's remove button; a removable chip has no link. */
  onRemove?: () => void
  /** Preview content or its availability. */
  preview?: boolean
  /** Overrides for named content slots. */
  slots?: EntitySlots
}

interface TierProps<T> {
  parts: Parts<T>
  dom: DomProps
}

function split<T>({ tier: _tier, fill: _fill, target: _target, ...props }: EntityIdentityProps<T>, targets: readonly T[]): TierProps<T> {
  const { name, title, kind, icon, image, portrait, state, count, facts, secondary, metric, tabs, actions, maxActions, href, onOpen, heading, size, onRemove, preview, slots, ...dom } = props
  return {
    parts: { name, title, kind, icon, image, portrait, state, count, facts, secondary, metric, tabs, actions, targets, maxActions, href, onOpen, heading, size, onRemove, preview, slots },
    dom,
  }
}

/** Right-click, long-press, Shift+F10 and the Menu key open the ⋯ menu's actions (R11.6). */
function WithContextMenu<T>({ actions, targets, name, children }: { actions?: ActionSet<T>; targets: readonly T[]; name: string; children: ReactElement }) {
  if (!actions || !targets.length) return children
  return (
    <ActionContextMenu set={actions} targets={targets} label={name}>
      {children}
    </ActionContextMenu>
  )
}

function TitleText({ name, title, href, onOpen }: { name: string; title?: ReactNode; href?: string; onOpen?: () => void }) {
  const text = <Name name={name} title={title} className="fa-entity-name" />
  if (!href && !onOpen) return text
  if (!href) {
    return (
      <button type="button" className="fa-entity-link" onClick={onOpen}>
        {text}
      </button>
    )
  }
  return (
    <a className="fa-entity-link" href={href} onClick={openHandler(onOpen)}>
      {text}
    </a>
  )
}

interface HeaderFit {
  metric: boolean
  available?: number
}

/**
 * How the header gives way (R7.4). The heading keeps its natural width first: promoted
 * buttons fold into More (the ActionBar gets only the room the tile, heading and metric
 * leave), then the metric hides, then the facts line truncates, and the name only once the
 * header is down to name, state and ⋯. It reads natural widths, never laid-out ones, so the
 * decision never feeds back into the layout. It runs when the row's content or size
 * changes, so a live state whose label grows is accounted for at once.
 */
function useHeaderFit(rowRef: RefObject<HTMLDivElement | null>, hasMetric: boolean): HeaderFit {
  const [fit, setFit] = useState<HeaderFit>({ metric: true })
  const metricWidth = useRef(0)
  const measure = useCallback(() => {
    const row = rowRef.current
    if (!row) return
    const gap = Number.parseFloat(getComputedStyle(row).columnGap) || 0
    const tile = row.querySelector<HTMLElement>(":scope > .fa-entity-icon")
    const nameEl = row.querySelector<HTMLElement>(".fa-entity-name")
    const stateEl = row.querySelector<HTMLElement>(".fa-entity-state")
    const titleline = row.querySelector<HTMLElement>(".fa-entity-titleline")
    const factsEl = row.querySelector<HTMLElement>(".fa-entity-facts")
    const metricEl = hasMetric ? row.querySelector<HTMLElement>(":scope > .fa-entity-metric") : null
    const actionsEl = row.querySelector<HTMLElement>(":scope > .fa-entity-actions")
    // The metric's width is remembered while it shows; one hidden by another rule (a short
    // window) takes no room.
    const hiddenHere = row.closest(".fa-entity")?.getAttribute("data-metric") === "hidden"
    if (metricEl && metricEl.offsetWidth > 0) metricWidth.current = metricEl.offsetWidth
    const metricRoom = metricEl && (metricEl.offsetWidth > 0 || hiddenHere) ? metricWidth.current + gap : 0
    const titleGap = titleline ? Number.parseFloat(getComputedStyle(titleline).columnGap) || 0 : 0
    // scrollWidth is the full text even while it is cut; the heading is never wider than it.
    const titleNatural = (nameEl?.scrollWidth ?? 0) + (stateEl ? titleGap + stateEl.offsetWidth : 0)
    const headingNatural = Math.max(titleNatural, factsEl?.scrollWidth ?? 0)
    const tileRoom = tile && tile.offsetWidth > 0 ? tile.offsetWidth + gap : 0
    const actions = actionsEl ? getComputedStyle(actionsEl) : null
    const actionsMin = actions ? Number.parseFloat(actions.minWidth) || 0 : 0
    // A narrow header caps the actions (one ⋯ under 30rem) with max-width.
    const cap = actions ? Number.parseFloat(actions.maxWidth) : Number.NaN
    const room = row.clientWidth - tileRoom - headingNatural - (actionsEl ? gap : 0)
    const metric = !metricEl || room - metricRoom + 0.5 >= actionsMin
    let available = Math.floor(room - (metric ? metricRoom : 0))
    if (Number.isFinite(cap)) available = Math.min(available, cap)
    // ActionBar reads 0 as "not measured yet": the least it gets is 1px, which is ⋯ alone.
    available = Math.max(1, available)
    setFit((current) => (current.metric === metric && current.available === available ? current : { metric, available }))
  }, [rowRef, hasMetric])
  useIsomorphicLayoutEffect(measure, [measure])
  // Measure again when the row's content changes (a state label, the name, the facts), not
  // after every render: a live metric re-renders often, and its box is reserved, so changes
  // inside it never change the fit. Flushed before paint, as a layout effect would be.
  useIsomorphicLayoutEffect(() => {
    const row = rowRef.current
    if (!row || typeof MutationObserver === "undefined") return
    const observer = new MutationObserver((records) => {
      const metric = row.querySelector(":scope > .fa-entity-metric")
      if (metric && records.every((record) => metric.contains(record.target))) return
      flushSync(measure)
    })
    observer.observe(row, { childList: true, subtree: true, characterData: true })
    return () => observer.disconnect()
  }, [rowRef, measure])
  useIsomorphicLayoutEffect(() => {
    const row = rowRef.current
    if (!row || typeof ResizeObserver === "undefined") return
    const unobserve = observeElementSize(row, () => measure())
    // Web fonts change the natural widths without resizing the row.
    let live = true
    void document.fonts?.ready.then(() => live && measure())
    return () => {
      live = false
      unobserve()
    }
  }, [rowRef, measure])
  return hasMetric ? fit : { metric: true, available: fit.available }
}

function HeaderTier<T>({ parts, dom }: TierProps<T>) {
  const { name, title, icon, image, portrait, state, count, facts, metric, tabs, actions, targets, maxActions, href, onOpen, heading = "h1", slots } = parts
  const Heading = heading
  const factsNode = factsText(facts)
  const rowRef = useRef<HTMLDivElement>(null)
  const fit = useHeaderFit(rowRef, Boolean(metric))
  const metricFits = fit.metric
  // The ActionBar gets only the room the heading and metric leave, folding buttons into More
  // first. Buttons give way before the metric, so once the metric has gone the bar is ⋯.
  const actionsNode =
    slots?.actions !== undefined ? (
      slots.actions
    ) : actions && targets.length ? (
      <ActionBar set={actions} targets={targets} label={name} maxButtons={metric && !metricFits ? 0 : maxActions} available={fit.available} />
    ) : null
  const stateNode = slots?.state !== undefined ? slots.state : state ? <EntityStateBadge state={state} /> : null
  return (
    <header {...dom} {...stateData(state)} className={cx("fa-entity", dom.className)} data-tier="header" data-metric={metric && !metricFits ? "hidden" : undefined}>
      <WithContextMenu actions={actions} targets={targets} name={name}>
        <div ref={rowRef} className="fa-entity-row">
          {icon || image || portrait ? <EntityTile icon={icon} image={image} portrait={portrait} state={state} count={count} labelled={false} badge={slots?.badge} /> : null}
          <div className="fa-entity-heading">
            <div className="fa-entity-titleline">
              <Heading className="fa-entity-title">
                <TitleText name={name} title={title} href={href} onOpen={onOpen} />
              </Heading>
              {stateNode ? <span className="fa-entity-state">{stateNode}</span> : null}
            </div>
            {factsNode ? <p className="fa-entity-facts">{factsNode}</p> : null}
          </div>
          {metric ? <div className="fa-entity-metric">{metric}</div> : null}
          {actionsNode ? <div className="fa-entity-actions">{actionsNode}</div> : null}
        </div>
      </WithContextMenu>
      {tabs ? <div className="fa-entity-tabs">{tabs}</div> : null}
    </header>
  )
}

function CompactTier<T>({ parts, dom }: TierProps<T>) {
  const { name, title, kind, icon, image, portrait, state, count, facts, actions, targets, href, onOpen, heading = "h2", slots } = parts
  const Heading = heading
  const factsNode = factsText(facts)
  const stateNode = slots?.state !== undefined ? slots.state : state ? <EntityStateBadge state={state} size="sm" /> : null
  const menu = slots?.actions !== undefined ? slots.actions : actions && targets.length ? <ActionMenu set={actions} targets={targets} label={name} size="md" /> : null
  return (
    <WithContextMenu actions={actions} targets={targets} name={name}>
      <div {...dom} {...stateData(state)} className={cx("fa-entity", dom.className)} data-tier="compact" role="group" aria-label={accessibleName(name, kind)}>
        <EntityTile icon={icon} image={image} portrait={portrait} state={state} count={count} labelled={false} badge={slots?.badge} />
        <div className="fa-entity-heading">
          <div className="fa-entity-titleline">
            <Heading className="fa-entity-title">
              <TitleText name={name} title={title} href={href} onOpen={onOpen} />
            </Heading>
            {stateNode ? <span className="fa-entity-state">{stateNode}</span> : null}
          </div>
          {factsNode ? <Line className="fa-entity-facts">{factsNode}</Line> : null}
        </div>
        {menu ? <div className="fa-entity-actions">{menu}</div> : null}
      </div>
    </WithContextMenu>
  )
}

function RowTier<T>({ parts, dom }: TierProps<T>) {
  const { name, title, kind, icon, portrait, state, facts, secondary, actions, targets, href, onOpen, slots } = parts
  const second = secondary ?? factsText(facts)
  const hasActions = Boolean(actions && targets.length)
  const interactive = Boolean(href || onOpen || hasActions)
  const content = (
    <>
      {/* A count would bury a 20px glyph; rows say it in their second line. */}
      <EntityGlyph icon={icon} portrait={portrait} state={state} labelled={!interactive} />
      <span className="fa-entity-text">
        <Name name={name} title={title} className="fa-entity-title" />
        {second ? <Line className="fa-entity-secondary">{second}</Line> : null}
      </span>
    </>
  )
  const label = accessibleName(name, kind, state)
  let main: ReactNode
  if (href) {
    main = (
      <a className="fa-entity-main" href={href} onClick={openHandler(onOpen)} aria-label={label}>
        {content}
      </a>
    )
  } else if (onOpen) {
    main = (
      <button type="button" className="fa-entity-main" onClick={onOpen} aria-label={label}>
        {content}
      </button>
    )
  } else if (hasActions) {
    // Actions without an open target: still focusable, so Shift+F10 reaches the menu.
    main = (
      // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- the row is a context-menu target (R11.5)
      <span className="fa-entity-main" tabIndex={0} role="group" aria-label={label}>
        {content}
      </span>
    )
  } else {
    main = <span className="fa-entity-main">{content}</span>
  }
  const menu = slots?.actions !== undefined ? slots.actions : hasActions && actions ? <ActionMenu set={actions} targets={targets} label={name} /> : null
  return (
    <WithContextMenu actions={actions} targets={targets} name={name}>
      <div {...dom} {...stateData(state)} className={cx("fa-entity", dom.className)} data-tier="row" data-interactive={interactive ? "" : undefined}>
        {main}
        {menu ? <span className="fa-entity-actions">{menu}</span> : null}
      </div>
    </WithContextMenu>
  )
}

/** The preview card's content: the compact identity and the top actions (R12). */
function PreviewContent<T>({ parts }: { parts: Parts<T> }) {
  const messages = useMessages(entityMessages)

  const { actions, targets, name } = parts
  const { start } = useActionRunner()
  const promoted = actions && targets.length ? splitForHeader(resolveActions(actions, targets, "header"), 2).promoted : []
  const identity: Parts<T> = { ...parts, actions: undefined, href: undefined, onOpen: undefined, heading: "p", slots: { badge: parts.slots?.badge } }
  return (
    <div className="fa-entity-preview-body">
      <CompactTier parts={identity} dom={{}} />
      {promoted.length ? (
        <div className="fa-entity-preview-actions" role="group" aria-label={messages.actionsFor(name)}>
          {promoted.map((action) => {
            const Icon = action.definition.icon
            return (
              <Button
                key={action.id}
                size="sm"
                variant={action.definition.primary ? "soft" : "secondary"}
                icon={Icon ? <Icon /> : undefined}
                disabledReason={action.disabledReason ?? undefined}
                onClick={() => void start(action, targets, "context")}
              >
                {action.label}
              </Button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

/** Enter and Space open a non-link opener (a chip with onOpen but no href). */
function keyOpen(onOpen?: () => void) {
  if (!onOpen) return undefined
  return (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return
    event.preventDefault()
    onOpen()
  }
}

function ChipTier<T>({ parts, dom }: TierProps<T>) {
  const messages = useMessages(entityMessages)

  const { name, title, kind, icon, portrait, state, actions, targets, href, onOpen, size = "inline", onRemove, preview = true, slots } = parts
  const popup = usePopupMetrics()
  const label = accessibleName(name, kind, state)
  const glyph = <EntityGlyph icon={icon} portrait={portrait} state={state} labelled={false} badge={slots?.badge} className="fa-entity-chip-glyph" />
  const common = { ...dom, ...stateData(state), className: cx("fa-entity", dom.className), "data-tier": "chip", "data-size": size }
  if (onRemove) {
    return (
      <span {...common} data-removable="" role="group" aria-label={label}>
        {glyph}
        <Name name={name} title={title} className="fa-entity-title" />
        <Tooltip content={messages.remove(name)}>
          <button type="button" className="fa-entity-remove fa-pressable" aria-label={messages.remove(name)} onClick={onRemove}>
            <IconClose />
          </button>
        </Tooltip>
      </span>
    )
  }
  const opens = Boolean(href || onOpen)
  const inner = (
    <>
      {glyph}
      <span className="fa-entity-title">{title ?? name}</span>
    </>
  )
  // A link when it has a place to go; otherwise a button that opens, or a focusable label.
  const behaviour = href
    ? { href, onClick: openHandler(onOpen) }
    : onOpen
      ? { role: "button", tabIndex: 0, onClick: onOpen, onKeyDown: keyOpen(onOpen) }
      : { role: "group", tabIndex: actions && targets.length ? 0 : undefined }
  const chipProps = { ...common, ...behaviour, "data-link": opens ? "" : undefined, "aria-label": label }
  const trigger = preview ? (
    <BasePreviewCard.Trigger {...(chipProps as object)} render={href ? undefined : <span />} delay={PREVIEW_DELAY_MS} closeDelay={PREVIEW_CLOSE_MS}>
      {inner}
    </BasePreviewCard.Trigger>
  ) : href ? (
    <a {...(chipProps as HTMLAttributes<HTMLAnchorElement>)}>{inner}</a>
  ) : (
    <span {...(chipProps as HTMLAttributes<HTMLSpanElement>)}>{inner}</span>
  )
  const withMenu = (
    <WithContextMenu actions={actions} targets={targets} name={name}>
      {trigger}
    </WithContextMenu>
  )
  if (!preview) return withMenu
  return (
    <BasePreviewCard.Root>
      {withMenu}
      <BasePreviewCard.Portal container={popupContainer()}>
        <BasePreviewCard.Positioner className="fa-entity-preview-positioner" sideOffset={popup.offset} collisionPadding={popup.collisionPadding}>
          <BasePreviewCard.Popup className="glass-overlay fa-popup fa-entity-preview">
            <PreviewContent parts={parts} />
          </BasePreviewCard.Popup>
        </BasePreviewCard.Positioner>
      </BasePreviewCard.Portal>
    </BasePreviewCard.Root>
  )
}

function IconTier<T>({ parts, dom }: TierProps<T>) {
  const { name, kind, icon, image, portrait, state, count, actions, targets, href, onOpen, slots } = parts
  const label = accessibleName(name, kind, state)
  const tile = (
    <>
      {portrait ? <EntityPortraitSlot portrait={portrait} icon={icon} /> : (image ?? icon)}
      {slots?.badge !== undefined ? slots.badge : <EntityBadge state={state} count={count} labelled={false} />}
    </>
  )
  const base = {
    ...dom,
    ...stateData(state),
    className: cx("fa-entity fa-tile-icon fa-entity-icon", dom.className),
    "data-tier": "icon",
    "data-image": image && !portrait ? "" : undefined,
    "data-portrait": portrait ? "" : undefined,
    "aria-label": label,
  }
  const hasActions = Boolean(actions && targets.length)
  let element: ReactElement
  if (href) {
    element = (
      <a {...(base as HTMLAttributes<HTMLAnchorElement>)} href={href} onClick={openHandler(onOpen)} data-link="">
        {tile}
      </a>
    )
  } else if (onOpen) {
    element = (
      <button {...(base as HTMLAttributes<HTMLButtonElement>)} type="button" onClick={onOpen} data-link="">
        {tile}
      </button>
    )
  } else if (hasActions) {
    element = (
      // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- an icon with actions is a context-menu target (R11.5)
      <span {...(base as HTMLAttributes<HTMLSpanElement>)} tabIndex={0} role="group">
        {tile}
      </span>
    )
  } else {
    element = (
      <span {...(base as HTMLAttributes<HTMLSpanElement>)} role="img">
        {tile}
      </span>
    )
  }
  // Every icon names itself (R20.5): the name and the state, one line.
  return (
    <WithContextMenu actions={actions} targets={targets} name={name}>
      <Tooltip content={state ? `${name} · ${state.label}` : name} describe={false}>
        {element}
      </Tooltip>
    </WithContextMenu>
  )
}

function TierSwitch<T>({ tier, ...props }: TierProps<T> & { tier: EntityTier }) {
  switch (tier) {
    case "header":
      return <HeaderTier {...props} />
    case "compact":
      return <CompactTier {...props} />
    case "row":
      return <RowTier {...props} />
    case "chip":
      return <ChipTier {...props} />
    default:
      return <IconTier {...props} />
  }
}

/** Measure a box and pick its tier. A flowing box decides by width; `fill` adds the height. */
function useAutoTier(fill: boolean | undefined) {
  const ref = useRef<HTMLDivElement>(null)
  const { width, height } = useElementSize(ref)
  const rem = useRemPx()
  const measured = width > 0
  const tier: EntityTier = measured ? selectEntityTier(width / rem, fill ? height / rem : null) : "header"
  return { ref, tier, measured }
}

/** Auto tier: the tiers render different parts, so the box is measured (R7). */
function AutoTier<T>({ fill, ...props }: TierProps<T> & { fill?: boolean }) {
  const { ref, tier, measured } = useAutoTier(fill)
  return (
    <div ref={ref} className="fa-entity-fit" data-fill={fill ? "" : undefined} data-tier={tier} data-measured={measured ? "" : undefined}>
      <TierSwitch {...props} tier={tier} />
    </div>
  )
}

/**
 * One entity at every size (docs/glass-ux-components-plan.md §5): the page header, a compact
 * header for windows, a list or tree row, an inline chip and the bare icon all come from
 * one definition, so an entity looks and behaves like itself everywhere.
 *
 * Every tier opens on click and Enter (`href` / `onOpen`), opens the ⋯ menu's actions on
 * right-click and Shift+F10 (R11.6), and is focusable when it does either. The icon tier
 * names itself in a tooltip; the chip opens a preview card (compact tier + top actions) on
 * hover and focus. Generic: it knows nothing about devices — the application maps its
 * entities onto these slots.
 */
function EntityIdentityRoot<T = unknown>(props: EntityIdentityProps<T>) {
  const { tier = "auto", fill, target } = props
  const targets = useMemo(() => (target === undefined ? [] : [target]), [target])
  const resolved = split(props, targets)
  if (tier === "auto") return <AutoTier<T> {...resolved} fill={fill} />
  return <TierSwitch<T> {...resolved} tier={tier} />
}

/* ── Skeleton ──────────────────────────────────────────────────────────────── */

export interface EntityIdentitySkeletonProps {
  /** Named size tier or automatic container-based tier selection. */
  tier?: EntityTierProp
  /** Lets the component fill a box with a definite size. */
  fill?: boolean
  /** Reserve the facts line (header, compact) or the second line (row). Default true. */
  facts?: boolean
  /** Reserve the live metric's box (header). */
  metric?: boolean
  /** Reserve the actions (header: one control; compact and row: the ⋯). */
  actions?: boolean
  /** Tab definitions in display order. */
  tabs?: boolean
  /** Chip size. */
  size?: "inline" | "sm"
  className?: string
}

/** The same boxes as the loaded identity, per tier (R9.3). */
function SkeletonTier({ tier, facts = true, metric, actions, tabs, size = "inline", className }: EntityIdentitySkeletonProps & { tier: EntityTier }) {
  const common = { className: cx("fa-entity", className), "data-tier": tier, "data-skeleton": "", "aria-hidden": true }
  switch (tier) {
    case "header":
      return (
        <header {...common}>
          <div className="fa-entity-row">
            <Skeleton.Block className="fa-entity-icon fa-entity-icon-skel" radius="tile" />
            <div className="fa-entity-heading">
              <span className="fa-entity-skel" data-tier="wide">
                <Skeleton.Text type="headline" width="40%" />
              </span>
              <span className="fa-entity-skel" data-tier="compact">
                <Skeleton.Text type="title" width="40%" />
              </span>
              {facts ? <Skeleton.Text type="body" width="60%" className="fa-entity-facts" /> : null}
            </div>
            {metric ? <Skeleton.Block className="fa-entity-metric" radius="item" /> : null}
            {actions ? <Skeleton.Block className="fa-entity-actions fa-entity-actions-skel" radius="control" /> : null}
          </div>
          {tabs ? <Skeleton.Block width="50%" height="var(--control-h-md)" radius="control" /> : null}
        </header>
      )
    case "compact":
      return (
        <div {...common}>
          <Skeleton.Block className="fa-entity-icon fa-entity-icon-skel" radius="control" />
          <div className="fa-entity-heading">
            <div className="fa-entity-titleline">
              <Skeleton.Text type="subtitle" width="55%" className="fa-entity-title" />
            </div>
            {facts ? <Skeleton.Text type="caption" width="75%" className="fa-entity-facts" /> : null}
          </div>
          {actions ? <Skeleton.Block className="fa-entity-actions fa-entity-menu-skel" radius="control" /> : null}
        </div>
      )
    case "row":
      return (
        // A row with actions is interactive: its minimum height and insets are part of the box.
        <div {...common} data-interactive={actions ? "" : undefined}>
          <span className="fa-entity-main">
            <Skeleton.Block className="fa-entity-glyph" radius="item" />
            <span className="fa-entity-text">
              <Skeleton.Text type="body" width="62%" className="fa-entity-title" />
              {facts ? <Skeleton.Text type="caption" width="78%" className="fa-entity-secondary" /> : null}
            </span>
          </span>
          {actions ? <Skeleton.Block className="fa-entity-actions fa-entity-row-menu-skel" radius="control" /> : null}
        </div>
      )
    case "chip":
      return <span {...common} data-size={size} className={cx("fa-entity fa-skel", className)} />
    default:
      return <Skeleton.Block {...common} className={cx("fa-entity fa-entity-icon", className)} radius="control" />
  }
}

/** Loading placeholder with the same boxes as the loaded identity at each tier; with `tier="auto"` (default) it measures its container like EntityIdentity. Also available as `EntityIdentity.Skeleton`. */
function EntityIdentitySkeleton({ tier = "auto", fill, ...props }: EntityIdentitySkeletonProps) {
  const messages = useMessages(entityMessages)

  const { ref, tier: resolved, measured } = useAutoTier(fill)
  if (tier !== "auto") return <SkeletonTier {...props} tier={tier} />
  return (
    <div ref={ref} className="fa-entity-fit" data-fill={fill ? "" : undefined} data-tier={resolved} data-measured={measured ? "" : undefined} aria-busy="true" aria-label={messages.loading}>
      <SkeletonTier {...props} tier={resolved} />
    </div>
  )
}

/* ── Static preview card (documentation) ───────────────────────────────────── */

/** The chip's preview card drawn in place, for documentation and screenshots. */
function EntityPreviewCardStatic<T>(props: EntityIdentityProps<T>) {
  const { target } = props
  const targets = useMemo(() => (target === undefined ? [] : [target]), [target])
  return (
    <div className="glass-overlay fa-popup fa-entity-preview fa-entity-preview-static">
      <PreviewContent<T> parts={split(props, targets).parts} />
    </div>
  )
}

/** The preview card's content (compact tier + top actions) without the card: for hosts that bring their own surface. */
function EntityPreviewBody<T>(props: EntityIdentityProps<T>) {
  const { target } = props
  const targets = useMemo(() => (target === undefined ? [] : [target]), [target])
  return <PreviewContent<T> parts={split(props, targets).parts} />
}

/** Present a host-defined entity with its glyph or avatar, readable name and supporting metadata. */
export const EntityIdentity = Object.assign(EntityIdentityRoot, {
  Skeleton: EntityIdentitySkeleton,
  PreviewBody: EntityPreviewBody,
  Glyph: EntityGlyph,
  Badge: EntityBadge,
  State: EntityStateBadge,
  PreviewCard: EntityPreviewCardStatic,
})

export { EntityIdentitySkeleton, ENTITY_TIER_LIMITS }
