import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for desktop. */
export const desktopMessages = defineMessages("desktop", {
  watching: (label: string) => `Watching ${label}`,
  assistantIsControlling: (label: string) => `Assistant is controlling ${label}`,
  assistantNeedsApprovalOn: (label: string) => `Assistant needs approval on ${label}`,
  assistantPausedOn: (label: string) => `Assistant paused on ${label}`,
  youHaveControlOf: (label: string) => `You have control of ${label}`,
  sessionOnEnded: (label: string) => `Session on ${label} ended`,
  controlOfExpired: (label: string) => `Control of ${label} expired`,
  lostTheSessionOn: (label: string) => `Lost the session on ${label}`,
  viewOnly: "View only",
  waitingForApproval: "Waiting for approval",
  youHaveControl: "You have control",
  ended: "Ended",
  expired: "Expired",
  noSignal: "No signal",
  leaseLeft: (time: string) => `lease ${time} left`,
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
