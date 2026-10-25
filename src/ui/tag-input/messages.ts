import { numberFormat } from "../../lib/locale/intl.js"
import { defineMessages, resolveMessages, plural } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for tagInput. */
export const tagInputMessages = defineMessages("tagInput", {
  create: (label: string) => `Create “${label}”`,
  edit: (label: string) => `Edit ${label}`,
  more: (count: number, labels: string) => `${count} more: ${labels}`,
  limit: (count: number, locale = "en-US") => plural(locale, count, { one: `Up to ${numberFormat(locale).format(count)} value`, other: `Up to ${numberFormat(locale).format(count)} values` }),
  valueCount: (count: number, locale = "en-AU") => plural(locale, count, { one: `${count} value`, other: `${count} values` }),
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
