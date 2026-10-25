import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for entitySettings. */
export const entitySettingsMessages = defineMessages("entitySettings", {
  loadingSettings: "Loading settings",
  settings: "Settings",
  discardEntityTitle: (name: string) => `Discard changes to ${name}?`,
  discardTitle: "Discard unsaved changes?",
  discardDescription: "Your edits in this dialog are lost.",
  changed: (section: string) => `${section} changed`,
  changedStatus: "Changed",
  by: "by",
  sinceYouOpenedItReloadToSeeTheir: "since you opened it. Reload to see their changes.",
  reload: "Reload",
  entitySettings: (name: string) => `${name} settings`,
  settingsSections: "Settings sections",
  cancel: "Cancel",
  verifying: "Verifying…",
  saving: "Saving…",
  verified: "Verified",
  saved: "Saved",
  notSaved: "Not saved",
  noChangesToSave: "No changes to save",
  verifyAndSave: "Verify and save",
  save: "Save",
  thisItem: "this item",
  enforcedByItCanTBeChangedHere: (source: string) => `Enforced by ${source}: it can't be changed here`,
  enforcedBy: (source: string) => `Enforced by ${source}`,
  overriddenFor: "Overridden for",
  inherits: "· inherits",
  inheritedFrom: "Inherited from",
  reset: "Reset",
  override: "Override",
  needsMfa: "(needs MFA)",
  replace: (name: string) => `Replace ${name}`,
  replaceAction: "Replace",
  clear: (name: string) => `Clear ${name}`,
  clearAction: "Clear",
  undoClearing: (name: string) => `Undo clearing ${name}`,
  undo: "Undo",
  newValue: "New value",
  keepTheCurrent: (name: string) => `Keep the current ${name}`,
  keepCurrent: "Keep current",
  test: "Test",
  theTestDidNotFinishRetry: "The test did not finish — retry",
  testing: "Testing…",
  lastTestSettingsChangedSince: (summary: string) => `Last test: ${summary} · settings changed since`,
  notTested: "Not tested",
  testResult: "Test result",
  set: "Set",
  clearedWhenYouSave: "Cleared when you save",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    entitySettings: typeof entitySettingsMessages.defaults
  }
}

/** Resolve entitySettings wording outside React; pass the component's locale. */
export function getEntitySettingsMessages(locale = getLocale()): typeof entitySettingsMessages.defaults {
  return resolveMessages(entitySettingsMessages.namespace, entitySettingsMessages.defaults, locale)
}
