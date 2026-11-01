import { defineMessages, plural, resolveMessages } from "../../lib/i18n/index.js"
import { numberFormat } from "../../lib/locale/intl.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for emojiPicker. */
export const emojiPickerMessages = defineMessages("emojiPicker", {
  picker: "Emoji picker",
  searchLabel: "Search emoji",
  searchPlaceholder: "Search emoji",
  categories: "Emoji categories",
  searchResults: "Search results",
  recent: "Recent",
  smileys: "Smileys and emotion",
  people: "People and body",
  nature: "Animals and nature",
  food: "Food and drink",
  travel: "Travel and places",
  activities: "Activities",
  objects: "Objects",
  symbols: "Symbols",
  flags: "Flags",
  noResults: (query: string) => `No emoji match "${query}"`,
  clearSearch: "Clear search",
  results: (count: number, locale = "en-US") =>
    plural(locale, count, {
      one: `${numberFormat(locale).format(count)} emoji found`,
      other: `${numberFormat(locale).format(count)} emoji found`,
    }),
  loadFailed: "The emoji list did not load. Check the connection and retry.",
  retry: "Retry",
  loading: "Loading emoji",
  skinTone: "Skin tone",
  toneNone: "No skin tone",
  toneLight: "Light",
  toneMediumLight: "Medium-light",
  toneMedium: "Medium",
  toneMediumDark: "Medium-dark",
  toneDark: "Dark",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    emojiPicker: typeof emojiPickerMessages.defaults
  }
}

/** Resolve emojiPicker wording outside React; pass the component's locale. */
export function getEmojiPickerMessages(locale = getLocale()): typeof emojiPickerMessages.defaults {
  return resolveMessages(emojiPickerMessages.namespace, emojiPickerMessages.defaults, locale)
}
