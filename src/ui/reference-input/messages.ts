import { numberFormat } from "../../lib/locale/intl.js"
import { defineMessages, resolveMessages, plural } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for referenceInput. */
export const referenceInputMessages = defineMessages("referenceInput", {
  relationTo: (name: string, relation: string) => `Relation to ${name}: ${relation}`,
  relationLabel: (name: string) => `Relation to ${name}`,
  none: "None",
  typeToLink: "Type @ to link",
  upTo: (count: number, noun: string) => `Up to ${count} ${noun}`,
  everything: "Everything",
  pressBackspaceOrDeleteToRemove: "Press Backspace or Delete to remove",
  linkedFromTheStartOfTheInput: (count: number) => `${count} linked. From the start of the input, press Left Arrow to reach them.`,
  link: "Link…",
  kind: "Kind",
  all: "All",
  showing: (kind: string) => `Showing ${kind}.`,
  limitLabel: "Up to",
  removeOneToLinkAnother: "— remove one to link another",
  noFor: (kind: string, query: string) => `No ${kind} for “${query}”`,
  typeANameToSearch: "Type a name to search",
  limit: (count: number, locale = "en-US") => plural(locale, count, { one: `Up to ${numberFormat(locale).format(count)} link`, other: `Up to ${numberFormat(locale).format(count)} links` }),
  matches: 'matches',
  limitNote: (count: number, locale = "en-US") => plural(locale, count, { one: `Up to ${count} link — remove one to link another`, other: `Up to ${count} links — remove one to link another` }),
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    referenceInput: typeof referenceInputMessages.defaults
  }
}

/** Resolve referenceInput wording outside React; pass the component's locale. */
export function getReferenceInputMessages(locale = getLocale()): typeof referenceInputMessages.defaults {
  return resolveMessages(referenceInputMessages.namespace, referenceInputMessages.defaults, locale)
}
