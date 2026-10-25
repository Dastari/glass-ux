import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for desktop. */
export const desktopMessages = defineMessages("desktop", {
  watching: (value0: unknown) => `Watching ${value0}`,
  assistantIsControlling: (value0: unknown) => `Assistant is controlling ${value0}`,
  assistantNeedsApprovalOn: (value0: unknown) => `Assistant needs approval on ${value0}`,
  assistantPausedOn: (value0: unknown) => `Assistant paused on ${value0}`,
  youHaveControlOf: (value0: unknown) => `You have control of ${value0}`,
  sessionOnEnded: (value0: unknown) => `Session on ${value0} ended`,
  controlOfExpired: (value0: unknown) => `Control of ${value0} expired`,
  lostTheSessionOn: (value0: unknown) => `Lost the session on ${value0}`,
  viewOnly: "View only",
  waitingForApproval: "Waiting for approval",
  youHaveControl: "You have control",
  ended: "Ended",
  expired: "Expired",
  noSignal: "No signal",
  leaseLeft: (value0: unknown) => `lease ${value0} left`,
  isSignedIn: "is signed in",
  assistant: "Assistant",
  steps: "Steps",
  actionWaitingForApproval: "Action waiting for approval",
  denying: "Denying…",
  denied: "Denied",
  deny: "Deny",
  approving: "Approving…",
  approved: "Approved",
  approveOnce: "Approve once",
  handBackToAssistant: "Hand back to Assistant",
  resume: "Resume",
  takeOver: "Take over",
  stop: "Stop",
  aiInControl: "AI in control",
  aiPaused: "AI paused",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    desktop: typeof desktopMessages.defaults
  }
}

/** Resolve desktop wording outside React; pass the component's locale. */
export function getDesktopMessages(locale = getLocale()): typeof desktopMessages.defaults {
  return resolveMessages(desktopMessages.namespace, desktopMessages.defaults, locale)
}
