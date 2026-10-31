/**
 * Options for every pick-from-a-list control (Combobox, MultiSelect, Autocomplete,
 * TagInput), whether static or searched on a server.
 *
 *   OptionItem     one row: value, label, optional description, icon, group, meta
 *   OptionSource   an async search: debounced, cancellable, cached, with suggestions
 *   useOptionSearch(source, query) → { items, status, … } — only the latest query renders
 */
import { useEffect, useState, type ReactNode } from "react"
import { foldText } from "../../lib/fold.js"
import { getLocale } from "../../lib/locale/locale.js"

export interface OptionItem<V extends string = string> {
  value: V
  label: string
  /** Second line ("AzureAD\MiraRowan"). Searched and highlighted like the label. */
  description?: string
  /** Pass the icon without a size. */
  icon?: ReactNode
  /** Rows with the same group are listed together under an overline label. */
  group?: string
  /** Right-aligned caption or badge: a status, a count, a version. */
  meta?: ReactNode
  disabled?: boolean
  /** Why it is disabled; shown in the row's tooltip and announced. */
  disabledReason?: string
}

export interface SearchResult<V extends string = string> {
  items: Array<OptionItem<V>>
  /** How many more matches the server has but did not send. */
  more?: number
}

export interface OptionSource<V extends string = string> {
  search(query: string, options: { signal: AbortSignal }): Promise<Array<OptionItem<V>> | SearchResult<V>>
  /** Wait this long after the last keystroke before searching. Default 200 ms. */
  debounceMs?: number
  /** Characters needed before searching ("Type 2 characters to search"). Default 0. */
  minChars?: number
  /** Shown on focus before typing: recent or suggested items. */
  suggestions?: Array<OptionItem<V>>
}

export type SearchStatus = "idle" | "loading" | "refreshing" | "error"

export interface OptionSearch<V extends string = string> {
  items: Array<OptionItem<V>>
  /** Current operation or connection status. */
  status: SearchStatus
  /** Matches the server did not send. */
  more: number
  /** The query is shorter than minChars (the list asks for more). */
  needsMore: number
  /** Run the current query again (after an error). */
  retry: () => void
}

const DEFAULT_DEBOUNCE_MS = 200
const CACHE_SIZE = 24

/** A tiny least-recently-used cache, one per source. */
class Lru<V> {
  private entries = new Map<string, V>()
  get(key: string) {
    const value = this.entries.get(key)
    if (value === undefined) return undefined
    this.entries.delete(key)
    this.entries.set(key, value)
    return value
  }
  set(key: string, value: V) {
    this.entries.delete(key)
    this.entries.set(key, value)
    if (this.entries.size > CACHE_SIZE) this.entries.delete(this.entries.keys().next().value as string)
  }
}

const caches = new WeakMap<OptionSource<string>, Lru<SearchResult<string>>>()
const cacheFor = <V extends string>(source: OptionSource<V>) => {
  let cache = caches.get(source as OptionSource<string>)
  if (!cache) {
    cache = new Lru()
    caches.set(source as OptionSource<string>, cache)
  }
  return cache as unknown as Lru<SearchResult<V>>
}

const normaliseResult = <V extends string>(result: Array<OptionItem<V>> | SearchResult<V>): SearchResult<V> =>
  Array.isArray(result) ? { items: result } : result

/**
 * Search a source as the query changes: debounced, with stale requests aborted so only the
 * latest query ever renders, previous results kept visible while refreshing (no flicker),
 * and recent queries answered from a small cache. State changes only when a response
 * arrives; everything else is derived while rendering.
 */
export function useOptionSearch<V extends string>(source: OptionSource<V> | undefined, query: string): OptionSearch<V> {
  const trimmed = query.trim()
  const minChars = Math.max(source?.minChars ?? 0, 1)
  const searchable = Boolean(source) && trimmed.length >= minChars
  const [result, setResult] = useState<{ for: string; items: Array<OptionItem<V>>; more: number; failed: boolean }>({
    for: "",
    items: [],
    more: 0,
    failed: false,
  })
  const [attempt, setAttempt] = useState(0)
  const cached = source && searchable && attempt === 0 ? cacheFor(source).get(trimmed) : undefined

  useEffect(() => {
    if (!source || !searchable || cached) return
    const controller = new AbortController()
    const timer = setTimeout(() => {
      source
        .search(trimmed, { signal: controller.signal })
        .then((raw) => {
          if (controller.signal.aborted) return
          const next = normaliseResult(raw)
          cacheFor(source).set(trimmed, next)
          setResult({ for: trimmed, items: next.items, more: next.more ?? 0, failed: false })
        })
        .catch(() => {
          if (controller.signal.aborted) return
          setResult({ for: trimmed, items: [], more: 0, failed: true })
        })
    }, source.debounceMs ?? DEFAULT_DEBOUNCE_MS)
    // A newer query (or unmounting) cancels this one, so a slow stale reply never renders.
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
    // oxlint-disable-next-line react/exhaustive-effect-dependencies -- attempt: Retry runs the same query again
  }, [source, searchable, trimmed, cached, attempt])

  const retry = () => {
    setResult((previous) => ({ ...previous, for: "", failed: false }))
    setAttempt((value) => value + 1)
  }

  if (!source) return { items: [], status: "idle", more: 0, needsMore: 0, retry }
  const needsMore = trimmed.length > 0 && trimmed.length < (source.minChars ?? 0) ? (source.minChars ?? 0) - trimmed.length : 0
  if (!searchable) return { items: source.suggestions ?? [], status: "idle", more: 0, needsMore, retry }
  if (cached) return { items: cached.items, status: "idle", more: cached.more ?? 0, needsMore: 0, retry }
  if (result.for === trimmed) {
    return { items: result.items, status: result.failed ? "error" : "idle", more: result.more, needsMore: 0, retry }
  }
  // Waiting for this query: keep the last results on screen while they refresh.
  return result.items.length
    ? { items: result.items, status: "refreshing", more: result.more, needsMore: 0, retry }
    : { items: [], status: "loading", more: 0, needsMore: 0, retry }
}

// ── Matching ─────────────────────────────────────────────────────────────────

let lastQuery: { query: string; locale: string; words: string[] } | undefined

/** The folded words of a query. The last query is remembered, so filtering a list folds it once, not once per option. */
function queryWords(query: string, locale: string): string[] {
  if (lastQuery?.query !== query || lastQuery.locale !== locale) {
    lastQuery = { query, locale, words: foldText(query, locale).split(/\s+/).filter(Boolean) }
  }
  return lastQuery.words
}

/** Case- and accent-insensitive match, case in `locale` (default `getLocale()`): does `text` contain every word of `query`? */
export function matches(text: string, query: string, locale = getLocale()) {
  const haystack = foldText(text, locale)
  return queryWords(query, locale).every((word) => haystack.includes(word))
}

const foldedOptions = new WeakMap<object, { locale: string; label: string; description: string | undefined; text: string }>()

/** An option's label and description folded for searching, remembered per option while it and the locale are unchanged. */
function optionText(option: OptionItem, locale: string): string {
  const known = foldedOptions.get(option)
  if (known && known.locale === locale && known.label === option.label && known.description === option.description) return known.text
  const text = foldText(`${option.label} ${option.description ?? ""}`, locale)
  foldedOptions.set(option, { locale, label: option.label, description: option.description, text })
  return text
}

/** Does an option's label or description contain every word of `query` (accents and case ignored, case in `locale`)? */
export function matchesOption(option: OptionItem, query: string, locale = getLocale()): boolean {
  const text = optionText(option, locale)
  return queryWords(query, locale).every((word) => text.includes(word))
}

/** A static list filtered like a source would: label or description contain the query. */
export function filterOptions<V extends string>(options: Array<OptionItem<V>>, query: string, locale = getLocale()) {
  const q = query.trim()
  if (!q) return options
  const words = queryWords(q, locale)
  return options.filter((option) => {
    const text = optionText(option, locale)
    return words.every((word) => text.includes(word))
  })
}

/**
 * [start, end) ranges of `text` matched by the words of `query`, ignoring case and
 * diacritics, merged and in order.
 */
export function matchRanges(text: string, query: string, locale = getLocale()): Array<[number, number]> {
  const words = queryWords(query, locale)
  if (words.length === 0) return []
  // Fold character by character, remembering where each folded char came from.
  let folded = ""
  const origin: number[] = []
  for (let index = 0; index < text.length; index++) {
    const piece = foldText(text[index] ?? "", locale)
    folded += piece
    for (let i = 0; i < piece.length; i++) origin.push(index)
  }
  const ranges: Array<[number, number]> = []
  for (const word of words) {
    let from = 0
    for (;;) {
      const at = folded.indexOf(word, from)
      if (at === -1) break
      const start = origin[at] ?? 0
      const end = (origin[at + word.length - 1] ?? start) + 1
      ranges.push([start, end])
      from = at + word.length
    }
  }
  ranges.sort((a, b) => a[0] - b[0])
  const merged: Array<[number, number]> = []
  for (const range of ranges) {
    const last = merged.at(-1)
    if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1])
    else merged.push([range[0], range[1]])
  }
  return merged
}
