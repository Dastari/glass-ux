import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode, type Ref, type RefObject } from "react"
import { IconChevronDown, IconChevronRight, IconChevronUp, IconClose, IconSearch } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { useMessages } from "../../lib/i18n/index.js"
import { numberFormat } from "../../lib/locale/intl.js"
import { useLocale } from "../../lib/locale/use-locale.js"
import { useControllable } from "../../lib/use-controllable.js"
import { Button } from "../button/index.js"
import { Input } from "../input/index.js"
import { Surface } from "../surface/index.js"
import { VisuallyHidden } from "../visually-hidden/index.js"
import { findBarMessages } from "./messages.js"

/** Quiet time before the outcome is announced, so typing is not read out letter by letter. */
const ANNOUNCE_DELAY = 400
/** From here a count is abbreviated, so it always fits the reserved width. */
const COMPACT_FROM = 10_000

export interface FindBarProps {
  /** The search term, controlled. */
  value?: string
  /** The initial term when uncontrolled. Default empty. */
  defaultValue?: string
  /** Called with the term on every edit. The host runs the search. */
  onValueChange?: (value: string) => void
  /** Matches found so far. Leave undefined until there is something to count. */
  matchCount?: number
  /** The current match, counted from 0. Leave undefined when none is current. */
  matchIndex?: number
  /** The search is still running, so `matchCount` may climb. The count shows "128+" and is announced only once it settles. */
  searching?: boolean
  /** Move to the next match: the button, or Enter in the term. */
  onNext?: () => void
  /** Move to the previous match: the button, or Shift+Enter in the term. */
  onPrevious?: () => void
  /** Whether the bar is showing, controlled. */
  open?: boolean
  /** The initial state when uncontrolled. Default true. */
  defaultOpen?: boolean
  /** Called when Escape or the close button asks to close. */
  onOpenChange?: (open: boolean) => void
  /** Focus the term and select it on mount. It is always focused when `open` turns true. Default false. */
  autoFocus?: boolean
  /** Where focus goes on closing. Default: the element that had focus before the bar did. */
  returnFocusRef?: RefObject<HTMLElement | null>
  /** Search options, usually pressed icon buttons for case, whole word and pattern. The host owns their state and their meaning. */
  toggles?: ReactNode
  /** Replace the current match. Supplying it, or `onReplaceAll`, offers the replace row. */
  onReplace?: (replacement: string) => void
  /** Replace every match. */
  onReplaceAll?: (replacement: string) => void
  /** The replacement text, controlled. */
  replaceValue?: string
  /** The initial replacement when uncontrolled. Default empty. */
  defaultReplaceValue?: string
  /** Called with the replacement on every edit. */
  onReplaceValueChange?: (value: string) => void
  /** Whether the replace row is showing, controlled. */
  replaceOpen?: boolean
  /** The initial state when uncontrolled. Default false. */
  defaultReplaceOpen?: boolean
  /** Called when the disclosure button is pressed. */
  onReplaceOpenChange?: (open: boolean) => void
  /**
   * Float at the top end of the nearest positioned ancestor, on overlay glass. Put that
   * ancestor around the scroller, not inside it: the bar stays clear of the scroll edge and
   * the scrollbar, and the scroller needs `scroll-padding-block-start` so a revealed match
   * is not left under it. Default false, for a bar in the page flow.
   */
  floating?: boolean
  /** Accessible name of the search landmark. Default "Find". */
  "aria-label"?: string
  /** Receives the term's input. */
  inputRef?: Ref<HTMLInputElement>
  /** Layout classes. */
  className?: string
}

/**
 * A find control for logs, tables and long documents. It holds no search logic: the host
 * owns matching and tells the bar how many matches there are, which one is current and
 * whether the count is still climbing. Options come through the `toggles` slot.
 *
 * Stability  the count's width is reserved, so a climbing count moves nothing (R9.1). Past
 *            9,999 it abbreviates to stay inside that width.
 * Announce   the outcome goes to a polite region that stays mounted, once it settles; the
 *            ticking count never does (R20.9).
 * Keys       Enter next · Shift+Enter previous · Esc closes and returns focus (R20.3).
 *            In the replace field Enter replaces the current match.
 * Width      below 28rem the options and count take a second row.
 */
export function FindBar({
  value: valueProp,
  defaultValue = "",
  onValueChange,
  open: openProp,
  defaultOpen = true,
  onOpenChange,
  replaceValue: replaceValueProp,
  defaultReplaceValue = "",
  onReplaceValueChange,
  replaceOpen: replaceOpenProp,
  defaultReplaceOpen = false,
  onReplaceOpenChange,
  ...rest
}: FindBarProps) {
  const [value, setValue] = useControllable(valueProp, defaultValue)
  const [replacement, setReplacement] = useControllable(replaceValueProp, defaultReplaceValue)
  const [replaceOpen, setReplaceOpen] = useControllable(replaceOpenProp, defaultReplaceOpen)
  const [open, setOpen] = useControllable(openProp, defaultOpen)
  // The bar focuses itself when it opens, not on the page's first render.
  const first = useRef(true)
  useEffect(() => {
    first.current = false
  }, [])
  if (!open) return null
  return (
    <FindBarBody
      {...rest}
      autoFocus={rest.autoFocus || !first.current}
      value={value}
      replacement={replacement}
      replaceOpen={replaceOpen}
      onValueChange={(next) => {
        setValue(next)
        onValueChange?.(next)
      }}
      onReplacementChange={(next) => {
        setReplacement(next)
        onReplaceValueChange?.(next)
      }}
      onReplaceOpenChange={(next) => {
        setReplaceOpen(next)
        onReplaceOpenChange?.(next)
      }}
      onClose={() => {
        setOpen(false)
        onOpenChange?.(false)
      }}
    />
  )
}

type BodyProps = Pick<
  FindBarProps,
  | "matchCount"
  | "matchIndex"
  | "searching"
  | "onNext"
  | "onPrevious"
  | "autoFocus"
  | "returnFocusRef"
  | "toggles"
  | "onReplace"
  | "onReplaceAll"
  | "floating"
  | "aria-label"
  | "inputRef"
  | "className"
> & {
  value: string
  onValueChange: (value: string) => void
  replacement: string
  onReplacementChange: (value: string) => void
  replaceOpen: boolean
  onReplaceOpenChange: (open: boolean) => void
  onClose: () => void
}

function assign<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") ref(value)
  else if (ref) ref.current = value
}

function FindBarBody({
  value,
  onValueChange,
  matchCount,
  matchIndex,
  searching = false,
  onNext,
  onPrevious,
  autoFocus = false,
  returnFocusRef,
  toggles,
  onReplace,
  onReplaceAll,
  replacement,
  onReplacementChange,
  replaceOpen,
  onReplaceOpenChange,
  floating = false,
  "aria-label": ariaLabel,
  inputRef,
  onClose,
  className,
}: BodyProps) {
  const messages = useMessages(findBarMessages)
  const locale = useLocale()
  const replaceId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<HTMLInputElement | null>(null)
  const origin = useRef<HTMLElement | null>(null)
  const returnFocus = useRef(returnFocusRef)
  returnFocus.current = returnFocusRef

  const formatted = (count: number) =>
    (count >= COMPACT_FROM ? numberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }) : numberFormat(locale)).format(count)
  const sample = numberFormat(locale).format(COMPACT_FROM - 1)

  const hasTerm = value !== ""
  const known = hasTerm && matchCount !== undefined
  const none = known && matchCount === 0 && !searching
  const current = known && matchIndex !== undefined && matchCount > 0 ? formatted(matchIndex + 1) : undefined
  const total = known ? (searching ? messages.atLeast(formatted(matchCount)) : formatted(matchCount)) : ""
  const count = !hasTerm
    ? ""
    : none
      ? messages.noMatches
      : searching && !matchCount
        ? messages.searching
        : current
          ? messages.position(current, total)
          : total

  // Decided from settled facts only: while the search runs the climbing total stays out of it.
  const outcome = !hasTerm
    ? ""
    : searching
      ? current
        ? messages.matchWhileSearching(current)
        : messages.searching
      : !known
        ? ""
        : none
          ? messages.noMatches
          : current
            ? messages.matchPosition(current, formatted(matchCount))
            : messages.matchCount(matchCount, locale)
  const [announced, setAnnounced] = useState("")
  useEffect(() => {
    const timer = setTimeout(() => setAnnounced(outcome), ANNOUNCE_DELAY)
    return () => clearTimeout(timer)
  }, [outcome])

  useLayoutEffect(() => {
    if (!autoFocus) return
    termRef.current?.focus({ preventScroll: true })
    termRef.current?.select()
    // Only on opening: a later change of the flag must not pull focus back.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Leaving with focus inside, by any route: focus goes back rather than falling to the body.
  useLayoutEffect(() => {
    const root = rootRef.current
    return () => {
      if (!root?.contains(document.activeElement)) return
      const target = returnFocus.current?.current ?? origin.current
      if (target?.isConnected) target.focus({ preventScroll: true })
    }
  }, [])

  const noMatch = !known || matchCount === 0 ? messages.noMatches : undefined
  const hasReplace = Boolean(onReplace || onReplaceAll)

  const onTermKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return
    event.preventDefault()
    if (noMatch) return
    if (event.shiftKey) onPrevious?.()
    else onNext?.()
  }
  const onReplaceKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return
    event.preventDefault()
    if (!noMatch) onReplace?.(replacement)
  }
  const onRootKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Escape" || event.defaultPrevented || event.nativeEvent.isComposing) return
    event.preventDefault()
    event.stopPropagation()
    onClose()
  }

  const body = (
    <>
      <div className="fa-find-bar-row">
        {hasReplace ? (
          <Button
            variant="ghost"
            size="sm"
            className="fa-find-bar-disclosure"
            icon={replaceOpen ? <IconChevronDown /> : <IconChevronRight />}
            aria-label={replaceOpen ? messages.hideReplace : messages.showReplace}
            aria-expanded={replaceOpen}
            aria-controls={replaceOpen ? replaceId : undefined}
            onClick={() => onReplaceOpenChange(!replaceOpen)}
          />
        ) : null}
        <Input
          ref={(element) => {
            termRef.current = element
            assign(inputRef, element)
          }}
          size="sm"
          className="fa-find-bar-term"
          icon={<IconSearch />}
          aria-label={messages.find}
          value={value}
          onValueChange={(next) => onValueChange(next)}
          onKeyDown={onTermKey}
        />
        {/* The widest forms sit invisibly in the same cell, so nothing moves as the text changes. */}
        <span className="fa-find-bar-count" data-numeric>
          <span aria-hidden className="fa-find-bar-sizer">
            {messages.position(sample, messages.atLeast(sample))}
          </span>
          <span aria-hidden className="fa-find-bar-sizer">
            {messages.noMatches}
          </span>
          <span aria-hidden className="fa-find-bar-sizer">
            {messages.searching}
          </span>
          <span>{count}</span>
        </span>
        {toggles ? <div className="fa-find-bar-toggles">{toggles}</div> : null}
        <div className="fa-find-bar-nav">
          <Button variant="ghost" size="sm" icon={<IconChevronUp />} aria-label={messages.previousMatch} disabledReason={noMatch} onClick={onPrevious} />
          <Button variant="ghost" size="sm" icon={<IconChevronDown />} aria-label={messages.nextMatch} disabledReason={noMatch} onClick={onNext} />
          <Button variant="ghost" size="sm" icon={<IconClose />} aria-label={messages.close} onClick={onClose} />
        </div>
      </div>
      {hasReplace && replaceOpen ? (
        <div id={replaceId} className="fa-find-bar-row fa-find-bar-replace">
          <Input
            size="sm"
            className="fa-find-bar-term"
            aria-label={messages.replaceWith}
            placeholder={messages.replaceWith}
            value={replacement}
            onValueChange={(next) => onReplacementChange(next)}
            onKeyDown={onReplaceKey}
          />
          {onReplace ? (
            <Button variant="secondary" size="sm" disabledReason={noMatch} onClick={() => onReplace(replacement)}>
              {messages.replace}
            </Button>
          ) : null}
          {onReplaceAll ? (
            <Button variant="secondary" size="sm" disabledReason={noMatch} onClick={() => onReplaceAll(replacement)}>
              {messages.replaceAll}
            </Button>
          ) : null}
        </div>
      ) : null}
      <VisuallyHidden role="status">{announced}</VisuallyHidden>
    </>
  )

  const landmark = {
    ref: rootRef,
    role: "search",
    "aria-label": ariaLabel ?? messages.find,
    "data-floating": floating ? "" : undefined,
    "data-replace": hasReplace ? "" : undefined,
    className: cx("fa-find-bar", className),
    onKeyDown: onRootKey,
    onFocus: (event: { relatedTarget: EventTarget | null }) => {
      // The element focus came from, when it came from outside.
      const from = event.relatedTarget
      if (from instanceof HTMLElement && !rootRef.current?.contains(from)) origin.current = from
    },
  }
  // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Escape from anywhere in the bar closes it
  if (!floating) return <div {...landmark}>{body}</div>
  return (
    <Surface {...landmark} material="overlay" radius="overlay" padding="overlay">
      {body}
    </Surface>
  )
}
