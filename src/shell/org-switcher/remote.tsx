import type { ReactNode } from "react";
import { Button } from "../../ui/button/index.js";
import { Notice } from "../../ui/notice/index.js";
import { OptionStatus } from "../../ui/combobox/index.js";
import type {
  SwitcherGroup,
  SwitcherLabels,
  SwitcherOrganisation,
} from "./model.js";

/** Application-owned search and continuation for a bounded, flat organisation directory. */
export interface OrgSwitcherRemote {
  /** Current server search text. Results must belong to this query and current identity. */
  query: string;
  /** Called as the search changes. The host debounces, cancels stale reads and resets its cursor. */
  onQueryChange: (value: string) => void;
  /** A search or continuation is pending. Organisation options are hidden until it finishes. */
  loading: boolean;
  /** Current read failure. Organisation options are hidden; All organisations remains available. */
  error?: string;
  /** Retry the failed bounded read. Omit when retry is unavailable. */
  onRetry?: () => void;
  /** The server reports another page; this does not assert a total result count. */
  hasNextPage: boolean;
  /** Request one next page. The host appends its results and owns the opaque cursor. */
  onLoadMore: () => void;
  /** Authoritative selected identity when it is outside the loaded results. Must match value. */
  selected?: SwitcherOrganisation | null;
  /** Optional coverage or freshness message. Do not imply the loaded page is the complete directory. */
  status?: ReactNode;
}

/** Keep server ordering and matches; no local ranking, parent inference or Recent grouping. */
export function remoteGroups(
  organisations: readonly SwitcherOrganisation[],
  remote: OrgSwitcherRemote,
  labels: SwitcherLabels,
): SwitcherGroup[] {
  const rows = remote.loading || remote.error ? [] : organisations;
  return [
    {
      value: "",
      items: [
        {
          key: "all",
          kind: "all",
          value: null,
          label: labels.all,
          depth: 0,
          includes: 0,
        },
      ],
    },
    ...(rows.length
      ? [
          {
            value: labels.organisations,
            items: rows.map((org) => ({
              key: `organisation:${org.id}`,
              kind: "organisation" as const,
              value: org.id,
              label: org.name,
              org,
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
}: {
  remote: OrgSwitcherRemote;
  /** Item count shown by the component. */
  count: number;
}) {
  return (
    <div className="fa-org-switcher-feedback" aria-busy={remote.loading}>
      {remote.loading ? (
        <OptionStatus status="loading" />
      ) : remote.error ? (
        <Notice
          tone="danger"
          action={
            remote.onRetry ? (
              <Button size="sm" variant="ghost" onClick={remote.onRetry}>
                Retry
              </Button>
            ) : undefined
          }
        >
          {remote.error}
        </Notice>
      ) : count === 0 ? (
        <p className="fa-org-switcher-empty">
          {remote.query.trim()
            ? `No organisations match “${remote.query.trim()}”`
            : "No organisations returned"}
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
          Load more organisations
        </Button>
      ) : null}
    </div>
  );
}
