import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for splitPane. */
export const splitPaneMessages = defineMessages("splitPane", {
  hide: "Hide",
  show: "Show",
  show2: (value0: unknown) => `Show ${value0}`,
  resize: (value0: unknown) => `Resize ${value0}`,
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    splitPane: typeof splitPaneMessages.defaults
  }
}

/** Resolve splitPane wording outside React; pass the component's locale. */
export function getSplitPaneMessages(locale = getLocale()): typeof splitPaneMessages.defaults {
  return resolveMessages(splitPaneMessages.namespace, splitPaneMessages.defaults, locale)
}
