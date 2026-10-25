import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for entityChip. */
export const entityChipMessages = defineMessages("entityChip", {
  remove: (value0: unknown) => `Remove ${value0}`,
  openInAWindow: (value0: unknown) => `Open ${value0} in a window`,
  namedByAssistantNotConfirmedByTheApplication: "Named by Assistant; not confirmed by the application yet.",
  notVerified: ", not verified",
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
