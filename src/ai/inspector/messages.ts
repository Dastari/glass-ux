import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for inspector. */
export const inspectorMessages = defineMessages("inspector", {
  scope: "Scope",
  workspaceEverythingYouCanAccess: "Workspace · everything you can access",
  referenced: "Referenced",
  toolsUsed: "Tools used",
  failed: "failed",
  sources: "Sources",
  budget: "Budget",
  resets: (value0: unknown) => `Resets ${value0}`,
  of: (value0: unknown, value1: unknown, value2: unknown, value3: unknown) => `${value0}% · ${value1} of ${value2} ${value3}`,
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
