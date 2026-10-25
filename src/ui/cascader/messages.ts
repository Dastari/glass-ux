import { defineMessages } from "../../lib/i18n/catalog.js"

const english = {
  placeholder: "Choose…",
  /** Names the popup and its first column when the control has no label of its own. */
  options: "Options",
  search: "Search",
  /** Between the labels of a path, in the trigger and search results. */
  separator: " / ",
  noMatch: (query: string) => `No match for “${query}”`,
  moreMatches: (shown: number, total: number) => `Showing ${shown} of ${total}. Type more to narrow.`,
  matches: (count: number) => (count === 1 ? "1 match" : `${count} matches`),
  back: "Back",
  selected: (count: number) => `${count} selected`,
  more: (count: number, labels: string) => `${count} more: ${labels}`,
  clear: "Clear",
  loading: "Loading…",
  loadFailed: "Couldn't load",
  retry: "Retry",
}

/** Cascader's English wording. */
export const cascaderMessages = defineMessages("cascader", english)

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    cascader: typeof cascaderMessages.defaults
  }
}
