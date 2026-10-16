/**
 * Typed assistant rendering models. The host adapts its own messages, tool events,
 * results, sources and questions into these shapes. Glass UX assumes no backend schema
 * or transport; see docs/ai-ui.md for the integration contracts and handler boundaries.
 */
import type { BadgeTone, EndpointStatus } from "../ui/badge/index.js";
import type { IconComponent } from "../ui/icon/index.js";

/* ── Entities ─────────────────────────────────────────────────────────────── */

/** A host-registered entity kind. EntityResolver supplies its glyph, noun, destinations and adapters. */
export type EntityKind = string;

/** A reference to one entity. `label` is resolved server-side, never typed by the model. */
export interface EntityRef {
  /** Semantic entity or content kind, used to choose labels and rendering. */
  kind: EntityKind;
  id: string;
  label: string;
  /** Live status for the glyph's dot (endpoints, agents). */
  status?: EndpointStatus;
  /** One neutral data meta: a version ("129.0"), a count. */
  meta?: string;
  /** A toned state: a ticket's "Open", an alert's "Critical". */
  state?: { label: string; tone: BadgeTone };
  /** Tint the glyph itself (alerts by severity). */
  tone?: "info" | "warning" | "danger";
  /**
   * false: the assistant named it but the server has not confirmed it exists and is visible
   * to the current person. The chip still opens; it says so.
   */
  verified?: boolean;
  /** Organisations: the staff-set short code ("NST", unique per workspace;). */
  code?: string;
}

/* ── Messages ─────────────────────────────────────────────────────────────── */

/** Who emitted the message; the host may synthesize system notices. */
export type AiRole = "user" | "assistant" | "system";

/** Presentation state for completed, streaming, failed, cancelled or retained-without-content messages. */
export type AiMessageState =
  "complete" | "streaming" | "failed" | "cancelled" | "purged";

export interface AiAttachment {
  id: string;
  name: string;
  /** Attachment size in bytes. */
  size: number;
  /** Media type of the file. */
  mime?: string;
  /** Upload progress 0–1 while QuarantineState is uploading. */
  progress?: number;
  /** Upload and content-screening state supplied by the host. */
  state?: "uploading" | "scanning" | "ready" | "rejected";
  /** Image preview (object URL while composing, thumbnail once released). */
  previewUrl?: string;
  /** Original file download URL supplied by the host; may be a browser object URL. The host owns its lifetime. */
  href?: string;
  /** RejectionCode, in words. */
  reason?: string;
}

export type AiFeedback = "up" | "down" | null;

export interface AiMessage {
  id: string;
  role: AiRole;
  /** Unix ms. */
  createdAt: number;
  /** Controlled view state, including loading, empty and error states. */
  state: AiMessageState;
  blocks: AiBlock[];
  /** Attachments selected for the message. */
  attachments?: AiAttachment[];
  /** Who sent a user message (AuthorSubject, resolved). */
  author?: string;
  /** The model that answered (session ExecutionSelection.Model). */
  model?: string;
  /** Host failure code, reason and whether retry is allowed. */
  failure?: { code?: string; reason: string; retryable: boolean };
  feedback?: AiFeedback;
}

/* ── Blocks ───────────────────────────────────────────────────────────────── */

/** One supported assistant message block, in display order. The host owns the data and execution callbacks. */
export type AiBlock =
  | { kind: "markdown"; text: string }
  | { kind: "reasoning"; reasoning: AiReasoning }
  | { kind: "tools"; calls: AiToolCall[] }
  | { kind: "result"; result: AiResult }
  | { kind: "ask"; ask: AiAsk }
  | { kind: "sources"; sources: AiSource[] }
  | {
      /** Semantic entity or content kind, used to choose labels and rendering. */
      kind: "notice";
      tone: "info" | "warning" | "danger" | "success";
      /** Plain text rendered or copied by the component. */
      text: string;
    };

/** provider_activity · reasoning_summary (accumulated). */
export interface AiReasoning {
  summary: string;
  /** Seconds the model spent; shown as "Thought for 4 s". */
  seconds: number;
  running?: boolean;
}

/* ── Tools ────────────────────────────────────────────────────────────────── */

/** Tool execution presentation state. Awaiting approval describes a pending host decision. */
export type ToolStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "awaiting-approval";

export interface AiToolCall {
  id: string;
  /** Stable registered tool ID (ToolId), e.g. `glass-ux.endpoints.query`. */
  toolId: string;
  /** Past-tense human label once done: "Queried 1,284 endpoints". */
  label: string;
  /** Present-tense label while running: "Querying endpoints". Defaults to `label`. */
  activeLabel?: string;
  /** The tool's domain glyph (the application maps ToolId → icon). */
  icon?: IconComponent;
  /** Selected entities passed to action visibility, enablement, confirmation and execution. */
  targets?: EntityRef[];
  /** Current operation or connection status. */
  status: ToolStatus;
  /** Elapsed ms (running: since start; done: total). */
  elapsedMs?: number;
  /** Failed: the outcome code in words ("Agent offline — retry when NST-C106 reconnects"). */
  reason?: string;
  /** Tool arguments supplied by the host; null means withheld. */
  args?: unknown;
  /** Tool result preview supplied by the host. */
  result?: unknown;
}

/** Provider progress state supplied by the host. */
export interface AiProviderStatus {
  /** Controlled view state, including loading, empty and error states. */
  state: "working" | "waiting" | "retrying" | "searching";
  /** "Waiting for NST-C106 to respond", "Retrying in 4 s (attempt 2 of 3)". */
  detail?: string;
  /** Selected assistant model or typed view model. */
  model?: string;
}

/* ── Sources ──────────────────────────────────────────────────────────────── */

/** A source citation: a credential-free HTTPS destination or a host record path. */
export interface AiSource {
  id: string;
  /** Footnote number used in the text as [^n]. */
  index: number;
  title: string;
  /** External: https URL. Glass UX record: an internal path. */
  href: string;
  /** Shown under the title: the domain, or the entity's data subtitle. */
  site?: string;
  /** Entity reference supplied by the host. */
  entity?: EntityRef;
}

/* ── Results (generative UI) ──────────────────────────────────────────────── */

export type ResultColumnType =
  "text" | "entity" | "status" | "number" | "time" | "badge";

export interface ResultColumn {
  key: string;
  header: string;
  /** Semantic content or control type. */
  type?: ResultColumnType;
  /** Unit displayed with a numeric value. */
  unit?: string;
  /** 1 never hides … 5 hides first as the block narrows. */
  priority?: 1 | 2 | 3 | 4 | 5;
}

/** A value the tool's disclosure marks confidential: shown as hidden, revealed only with permission. */
export interface RedactedValue {
  redacted: true;
  /** Why it is hidden or what reveals it ("Needs Confidential data access"). */
  reason?: string;
}

export type ResultRow = Record<
  string,
  string | number | EntityRef | RedactedValue | null | undefined
>;

export interface ChartSeries {
  name: string;
  /** Values rendered by the chart or multi-value control. */
  values: number[];
  tone?: "accent" | "success" | "warning" | "danger" | "info" | "neutral";
}

export interface ResultMetricItem {
  label: string;
  value: number | null;
  /** Unit displayed with a numeric value. */
  unit?: string;
  /** Change from the comparison value. */
  delta?: number;
  better?: "up" | "down" | "none";
  /** Typed records rendered by the component. */
  data?: number[];
  times?: string[];
  domain?: [number, number];
  tone?: "accent" | "success" | "warning" | "danger" | "info" | "neutral";
}

export interface ResultDetailItem {
  label: string;
  value: string;
  /** Confidential: the value is hidden (DetailTile shows the redacted treatment). */
  redacted?: RedactedValue;
  /** Additional detail for this value or request. */
  detail?: string;
  icon?: IconComponent;
  numeric?: boolean;
}

export interface ResultImage {
  id: string;
  /** Image URL; the component uses its fallback when it is absent or fails. */
  src: string;
  alt: string;
  /** Available width or named width tier. */
  width: number;
  /** Available height used for the component’s size tier. */
  height: number;
  /** Accessible caption or figure description. */
  caption?: string;
}

export interface ResultFile {
  id: string;
  name: string;
  size: number;
  /** Media type of the file. */
  mime?: string;
  href?: string;
}

export interface DiffLine {
  /** Semantic content or control type. */
  type: "context" | "add" | "remove";
  /** Plain text rendered or copied by the component. */
  text: string;
}

export interface LogLine {
  time?: string;
  level: "debug" | "info" | "warning" | "error" | "success";
  /** Plain text rendered or copied by the component. */
  text: string;
}

interface ResultBase {
  id: string;
  title: string;
  /** Data subtitle: the source and scope ("glass-ux.endpoints · Northstar Studio"). */
  source?: string;
}

export type AiResult =
  | (ResultBase & {
      /** Semantic content or control type. */
      type: "table";
      /** Typed column definitions, including rendering, sorting, priorities and filters. */
      columns: ResultColumn[];
      /** Records or matrix rows in display order. */
      rows: ResultRow[];
      total: number;
      /** Singular and plural names used in counts and accessible labels. */
      noun?: { one: string; other: string };
    })
  | (ResultBase & { type: "metrics"; metrics: ResultMetricItem[] })
  | (ResultBase & {
      /** Semantic content or control type. */
      type: "chart";
      chart: "line" | "bar";
      /** Display and accessibility labels supplied by the application. */
      labels: string[];
      /** Chart series with stable identifiers, labels and typed values. */
      series: ChartSeries[];
      /** Unit displayed with a numeric value. */
      unit?: string;
      domain?: [number, number];
    })
  | (ResultBase & {
      /** Semantic content or control type. */
      type: "detail";
      /** Entity reference supplied by the host. */
      entity?: EntityRef;
      items: ResultDetailItem[];
    })
  | (ResultBase & {
      /** Semantic content or control type. */
      type: "entity";
      /** Entity reference supplied by the host. */
      entity: EntityRef;
      /** Data shown beneath or beside the title. */
      subtitle?: string;
      facts: Array<{ label: string; value: string }>;
    })
  | (ResultBase & {
      /** Semantic content or control type. */
      type: "entities";
      entities: Array<EntityRef & { detail?: string }>;
      total?: number;
    })
  | (ResultBase & { type: "images"; images: ResultImage[] })
  | (ResultBase & { type: "files"; files: ResultFile[] })
  | (ResultBase & {
      /** Semantic content or control type. */
      type: "diff";
      target?: EntityRef;
      language?: string;
      /** Number of text or skeleton lines. */
      lines: DiffLine[];
    })
  | (ResultBase & { type: "log"; lines: LogLine[] })
  | (ResultBase & {
      /** Semantic content or control type. */
      type: "value";
      label: string;
      value: string | number | null;
      /** Unit displayed with a numeric value. */
      unit?: string;
      /** Additional detail for this value or request. */
      detail?: string;
      redacted?: RedactedValue;
    })
  | (ResultBase & { type: "json"; value: unknown; truncated?: boolean });

/* ── Asks (human in the loop) ─────────────────────────────────────────────── */

/**
 * AiApprovalView.State: pending · approved · resume_claimed · denied · expired · revoked ·
 * consumed. The UI folds resume_claimed into approved ("running") and consumed into executed.
 */
export type ApprovalState =
  | "pending"
  | "approved"
  | "executed"
  | "denied"
  | "expired"
  | "revoked"
  | "cancelled"
  | "failed";

export interface ApprovalAsk {
  /** Semantic content or control type. */
  type: "approval";
  /** "Restart the Print Spooler service". */
  action: string;
  /** Selected entities passed to action visibility, enablement, confirmation and execution. */
  targets: EntityRef[];
  risk: "warning" | "danger";
  /** One factual sentence: what will happen and whether it can be undone. */
  effect: string;
  /** CanonicalPreview: the exact command or change. */
  preview?: { language: string; code: string };
  /** RecentMfaRequired: the Assured tier (a click plus recent MFA); otherwise Confirm. */
  stepUp?: boolean;
  /** Unix ms (ExpiresAt). */
  expiresAt?: number;
  /** ApproveGlassUxAiActionForContext: approve similar commands here for a while (1–60 min). */
  allowForSession?: boolean;
  /** "PowerShell", "Software update": what kind of action the grant covers. */
  actionKind?: string;
  /** Controlled view state, including loading, empty and error states. */
  state: ApprovalState;
  /** Actor display name for legacy records. */
  decidedBy?: string;
  /** Resolved actor identity, rendered through the host entity adapter. */
  decidedByEntity?: EntityRef;
  decidedAt?: number;
  /** Executed: the outcome line ("Spooler restarted · 1.8 s"). */
  outcome?: string;
}

export interface ChoiceOption {
  value: string;
  label: string;
  description?: string;
  icon?: IconComponent;
  /** Trailing data ("Level 2 · 12 jobs today"). */
  meta?: string;
}

export interface FormField {
  name: string;
  label: string;
  /** Semantic entity or content kind, used to choose labels and rendering. */
  kind: "text" | "textarea" | "select" | "number";
  required?: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  /** Supporting text in the field’s reserved message slot. Validation errors take precedence. */
  hint?: string;
  /** Pre-filled by the agent. */
  value?: string;
  /** Unit displayed with a numeric value. */
  unit?: string;
  /** Lower allowed value. */
  min?: number;
  /** Upper value or visible-item limit, as specified by the type. */
  max?: number;
}

/** The ask types. Only `approval` exists in the backend today; the rest are proposals. */
export type AiAskBody =
  | ApprovalAsk
  | { type: "single"; options: ChoiceOption[]; layout?: "cards" | "list" }
  | { type: "multi"; options: ChoiceOption[]; min?: number }
  | { type: "quick"; options: ChoiceOption[] }
  | { type: "form"; fields: FormField[] }
  | {
      /** Semantic content or control type. */
      type: "entity";
      entityKind: EntityKind;
      /** Initial or ranked choices offered before a search. */
      suggestions: EntityRef[];
      /** Allows more than one selected value. */
      multiple?: boolean;
    }
  | {
      /** Semantic content or control type. */
      type: "datetime";
      /** Initial or ranked choices offered before a search. */
      suggestions: Array<{ label: string; value: string }>;
      /** IANA time zone, e.g. Australia/Hobart. Unzoned suggestions are interpreted here; answers use UTC ISO instants. */ timezone: string;
      /** Earliest instant, local wall time in timezone, or "now". */ earliest?: string;
    }
  | {
      /** Semantic content or control type. */
      type: "confirm";
      consequence: string;
      /** Visible label naming the outcome of the confirmation. */
      confirmLabel: string;
      tone: "warning" | "danger" | "accent";
    }
  | { type: "rank"; options: ChoiceOption[] }
  | { type: "clarify"; placeholder?: string; suggestions?: string[] };

export type AskState = "pending" | "answered" | "expired" | "cancelled";

export type AiAsk = AiAskBody & {
  id: string;
  /** The question, one line: "Which printer should be the default?". */
  question: string;
  /** Optional data line under the question (never a restatement, R2.2). */
  detail?: string;
  /** Non-approval asks: answered/expired/cancelled. Approvals use their own `state`. */
  status?: AskState;
  /** The answer in words for the collapsed record. */
  answer?: string;
  /** Actor display name for legacy records. */
  answeredBy?: string;
  /** Resolved actor identity, rendered through the host entity adapter. */
  answeredByEntity?: EntityRef;
  answeredAt?: number;
  /** The submit verb, naming the outcome ("Set as default"). */
  submitLabel?: string;
};

/** An approval ask (the one kind the backend has today). */
export type AiApproval = Extract<AiAsk, { type: "approval" }>;

/* ── Sessions ─────────────────────────────────────────────────────────────── */

/** AiSessionActivityState (Done · Error · Prompt · Working) plus unread from inbox events. */
export type SessionActivity = "idle" | "working" | "prompt" | "error" | "done";

export interface AiSession {
  id: string;
  title: string;
  /** Unix ms (LastActivityAt). */
  lastActivityAt: number;
  activity: SessionActivity;
  unread?: boolean;
  archived?: boolean;
  /** Tenant, organisation or entity scope supplied by the application. */
  scope?: EntityRef;
  /**
   * The organisation the chat belongs to (R6.9: history is never filtered by the switcher,
   * so every row says whose it is). null: a cross-client chat ("All organisations").
   */
  organisation?: EntityRef | null;
  projectId?: string;
}

export interface AiProject {
  id: string;
  name: string;
  /** Item count shown by the component. */
  count: number;
}

/* ── Conversation scope and budget ────────────────────────────────────────── */

export interface AiScope {
  /** Workspace or one entity (CreateGlassUxAiSession ScopeKind/ScopeId). */
  entity: EntityRef | null;
  /** GlassUxAiConversationContext.References. */
  references: EntityRef[];
}

/** GlassUxAiBudgetWarning / AiBudgetScopeCapacityView, reduced to what a person reads. */
export interface AiBudget {
  label: string;
  used: number;
  maximum: number;
  /** Unit displayed with a numeric value. */
  unit: string;
  /** Unix ms (PeriodEndsAt). */
  resetsAt?: number;
}

/** The run's live state for the composer, the status strip and the turn. */
export type RunState = "idle" | "sending" | "running" | "stopping";

/** Connection to the durable session stream (AiSessionEventEnvelope, R17.4). */
export type StreamState = "connected" | "reconnecting" | "offline" | "reset";
