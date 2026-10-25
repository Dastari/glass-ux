import { useMessages } from "../../lib/i18n/index.js"
import { contextSwitcherMessages } from "./messages.js"
import type { ReactNode } from "react";
import { Button } from "../../ui/button/index.js";
import { Notice } from "../../ui/notice/index.js";
import { OptionStatus } from "../../ui/combobox/index.js";
import type { ContextItem, SwitcherGroup, SwitcherLabels } from "./model.js";

/** Application-owned search and continuation for a bounded, flat directory of contexts. */
export interface ContextSwitcherRemote {
  /** Current server search text. Results must belong to this query and current identity. */
  query: string;
  /** Called as the search changes. The host debounces, cancels stale reads and resets its cursor. */
  onQueryChange: (value: string) => void;
  /** A search or continuation is pending. Context options are hidden until it finishes. */
  loading: boolean;
  /** Current read failure. Context options are hidden; the "all" row remains available. */
  error?: string;
  /** Retry the failed bounded read. Omit when retry is unavailable. */
  onRetry?: () => void;
  /** The server reports another page; this does not assert a total result count. */
  hasNextPage: boolean;
  /** Request one next page. The host appends its results and owns the opaque cursor. */
  onLoadMore: () => void;
  /** Authoritative selected identity when it is outside the loaded results. Must match value. */
  selected?: ContextItem | null;
  /** Optional coverage or freshness message. Do not imply the loaded page is the complete directory. */
  status?: ReactNode;
}

/** Keep server ordering and matches; no local ranking, parent inference or Recent grouping. */
export function remoteGroups(
  items: readonly ContextItem[],
  remote: ContextSwitcherRemote,
  labels: SwitcherLabels,
  all = true,
): SwitcherGroup[] {
  const rows = remote.loading || remote.error ? [] : items;
  return [
    ...(all
      ? [
          {
            value: "",
            items: [
              {
                key: "all",
                kind: "all" as const,
                value: null,
                label: labels.all,
                depth: 0,
                includes: 0,
              },
            ],
          },
        ]
      : []),
    ...(rows.length
      ? [
          {
            value: labels.group,
            items: rows.map((item) => ({
              key: `item:${item.id}`,
              kind: "item" as const,
              value: item.id,
              label: item.name,
              item,
              depth: 0,
              includes: 0,
            })),
          },
        ]
      : []),
  ];
}

export function RemoteFeedback({
  remote,
  count,
  labels,
}: {
  remote: ContextSwitcherRemote;
  /** Item count shown by the component. */
  count: number;
  /** The switcher's labels. */
  labels: SwitcherLabels;
}) {
  const messages = useMessages(contextSwitcherMessages)

  return (
    <div className="fa-context-switcher-feedback" aria-busy={remote.loading}>
      {remote.loading ? (
        <OptionStatus status="loading" />
      ) : remote.error ? (
        <Notice
          tone="danger"
          action={
            remote.onRetry ? (
              <Button size="sm" variant="ghost" onClick={remote.onRetry}>
                {messages.retry} </Button>
            ) : undefined
          }
        >
          {remote.error}
        </Notice>
      ) : count === 0 ? (
        <p className="fa-context-switcher-empty">
          {remote.query.trim() ? labels.noMatch(remote.query.trim()) : labels.none}
        </p>
      ) : null}
      {remote.status ? (
        <div className="type-caption text-fg-muted">{remote.status}</div>
      ) : null}
      {remote.hasNextPage ? (
        <Button
          size="sm"
          variant="ghost"
          disabled={remote.loading || Boolean(remote.error)}
          onClick={() => {
            if (!remote.loading && !remote.error) remote.onLoadMore();
          }}
        >
          {labels.loadMore}
        </Button>
      ) : null}
    </div>
  );
}
