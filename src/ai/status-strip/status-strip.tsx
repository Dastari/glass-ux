import { formatPercent, numberFormat } from "../../lib/locale/intl.js"
import { useMessages } from "../../lib/i18n/index.js"
import { statusStripMessages } from "./messages.js"
import { IconCloudOff, IconRefresh } from "../../icons/generated/icons.js";
import { cx } from "../../lib/cx.js";
import { Button } from "../../ui/button/index.js";
import { ToneDot } from "../../ui/tone-dot/index.js";
import { TruncatedText } from "../../ui/truncated-text/index.js";
import { Tooltip } from "../../ui/tooltip/index.js";
import { formatNumber, useNow } from "../format.js";
import type { AiBudget, StreamState } from "../types.js";
import { useLocale } from "../../lib/locale/use-locale.js";

export interface AiStatusStripProps {
  /** Current message stream state. */
  stream: StreamState;
  /** Reconnecting: when the next attempt runs (Unix ms) and which attempt it is. */
  retryAt?: number;
  /** Current retry attempt. */
  attempt?: number;
  /** Called from Retry now, shown whenever `stream` is not `connected` and this is supplied. */
  onRetry?: () => void;
  /** Remaining capacity and its warning state. */
  budget?: AiBudget;
  /** Selected assistant model or typed view model. */
  model?: string;
  className?: string;
}

const percent = (budget: AiBudget) =>
  Math.round((budget.used / Math.max(1, budget.maximum)) * 100);

/**
 * The conversation's status strip (R14.6, R17.4): the session stream's connection, the
 * budget and the model, as one caption line under the composer. Background state lives
 * here, never in a banner: "Reconnecting · attempt 2 · 4 s", "Offline · history stays
 * readable", "Daily allowance 82%" in the warning tone from 80%.
 */
export function AiStatusStrip({
  stream,
  retryAt,
  attempt,
  onRetry,
  budget,
  model,
  className,
}: AiStatusStripProps) {
  const messages = useMessages(statusStripMessages)

  const now = useNow(stream === "reconnecting" && Boolean(retryAt), 1000);
  const locale = useLocale();
  const seconds = retryAt
    ? Math.max(0, Math.ceil((retryAt - now) / 1000))
    : null;
  const secondUnit = numberFormat(locale, { style: "unit", unit: "second", unitDisplay: "narrow" }).formatToParts(1).find((part) => part.type === "unit")?.value ?? ""
  const used = budget ? percent(budget) : null;
  const stateText = (time: string | undefined) =>
    stream === "connected"
      ? messages.live
      : stream === "reconnecting"
        ? messages.reconnectStatus({ attempt, time })
        : stream === "reset"
          ? messages.reloaded
          : messages.offlineHistoryStaysReadable;
  return (
    <div
      className={cx("fa-ai-status", className)}
      data-stream={stream}
    >
      {/* The state alone is announced; the visible line also counts down to the next attempt. */}
      <span className="sr-only" role="status">
        {stateText(undefined)}
      </span>
      <span
        aria-hidden
        className="fa-ai-status-item"
        data-tone={
          stream === "connected"
            ? "success"
            : stream === "reconnecting"
              ? "warning"
              : "danger"
        }
      >
        {stream === "offline" ? (
          <IconCloudOff className="fa-ai-status-icon" />
        ) : (
          <ToneDot
            tone={stream === "connected" ? "success" : "warning"}
            marker={stream === "connected" ? "dot" : "pulse"}
            aria-hidden
          />
        )}
        {stateText(seconds !== null ? `${formatNumber(seconds, 0, locale)} ${secondUnit}` : undefined)}
      </span>
      {stream !== "connected" && onRetry ? (
        <Button
          variant="ghost"
          size="sm"
          icon={<IconRefresh />}
          className="fa-ai-status-retry"
          onClick={onRetry}
        >
          {messages.retryNow} </Button>
      ) : null}
      <span className="fa-ai-status-meta">
        {budget && used !== null ? (
          <Tooltip
            content={messages.budgetUsage({ used: formatNumber(budget.used, 0, locale), maximum: formatNumber(budget.maximum, 0, locale), unit: budget.unit })}
          >
            <span
              className="fa-ai-status-item"
              data-tone={
                used >= 100 ? "danger" : used >= 80 ? "warning" : undefined
              }
            >
              {budget.label} <span data-numeric>{formatPercent(locale, used)}</span>
            </span>
          </Tooltip>
        ) : null}
        {model ? (
          <TruncatedText className="fa-ai-status-item">{model}</TruncatedText>
        ) : null}
      </span>
    </div>
  );
}
