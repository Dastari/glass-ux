import { Tabs as BaseTabs } from "@base-ui/react/tabs"
import {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
} from "react"
import { useAnnounce } from "../../hooks/use-announce.js"
import { IconError, IconSearch } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { readingKey } from "../../lib/direction.js"
import { useMessages } from "../../lib/i18n/index.js"
import { useLocale } from "../../lib/locale/use-locale.js"
import { useControllable } from "../../lib/use-controllable.js"
import { Button } from "../button/index.js"
import { EmptyState } from "../empty-state/index.js"
import { SearchField } from "../input/index.js"
import { Menu } from "../menu/index.js"
import { Tooltip } from "../tooltip/index.js"
import { TruncatedText } from "../truncated-text/index.js"
import {
  applySkinTone,
  EMOJI_GROUPS,
  findEmoji,
  loadEmojiData,
  localiseEmoji,
  parseEmojiData,
  searchEmoji,
  type EmojiEntry,
  type EmojiGroup,
  type EmojiSet,
  type EmojiSkinTone,
} from "./emoji.js"
import { EmojiGridSkeleton } from "./emoji-skeleton.js"
import { emojiPickerMessages } from "./messages.js"

/** What `onPick` receives. */
export interface EmojiPick {
  /** The emoji as chosen, with its skin tone. */
  emoji: string
  /** The emoji without a skin tone. */
  base: string
  /** Its name in the picker. */
  name: string
  /** The tone applied, 0 for none. */
  skinTone: EmojiSkinTone
}

export interface EmojiPickerProps extends Omit<ComponentProps<"div">, "children" | "onPick"> {
  /** Called with the emoji a person picks by click, Enter or Space. */
  onPick: (pick: EmojiPick) => void
  /** Emoji to offer first, in a Recent tab. The host keeps this list; without it there is no tab. */
  recent?: readonly string[]
  /** The skin tone, controlled: 0 for none, 1 (light) to 5 (dark). */
  skinTone?: EmojiSkinTone
  /** The skin tone at first when uncontrolled. Default 0. */
  defaultSkinTone?: EmojiSkinTone
  /** Called with the tone a person chooses. */
  onSkinToneChange?: (tone: EmojiSkinTone) => void
  /** Offer the skin tone menu. Sequences with two people have no tone. Default true. */
  skinTones?: boolean
  /**
   * Names for the current locale, by emoji without a tone: the name shown and searched, with
   * any keywords after it. Without this names are English, and a search matches English only.
   * The application supplies them, so no language's data ships in the library.
   */
  loadNames?: (locale: string) => Promise<Readonly<Record<string, string>>>
  /** Focus the search when the picker has loaded. */
  autoFocus?: boolean
}

const TAB_GLYPHS: Record<EmojiGroup | "recent", string> = {
  recent: "🕘",
  smileys: "😀",
  people: "👋",
  nature: "🐻",
  food: "🍎",
  travel: "🚗",
  activities: "⚽",
  objects: "💡",
  symbols: "🔣",
  flags: "🏳️",
}

const TONES: readonly EmojiSkinTone[] = [0, 1, 2, 3, 4, 5]

/** Rows of a wrapped grid: its tracks, read from the box it was given. */
function columnsOf(list: HTMLElement) {
  return getComputedStyle(list).gridTemplateColumns.split(" ").filter(Boolean).length || 1
}

const Option = /* @__PURE__ */ memo(function Option({ index, glyph, name, active }: { index: number; glyph: string; name: string; active: boolean }) {
  return (
    // Keys and pointer are handled once on the list (roving focus), as Tree does.
    <div className="fa-emoji-option" role="option" aria-selected={false} aria-label={name} tabIndex={active ? 0 : -1} data-index={index}>
      <span className="fa-emoji-glyph" aria-hidden>
        {glyph}
      </span>
    </div>
  )
})

interface EmojiListProps {
  entries: readonly EmojiEntry[]
  label: string
  /** Whether the entries are the host's own, already toned. */
  verbatim: readonly string[] | null
  tone: EmojiSkinTone
  listRef: RefObject<HTMLDivElement | null>
  onPick: (entry: EmojiEntry, index: number) => void
  onPreview: (entry: EmojiEntry, glyph: string) => void
  onLeaveTop: () => void
}

/** One tab stop (R11.5): arrow keys move through the wrapped grid. */
function EmojiList({ entries, label, verbatim, tone, listRef, onPick, onPreview, onLeaveTop }: EmojiListProps) {
  const [active, setActive] = useState(0)
  const glyphOf = (entry: EmojiEntry, index: number) => verbatim?.[index] ?? (entry.tones ? applySkinTone(entry.emoji, tone) : entry.emoji)
  const indexOf = (target: EventTarget) => {
    const index = Number((target as HTMLElement).closest<HTMLElement>("[data-index]")?.dataset.index)
    return Number.isInteger(index) ? index : -1
  }

  const move = (list: HTMLElement, next: number) => {
    const index = Math.max(0, Math.min(entries.length - 1, next))
    list.querySelector<HTMLElement>(`[data-index="${index}"]`)?.focus()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const list = event.currentTarget
    const index = indexOf(event.target)
    if (index < 0) return
    const columns = columnsOf(list)
    const key = readingKey(event.key, list)
    if (key === "ArrowRight") move(list, index + 1)
    else if (key === "ArrowLeft") move(list, index - 1)
    else if (key === "ArrowDown") move(list, index + columns)
    else if (key === "ArrowUp") {
      if (index < columns) onLeaveTop()
      else move(list, index - columns)
    } else if (key === "Home") move(list, 0)
    else if (key === "End") move(list, entries.length - 1)
    else if (key === "Enter" || key === " ") onPick(entries[index]!, index)
    else {
      // Typing anywhere in the list searches: the key lands in the field it just focused.
      if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) onLeaveTop()
      return
    }
    event.preventDefault()
  }

  const preview = (target: EventTarget) => {
    const index = indexOf(target)
    const entry = entries[index]
    if (entry) onPreview(entry, glyphOf(entry, index))
  }

  return (
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events
    <div
      ref={listRef}
      className="fa-emoji-list"
      role="listbox"
      aria-label={label}
      onKeyDown={onKeyDown}
      onClick={(event) => {
        const index = indexOf(event.target)
        const entry = entries[index]
        if (entry) onPick(entry, index)
      }}
      onFocus={(event) => {
        const index = indexOf(event.target)
        if (index >= 0) setActive(index)
        preview(event.target)
      }}
      onPointerOver={(event: PointerEvent) => preview(event.target)}
    >
      {entries.map((entry, index) => (
        <Option key={`${index}:${entry.emoji}`} index={index} glyph={glyphOf(entry, index)} name={entry.name} active={index === active} />
      ))}
    </div>
  )
}

/**
 * A searchable emoji picker drawn in the system font, so it ships no images. The list is one
 * tab stop: arrow keys move through the wrapped grid in reading order, Home and End go to its
 * ends, Enter or Space picks, and typing returns to the search. ↓ enters the list from the
 * search, and Enter there picks the first result.
 *
 * The data loads on demand when the picker first renders: about 23 KB after gzip for Emoji
 * 15.0's 1,870 emoji. Names and search are English unless `loadNames` supplies the locale's.
 * An emoji newer than the operating system's font draws as an empty box.
 */
export function EmojiPicker({
  onPick,
  recent,
  skinTone,
  defaultSkinTone = 0,
  onSkinToneChange,
  skinTones = true,
  loadNames,
  autoFocus = false,
  className,
  "aria-label": label,
  ...rest
}: EmojiPickerProps) {
  const messages = useMessages(emojiPickerMessages)
  const locale = useLocale()
  const announce = useAnnounce()
  const [set, setSet] = useState<EmojiSet | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [tone, setTone] = useControllable(skinTone, defaultSkinTone, onSkinToneChange)
  const [query, setQuery] = useState("")
  const [tab, setTab] = useState<EmojiGroup | "recent">(recent?.length ? "recent" : "smileys")
  const [preview, setPreview] = useState<{ glyph: string; name: string } | null>(null)
  const searched = useDeferredValue(query)
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let current = true
    setFailed(false)
    void (async () => {
      try {
        const data = await loadEmojiData()
        if (!current) return
        const parsed = parseEmojiData(data, locale)
        setSet(parsed)
        const names = await loadNames?.(locale)
        if (current && names) setSet(localiseEmoji(parsed, names, locale))
      } catch {
        if (current) setFailed(true)
      }
    })()
    return () => {
      current = false
    }
  }, [attempt, locale, loadNames])

  const ready = set !== null
  useEffect(() => {
    if (autoFocus && ready) searchRef.current?.focus()
  }, [autoFocus, ready])

  const searching = searched.trim() !== ""
  const showRecent = !searching && tab === "recent"
  const entries = useMemo<readonly EmojiEntry[]>(() => {
    if (!set) return []
    if (searching) return searchEmoji(set, searched, locale)
    if (tab === "recent") return (recent ?? []).map((emoji) => findEmoji(set, emoji) ?? { emoji, name: emoji, search: "", tones: false })
    return set[tab]
  }, [set, searching, searched, locale, tab, recent])

  useEffect(() => {
    if (searching && ready) announce(messages.results(entries.length, locale), { key: "emoji-results" })
  }, [searching, ready, entries.length, announce, messages, locale])

  const pick = (entry: EmojiEntry, index: number) => {
    const emoji = showRecent && !query.trim() ? (recent?.[index] ?? entry.emoji) : entry.tones ? applySkinTone(entry.emoji, tone) : entry.emoji
    onPick({ emoji, base: entry.emoji, name: entry.name, skinTone: entry.tones ? tone : 0 })
  }
  const updatePreview = useCallback((entry: EmojiEntry, glyph: string) => setPreview({ glyph, name: entry.name }), [])
  const focusSearch = useCallback(() => searchRef.current?.focus(), [])

  const tabs: ReadonlyArray<EmojiGroup | "recent"> = recent?.length ? ["recent", ...EMOJI_GROUPS] : EMOJI_GROUPS
  const list = (
    <EmojiList
      key={searching ? `search:${searched}` : tab}
      entries={entries}
      label={searching ? messages.searchResults : messages[tab]}
      verbatim={showRecent ? (recent ?? null) : null}
      tone={tone}
      listRef={listRef}
      onPick={pick}
      onPreview={updatePreview}
      onLeaveTop={focusSearch}
    />
  )

  const body = failed ? (
    <EmptyState icon={<IconError />} tone="danger" action={<Button size="sm" onClick={() => setAttempt((count) => count + 1)}>{messages.retry}</Button>}>
      {messages.loadFailed}
    </EmptyState>
  ) : !set ? (
    <EmojiGridSkeleton label={messages.loading} />
  ) : searching && entries.length === 0 ? (
    <EmptyState icon={<IconSearch />} action={<Button size="sm" onClick={() => setQuery("")}>{messages.clearSearch}</Button>}>
      {messages.noResults(searched.trim())}
    </EmptyState>
  ) : searching ? (
    list
  ) : (
    <BaseTabs.Panel value={tab} className="fa-emoji-panel" tabIndex={-1}>
      {list}
    </BaseTabs.Panel>
  )

  return (
    <div {...rest} className={cx("fa-emoji-picker", className)} role="group" aria-label={label ?? messages.picker}>
      <SearchField
        ref={searchRef}
        aria-label={messages.searchLabel}
        placeholder={messages.searchPlaceholder}
        value={query}
        onValueChange={setQuery}
        disabled={!set}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            listRef.current?.querySelector<HTMLElement>('[tabindex="0"]')?.focus()
            event.preventDefault()
          } else if (event.key === "Enter") {
            // The list follows the field at low priority: pick from what was typed.
            const first = set && query.trim() ? searchEmoji(set, query, locale)[0] : entries[0]
            if (!first) return
            pick(first, 0)
            event.preventDefault()
          }
        }}
      />
      <BaseTabs.Root
        className="fa-emoji-tabs-root"
        value={searching ? null : tab}
        onValueChange={(next: EmojiGroup | "recent") => {
          setQuery("")
          setTab(next)
        }}
      >
        <BaseTabs.List className="fa-emoji-tabs" activateOnFocus aria-label={messages.categories}>
          {tabs.map((id) => (
            <Tooltip key={id} content={messages[id]}>
              <BaseTabs.Tab className="fa-emoji-tab fa-pressable" value={id} aria-label={messages[id]} disabled={!set}>
                <span className="fa-emoji-glyph" aria-hidden>
                  {TAB_GLYPHS[id]}
                </span>
              </BaseTabs.Tab>
            </Tooltip>
          ))}
        </BaseTabs.List>
        <div className="fa-emoji-body">{body}</div>
      </BaseTabs.Root>
      <div className="fa-emoji-foot">
        {/* The focused option already says its name; this line is for the eye. */}
        <span className="fa-emoji-preview" aria-hidden>
          <span className="fa-emoji-glyph">{preview?.glyph}</span>
          <TruncatedText>{preview?.name ?? ""}</TruncatedText>
        </span>
        {skinTones ? (
          <Menu.Root>
            <Menu.Trigger
              render={
                <Button variant="ghost" size="sm" aria-label={messages.skinTone} disabled={!set}>
                  <span className="fa-emoji-glyph" aria-hidden>
                    {applySkinTone("✋", tone)}
                  </span>
                </Button>
              }
            />
            <Menu.Popup align="end">
              <Menu.RadioGroup value={tone} onValueChange={(next: EmojiSkinTone) => setTone(next)}>
                {TONES.map((value) => (
                  <Menu.RadioItem key={value} value={value} closeOnClick>
                    {messages[(["toneNone", "toneLight", "toneMediumLight", "toneMedium", "toneMediumDark", "toneDark"] as const)[value]!]}
                  </Menu.RadioItem>
                ))}
              </Menu.RadioGroup>
            </Menu.Popup>
          </Menu.Root>
        ) : null}
      </div>
    </div>
  )
}
