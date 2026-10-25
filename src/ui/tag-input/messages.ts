import { numberFormat } from "../../lib/locale/intl.js"
import { defineMessages, resolveMessages, plural } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for tagInput. */
export const tagInputMessages = defineMessages("tagInput", {
  create: (value0: unknown) => `Create “${value0}”`,
  upTo: (value0: unknown, value1: unknown) => `Up to ${value0} ${value1}`,
  edit: (value0: unknown) => `Edit ${value0}`,
  more: "more:",
  limit: (count: number, locale = "en-US") => plural(locale, count, { one: `Up to ${numberFormat(locale).format(count)} value`, other: `Up to ${numberFormat(locale).format(count)} values` }),
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    tagInput: typeof tagInputMessages.defaults
  }
}

/** Resolve tagInput wording outside React; pass the component's locale. */
export function getTagInputMessages(locale = getLocale()): typeof tagInputMessages.defaults {
  return resolveMessages(tagInputMessages.namespace, tagInputMessages.defaults, locale)
}
