/**
 * Assistant — the conversation, generative and tool-rendered UI layer.
 *
 * Library code: no application imports. The application supplies the entity kinds and data
 * (EntityResolverProvider) and the conversation's actions (ConversationHandlersProvider).
 * docs/ai-ui.md maps every backend contract to the component that renders it.
 */
export * from "./ai-mark/index.js"
export * from "./asks/index.js"
export * from "./blocks/index.js"
export * from "./card/index.js"
export * from "./code-block/index.js"
export * from "./composer/index.js"
export * from "./conversation/index.js"
export * from "./desktop/index.js"
export * from "./entity-chip/index.js"
export * from "./inspector/index.js"
export * from "./json-tree/index.js"
export * from "./landing/index.js"
export * from "./markdown/index.js"
export * from "./message/index.js"
export * from "./pane/index.js"
export * from "./reasoning/index.js"
export * from "./results/index.js"
export * from "./session-nav/index.js"
export * from "./sources/index.js"
export * from "./status-strip/index.js"
export * from "./surface/index.js"
export * from "./table/index.js"
export * from "./tool-activity/index.js"
export { defineEntityKinds, entityHref, entityName, hostOf, kindSpec, parseEntityHref, safeExternalHref, type EntityKindSpec, type EntityKinds } from "./entities.js"
export { formatClock, formatCountdown, formatElapsed, formatIn } from "./format.js"
export { ConversationHandlersProvider, useConversationHandlers, type ApprovalDecision, type AskAnswer, type ConversationHandlers } from "./handlers.js"
export type * from "./types.js"
