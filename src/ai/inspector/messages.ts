import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for inspector. */
export const inspectorMessages = defineMessages("inspector", {
  scope: "Scope",
  workspaceScope: "Workspace · everything you can access",
  referenced: "Referenced",
  toolsUsed: "Tools used",
  failed: "failed",
  sources: "Sources",
  budget: "Budget",
  resets: (time: string) => `Resets ${time}`,
  budgetSummary: (percent: number, used: string, maximum: string, unit: string) => `${percent}% · ${used} of ${maximum} ${unit}`,
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    inspector: typeof inspectorMessages.defaults
  }
}

/** Resolve inspector wording outside React; pass the component's locale. */
export function getInspectorMessages(locale = getLocale()): typeof inspectorMessages.defaults {
  return resolveMessages(inspectorMessages.namespace, inspectorMessages.defaults, locale)
}
