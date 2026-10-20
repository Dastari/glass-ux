import { Collapsible } from "@base-ui/react/collapsible";
import { useEffect, useState } from "react";
import {
  IconChevronRight,
  IconError,
  IconGlobe,
  IconPending,
  IconPuzzle,
  IconShield,
  IconSpinner,
  IconStop,
  IconSuccess,
} from "../../icons/generated/icons.js";
import { cx } from "../../lib/cx.js";
import { OptionChip } from "../../ui/combobox/index.js";
import { FactList } from "../../ui/fact-list/index.js";
import { TruncatedText } from "../../ui/truncated-text/index.js";
import { CopyButton } from "../../ui/copy-button/index.js";
import { Notice } from "../../ui/notice/index.js";
import { Progress } from "../../ui/progress/index.js";
import { Skeleton } from "../../ui/skeleton/index.js";
import { AiCard } from "../card/index.js";
import { EntityChip } from "../entity-chip/index.js";
import { formatElapsed, plural, useNow } from "../format.js";
import { useConversationHandlers } from "../handlers.js";
import { JsonTree } from "../json-tree/index.js";
import type { AiProviderStatus, AiToolCall, ToolStatus } from "../types.js";
import { useLocale } from "../../lib/locale/use-locale.js";

const STATUS_WORDS: Record<ToolStatus, string> = {
  queued: "Queued",
  running: "Running",
  succeeded: "Done",
  failed: "Failed",
  cancelled: "Cancelled",
  "awaiting-approval": "Waiting for approval",
};

/** The status glyph shared by tool rows, groups and provider activity. */
export function StatusGlyph({
  status,
  className,
}: {
  /** Current operation or connection status. */
  status: ToolStatus;
  className?: string;
}) {
  const Icon =
    status === "running"
      ? IconSpinner
      : status === "succeeded"
        ? IconSuccess
        : status === "failed"
          ? IconError
          : status === "cancelled"
            ? IconStop
            : status === "awaiting-approval"
              ? IconShield
              : IconPending;
  return (
    <span className={cx("fa-ai-status-glyph", className)} data-status={status}>
      <Icon />
    </span>
  );
}

/** Elapsed time that ticks while the work runs (tabular, so it never changes width). */
function Elapsed({ ms, running }: { ms?: number; running: boolean }) {
  const [started] = useState(() => Date.now() - (ms ?? 0));
  const now = useNow(running, 100);
  const locale = useLocale();
  const value = running ? now - started : ms;
  if (value === undefined) return null;
  return (
    <span className="fa-ai-tool-elapsed" data-numeric>
      {formatElapsed(value, locale)}
    </span>
  );
}

function ToolDetails({ call }: { call: AiToolCall }) {
  const handlers = useConversationHandlers();
  const [loaded, setLoaded] = useState<{
    value?: Pick<AiToolCall, "args" | "result">;
    failed?: boolean;
  } | null>(null);
  const load = handlers.loadToolDetails;
  const needsLoad =
    call.args === undefined &&
    call.result === undefined &&
    Boolean(load) &&
    call.status !== "running";
  const state = needsLoad
    ? loaded === null
      ? "loading"
      : loaded.failed
        ? "error"
        : "idle"
    : "idle";
  const args = loaded?.value ? loaded.value.args : call.args;
  const result = loaded?.value ? loaded.value.result : call.result;
  // The details are fetched when the row first opens (AiToolCallResultPreview), not before.
  useEffect(() => {
    if (!needsLoad || !load) return;
    let active = true;
    load(call).then(
      (value) => {
        if (active) setLoaded({ value });
      },
      () => {
        if (active) setLoaded({ failed: true });
      },
    );
    return () => {
      active = false;
    };
  }, [needsLoad, load, call]);
  return (
    <AiCard.Root well className="fa-ai-tool-details">
      <AiCard.Body>
        <FactList
          facts={[
            {
              label: "Tool",
              value: (
                <TruncatedText numeric>
                  <code>{call.toolId}</code>
                </TruncatedText>
              ),
            },
            { label: "Status", value: STATUS_WORDS[call.status] },
            ...(call.targets?.length
              ? [
                  {
                    label: "Targets",
                    value: (
                      <span className="fa-ai-tool-targets">
                        {call.targets.map((target) => (
                          <EntityChip
                            key={`${target.kind}:${target.id}`}
                            entity={target}
                            size="sm"
                          />
                        ))}
                      </span>
                    ),
                  },
                ]
              : []),
          ]}
        />
        {call.status === "failed" && call.reason ? (
          <Notice tone="danger" compact>
            {call.reason}
          </Notice>
        ) : null}
        {state === "loading" ? (
          <div className="fa-ai-tool-json" aria-busy="true">
            <Skeleton.Text type="mono" lines={4} width="60%" />
          </div>
        ) : state === "error" ? (
          <p className="fa-hint">
            The tool details could not be loaded. They stay on the server.
          </p>
        ) : (
          <>
            <ToolJson
              label="Arguments"
              value={args}
              withheld="The server withheld the arguments."
            />
            <ToolJson
              label="Result"
              value={result}
              withheld={
                call.status === "running"
                  ? "The result appears when the tool finishes."
                  : "No result is available to this browser."
              }
            />
          </>
        )}
      </AiCard.Body>
    </AiCard.Root>
  );
}

function ToolJson({
  label,
  value,
  withheld,
}: {
  label: string;
  value: unknown;
  withheld: string;
}) {
  if (value === undefined || value === null) {
    return (
      <div className="fa-ai-tool-json">
        <div className="fa-ai-tool-json-head">
          <span className="fa-overline">{label}</span>
        </div>
        <p className="fa-hint">{withheld}</p>
      </div>
    );
  }
  const text = JSON.stringify(value, null, 2);
  return (
    <div className="fa-ai-tool-json">
      <div className="fa-ai-tool-json-head">
        <span className="fa-overline">{label}</span>
        <CopyButton value={text} label={`Copy ${label.toLowerCase()}`} />
      </div>
      <JsonTree
        value={value}
        label={label}
        truncated={
          text.length > 64 * 1024
            ? "Truncated to 64 KB in this view."
            : undefined
        }
      />
    </div>
  );
}

export interface ToolCallRowProps {
  /** Tool call and its current execution state. */
  call: AiToolCall;
  /** Start expanded (galleries, failures you want seen). */
  defaultOpen?: boolean;
  className?: string;
}

/**
 * One tool call as a quiet row: status glyph, a human verb ("Queried 1,284 endpoints"),
 * its targets, and the elapsed time. Status changes in place; a running call shows a thin
 * indeterminate line under the row. Expanding shows the targets, arguments and a result
 * preview (copyable JSON). Failures keep their reason visible without expanding.
 */
export function ToolCallRow({
  call,
  defaultOpen = false,
  className,
}: ToolCallRowProps) {
  const running = call.status === "running";
  const label =
    running || call.status === "queued"
      ? (call.activeLabel ?? call.label)
      : call.label;
  // Targets the label already names are not repeated as chips.
  const chips = (call.targets ?? []).filter(
    (target) => !label.includes(target.label),
  );
  return (
    <Collapsible.Root
      className={cx("fa-ai-tool", className)}
      data-status={call.status}
      defaultOpen={defaultOpen}
    >
      <Collapsible.Trigger
        className="fa-ai-tool-row"
        aria-label={`${label}, ${STATUS_WORDS[call.status].toLowerCase()}`}
      >
        <StatusGlyph status={call.status} />
        <span className="fa-ai-tool-text">
          <TruncatedText className="fa-ai-tool-label">{label}</TruncatedText>
          {call.status === "failed" && call.reason ? (
            <TruncatedText className="fa-ai-tool-reason">
              {call.reason}
            </TruncatedText>
          ) : null}
        </span>
        {chips.length ? (
          <span className="fa-ai-tool-chips">
            {chips.slice(0, 2).map((target) => (
              <OptionChip
                key={`${target.kind}:${target.id}`}
                label={target.label}
                readOnly
              />
            ))}
            {chips.length > 2 ? (
              <span className="fa-ai-tool-more">+{chips.length - 2}</span>
            ) : null}
          </span>
        ) : null}
        <Elapsed ms={call.elapsedMs} running={running} />
        <IconChevronRight className="fa-ai-tool-chevron" />
        {running ? (
          <Progress
            value={null}
            aria-label="Tool running"
            className="fa-ai-tool-progress"
            size="sm"
          />
        ) : null}
      </Collapsible.Trigger>
      <Collapsible.Panel className="fa-collapse fa-ai-tool-panel">
        <ToolDetails call={call} />
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}

function groupStatus(calls: AiToolCall[]): ToolStatus {
  if (calls.some((call) => call.status === "running")) return "running";
  if (calls.some((call) => call.status === "awaiting-approval"))
    return "awaiting-approval";
  if (calls.some((call) => call.status === "queued")) return "queued";
  if (calls.some((call) => call.status === "failed")) return "failed";
  if (calls.every((call) => call.status === "cancelled")) return "cancelled";
  return "succeeded";
}

export interface ToolGroupProps {
  /** Tool calls in execution order. */
  calls: AiToolCall[];
  defaultOpen?: boolean;
  className?: string;
}

/**
 * Consecutive tool calls folded into one summary row ("Ran 4 tools · 2.3 s"), with the
 * running and failed counts when there are any. A single call renders as its own row.
 */
export function ToolGroup({
  calls,
  defaultOpen = false,
  className,
}: ToolGroupProps) {
  const locale = useLocale();
  if (calls.length === 1)
    return (
      <ToolCallRow
        call={calls[0]!}
        defaultOpen={defaultOpen}
        className={className}
      />
    );
  const status = groupStatus(calls);
  const running = calls.filter((call) => call.status === "running").length;
  const failed = calls.filter((call) => call.status === "failed").length;
  const total = calls.reduce((sum, call) => sum + (call.elapsedMs ?? 0), 0);
  const label =
    status === "running"
      ? `Running ${running} of ${plural(calls.length, "tool", undefined, locale)}`
      : status === "awaiting-approval"
        ? `${plural(calls.length, "tool", undefined, locale)} · waiting for approval`
        : `Ran ${plural(calls.length, "tool", undefined, locale)}`;
  return (
    <Collapsible.Root
      className={cx("fa-ai-tool fa-ai-tool-group", className)}
      data-status={status}
      defaultOpen={defaultOpen}
    >
      <Collapsible.Trigger
        className="fa-ai-tool-row"
        aria-label={`${label}${failed ? `, ${failed} failed` : ""}`}
      >
        <StatusGlyph status={status} />
        <span className="fa-ai-tool-text">
          <span className="fa-ai-tool-label">
            {label}
            {failed ? (
              <span className="fa-ai-tool-failed"> · {failed} failed</span>
            ) : null}
          </span>
        </span>
        <span className="fa-ai-tool-stack" aria-hidden>
          {calls.slice(0, 4).map((call) => {
            const Icon = call.icon ?? IconPuzzle;
            return (
              <span
                key={call.id}
                className="fa-ai-tool-stack-icon"
                data-status={call.status}
              >
                <Icon />
              </span>
            );
          })}
        </span>
        {status === "running" ? (
          <Elapsed running />
        ) : total ? (
          <Elapsed ms={total} running={false} />
        ) : null}
        <IconChevronRight className="fa-ai-tool-chevron" />
        {status === "running" ? (
          <Progress
            value={null}
            aria-label="Tool running"
            className="fa-ai-tool-progress"
            size="sm"
          />
        ) : null}
      </Collapsible.Trigger>
      <Collapsible.Panel className="fa-collapse fa-ai-tool-panel">
        <div className="fa-ai-tool-list">
          {calls.map((call) => (
            <ToolCallRow key={call.id} call={call} />
          ))}
        </div>
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}

const PROVIDER_WORDS: Record<AiProviderStatus["state"], string> = {
  working: "Working",
  waiting: "Waiting",
  retrying: "Retrying",
  searching: "Searching the web",
};

/**
 * What the model is doing between tool calls: working, waiting on an endpoint, retrying
 * the provider, or searching the web. One line with a spinner and the elapsed time; it is
 * replaced in place by the answer.
 */
export function ProviderActivity({
  status,
  className,
}: {
  /** Current operation or connection status. */
  status: AiProviderStatus;
  className?: string;
}) {
  return (
    <div
      className={cx("fa-ai-tool fa-ai-provider", className)}
      data-status="running"
      data-state={status.state}
      role="status"
    >
      <div className="fa-ai-tool-row" data-static="">
        {status.state === "searching" ? (
          <span className="fa-ai-status-glyph" data-status="running">
            <IconGlobe />
          </span>
        ) : (
          <StatusGlyph
            status={status.state === "retrying" ? "queued" : "running"}
          />
        )}
        <span className="fa-ai-tool-text">
          <span className="fa-ai-tool-label">
            {PROVIDER_WORDS[status.state]}
            {status.detail ? (
              <span className="fa-ai-tool-detail"> · {status.detail}</span>
            ) : null}
          </span>
        </span>
        {status.model ? (
          <span className="fa-ai-tool-model">{status.model}</span>
        ) : null}
        <Elapsed running />
      </div>
    </div>
  );
}

/** The exact row box of a tool call while history loads. */
export function ToolCallSkeleton({ className }: { className?: string }) {
  return (
    <div className={cx("fa-ai-tool", className)} aria-hidden>
      <div className="fa-ai-tool-row" data-static="">
        <Skeleton.Circle size="var(--icon-sm)" />
        <Skeleton.Text type="label" width="40%" />
      </div>
    </div>
  );
}
