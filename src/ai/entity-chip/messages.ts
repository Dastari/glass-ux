import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for entityChip. */
export const entityChipMessages = defineMessages("entityChip", {
  remove: (name: string) => `Remove ${name}`,
  openInAWindow: (name: string) => `Open ${name} in a window`,
  unverifiedDescription: "Named by Assistant; not confirmed by the application yet.",
  unverifiedLabel: ", not verified",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    entityChip: typeof entityChipMessages.defaults
  }
}

/** Resolve entityChip wording outside React; pass the component's locale. */
export function getEntityChipMessages(locale = getLocale()): typeof entityChipMessages.defaults {
  return resolveMessages(entityChipMessages.namespace, entityChipMessages.defaults, locale)
}
