import { messageContent } from "../../lib/i18n/message-content.js"
import { useMessages } from "../../lib/i18n/index.js"
import { desktopMessages } from "./messages.js"
import type { CSSProperties, ReactNode } from "react";
import {
  IconCursor,
  IconEye,
  IconPause,
  IconPlay,
  IconRemoteControl,
  IconStop,
} from "../../icons/generated/icons.js";
import { Badge } from "../../ui/badge/index.js";
import { ActionButton, Button } from "../../ui/button/index.js";
import { AiCard, type AiCardTone } from "../card/index.js";
import { EntityChip } from "../entity-chip/index.js";
import { formatCountdown, formatElapsed, useNow } from "../format.js";
import { StatusGlyph } from "../tool-activity/index.js";
import type { EntityRef, ResultImage, ToolStatus } from "../types.js";
import { useLocale } from "../../lib/locale/use-locale.js";

/**
 * Supervised desktop control (planned: Example application glass-ux-ai-desktop-control). The assistant first
 * watches, then acts on the screen while the person watches. The grants before it
 * (observation, then control: Assured, MFA, at most 15 minutes, no automatic renewal) are
 * approvals (ApprovalCard). This block shows the session itself:
 *
 *   observing        view-only: frames arrive, no input is sent
 *   controlling      the AI holds the control lease and sends input; Stop / Take over
 *   awaiting-action  a consequential action waits for its own one-shot approval
 *   paused           AI input paused (video froze, no progress after 3 actions)
 *   human            the person holds control; the AI waits
 *   ended · expired · failed   terminal; the last frame stays, visibly stale
 */
export type DesktopState =
  | "observing"
  | "controlling"
  | "awaiting-action"
  | "paused"
  | "human"
  | "ended"
  | "expired"
  | "failed";

export interface DesktopStep {
  id: string;
  /** "Opened Devices and Printers". */
  label: string;
  /** Current operation or connection status. */
  status: ToolStatus;
}

export interface DesktopSessionProps {
  /** The device or workspace being viewed, as presentation data supplied by the host. */
  target: EntityRef;
  /** Controlled view state, including loading, empty and error states. */
  state: DesktopState;
  /** Who is signed in on the target ("AzureAD\\MiraRowan"). */
  user?: string;
  /** Resolved signed-in person identity, rendered through the host entity adapter. */
  userEntity?: EntityRef;
  /** Host identity adapter, e.g. an account chip, when the signed-in value is a legacy account string. */
  userIdentity?: ReactNode;
  /** The latest frame. Its box keeps the frame's ratio, so frames never move the layout. */
  screen?: ResultImage;
  /** Ordered steps representing the progress or reasoning sequence. */
  steps: DesktopStep[];
  /** Unix ms the session started (the timer ticks while active). */
  startedAt: number;
  /** Why it paused, failed or ended, one line. */
  reason?: string;
  /** Unix ms the control lease ends (counts down while controlling). */
  leaseEndsAt?: number;
  /** The consequential action waiting for approval (awaiting-action). */
  pendingAction?: {
    label: string;
    effect: string;
    /** Called from Approve once; the button shows pending until the promise settles. Without it the button resolves immediately. */
    onApprove?: () => Promise<unknown>;
    /** Called from Deny; the button shows pending until the promise settles. Without it the button resolves immediately. */
    onDeny?: () => Promise<unknown>;
  };
  /** Called from Stop, shown in every state until the session has ended, expired or failed. */
  onStop?: () => void;
  /** Called from Take over, shown while the assistant is `controlling` or `awaiting-action`. */
  onTakeOver?: () => void;
  /** Called from Resume (`paused`) or Hand back to Assistant (`human`). */
  onResume?: () => void;
}

function getTITLES(messages: typeof desktopMessages.defaults): Record<DesktopState, (label: string) => string> { return {
  observing: (label) => messages.watching(label),
  controlling: (label) => messages.assistantIsControlling(label),
  "awaiting-action": (label) => messages.assistantNeedsApprovalOn(label),
  paused: (label) => messages.assistantPausedOn(label),
  human: (label) => messages.youHaveControlOf(label),
  ended: (label) => messages.sessionOnEnded(label),
  expired: (label) => messages.controlOfExpired(label),
  failed: (label) => messages.lostTheSessionOn(label),
} }


const TONES: Record<DesktopState, AiCardTone> = {
  observing: "info",
  controlling: "warning",
  "awaiting-action": "warning",
  paused: "warning",
  human: "default",
  ended: "default",
  expired: "default",
  failed: "danger",
};

function getBADGES(messages: typeof desktopMessages.defaults): Record<DesktopState, string> { return {
  observing: messages.viewOnly,
  controlling: messages.aiInControl,
  "awaiting-action": messages.waitingForApproval,
  paused: messages.aiPaused,
  human: messages.youHaveControl,
  ended: messages.ended,
  expired: messages.expired,
  failed: messages.noSignal,
} }


const resolved = () => Promise.resolve();

/**
 * The live desktop block: the target's screen with a state badge on it, the steps the
 * assistant took and is taking, and a large Stop. Stop and Take over are always reachable
 * while the AI holds the screen; nothing else in the conversation competes with them.
 */
export function DesktopSession({
  target,
  state,
  user,
  userEntity,
  userIdentity,
  screen,
  steps,
  startedAt,
  reason,
  leaseEndsAt,
  pendingAction,
  onStop,
  onTakeOver,
  onResume,
}: DesktopSessionProps) {
  const messages = useMessages(desktopMessages)

  const title = getTITLES(messages)[state](target.label);
  const active = state !== "ended" && state !== "expired" && state !== "failed";
  const now = useNow(active, 1000);
  const locale = useLocale();
  const elapsed = formatElapsed(Math.max(0, now - startedAt), locale);
  const lease =
    leaseEndsAt && state === "controlling"
      ? messages.leaseLeft(formatCountdown(leaseEndsAt - now))
      : null;
  const ratio = screen ? `${screen.width} / ${screen.height}` : "16 / 10";
  return (
    <AiCard.Root
      tone={TONES[state]}
      breakout
      className="fa-ai-desktop"
      data-state={state}
      aria-label={title}
    >
      <AiCard.Header
        icon={state === "observing" ? <IconEye /> : <IconRemoteControl />}
        iconTile
        title={title}
        meta={
          <span className="fa-ai-desktop-meta">
            {userIdentity || userEntity || user ? (
              <span>
                {messageContent(messages.isSignedIn("{name}"), { name: userIdentity ?? (userEntity ? <EntityChip entity={userEntity} size="sm" /> : user) })} </span>
            ) : null}
            {[active ? elapsed : null, lease, reason]
              .filter(Boolean)
              .map((item, index) => (
                <span key={index}>{item}</span>
              ))}
          </span>
        }
      >
        <EntityChip entity={target} size="sm" />
      </AiCard.Header>
      <AiCard.Body className="fa-ai-desktop-body">
        <div
          className="fa-ai-desktop-screen"
          data-over-imagery=""
          style={{ "--_ratio": ratio } as CSSProperties}
        >
          {screen ? (
            <img
              src={screen.src}
              alt={screen.alt}
              width={screen.width}
              height={screen.height}
              draggable={false}
            />
          ) : null}
          <Badge
            className="fa-ai-desktop-badge"
            tone={
              state === "failed"
                ? "danger"
                : state === "controlling" ||
                    state === "awaiting-action" ||
                    state === "paused"
                  ? "warning"
                  : state === "human"
                    ? "success"
                    : state === "ended" || state === "expired"
                      ? "neutral"
                      : "info"
            }
            marker={state === "controlling" ? "pulse" : "dot"}
          >
            {getBADGES(messages)[state]}
          </Badge>
          {state === "controlling" ? (
            <span className="glass-float fa-ai-desktop-cursor" aria-hidden>
              <IconCursor />
              {messages.assistant} </span>
          ) : null}
        </div>
        <div className="fa-ai-desktop-side">
          <ol className="fa-ai-desktop-steps" aria-label={messages.steps}>
            {steps.map((step) => (
              <li
                key={step.id}
                className="fa-ai-desktop-step"
                data-status={step.status}
              >
                <StatusGlyph status={step.status} />
                <span>{step.label}</span>
              </li>
            ))}
          </ol>
          {state === "awaiting-action" && pendingAction ? (
            <div
              className="glass-inset fa-ai-desktop-action"
              role="group"
              aria-label={messages.actionWaitingForApproval}
            >
              <span className="fa-label">{pendingAction.label}</span>
              <span className="fa-hint">{pendingAction.effect}</span>
              <div className="fa-ai-desktop-action-buttons">
                <ActionButton
                  size="sm"
                  variant="ghost"
                  pendingLabel={messages.denying}
                  successLabel={messages.denied}
                  onAction={pendingAction.onDeny ?? resolved}
                >
                  {messages.deny} </ActionButton>
                <ActionButton
                  size="sm"
                  variant="warning"
                  pendingLabel={messages.approving}
                  successLabel={messages.approved}
                  onAction={pendingAction.onApprove ?? resolved}
                >
                  {messages.approveOnce} </ActionButton>
              </div>
            </div>
          ) : null}
        </div>
      </AiCard.Body>
      {active ? (
        <AiCard.Footer className="fa-ai-desktop-footer">
          {state === "human" || state === "paused" ? (
            <Button size="lg" icon={<IconPlay />} onClick={onResume}>
              {state === "human" ? messages.handBackToAssistant : messages.resume}
            </Button>
          ) : state === "controlling" || state === "awaiting-action" ? (
            <Button size="lg" icon={<IconPause />} onClick={onTakeOver}>
              {messages.takeOver} </Button>
          ) : null}
          <Button
            size="lg"
            variant="danger-soft"
            icon={<IconStop />}
            className="fa-ai-desktop-stop"
            shortcut="esc"
            tooltip={false}
            onClick={onStop}
          >
            {messages.stop} </Button>
        </AiCard.Footer>
      ) : null}
    </AiCard.Root>
  );
}
