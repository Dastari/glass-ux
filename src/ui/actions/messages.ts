import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for actions. */
export const actionsMessages = defineMessages("actions", {
  actionLabel: (action: string, target: string) => `${action} for ${target}`,
  moreOptions: (action: string) => `More ${action} options`,
  moreActionsFor: (target: string) => `More actions for ${target}`,
  moreActions: "More actions",
  actionsFor: (target: string) => `Actions for ${target}`,
  failed: (action: string) => `${action} failed`,
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
