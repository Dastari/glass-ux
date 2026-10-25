import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for actions. */
export const actionsMessages = defineMessages("actions", {
  for: (value0: unknown, value1: unknown) => `${value0} for ${value1}`,
  moreOptions: (value0: unknown) => `More ${value0} options`,
  moreActionsFor: (value0: unknown) => `More actions for ${value0}`,
  moreActions: "More actions",
  actionsFor: (value0: unknown) => `Actions for ${value0}`,
  failed: (value0: unknown) => `${value0} failed`,
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    actions: typeof actionsMessages.defaults
  }
}

/** Resolve actions wording outside React; pass the component's locale. */
export function getActionsMessages(locale = getLocale()): typeof actionsMessages.defaults {
  return resolveMessages(actionsMessages.namespace, actionsMessages.defaults, locale)
}
