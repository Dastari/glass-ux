import { useLocale } from "../../lib/locale/use-locale.js"
import { messageContent } from "../../lib/i18n/message-content.js"
import { useMessages } from "../../lib/i18n/index.js"
import { asksMessages } from "./messages.js"
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { IconLock, IconShield } from "../../icons/generated/icons.js";
import { ActionButton, Button } from "../../ui/button/index.js";
import { Notice } from "../../ui/notice/index.js";
import { SettingRow } from "../../ui/setting-row/index.js";
import { Switch } from "../../ui/switch/index.js";
import { CodeBlock } from "../code-block/index.js";
import { EntityChip } from "../entity-chip/index.js";
import { formatCountdown, useNow } from "../format.js";
import { useConversationHandlers } from "../handlers.js";
import type { AiApproval, ApprovalState } from "../types.js";
import { useAskDockApi, useAskResolution } from "./dock-state.js";
import { AskLayout, AskRecord, AskShell, RESOLVE_HOLD_MS } from "./frame.js";

type Approval = AiApproval;

/** Minutes "approve similar commands" covers (Example application CONTEXT_CONSENT_MINUTES; the server admits 1–60). */
const ALLOW_MINUTES = 15;

const RECORD_STATUS = {
  executed: "succeeded",
  approved: "running",
  denied: "cancelled",
  expired: "queued",
  revoked: "cancelled",
  cancelled: "cancelled",
  failed: "failed",
  pending: "awaiting-approval",
} as const satisfies Record<ApprovalState, string>;

function targetsText(ask: Approval, locale: string) {
  return new Intl.ListFormat(locale, { type: "unit" }).format(ask.targets.map((target) => target.label));
}

export interface ApprovalRecordProps {
  /** The typed request and its current resolution state. */
  ask: Approval;
  /** While approved and not yet run: withdraw it (RevokeAiApproval). */
  onRevoke?: () => Promise<void>;
}

/**
 * The record of a decided approval: one line in the transcript. While it is approved and
 * running it carries Revoke; it updates in place to executed, failed or revoked.
 */
export function ApprovalRecord({ ask, onRevoke }: ApprovalRecordProps) {
  const messages = useMessages(asksMessages)
  const locale = useLocale()

  return (
    <AskRecord
      status={RECORD_STATUS[ask.state]}
      by={ask.decidedBy}
      actor={ask.decidedByEntity}
      at={ask.decidedAt}
      action={
        ask.state === "approved" && onRevoke ? (
          <ActionButton
            variant="ghost"
            size="sm"
            pendingLabel={messages.revoking}
            successLabel={messages.revokedStatus}
            onAction={onRevoke}
          >
            {messages.revoke} </ActionButton>
        ) : undefined
      }
    >
      {messageContent(messages.approvalRecord({ state: ask.state, action: ask.action, targets: "{targets}", outcome: ask.outcome }), {
        targets: new Intl.ListFormat(locale, { type: "unit" }).formatToParts(ask.targets.map((_, index) => String(index))).map((part, index) => part.type === "element" ? <EntityChip key={index} entity={ask.targets[Number(part.value)]!} size="sm" /> : part.value),
      })}
    </AskRecord>
  );
}

function Expiry({ at, onExpire }: { at: number; onExpire: () => void }) {
  const messages = useMessages(asksMessages)

  const now = useNow(true, 1000);
  const left = at - now;
  useEffect(() => {
    if (left <= 0) onExpire();
  }, [left, onExpire]);
  if (left <= 0) return <span>{messages.expiredStatus}</span>;
  return (
    <span
      data-numeric
      data-soon={left < 60_000 ? "" : undefined}
      className="fa-ai-ask-expiry"
    >
      {messages.expiresIn(formatCountdown(left))}
    </span>
  );
}

/**
 * An approval request: the agent wants to run a consequential action. It names the action
 * and its targets, says what will happen, shows the exact command (the canonical preview),
 * and notes when step-up (MFA) follows. Approve is the final confirmation, so it is the
 * solid tone button (R11.9).
 *
 * Destructive and Assured (MFA) approvals confirm in a second step inside the card, never
 * behind a scrim (R13.8): "Review and approve" turns the effect into a toned notice and the
 * footer into Back and the single solid button. Esc goes back.
 * Decisions confirm in the button, then the card folds into its record, which shows the run
 * and updates in place.
 */
export function ApprovalCard({ ask }: {
  /** The approval request and its current state; once decided the card folds into its record. */
  ask: Approval;
}) {
  const messages = useMessages(asksMessages)
  const locale = useLocale()

  const id = useId();
  const handlers = useConversationHandlers();
  const dock = useAskDockApi();
  const shared = useAskResolution(ask.id);
  const [allow, setAllow] = useState(false);
  const [local, setLocal] = useState<{
    /** Controlled view state, including loading, empty and error states. */
    state: ApprovalState;
    /** Time associated with the record. */
    at: number;
  } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const reviewRef = useRef<HTMLButtonElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const decided =
    local ?? (shared?.state ? { state: shared.state, at: shared.at } : null);
  const state =
    ask.state !== "pending" ? ask.state : (decided?.state ?? "pending");
  const resolved = state !== "pending";
  const danger = ask.risk === "danger";
  const twoStep = danger || Boolean(ask.stepUp);
  const target = targetsText(ask, locale);

  const settle = useCallback(
    (next: ApprovalState) => {
      const at = Date.now();
      setLocal({ state: next, at });
      dock?.resolve(ask.id, { state: next, at });
    },
    [dock, ask.id],
  );

  const decide = async (decision: "approve" | "deny" | "revoke") => {
    await handlers.decide(ask.id, {
      decision,
      allowForMinutes:
        decision === "approve" && allow ? ALLOW_MINUTES : undefined,
    });
    setTimeout(
      () =>
        settle(
          decision === "approve"
            ? "approved"
            : decision === "deny"
              ? "denied"
              : "revoked",
        ),
      RESOLVE_HOLD_MS,
    );
  };

  const expire = useCallback(() => {
    if (!local) settle("expired");
  }, [local, settle]);

  // The second step: focus Back (the safe choice) when it opens, the entry point when it closes.
  const step = (next: boolean) => {
    setConfirming(next);
    requestAnimationFrame(() =>
      (next ? backRef.current : reviewRef.current)?.focus(),
    );
  };
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Escape" || !confirming) return;
    event.stopPropagation();
    step(false);
  };

  const tier = ask.stepUp ? messages.assuredMfa : messages.confirm;
  const approveLabel = ask.stepUp ? messages.approveWithMfa : messages.approveOnce;

  return (
    <AskShell
      resolved={resolved}
      record={
        <ApprovalRecord
          ask={{ ...ask, state, decidedAt: ask.decidedAt ?? decided?.at }}
          onRevoke={() => decide("revoke")}
        />
      }
    >
      <AskLayout
        id={id}
        icon={<IconShield />}
        tone={danger ? "danger" : "warning"}
        title={ask.question || `${ask.action}?`}
        meta={
          ask.expiresAt ? (
            <span>
              {tier} · <Expiry at={ask.expiresAt} onExpire={expire} />
            </span>
          ) : (
            tier
          )
        }
        confirming={confirming}
        onKeyDown={onKeyDown}
        footerStart={
          confirming ? (
            <Button
              ref={backRef}
              variant="ghost"
              size="sm"
              onClick={() => step(false)}
            >
              {messages.back} </Button>
          ) : (
            <ActionButton
              variant="ghost"
              size="sm"
              pendingLabel={messages.denying}
              successLabel={messages.deniedStatus}
              onAction={() => decide("deny")}
            >
              {messages.deny} </ActionButton>
          )
        }
        footer={
          !twoStep ? (
            <ActionButton
              variant="warning"
              size="sm"
              pendingLabel={messages.approving}
              successLabel={messages.approved}
              onAction={() => decide("approve")}
            >
              {approveLabel}
            </ActionButton>
          ) : confirming ? (
            <ActionButton
              variant={danger ? "danger" : "warning"}
              size="sm"
              icon={ask.stepUp ? <IconLock /> : undefined}
              pendingLabel={messages.approving}
              successLabel={messages.approved}
              onAction={() => decide("approve")}
            >
              {approveLabel}
            </ActionButton>
          ) : (
            <Button
              ref={reviewRef}
              variant={danger ? "danger-soft" : "warning-soft"}
              size="sm"
              icon={ask.stepUp ? <IconLock /> : undefined}
              onClick={() => step(true)}
            >
              {messages.reviewAndApprove} </Button>
          )
        }
      >
        <div className="fa-ai-approval">
          <div
            className="fa-ai-approval-targets"
            role="group"
            aria-label={messages.targets}
          >
            {ask.targets.map((entity) => (
              <EntityChip
                key={`${entity.kind}:${entity.id}`}
                entity={entity}
                size="sm"
              />
            ))}
          </div>
          {confirming ? null : (
            <p className="fa-ai-approval-effect">{ask.effect}</p>
          )}
          {ask.preview ? (
            <CodeBlock
              code={ask.preview.code}
              language={ask.preview.language}
              maxLines={8}
              wrap
            />
          ) : null}
          <p className="fa-hint">
            {messages.approvalScope} </p>
          {ask.stepUp ? (
            <Notice tone="info" compact>
              {messages.mfaDescription} </Notice>
          ) : null}
          {ask.allowForSession ? (
            <SettingRow
              label={messages.rememberApproval(ALLOW_MINUTES)}
              description={messages.approvalContext(ask.actionKind ?? messages.thisAction, target)}
              control={
                <Switch
                  checked={allow}
                  onCheckedChange={setAllow}
                  tone="warning"
                />
              }
            />
          ) : null}
          {confirming ? (
            <Notice
              tone={danger ? "danger" : "warning"}
              className="fa-ai-ask-confirm-notice"
            >
              {ask.effect}
            </Notice>
          ) : null}
        </div>
      </AskLayout>
    </AskShell>
  );
}
