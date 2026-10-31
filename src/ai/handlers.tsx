import { createContext, useContext, type ReactNode } from "react"
import type { AiFeedback, AiMessage, AiResult, AiToolCall } from "./types.js"

/** How the person answered an ask. `value` is the option value(s), the form or the text. */
export type AskAnswer =
  | { type: "choice"; value: string; label: string }
  | { type: "choices"; values: string[]; label: string }
  | { type: "form"; values: Record<string, string>; label: string }
  | { type: "text"; value: string }
  | { type: "entities"; ids: string[]; label: string }
  | { type: "datetime"; value: string; label: string }
  | { type: "confirm"; confirmed: boolean }
  | { type: "order"; values: string[]; label: string }

export interface ApprovalDecision {
  /** DecideAiApproval Approve/Deny, or RevokeAiApproval before it is used. */
  decision: "approve" | "deny" | "revoke"
  /** ApproveGlassUxAiActionForContext: stop asking for this action on this target for a while. */
  allowForMinutes?: number
}

/**
 * Everything a conversation can ask its host to do. Components call these; the host (the
 * AI feature, or a template) wires them to GraphQL mutations — SendAiMessage,
 * DecideAiApproval, RetryAiRun, CancelAiRun — and the window manager. Each async handler
 * resolves when the server accepts, so buttons confirm in place (R9.2).
 */
export interface ConversationHandlers {
  answer: (askId: string, answer: AskAnswer) => Promise<void>
  decide: (askId: string, decision: ApprovalDecision) => Promise<void>
  retry: (message: AiMessage) => Promise<void>
  feedback: (message: AiMessage, value: AiFeedback) => void
  editMessage: (message: AiMessage) => void
  openMessageWindow: (message: AiMessage) => void
  openResultWindow: (result: AiResult) => void
  loadToolDetails?: (call: AiToolCall) => Promise<Pick<AiToolCall, "args" | "result">>
}

const resolved = () => Promise.resolve()

/** Without a host, actions resolve at once and windows are logged. */
const DEFAULTS: ConversationHandlers = {
  answer: resolved,
  decide: resolved,
  retry: resolved,
  feedback: () => {},
  editMessage: () => {},
  openMessageWindow: (message) => console.info(`[ai] open message ${message.id} in a window`),
  openResultWindow: (result) => console.info(`[ai] open ${result.type} result "${result.title}" in a window`),
}

const HandlersContext = /* @__PURE__ */ createContext<ConversationHandlers>(DEFAULTS)

/** Connect assistant interaction events to host callbacks for answers, approvals, retries, feedback and opening results. */
export function ConversationHandlersProvider({ handlers, children }: {
  /** The host callbacks to use; any left out keep the defaults (async actions resolve at once, window requests are logged). */
  handlers: Partial<ConversationHandlers>
  children: ReactNode
}) {
  return <HandlersContext value={{ ...DEFAULTS, ...handlers }}>{children}</HandlersContext>
}

/** The ConversationHandlers from the nearest ConversationHandlersProvider, merged over the defaults; without a provider, actions resolve at once and windows are logged. */
export function useConversationHandlers() {
  return useContext(HandlersContext)
}
