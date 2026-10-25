import { defineMessages } from "../../lib/i18n/catalog.js"

const english = {
  placeholder: "Choose…",
  /** Names the popup and its tree when the control has no label of its own. */
  options: "Options",
  search: "Search",
  noMatch: (query: string) => `No match for “${query}”`,
  selected: (count: number) => `${count} selected`,
  more: (count: number, labels: string) => `${count} more: ${labels}`,
  clear: "Clear",
  loading: "Loading…",
  loadFailed: "Couldn't load",
  retry: "Retry",
}

/** TreeSelect's English wording. */
export const treeSelectMessages = defineMessages("treeSelect", english)

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    treeSelect: typeof treeSelectMessages.defaults
  }
}
