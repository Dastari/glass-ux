import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for sheet. */
export const sheetMessages = defineMessages("sheet", {
  /** The grab handle's accessible name when it moves the sheet between snap points. */
  heightControl: "Sheet height",
  /** The handle's value text: the current snap point counted from the lowest, both formatted. */
  heightStep: (position: string, count: string) => `Height ${position} of ${count}`,
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    sheet: typeof sheetMessages.defaults
  }
}

/** Resolve sheet wording outside React; pass the component's locale. */
export function getSheetMessages(locale = getLocale()): typeof sheetMessages.defaults {
  return resolveMessages(sheetMessages.namespace, sheetMessages.defaults, locale)
}
