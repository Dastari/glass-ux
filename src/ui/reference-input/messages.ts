import { numberFormat } from "../../lib/locale/intl.js"
import { defineMessages, resolveMessages, plural } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for referenceInput. */
export const referenceInputMessages = defineMessages("referenceInput", {
  relationTo: (value0: unknown, value1: unknown) => `Relation to ${value0}: ${value1}`,
  relationTo2: (value0: unknown) => `Relation to ${value0}`,
  none: "None",
  typeToLink: "Type @ to link",
  upTo: (value0: unknown, value1: unknown) => `Up to ${value0} ${value1}`,
  everything: "Everything",
  pressBackspaceOrDeleteToRemove: "Press Backspace or Delete to remove",
  linkedFromTheStartOfTheInput: (value0: unknown) => `${value0} linked. From the start of the input, press Left Arrow to reach them.`,
  link: "Link…",
  kind: "Kind",
  all: "All",
  showing: (value0: unknown) => `Showing ${value0}.`,
  upTo2: "Up to",
  removeOneToLinkAnother: "— remove one to link another",
  noFor: (value0: unknown, value1: unknown) => `No ${value0} for “${value1}”`,
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
