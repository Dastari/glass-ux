import { useMessages } from "../../lib/i18n/index.js"
import { inspectorMessages } from "./messages.js"
import type { ComponentProps, ReactNode } from "react";
import { IconPuzzle } from "../../icons/generated/icons.js";
import { cx } from "../../lib/cx.js";
import { TruncatedText } from "../../ui/truncated-text/index.js";
import { CountBadge } from "../../ui/badge/index.js";
import { Meter } from "../../ui/meter/index.js";
import { EntityChip } from "../entity-chip/index.js";
import { formatElapsed, formatIn, formatNumber, useNow } from "../format.js";
import { SourceList } from "../sources/index.js";
import type { AiBudget, AiSource, AiToolCall, EntityRef } from "../types.js";
import { useLocale } from "../../lib/locale/use-locale.js";

export interface ConversationContextProps extends ComponentProps<"div"> {
  /** The conversation's scope, or null for the whole workspace. */
  scope: EntityRef | null;
  /** Entities the conversation mentioned, most recent first. */
  referenced: EntityRef[];
  /** Tool definitions or calls displayed in the view. */
  tools: AiToolCall[];
  /** Citations or data sources associated with the content. */
  sources: AiSource[];
  /** Remaining capacity and its warning state. */
  budget?: AiBudget;
}

function Section({
  title,
  meta,
  children,
}: {
  title: string;
  /** Supporting data displayed with the item. */
  meta?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="fa-ai-context-section" aria-label={title}>
      <h3 className="fa-ai-context-title">
        <span className="fa-overline">{title}</span>
        {meta ? <span className="fa-ai-context-meta">{meta}</span> : null}
      </h3>
      {children}
    </section>
  );
}

/** Tools grouped by id: how often each ran and how long it took in total. */
function toolSummary(tools: AiToolCall[]) {
  const map = new Map<
    string,
    { call: AiToolCall; count: number; ms: number; failed: number }
  >();
  for (const call of tools) {
    const entry = map.get(call.toolId) ?? { call, count: 0, ms: 0, failed: 0 };
    entry.count += 1;
    entry.ms += call.elapsedMs ?? 0;
    if (call.status === "failed") entry.failed += 1;
    map.set(call.toolId, entry);
  }
  return [...map.values()].toSorted((a, b) => b.count - a.count);
}

/**
 * What the conversation stands on, for the inspector beside it on wide screens (R5.4):
 * its scope, the entities it referenced, the tools it ran, its sources and the budget it
 * draws from. Content only: the shell's inspector pane supplies the glass and the header.
 */
export function ConversationContext({
  scope,
  referenced,
  tools,
  sources,
  budget,
  className,
  ...rest
}: ConversationContextProps) {
  const messages = useMessages(inspectorMessages)

  const now = useNow(false);
  const locale = useLocale();
  const summary = toolSummary(tools);
  const used = budget
    ? Math.round((budget.used / Math.max(1, budget.maximum)) * 100)
    : 0;
  return (
    <div {...rest} className={cx("fa-ai-context-panel", className)}>
      <Section title={messages.scope}>
        <div className="fa-ai-context-chips">
          {scope ? (
            <EntityChip entity={scope} size="sm" />
          ) : (
            <span className="fa-ai-context-workspace">
              {messages.workspaceScope} </span>
          )}
        </div>
      </Section>
      {referenced.length ? (
        <Section
          title={messages.referenced}
          meta={<CountBadge value={referenced.length} />}
        >
          <div className="fa-ai-context-chips">
            {referenced.map((entity) => (
              <EntityChip
                key={`${entity.kind}:${entity.id}`}
                entity={entity}
                size="sm"
              />
            ))}
          </div>
        </Section>
      ) : null}
      {summary.length ? (
        <Section title={messages.toolsUsed} meta={<CountBadge value={tools.length} />}>
          <ul className="fa-ai-context-tools">
            {summary.map(({ call, count, ms, failed }) => {
              const Icon = call.icon ?? IconPuzzle;
              return (
                <li key={call.toolId} className="fa-ai-context-tool">
                  <span className="fa-ai-context-tool-icon" aria-hidden>
                    <Icon />
                  </span>
                  <TruncatedText className="fa-ai-context-tool-id" numeric>
                    <code>{call.toolId}</code>
                  </TruncatedText>
                  <span className="fa-ai-context-tool-meta" data-numeric>
                    {count}× · {formatElapsed(ms, locale)}
                    {failed ? (
                      <span className="fa-ai-context-failed">
                        {" "}
                        · {failed} {messages.failed} </span>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ul>
        </Section>
      ) : null}
      {sources.length ? (
        <Section title={messages.sources} meta={<CountBadge value={sources.length} />}>
          <SourceList sources={sources} className="fa-ai-context-sources" />
        </Section>
      ) : null}
      {budget ? (
        <Section
          title={messages.budget}
          meta={
            budget.resetsAt
              ? messages.resets(formatIn(budget.resetsAt, now, locale))
              : undefined
          }
        >
          <Meter
            value={budget.used}
            max={budget.maximum}
            label={budget.label}
            valueText={messages.budgetSummary(used, formatNumber(budget.used, 0, locale), formatNumber(budget.maximum, 0, locale), budget.unit)}
            warningAt={0.8}
            dangerAt={0.95}
          />
        </Section>
      ) : null}
    </div>
  );
}
