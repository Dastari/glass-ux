import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for form. */
export const formMessages = defineMessages("form", {
  saveChanges: "Save changes",
  saving: "Saving…",
  saved: "Saved",
  notSaved: "Not saved",
  cancel: "Cancel",
  checkThisValue: "Check this value",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    form: typeof formMessages.defaults
  }
}

/** Resolve form wording outside React; pass the component's locale. */
export function getFormMessages(locale = getLocale()): typeof formMessages.defaults {
  return resolveMessages(formMessages.namespace, formMessages.defaults, locale)
}
