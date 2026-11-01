import { foldText } from "../../lib/fold.js"

/** A skin tone: the Fitzpatrick modifier's position, 1 (light) to 5 (dark), or 0 for none. */
export type EmojiSkinTone = 0 | 1 | 2 | 3 | 4 | 5

/** The groups of the emoji set, in Unicode's order. */
export type EmojiGroup = "smileys" | "people" | "nature" | "food" | "travel" | "activities" | "objects" | "symbols" | "flags"

/** One emoji from the picker's data. */
export interface EmojiEntry {
  /** The emoji, without a skin tone. */
  emoji: string
  /** Its name: English, or what `loadNames` gave. */
  name: string
  /** Lower-cased, folded text a search runs over. */
  search: string
  /** It takes one skin tone. */
  tones: boolean
}

/** The whole set, by group. */
export type EmojiSet = Record<EmojiGroup, readonly EmojiEntry[]>

/** Each group's name in Unicode order; a `Record` so a group added to the type must be listed. */
const ORDER: Record<EmojiGroup, number> = { smileys: 0, people: 1, nature: 2, food: 3, travel: 4, activities: 5, objects: 6, symbols: 7, flags: 8 }

/** The groups in display order. */
export const EMOJI_GROUPS = /* @__PURE__ */ (Object.keys(ORDER) as EmojiGroup[])

/** One row of the generated data: `<emoji> [~]<name>[|<keyword> <keyword>]`. */
function parseRow(row: string, locale: string): EmojiEntry {
  const space = row.indexOf(" ")
  const emoji = row.slice(0, space)
  const tones = row[space + 1] === "~"
  const rest = row.slice(space + (tones ? 2 : 1))
  const bar = rest.indexOf("|")
  const name = bar < 0 ? rest : rest.slice(0, bar)
  return { emoji, name, tones, search: foldText(rest.replace("|", " "), locale) }
}

/** Unpacks the generated strings. */
export function parseEmojiData(data: Record<EmojiGroup, string>, locale: string): EmojiSet {
  const groups = {} as Record<EmojiGroup, readonly EmojiEntry[]>
  for (const group of EMOJI_GROUPS) groups[group] = data[group].split("\n").map((row) => parseRow(row, locale))
  return groups
}

/** Puts the application's localised names over the English ones; the English stays searchable. */
export function localiseEmoji(set: EmojiSet, names: Readonly<Record<string, string>>, locale: string): EmojiSet {
  const groups = {} as Record<EmojiGroup, readonly EmojiEntry[]>
  for (const group of EMOJI_GROUPS)
    groups[group] = set[group].map((entry) => {
      const name = names[entry.emoji]
      return name ? { ...entry, name, search: `${foldText(name, locale)} ${entry.search}` } : entry
    })
  return groups
}

/** Rows that match, best first: a whole first word, the text's start, a word's start, then anywhere; shorter text first within each. */
export function searchEmoji(set: EmojiSet, query: string, locale: string): EmojiEntry[] {
  const needle = foldText(query.trim(), locale)
  if (!needle) return []
  const ranked: Array<[rank: number, entry: EmojiEntry]> = []
  for (const group of EMOJI_GROUPS)
    for (const entry of set[group]) {
      const at = entry.search.indexOf(needle)
      if (at < 0) continue
      const first = at === 0 ? (entry.search.length === needle.length || entry.search[needle.length] === " " ? 0 : 1) : null
      ranked.push([first ?? (entry.search.includes(` ${needle}`) ? 2 : 3), entry])
    }
  return ranked.sort((a, b) => a[0] - b[0] || a[1].search.length - b[1].search.length).map(([, entry]) => entry)
}

const BASE = /\p{Emoji_Modifier_Base}\uFE0F?/u

/** The emoji with a skin tone, when it takes one. */
export function applySkinTone(emoji: string, tone: EmojiSkinTone): string {
  if (!tone) return emoji
  const modifier = String.fromCodePoint(0x1f3fa + tone)
  return emoji.replace(BASE, (base) => base.replace("\uFE0F", "") + modifier)
}

const TONE_MARK = /[\u{1F3FB}-\u{1F3FF}]/gu

/** The emoji without a skin tone: how a toned recent emoji finds its name. */
export function stripSkinTone(emoji: string): string {
  return emoji.replace(TONE_MARK, "")
}

/** Finds an emoji's entry, with or without its skin tone or variation selector. */
export function findEmoji(set: EmojiSet, emoji: string): EmojiEntry | undefined {
  const plain = stripSkinTone(emoji)
  for (const group of EMOJI_GROUPS) {
    const found = set[group].find((entry) => entry.emoji === plain || entry.emoji.replace(/\uFE0F/g, "") === plain.replace(/\uFE0F/g, ""))
    if (found) return found
  }
  return undefined
}

let loading: Promise<Record<EmojiGroup, string>> | null = null

/** Loads the data once. A failed load is forgotten, so a retry fetches it again. */
export function loadEmojiData(): Promise<Record<EmojiGroup, string>> {
  loading ??= import("./emoji-data.js").then(
    (module) => module.EMOJI_DATA,
    (error: unknown) => {
      loading = null
      throw error
    },
  )
  return loading
}
