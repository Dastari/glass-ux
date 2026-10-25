import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for entitySettings. */
export const entitySettingsMessages = defineMessages("entitySettings", {
  loadingSettings: "Loading settings",
  settings: "Settings",
  discardChangesTo: (value0: unknown) => `Discard changes to ${value0}?`,
  discardUnsavedChanges: "Discard unsaved changes?",
  yourEditsInThisDialogAreLost: "Your edits in this dialog are lost.",
  changed: (value0: unknown) => `${value0} changed`,
  changed2: "Changed",
  by: "by",
  sinceYouOpenedItReloadToSeeTheir: "since you opened it. Reload to see their changes.",
  reload: "Reload",
  settings2: (value0: unknown) => `${value0} settings`,
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
  enforcedByItCanTBeChangedHere: (value0: unknown) => `Enforced by ${value0}: it can't be changed here`,
  enforcedBy: (value0: unknown) => `Enforced by ${value0}`,
  overriddenFor: "Overridden for",
  inherits: "· inherits",
  inheritedFrom: "Inherited from",
  reset: "Reset",
  override: "Override",
  needsMfa: "(needs MFA)",
  replace: (value0: unknown) => `Replace ${value0}`,
  replace2: "Replace",
  clear: (value0: unknown) => `Clear ${value0}`,
  clear2: "Clear",
  undoClearing: (value0: unknown) => `Undo clearing ${value0}`,
  undo: "Undo",
  newValue: "New value",
  keepTheCurrent: (value0: unknown) => `Keep the current ${value0}`,
  keepCurrent: "Keep current",
  test: "Test",
  theTestDidNotFinishRetry: "The test did not finish — retry",
  testing: "Testing…",
  lastTestSettingsChangedSince: (value0: unknown) => `Last test: ${value0} · settings changed since`,
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
