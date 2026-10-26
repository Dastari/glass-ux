import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for composer. */
export const composerMessages = defineMessages("composer", {
  noCommandsMatch: "No commands match",
  commands: "Commands",
  rejected: "Rejected",
  scanning: "Scanning…",
  uploading: (percent: number) => `Uploading · ${percent}%`,
  upload: (name: string) => `${name} upload`,
  remove: (name: string) => `Remove ${name}`,
  askAssistant: "Ask Assistant…",
  messageAssistant: "Message Assistant",
  listening: "Listening…",
  attachFiles: "Attach files",
  attach: "Attach",
  model: (name: string) => `Model: ${name}`,
  modelSummary: (name: string) => `Model · ${name}`,
  modelLabel: "Model",
  reasoning: "Reasoning",
  runtime: "Runtime",
  workspaceModel: "The model is chosen for the whole workspace.",
  aiSettings: "AI settings",
  context: "Context",
  inThisConversation: "In this conversation",
  workspaceScope: "Workspace · everything you can access",
  searchEntities: "Search entities",
  addAnEntity: "Add an entity",
  stopDictation: "Stop dictation",
  dictate: "Dictate",
  dictationNeedsMicrophoneAccess: "Dictation needs microphone access",
  stopResponse: "Stop response",
  send: "Send",
  typeAMessageFirst: "Type a message first",
  mention: "Mention",
  nothingMatches: (query: string) => `Nothing matches "${query}"`,
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
