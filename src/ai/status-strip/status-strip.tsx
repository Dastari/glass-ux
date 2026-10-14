import { IconCloudOff, IconRefresh } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { Button } from "../../ui/button/index.js"
import { Tooltip } from "../../ui/tooltip/index.js"
import { formatNumber, useNow } from "../format.js"
import type { AiBudget, StreamState } from "../types.js"

export interface AiStatusStripProps {
  /** Current message stream state. */
  stream: StreamState
  /** Reconnecting: when the next attempt runs (Unix ms) and which attempt it is. */
  retryAt?: number
  /** Current retry attempt. */
  attempt?: number
  /** Called when retry occurs. The callback type specifies its arguments. */
  onRetry?: () => void
  /** Remaining capacity and its warning state. */
  budget?: AiBudget
  /** Selected assistant model or typed view model. */
  model?: string
  className?: string
}

const percent = (budget: AiBudget) => Math.round((budget.used / Math.max(1, budget.maximum)) * 100)

/**
 * The conversation's status strip (R14.6, R17.4): the session stream's connection, the
 * budget and the model, as one caption line under the composer. Background state lives
 * here, never in a banner: "Reconnecting · attempt 2 · 4 s", "Offline · history stays
 * readable", "Daily allowance 82%" in the warning tone from 80%.
 */
export function AiStatusStrip({ stream, retryAt, attempt, onRetry, budget, model, className }: AiStatusStripProps) {
  const now = useNow(stream === "reconnecting" && Boolean(retryAt), 1000)
  const seconds = retryAt ? Math.max(0, Math.ceil((retryAt - now) / 1000)) : null
  const used = budget ? percent(budget) : null
  return (
    <div className={cx("fa-ai-status", className)} role="status" data-stream={stream}>
      <span className="fa-ai-status-item" data-tone={stream === "connected" ? "success" : stream === "reconnecting" ? "warning" : "danger"}>
        {stream === "offline" ? <IconCloudOff className="fa-ai-status-icon" /> : <span className="fa-ai-status-dot" aria-hidden />}
        {stream === "connected"
          ? "Live"
          : stream === "reconnecting"
            ? `Reconnecting${attempt ? ` · attempt ${attempt}` : ""}${seconds !== null ? ` · ${seconds} s` : ""}`
            : stream === "reset"
              ? "Conversation reloaded from the server"
              : "Offline · history stays readable"}
      </span>
      {stream !== "connected" && onRetry ? (
        <Button variant="ghost" size="sm" icon={<IconRefresh />} className="fa-ai-status-retry" onClick={onRetry}>
          Retry now
        </Button>
      ) : null}
      <span className="fa-ai-status-meta">
        {budget && used !== null ? (
          <Tooltip content={`${formatNumber(budget.used)} of ${formatNumber(budget.maximum)} ${budget.unit}`}>
            <span className="fa-ai-status-item" data-tone={used >= 100 ? "danger" : used >= 80 ? "warning" : undefined}>
              {budget.label} <span data-numeric>{used}%</span>
            </span>
          </Tooltip>
        ) : null}
        {model ? <span className="fa-ai-status-item">{model}</span> : null}
      </span>
    </div>
  )
}
