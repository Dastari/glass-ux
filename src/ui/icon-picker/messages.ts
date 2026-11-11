import { defineMessages, plural, resolveMessages } from "../../lib/i18n/index.js"
import { numberFormat } from "../../lib/locale/intl.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for iconPicker. */
export const iconPickerMessages = defineMessages("iconPicker", {
  picker: "Icon picker",
  icons: "Icons",
  searchLabel: "Search icons",
  searchPlaceholder: "Search icons",
  noResults: (query: string) => `No icons match "${query}"`,
  clearSearch: "Clear search",
  results: (count: number, locale = "en-US") =>
    plural(locale, count, {
      one: `${numberFormat(locale).format(count)} icon found`,
      other: `${numberFormat(locale).format(count)} icons found`,
    }),
  chooseIcon: "Choose an icon",
  noIcon: "No icon",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    iconPicker: typeof iconPickerMessages.defaults
  }
}

/** Resolve iconPicker wording outside React; pass the component's locale. */
export function getIconPickerMessages(locale = getLocale()): typeof iconPickerMessages.defaults {
  return resolveMessages(iconPickerMessages.namespace, iconPickerMessages.defaults, locale)
}
