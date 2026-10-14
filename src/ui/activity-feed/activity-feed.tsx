import type { ComponentProps, ReactNode } from "react";
import { cx } from "../../lib/cx.js";
import { RelativeTime } from "../data-table/cells/relative-time.js";
import { EmptyState } from "../empty-state/index.js";
export interface ActivityItem {
  /** Stable event identifier. */ id: string;
  /** Event description, with optional entity chips. */ content: ReactNode;
  /** Timestamp as epoch milliseconds, ISO string or Date. */ at:
    Date | number | string;
  /** Optional leading status or event icon. */ icon?: ReactNode;
}
export interface ActivityFeedProps extends Omit<
  ComponentProps<"ol">,
  "children"
> {
  /** Events in the application's chosen order. */ items: readonly ActivityItem[];
  /** One factual line when there are no events. */ empty?: string;
}
/** An activity or notification feed using shared relative times and accessible absolute tooltips. */
export function ActivityFeed({
  items,
  empty = "No activity",
  className,
  ...rest
}: ActivityFeedProps) {
  return (
    <ol {...rest} className={cx("fa-activity-feed", className)}>
      {items.length ? (
        items.map((item) => (
          <li key={item.id}>
            {item.icon ? (
              <span className="fa-activity-icon" aria-hidden>
                {item.icon}
              </span>
            ) : null}
            <span className="fa-activity-content">{item.content}</span>
            <RelativeTime value={item.at} />
          </li>
        ))
      ) : (
        <li>
          <EmptyState icon={null}>{empty}</EmptyState>
        </li>
      )}
    </ol>
  );
}
