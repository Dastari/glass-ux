import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for swatchPicker. */
export const swatchPickerMessages = defineMessages("swatchPicker", {
  noneChosen: "None chosen",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    swatchPicker: typeof swatchPickerMessages.defaults
  }
}

/** Resolve swatchPicker wording outside React; pass the component's locale. */
export function getSwatchPickerMessages(locale = getLocale()): typeof swatchPickerMessages.defaults {
  return resolveMessages(swatchPickerMessages.namespace, swatchPickerMessages.defaults, locale)
}
