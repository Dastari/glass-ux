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

function targetsText(ask: Approval) {
  return ask.targets.map((target) => target.label).join(", ");
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
  const prefix =
    ask.state === "executed"
      ? ""
      : ask.state === "denied"
        ? "Denied · "
        : ask.state === "expired"
          ? "Expired · "
          : ask.state === "revoked"
            ? "Revoked · "
            : ask.state === "cancelled"
              ? "Cancelled with the run · "
              : ask.state === "failed"
                ? "Failed · "
                : "Approved · running · ";
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
            pendingLabel="Revoking…"
            successLabel="Revoked"
            onAction={onRevoke}
          >
            Revoke
          </ActionButton>
        ) : undefined
      }
    >
      {prefix}
      {ask.action} on{" "}
      {ask.targets.map((entity, index) => (
        <span key={`${entity.kind}:${entity.id}`}>
          {index ? ", " : ""}
          <EntityChip entity={entity} size="sm" />
        </span>
      ))}
      {ask.outcome ? (
        <span className="fa-ai-ask-record-outcome"> · {ask.outcome}</span>
      ) : null}
    </AskRecord>
  );
}

function Expiry({ at, onExpire }: { at: number; onExpire: () => void }) {
  const now = useNow(true, 1000);
  const left = at - now;
  useEffect(() => {
    if (left <= 0) onExpire();
  }, [left, onExpire]);
  if (left <= 0) return <span>Expired</span>;
  return (
    <span
      data-numeric
      data-soon={left < 60_000 ? "" : undefined}
      className="fa-ai-ask-expiry"
    >
      Expires in {formatCountdown(left)}
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
  const target = targetsText(ask);

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

  const tier = ask.stepUp ? "Assured · MFA" : "Confirm";
  const approveLabel = ask.stepUp ? "Approve with MFA" : "Approve once";

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
              Back
            </Button>
          ) : (
            <ActionButton
              variant="ghost"
              size="sm"
              pendingLabel="Denying…"
              successLabel="Denied"
              onAction={() => decide("deny")}
            >
              Deny
            </ActionButton>
          )
        }
        footer={
          !twoStep ? (
            <ActionButton
              variant="warning"
              size="sm"
              pendingLabel="Approving…"
              successLabel="Approved"
              onAction={() => decide("approve")}
            >
              {approveLabel}
            </ActionButton>
          ) : confirming ? (
            <ActionButton
              variant={danger ? "danger" : "warning"}
              size="sm"
              icon={ask.stepUp ? <IconLock /> : undefined}
              pendingLabel="Approving…"
              successLabel="Approved"
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
              Review and approve
            </Button>
          )
        }
      >
        <div className="fa-ai-approval">
          <div
            className="fa-ai-approval-targets"
            role="group"
            aria-label="Targets"
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
            Approval applies once, to this action and its selected targets.
          </p>
          {ask.stepUp ? (
            <Notice tone="info" compact>
              Approving asks you to confirm with MFA before it runs.
            </Notice>
          ) : null}
          {ask.allowForSession ? (
            <SettingRow
              label={`Approve similar commands for ${ALLOW_MINUTES} minutes`}
              description={`${ask.actionKind ?? "This action"} on ${target}, in this conversation only.`}
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
