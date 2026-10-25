import { useMessages } from "../../lib/i18n/index.js"
import { comboboxMessages, getComboboxMessages } from "./messages.js"
/**
 * The row and list states shared by every list popup: Combobox, MultiSelect,
 * Autocomplete, TagInput — and reusable by the AI composer's @-mentions and the command
 * palette. Rows sit inside an `fa-item`; this renders what goes in it.
 */
import type { ReactNode } from "react"
import { IconAlert, IconCheck } from "../../icons/generated/icons.js"
import { numberFormat } from "../../lib/locale/intl.js"
import { useLocale } from "../../lib/locale/use-locale.js"
import { Button } from "../button/index.js"
import { Skeleton } from "../skeleton/index.js"
import { matchRanges, type OptionItem, type SearchStatus } from "./source.js"

/** `text` with the parts matching `query` emphasised (case- and diacritic-insensitive). */
export function Highlight({ text, query }: {
  /** The text to show. */
  text: string
  /** The search text whose matches are marked; blank marks nothing. */
  query: string
}) {
  const ranges = query.trim() ? matchRanges(text, query) : []
  if (ranges.length === 0) return <>{text}</>
  const parts: ReactNode[] = []
  let at = 0
  ranges.forEach(([start, end], index) => {
    if (start > at) parts.push(text.slice(at, start))
    parts.push(
      <mark key={index} className="fa-option-match">
        {text.slice(start, end)}
      </mark>
    )
    at = end
  })
  if (at < text.length) parts.push(text.slice(at))
  return <>{parts}</>
}

export interface OptionRowProps {
  /** The typed item displayed or acted upon. */
  item: OptionItem
  /** The text being searched for; matches are emphasised. */
  query?: string
  /** Reserve a trailing column for a ✓ (pass the indicator element to fill it). */
  check?: ReactNode | boolean
}

/**
 * One option's content: icon, label and description with matches emphasised, meta on
 * the right and an optional ✓ column. A disabled option shows its reason as the second line.
 */
export function OptionRow({ item, query = "", check }: OptionRowProps) {
  const second = item.disabled && item.disabledReason ? item.disabledReason : item.description
  return (
    <>
      {item.icon}
      <span className="fa-option-text" data-query={query.trim() ? "" : undefined}>
        <span className="fa-option-label">
          <Highlight text={item.label} query={query} />
        </span>
        {second ? (
          <span className="fa-option-description">
            <Highlight text={second} query={item.disabled ? "" : query} />
          </span>
        ) : null}
      </span>
      {item.meta !== undefined ? <span className="fa-option-meta">{item.meta}</span> : null}
      {check ? (
        <span className="fa-select-check" aria-hidden>
          {check === true ? <IconCheck /> : check}
        </span>
      ) : null}
    </>
  )
}

/** True when any option has a second line (rows and skeletons then use the two-line height). */
export const hasSecondLine = (items: OptionItem[]) => items.some((item) => item.description || (item.disabled && item.disabledReason))

export interface OptionStatusProps {
  /** Current operation or connection status. */
  status: SearchStatus
  /** Two-line rows: the skeleton matches them. */
  twoLine?: boolean
  /** Characters still needed before searching. */
  needsMore?: number
  /** Called when Retry is pressed in the error row. Without it the error row has no Retry button. */
  onRetry?: () => void
}

/**
 * The list's state above the options: a thin indeterminate line while results refresh
 * (the previous ones stay), skeleton rows on the first load, an error row with Retry, or
 * a prompt for more characters. Rows are exactly one option tall.
 */
export function OptionStatus({ status, twoLine = false, needsMore = 0, onRetry }: OptionStatusProps) {
  const messages = useMessages(comboboxMessages)

  return (
    <>
      {status === "refreshing" ? <div className="fa-option-progress fa-shimmer" aria-hidden /> : null}
      {status === "loading" ? (
        <div className="fa-option-skeletons" aria-hidden>
          {[72, 54, 64, 46].map((width) => (
            <div key={width} className="fa-option-skeleton" data-two-line={twoLine ? "" : undefined}>
              <Skeleton.Text type="body" width={`${width}%`} />
              {twoLine ? <Skeleton.Text type="caption" width={`${width - 18}%`} /> : null}
            </div>
          ))}
        </div>
      ) : null}
      {status === "error" ? (
        <div className="fa-option-note" data-tone="danger" role="alert">
          <IconAlert />
          <span className="fa-option-note-text">{messages.searchFailedCheckTheConnectionAndRetry}</span>
          {onRetry ? (
            <Button size="sm" variant="ghost" onClick={onRetry} className="fa-option-retry">
              {messages.retry} </Button>
          ) : null}
        </div>
      ) : null}
      {needsMore > 0 ? (
        <div className="fa-option-note">
          <span className="fa-option-note-text">
            {messages.typeMoreCharacters(needsMore)} </span>
        </div>
      ) : null}
    </>
  )
}

/** "1,272 more — refine your search", under a truncated result list. */
export function OptionMore({ more }: {
  /** How many results were left out of the list; nothing renders when 0 or less. */
  more: number
}) {
  const messages = useMessages(comboboxMessages)

  const locale = useLocale()
  if (more <= 0) return null
  return <div className="fa-option-more">{numberFormat(locale).format(more)} {messages.moreRefineYourSearch}</div>
}

/** What a screen reader hears about the list (render inside the popup's Status part). */
export function statusAnnouncement(status: SearchStatus, count: number, query: string, messages = getComboboxMessages(), locale = "en-US") {
  if (status === "loading") return messages.loadingResults
  if (status === "error") return messages.searchFailed
  if (!query.trim()) return ""
  if (count === 0) return messages.noMatchesFor(query.trim())
  return messages.resultCount(count, locale)
}

/** Split a flat option list into Base UI groups when any option names a group. */
export function groupOptions<V extends string>(items: Array<OptionItem<V>>) {
  if (!items.some((item) => item.group)) return null
  const groups: Array<{ value: string; items: Array<OptionItem<V>> }> = []
  for (const item of items) {
    const name = item.group ?? ""
    let group = groups.find((existing) => existing.value === name)
    if (!group) {
      group = { value: name, items: [] }
      groups.push(group)
    }
    group.items.push(item)
  }
  return groups
}
