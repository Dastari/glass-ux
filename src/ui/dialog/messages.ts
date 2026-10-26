import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for dialog. */
export const dialogMessages = defineMessages("dialog", {
  close: "Close",
  sectionLabel: (title: string) => `${title} sections`,
  sections: "Sections",
  discardTitle: "Discard unsaved changes?",
  discardDescription: "Your edits in this dialog are lost.",
  discardChanges: "Discard changes",
  keepEditing: "Keep editing",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    dialog: typeof dialogMessages.defaults
  }
}

/** Resolve dialog wording outside React; pass the component's locale. */
export function getDialogMessages(locale = getLocale()): typeof dialogMessages.defaults {
  return resolveMessages(dialogMessages.namespace, dialogMessages.defaults, locale)
}
