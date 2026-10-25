import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for settingRow. */
export const settingRowMessages = defineMessages("settingRow", {
  saving: "Saving",
  saved: "Saved",
  notSaved: "Not saved",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    settingRow: typeof settingRowMessages.defaults
  }
}

/** Resolve settingRow wording outside React; pass the component's locale. */
export function getSettingRowMessages(locale = getLocale()): typeof settingRowMessages.defaults {
  return resolveMessages(settingRowMessages.namespace, settingRowMessages.defaults, locale)
}
