import type { CSSProperties } from "react"
import { IconCursor, IconEye, IconPause, IconPlay, IconRemoteControl, IconStop } from "../../icons/generated/icons.js"
import { ActionButton, Button } from "../../ui/button/index.js"
import { AiCard, type AiCardTone } from "../card/index.js"
import { EntityChip } from "../entity-chip/index.js"
import { formatCountdown, formatElapsed, useNow } from "../format.js"
import { StatusGlyph } from "../tool-activity/index.js"
import type { EntityRef, ResultImage, ToolStatus } from "../types.js"

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
export type DesktopState = "observing" | "controlling" | "awaiting-action" | "paused" | "human" | "ended" | "expired" | "failed"

export interface DesktopStep {
  id: string
  /** "Opened Devices and Printers". */
  label: string
  /** Current operation or connection status. */
  status: ToolStatus
}

export interface DesktopSessionProps {
  /** Endpoint presentation data supplied by the host. */
  endpoint: EntityRef
  /** Controlled view state, including loading, empty and error states. */
  state: DesktopState
  /** Who is signed in on the endpoint ("AzureAD\\MiraRowan"). */
  user?: string
  /** The latest frame. Its box keeps the frame's ratio, so frames never move the layout. */
  screen?: ResultImage
  /** Ordered steps representing the progress or reasoning sequence. */
  steps: DesktopStep[]
  /** Unix ms the session started (the timer ticks while active). */
  startedAt: number
  /** Why it paused, failed or ended, one line. */
  reason?: string
  /** Unix ms the control lease ends (counts down while controlling). */
  leaseEndsAt?: number
  /** The consequential action waiting for approval (awaiting-action). */
  pendingAction?: { label: string; effect: string; onApprove?: () => Promise<unknown>; onDeny?: () => Promise<unknown> }
  /** Called when stop occurs. The callback type specifies its arguments. */
  onStop?: () => void
  /** Called when take over occurs. The callback type specifies its arguments. */
  onTakeOver?: () => void
  /** Called when resume occurs. The callback type specifies its arguments. */
  onResume?: () => void
}

const TITLES: Record<DesktopState, (label: string) => string> = {
  observing: (label) => `Watching ${label}`,
  controlling: (label) => `Assistant is controlling ${label}`,
  "awaiting-action": (label) => `Assistant needs approval on ${label}`,
  paused: (label) => `Assistant paused on ${label}`,
  human: (label) => `You have control of ${label}`,
  ended: (label) => `Session on ${label} ended`,
  expired: (label) => `Control of ${label} expired`,
  failed: (label) => `Lost the session on ${label}`,
}

const TONES: Record<DesktopState, AiCardTone> = {
  observing: "info",
  controlling: "warning",
  "awaiting-action": "warning",
  paused: "warning",
  human: "default",
  ended: "default",
  expired: "default",
  failed: "danger",
}

const BADGES: Record<DesktopState, string> = {
  observing: "View only",
  controlling: "AI in control",
  "awaiting-action": "Waiting for approval",
  paused: "AI paused",
  human: "You have control",
  ended: "Ended",
  expired: "Expired",
  failed: "No signal",
}

const resolved = () => Promise.resolve()

/**
 * The live desktop block: the endpoint's screen with a state badge on it, the steps the
 * assistant took and is taking, and a large Stop. Stop and Take over are always reachable
 * while the AI holds the screen; nothing else in the conversation competes with them.
 */
export function DesktopSession({ endpoint, state, user, screen, steps, startedAt, reason, leaseEndsAt, pendingAction, onStop, onTakeOver, onResume }: DesktopSessionProps) {
  const active = state !== "ended" && state !== "expired" && state !== "failed"
  const now = useNow(active, 1000)
  const elapsed = formatElapsed(Math.max(0, now - startedAt))
  const lease = leaseEndsAt && state === "controlling" ? `lease ${formatCountdown(leaseEndsAt - now)} left` : null
  const ratio = screen ? `${screen.width} / ${screen.height}` : "16 / 10"
  return (
    <AiCard.Root tone={TONES[state]} breakout className="fa-ai-desktop" data-state={state} aria-label={TITLES[state](endpoint.label)}>
      <AiCard.Header
        icon={state === "observing" ? <IconEye /> : <IconRemoteControl />}
        iconTile
        title={TITLES[state](endpoint.label)}
        meta={[user ? `${user} is signed in` : null, active ? elapsed : null, lease, reason].filter(Boolean).join(" · ")}
      >
        <EntityChip entity={endpoint} size="sm" />
      </AiCard.Header>
      <AiCard.Body className="fa-ai-desktop-body">
        <div className="fa-ai-desktop-screen" data-over-imagery="" style={{ "--_ratio": ratio } as CSSProperties}>
          {screen ? <img src={screen.src} alt={screen.alt} width={screen.width} height={screen.height} draggable={false} /> : null}
          <span className="glass-float fa-ai-desktop-badge" data-state={state} role="status">
            <span className="fa-ai-desktop-dot" aria-hidden />
            {BADGES[state]}
          </span>
          {state === "controlling" ? (
            <span className="glass-float fa-ai-desktop-cursor" aria-hidden>
              <IconCursor />
              Assistant
            </span>
          ) : null}
        </div>
        <div className="fa-ai-desktop-side">
          <ol className="fa-ai-desktop-steps" aria-label="Steps">
            {steps.map((step) => (
              <li key={step.id} className="fa-ai-desktop-step" data-status={step.status}>
                <StatusGlyph status={step.status} />
                <span>{step.label}</span>
              </li>
            ))}
          </ol>
          {state === "awaiting-action" && pendingAction ? (
            <div className="glass-inset fa-ai-desktop-action" role="group" aria-label="Action waiting for approval">
              <span className="fa-label">{pendingAction.label}</span>
              <span className="fa-hint">{pendingAction.effect}</span>
              <div className="fa-ai-desktop-action-buttons">
                <ActionButton size="sm" variant="ghost" pendingLabel="Denying…" successLabel="Denied" onAction={pendingAction.onDeny ?? resolved}>
                  Deny
                </ActionButton>
                <ActionButton size="sm" variant="warning" pendingLabel="Approving…" successLabel="Approved" onAction={pendingAction.onApprove ?? resolved}>
                  Approve once
                </ActionButton>
              </div>
            </div>
          ) : null}
        </div>
      </AiCard.Body>
      {active ? (
        <AiCard.Footer className="fa-ai-desktop-footer">
          {state === "human" || state === "paused" ? (
            <Button size="lg" icon={<IconPlay />} onClick={onResume}>
              {state === "human" ? "Hand back to Assistant" : "Resume"}
            </Button>
          ) : state === "controlling" || state === "awaiting-action" ? (
            <Button size="lg" icon={<IconPause />} onClick={onTakeOver}>
              Take over
            </Button>
          ) : null}
          <Button size="lg" variant="danger-soft" icon={<IconStop />} className="fa-ai-desktop-stop" shortcut="esc" tooltip={false} onClick={onStop}>
            Stop
          </Button>
        </AiCard.Footer>
      ) : null}
    </AiCard.Root>
  )
}
