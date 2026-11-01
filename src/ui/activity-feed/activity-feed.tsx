import { useMessages } from "../../lib/i18n/index.js"
import { activityFeedMessages } from "./messages.js"
import { useId, useRef, useState, type ComponentProps, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { cx } from "../../lib/cx.js";
import { useSelectedId, type SelectedIdChangeHandler } from "../../lib/use-selected-id.js";
import type { BadgeTone } from "../badge/index.js";
import { RelativeTime } from "../data-table/cells/relative-time.js";
import { EmptyState } from "../empty-state/index.js";
import { ToneDot } from "../tone-dot/index.js";
export interface ActivityItem {
  /** Stable event identifier. */ id: string;
  /** Event description, with optional entity chips. */ content: ReactNode;
  /** Timestamp as epoch milliseconds, ISO string or Date. */ at:
    Date | number | string;
  /** Optional leading status or event icon. */ icon?: ReactNode;
  /** Colours the marker: the icon, or a dot when there is none. Tones mean status (R3.3). */ tone?: BadgeTone;
  /** Names the marker for assistive technology when `content` does not already say what the tone means. */ toneLabel?: string;
  /** Events that branch from this one, drawn indented beneath it. One level only. */ children?: readonly Omit<ActivityItem, "children">[];
}
export interface ActivityFeedProps extends Omit<
  ComponentProps<"ol">,
  "children"
> {
  /** Events in the application's chosen order. */ items: readonly ActivityItem[];
  /** One factual line when there are no events. */ empty?: string;
  /** The selected event's id, controlled; null selects none. Supplying this, `defaultSelectedId` or `onSelectedIdChange` makes the feed selectable. */ selectedId?: string | null;
  /** The event selected at first when uncontrolled. */ defaultSelectedId?: string | null;
  /** Called with the id of the event the person selects by click, Enter or Space, and details. */ onSelectedIdChange?: SelectedIdChangeHandler<ActivityItem>;
}

function marker({ icon, tone, toneLabel }: ActivityItem) {
  if (!icon && !tone) return null;
  return (
    <span
      className="fa-activity-icon"
      data-tone={tone}
      role={toneLabel ? "img" : undefined}
      aria-label={toneLabel}
      aria-hidden={toneLabel ? undefined : true}
    >
      {icon ?? <ToneDot tone={tone} />}
    </span>
  );
}

function PlainFeed({ items, ...rest }: Pick<ActivityFeedProps, "items"> & Omit<ComponentProps<"ol">, "children">) {
  return (
    <ol {...rest}>
      {items.map((item) => (
        <li key={item.id}>
          {marker(item)}
          <span className="fa-activity-content">{item.content}</span>
          <RelativeTime value={item.at} />
          {item.children?.length ? <PlainFeed items={item.children} className="fa-activity-branch" /> : null}
        </li>
      ))}
    </ol>
  );
}

/**
 * A selectable feed is one tab stop (R11.5): a listbox whose rows take roving focus. Rows keep
 * their `li`, emptied of its role, so a branch can be a group beside its parent's option.
 */
function SelectableFeed({
  items,
  selectedId,
  defaultSelectedId,
  onSelectedIdChange,
  onKeyDown,
  ...rest
}: Omit<ActivityFeedProps, "empty">) {
  const prefix = useId();
  const listRef = useRef<HTMLOListElement>(null);
  const [selected, select] = useSelectedId(selectedId, defaultSelectedId, onSelectedIdChange);
  const [focused, setFocused] = useState<string | null>(null);
  const flat = items.flatMap((item) => [item as ActivityItem, ...(item.children ?? [])]);
  const present = (id: string | null) => flat.some((item) => item.id === id);
  const stop = present(focused) ? focused : present(selected) ? selected : flat[0]?.id;
  const elementId = (index: number) => `${prefix}-${index}`;

  const move = (index: number) =>
    listRef.current?.querySelector<HTMLElement>(`#${CSS.escape(elementId(index))}`)?.focus();

  const onListKey = (event: KeyboardEvent<HTMLOListElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const option = (event.target as HTMLElement).closest("[role=option]");
    const index = option ? flat.findIndex((_, at) => elementId(at) === option.id) : -1;
    const item = flat[index];
    if (!item) return;
    if (event.key === "ArrowDown") move(Math.min(flat.length - 1, index + 1));
    else if (event.key === "ArrowUp") move(Math.max(0, index - 1));
    else if (event.key === "Home") move(0);
    else if (event.key === "End") move(flat.length - 1);
    else if (event.key === "Enter" || event.key === " ")
      select(item.id, { reason: "item-press", event: event.nativeEvent, item });
    else return;
    event.preventDefault();
  };

  const row = (item: ActivityItem) => {
    const index = flat.indexOf(item);
    const isSelected = item.id === selected;
    return (
      // Keys are handled once on the list (roving focus), as Tree does.
      // oxlint-disable-next-line jsx-a11y/click-events-have-key-events
      <div
        id={elementId(index)}
        role="option"
        aria-selected={isSelected}
        data-selected={isSelected ? "" : undefined}
        tabIndex={item.id === stop ? 0 : -1}
        className="fa-item fa-activity-row"
        onFocus={() => setFocused(item.id)}
        onClick={(event: MouseEvent) => select(item.id, { reason: "item-press", event: event.nativeEvent, item })}
      >
        {marker(item)}
        <span className="fa-activity-content">{item.content}</span>
        <RelativeTime value={item.at} />
      </div>
    );
  };

  return (
    <ol {...rest} ref={listRef} role="listbox" data-selectable="" onKeyDown={onListKey}>
      {items.map((item) => (
        <li key={item.id} role="none">
          {row(item)}
          {item.children?.length ? (
            <ol role="group" aria-labelledby={elementId(flat.indexOf(item))} className="fa-activity-branch">
              {item.children.map((child) => (
                <li key={child.id} role="none">
                  {row(child)}
                </li>
              ))}
            </ol>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

/**
 * An activity or notification feed using shared relative times and accessible absolute tooltips.
 *
 * As a timeline, such as a version history, items take a `tone` for the marker and `children`
 * for one level of branches. Selection makes it a listbox with one tab stop (R11.5):
 * ↑ ↓ Home End move, and a click, Enter or Space selects. Selection does not follow focus,
 * so moving through a long history loads nothing. A plain feed stays an ordinary list.
 */
export function ActivityFeed({
  items,
  empty: emptyProp,
  className,
  selectedId,
  defaultSelectedId,
  onSelectedIdChange,
  ...rest
}: ActivityFeedProps) {
  const messages = useMessages(activityFeedMessages)
  const empty = emptyProp ?? messages.noActivity
  const selectable = selectedId !== undefined || defaultSelectedId !== undefined || onSelectedIdChange !== undefined;

  if (items.length && selectable)
    return (
      <SelectableFeed
        {...rest}
        className={cx("fa-activity-feed", className)}
        items={items}
        selectedId={selectedId}
        defaultSelectedId={defaultSelectedId}
        onSelectedIdChange={onSelectedIdChange}
      />
    );
  if (items.length) return <PlainFeed {...rest} className={cx("fa-activity-feed", className)} items={items} />;
  return (
    <ol {...rest} className={cx("fa-activity-feed", className)}>
      <li>
        <EmptyState icon={null}>{empty}</EmptyState>
      </li>
    </ol>
  );
}
