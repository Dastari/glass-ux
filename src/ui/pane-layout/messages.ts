import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for paneLayout. */
export const paneLayoutMessages = defineMessages("paneLayout", {
  moveTo: "Move to",
  splitLeft: "Split left",
  splitRight: "Split right",
  splitUp: "Split up",
  splitDown: "Split down",
  maximise: "Maximise",
  restore: "Restore",
  close: "Close",
  panelActions: (title: string) => `Actions for ${title}`,
  group: (title: string) => `${title} group`,
  panels: "Panels",
  movedTo: ({ title, target }: { title: string; target: string }) => `${title} moved to ${target}.`,
  movedBeside: ({ title, target }: { title: string; target: string }) => `${title} moved beside ${target}.`,
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    paneLayout: typeof paneLayoutMessages.defaults
  }
}

/** Resolve paneLayout wording outside React; pass the component's locale. */
export function getPaneLayoutMessages(locale = getLocale()): typeof paneLayoutMessages.defaults {
  return resolveMessages(paneLayoutMessages.namespace, paneLayoutMessages.defaults, locale)
}
