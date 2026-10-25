import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for alertDialog. */
export const alertDialogMessages = defineMessages("alertDialog", {
  cancel: "Cancel",
  failed: (value0: unknown) => `${value0} failed`,
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    alertDialog: typeof alertDialogMessages.defaults
  }
}

/** Resolve alertDialog wording outside React; pass the component's locale. */
export function getAlertDialogMessages(locale = getLocale()): typeof alertDialogMessages.defaults {
  return resolveMessages(alertDialogMessages.namespace, alertDialogMessages.defaults, locale)
}
