import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for composer. */
export const composerMessages = defineMessages("composer", {
  noCommandsMatch: "No commands match",
  commands: "Commands",
  rejected: "Rejected",
  scanning: "Scanning…",
  uploading: (value0: unknown) => `Uploading · ${value0}%`,
  upload: (value0: unknown) => `${value0} upload`,
  remove: (value0: unknown) => `Remove ${value0}`,
  askAssistant: "Ask Assistant…",
  messageAssistant: "Message Assistant",
  listening: "Listening…",
  attachFiles: "Attach files",
  attach: "Attach",
  model: (value0: unknown) => `Model: ${value0}`,
  model2: (value0: unknown) => `Model · ${value0}`,
  model3: "Model",
  reasoning: "Reasoning",
  runtime: "Runtime",
  theModelIsChosenForTheWholeWorkspace: "The model is chosen for the whole workspace.",
  aiSettings: "AI settings",
  context: "Context",
  inThisConversation: "In this conversation",
  workspaceEverythingYouCanAccess: "Workspace · everything you can access",
  searchEntities: "Search entities",
  addAnEntity: "Add an entity",
  stopDictation: "Stop dictation",
  dictate: "Dictate",
  dictationNeedsMicrophoneAccess: "Dictation needs microphone access",
  stopResponse: "Stop response",
  send: "Send",
  typeAMessageFirst: "Type a message first",
  mention: "Mention",
  nothingMatches: (value0: unknown) => `Nothing matches "${value0}"`,
  typeAName: "Type a name",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    composer: typeof composerMessages.defaults
  }
}

/** Resolve composer wording outside React; pass the component's locale. */
export function getComposerMessages(locale = getLocale()): typeof composerMessages.defaults {
  return resolveMessages(composerMessages.namespace, composerMessages.defaults, locale)
}
