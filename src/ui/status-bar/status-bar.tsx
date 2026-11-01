import { mergeProps } from "@base-ui/react/merge-props"
import { Popover as BasePopover } from "@base-ui/react/popover"
import { useRender } from "@base-ui/react/use-render"
import {
  createContext,
  use,
  useCallback,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type MouseEventHandler,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react"
import { createPortal, flushSync } from "react-dom"
import { IconMoreHorizontal } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { useMessages } from "../../lib/i18n/index.js"
import { numberFormat } from "../../lib/locale/intl.js"
import { useLocale } from "../../lib/locale/use-locale.js"
import { observeElementSizes } from "../../lib/resize-observer.js"
import { StatusDot, type StatusKind } from "../badge/index.js"
import { Popover } from "../popover/index.js"
import { Tooltip } from "../tooltip/index.js"
import { TruncatedText } from "../truncated-text/index.js"
import { statusBarMessages } from "./messages.js"

const useIsomorphicLayoutEffect = typeof window === "undefined" ? () => {} : useLayoutEffect

/** The tones an item can show; each draws a status dot before the label. */
export type StatusBarTone = "success" | "warning" | "danger" | "info" | "neutral"

const TONE_STATUS = {
  success: "online",
  warning: "warning",
  danger: "error",
  info: "connecting",
  neutral: "offline",
} as const satisfies Record<StatusBarTone, StatusKind>

interface RankedItem {
  rank: number
  element: HTMLElement
}

interface GiveWay {
  /** Items whose rank is at or under this have moved into More. 0: none. */
  level: number
  /** The open More popup's body, where those items render; null while it is closed. */
  host: HTMLElement | null
  register: (id: string, item: RankedItem) => () => void
}

const GiveWayContext = /* @__PURE__ */ createContext<GiveWay | null>(null)

/**
 * Which items fit. The natural widths are read when the shared observer reports the bar or
 * an item, with `data-measuring` showing everything at max-content for that one read, so the
 * answer never depends on what is currently hidden. Only runs once an item has a rank.
 */
function useGiveWay(barRef: { current: HTMLElement | null }) {
  const items = useRef(new Map<string, RankedItem>())
  const widths = useRef(new Map<string, number>())
  const [count, setCount] = useState(0)
  const [ranked, setRanked] = useState(0)
  const [level, setLevel] = useState(0)
  const [host, setHost] = useState<HTMLElement | null>(null)
  const hostRef = useRef<HTMLElement | null>(null)
  hostRef.current = host

  const register = useCallback((id: string, item: RankedItem) => {
    items.current.set(id, item)
    setRanked((current) => current + 1)
    return () => {
      items.current.delete(id)
      widths.current.delete(id)
      setRanked((current) => current - 1)
    }
  }, [])

  useIsomorphicLayoutEffect(() => {
    const bar = barRef.current
    if (!bar || ranked === 0 || typeof ResizeObserver === "undefined") return
    const measure = () => {
      // Items in the open popup are not in the bar: keep the answer until it closes.
      if (hostRef.current) return
      const available = bar.clientWidth
      bar.toggleAttribute("data-measuring", true)
      const natural = bar.getBoundingClientRect().width
      const more = bar.querySelector<HTMLElement>(":scope > .fa-status-bar-more")?.getBoundingClientRect().width ?? 0
      for (const [id, item] of items.current) widths.current.set(id, item.element.getBoundingClientRect().width)
      bar.removeAttribute("data-measuring")
      const gap = Number.parseFloat(getComputedStyle(bar).columnGap) || 0
      const ranks = [...new Set([...items.current.values()].map((item) => item.rank))].toSorted((a, b) => a - b)
      // With nothing moved the trigger is not shown; once anything moves, it takes its place.
      let total = natural
      let next = 0
      let moved = 0
      if (natural - more - gap > available + 0.5) {
        for (const rank of ranks) {
          if (total <= available + 0.5) break
          for (const [id, item] of items.current) {
            if (item.rank !== rank) continue
            total -= widths.current.get(id) ?? 0
            moved += 1
          }
          next = rank
        }
      }
      flushSync(() => {
        setLevel(next)
        setCount(moved)
      })
    }
    const group = observeElementSizes(measure)
    group.observe(bar)
    for (const item of items.current.values()) group.observe(item.element)
    return () => group.disconnect()
  }, [barRef, ranked])

  const value = useMemo<GiveWay>(() => ({ level, host, register }), [level, host, register])
  return { value, ranked, count, setHost }
}

/** The trailing More button: what gave way, in a popup, the same elements with the same handlers. */
function More({ count, shown, setHost }: { count: number; shown: boolean; setHost: (element: HTMLElement | null) => void }) {
  const messages = useMessages(statusBarMessages)
  const locale = useLocale()
  return (
    <BasePopover.Root onOpenChange={(open) => (open ? undefined : setHost(null))}>
      <BasePopover.Trigger type="button" className="fa-status-bar-more fa-pressable" hidden={!shown} aria-label={messages.moreStatus(numberFormat(locale).format(count))}>
        <IconMoreHorizontal />
      </BasePopover.Trigger>
      <Popover.Popup size="sm" side="top" align="end">
        <div ref={setHost} className="fa-status-bar-overflow" />
      </Popover.Popup>
    </BasePopover.Root>
  )
}

export interface StatusBarProps extends Omit<ComponentProps<"div">, "ref"> {
  /** Names the bar: "Editor status". */
  "aria-label"?: string
  /** The element to render instead of a div. It keeps its own role (`<footer />`). */
  render?: ReactElement
  /** The element, for measuring or focus. */
  ref?: Ref<HTMLElement>
}

/**
 * A general application status bar (R14.6): `Start` and `End` groups of `Item`s, on the
 * canvas under a view or in a window's status slot. Items may be buttons.
 *
 * Content gives way in a stated order when the box is narrow (R7.4), never silently:
 * 1. Items with a `giveWay` rank move into a trailing More popup, rank 1 first, then 2.
 * 2. Unranked text in `End` truncates.
 * 3. Unranked text in `Start` truncates.
 * 4. An item with a `tone` is the state itself and does not shrink.
 */
function StatusBarRoot({ render, className, children, ref, ...rest }: StatusBarProps) {
  const barRef = useRef<HTMLElement | null>(null)
  const { value, ranked, count, setHost } = useGiveWay(barRef)
  const named = !render && rest["aria-label"] !== undefined
  return useRender({
    defaultTagName: "div",
    render,
    ref: [barRef, ...(ref ? [ref] : [])],
    props: mergeProps<"div">(
      {
        className: cx("fa-status-bar", className),
        role: named ? "group" : undefined,
        children: (
          <GiveWayContext value={value}>
            {children}
            {ranked > 0 ? <More count={count} shown={value.level > 0} setHost={setHost} /> : null}
          </GiveWayContext>
        ),
      },
      rest
    ),
  })
}

export interface StatusBarStartProps extends ComponentProps<"span"> {}

/** The leading group: the view's state first. Holds Items and any small content. */
function Start({ className, ...rest }: StatusBarStartProps) {
  return <span {...rest} className={cx("fa-status-bar-start", className)} />
}

export interface StatusBarEndProps extends ComponentProps<"span"> {}

/** The trailing group, at the reading end (resolution, latency, counts). Its content is joined with "·". */
function End({ className, ...rest }: StatusBarEndProps) {
  return <span {...rest} className={cx("fa-status-bar-end", className)} data-numeric />
}

export interface StatusBarGroupProps extends ComponentProps<"span"> {}

/**
 * A live region for items that report changes (connection lost, reconnecting). Ticking text,
 * such as an elapsed time, stays outside it. Outside a StatusBar (a window's status slot) it
 * keeps the give-way order for its own items.
 */
function Group({ className, children, ...rest }: StatusBarGroupProps) {
  const inherited = use(GiveWayContext)
  const groupRef = useRef<HTMLElement | null>(null)
  const { value, ranked, count, setHost } = useGiveWay(groupRef)
  return (
    <span role="status" {...rest} ref={groupRef as Ref<HTMLSpanElement>} className={cx("fa-status-bar-group", className)}>
      {inherited ? (
        children
      ) : (
        <GiveWayContext value={value}>
          {children}
          {ranked > 0 ? <More count={count} shown={value.level > 0} setHost={setHost} /> : null}
        </GiveWayContext>
      )}
    </span>
  )
}

export interface StatusBarItemProps extends Omit<ComponentProps<"span">, "onClick" | "ref"> {
  /** Draws a status dot before the label. The item then does not shrink. */
  tone?: StatusBarTone
  /**
   * Moves into the More popup when the box is too narrow, lowest rank first. Leave it unset
   * for an item that stays in the bar and truncates instead.
   */
  giveWay?: number
  /** Makes the item a button. */
  onClick?: MouseEventHandler<HTMLElement>
  /** Why the button does nothing now. It stays focusable and shows this as its tooltip (R11.3). */
  disabledReason?: string | null
  /** The element, for a menu or popover that this item opens. */
  ref?: Ref<HTMLElement>
}

/**
 * One fact in the bar; items are joined with "·". With `onClick`, or when a menu or popover
 * trigger renders it, it is a button (name it with `aria-label` when the visible value alone
 * does not say what it does). A ranked item keeps its handlers in the More popup.
 */
function Item({ tone, giveWay, onClick, disabledReason, className, children, ref, ...rest }: StatusBarItemProps) {
  const bar = use(GiveWayContext)
  const id = useId()
  const [element, setElement] = useState<HTMLElement | null>(null)
  const register = bar?.register
  const rank = giveWay
  useIsomorphicLayoutEffect(() => {
    if (!register || rank === undefined || !element) return
    return register(id, { rank, element })
  }, [register, rank, element, id])
  const gaveWay = bar !== null && giveWay !== undefined && giveWay <= bar.level
  const host = gaveWay ? bar.host : null
  const interactive = onClick !== undefined || rest["aria-haspopup"] !== undefined
  const refs = (node: HTMLElement | null) => {
    setElement(node)
    if (typeof ref === "function") return ref(node)
    if (ref) ref.current = node
  }
  const body = (
    <>
      {tone ? <StatusDot status={TONE_STATUS[tone]} /> : null}
      <TruncatedText className="fa-status-bar-label">{children}</TruncatedText>
    </>
  )
  const shared = {
    className: cx("fa-status-bar-item", interactive && "fa-pressable", className),
    "data-tone": tone,
    "data-give-way": giveWay,
    hidden: (gaveWay && !host) || undefined,
  }
  let node: ReactNode = interactive ? (
    <button
      {...(rest as ComponentProps<"button">)}
      {...shared}
      ref={refs}
      type="button"
      data-interactive=""
      aria-disabled={disabledReason ? true : undefined}
      onClick={disabledReason ? undefined : onClick}
    >
      {body}
    </button>
  ) : (
    <span {...rest} {...shared} ref={refs}>
      {body}
    </span>
  )
  if (disabledReason) node = <Tooltip content={disabledReason}>{node as ReactElement}</Tooltip>
  return host ? createPortal(node, host) : node
}

/**
 * A general application status bar: `StatusBar` with `StatusBar.Start`, `StatusBar.End`,
 * `StatusBar.Item` and the live `StatusBar.Group`. `WindowFrame.StatusBar` and its parts are
 * built on these.
 */
export const StatusBar = /* @__PURE__ */ Object.assign(StatusBarRoot, { Start, End, Item, Group })
