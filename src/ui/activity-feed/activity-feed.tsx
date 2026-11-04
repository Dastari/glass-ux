import { useMessages } from "../../lib/i18n/index.js"
import { activityFeedMessages } from "./messages.js"
import { useId, useMemo, useRef, useState, type ComponentProps, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { cx } from "../../lib/cx.js";
import { useSelectedId, type SelectedIdChangeHandler } from "../../lib/use-selected-id.js";
import type { BadgeTone } from "../badge/index.js";
import { RelativeTime } from "../data-table/cells/relative-time.js";
import { toTime } from "../data-table/format.js";
import { EmptyState } from "../empty-state/index.js";
import { Surface } from "../surface/index.js";
import { ToneDot } from "../tone-dot/index.js";
export interface ActivityItem {
  /** Stable event identifier. */ id: string;
  /** Event description, with optional entity chips. Phrasing content (text, `strong`, chips, badges), so `timePlacement="inline"` can follow it. */ content: ReactNode;
  /** Timestamp as epoch milliseconds, ISO string or Date. `order` sorts by it. */ at:
    Date | number | string;
  /**
   * Optional leading marker: an icon, or an `Avatar` for an event by a person. The feed sizes
   * it (pass it without a size, R19.1); in a timeline an avatar takes the marker column's size.
   */
  icon?: ReactNode;
  /** Colours the marker: the icon, or a dot when there is none. Tones mean status (R3.3). */ tone?: BadgeTone;
  /** Names the marker for assistive technology when `content` does not already say what the tone means. */ toneLabel?: string;
  /**
   * Content drawn below the event's line, in the content column: a post's message, an alert's
   * facts, an attachment. `detailSurface` gives it a surface. In a plain feed it may hold links and
   * controls. In a selectable feed it is part of the row's option, which describes the option with
   * it, so it must hold no links or controls: ARIA does not let an option contain them.
   */
  detail?: ReactNode;
  /** Events that branch from this one, drawn indented beneath it. One level only. */ children?: readonly Omit<ActivityItem, "children">[];
}

/** The order `ActivityFeed` draws its events in; see {@link ActivityFeedProps.order}. */
export type ActivityOrder = "given" | "newest" | "oldest";

/** The surface under an event's `detail`; see {@link ActivityFeedProps.detailSurface}. */
export type ActivityDetailSurface = "inset" | "card" | "none";

export interface ActivityFeedProps extends Omit<
  ComponentProps<"ol">,
  "children"
> {
  /** Events, drawn in this order unless `order` sorts them. */ items: readonly ActivityItem[];
  /** One factual line when there are no events. */ empty?: string;
  /** The selected event's id, controlled; null selects none. Supplying this, `defaultSelectedId` or `onSelectedIdChange` makes the feed selectable. */ selectedId?: string | null;
  /** The event selected at first when uncontrolled. */ defaultSelectedId?: string | null;
  /** Called with the id of the event the person selects by click, Enter or Space, and details. */ onSelectedIdChange?: SelectedIdChangeHandler<ActivityItem>;
  /**
   * `feed` (the default) draws each marker inline before its event. `timeline` puts every marker
   * in one column on the reading-start side, joined by a rail from the first event to the last,
   * with a small gap around each marker; events without an icon or tone get a node on the rail,
   * and avatars and icons are sized to the column. Branches take a rail of their own. The time
   * reserves its width there, so the clock's ticks do not re-wrap a row.
   */
  variant?: "feed" | "timeline";
  /**
   * Sorts the events by `at`: `newest` or `oldest` first. `given` (the default) keeps the
   * application's order. The sort is stable, so events at the same time keep their given order;
   * branches stay under their parent and are sorted the same way among themselves. Events whose
   * `at` does not parse go last. For a live feed, `oldest` adds arrivals at the end, where they
   * move nothing; with `newest`, hold arrivals behind a count (R17.3).
   */
  order?: ActivityOrder;
  /**
   * Where the relative time goes: `end` (the default) at the end of the event's line, or `inline`
   * after the event's sentence, behind a middle dot ("… to High · 2 min ago").
   */
  timePlacement?: "end" | "inline";
  /**
   * The surface under each event's `detail`: `inset` (the default), a well like a code block's;
   * `card`, the card material; or `none`, for content that brings its own surface or none.
   */
  detailSurface?: ActivityDetailSurface;
}

interface Layout {
  timeline: boolean;
  inline: boolean;
  detailSurface: ActivityDetailSurface;
}

const FEED: Layout = { timeline: false, inline: false, detailSurface: "inset" };

function marker({ icon, tone, toneLabel }: ActivityItem, timeline = false) {
  if (!icon && !tone)
    // A timeline keeps every event on the rail, so an event without a marker gets a plain node.
    return timeline ? <span className="fa-activity-icon" aria-hidden="true"><span className="fa-activity-node" /></span> : null;
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

/** What the rail measures its gap from: a status dot, a node, or an icon or avatar. */
function markerKind({ icon, tone }: ActivityItem) {
  return icon ? "icon" : tone ? "dot" : "node";
}

/** In a timeline or inline, the time sits in a box that reserves its width and holds the separator. */
function Time({ at, layout }: { at: ActivityItem["at"]; layout: Layout }) {
  if (!layout.timeline && !layout.inline) return <RelativeTime value={at} />;
  return (
    <span className="fa-activity-time">
      <RelativeTime value={at} />
    </span>
  );
}

/**
 * The event's line: its content and time. A plain feed row keeps them as the row's own children,
 * as it always has; otherwise they share one line box that the marker centres on and that names
 * an option with a detail.
 */
function Line({ item, layout, id }: { item: ActivityItem; layout: Layout; id?: string }) {
  if (!layout.timeline && !layout.inline && !hasDetail(item))
    return (
      <>
        <span className="fa-activity-content">{item.content}</span>
        <RelativeTime value={item.at} />
      </>
    );
  return (
    <span className="fa-activity-line" id={id} data-placement={layout.inline ? "inline" : "end"}>
      <span className="fa-activity-content">{item.content}</span>
      {/* A real space: the sentence and its time never run together, read aloud or wrapped. */}
      {layout.inline ? " " : null}
      <Time at={item.at} layout={layout} />
    </span>
  );
}

const hasDetail = (item: ActivityItem) => item.detail !== undefined && item.detail !== null && item.detail !== false;

function Detail({ item, layout, id }: { item: ActivityItem; layout: Layout; id?: string }) {
  if (!hasDetail(item)) return null;
  if (layout.detailSurface === "none")
    return (
      <div className="fa-activity-detail" id={id}>
        {item.detail}
      </div>
    );
  return (
    <Surface material={layout.detailSurface} radius="tile" padding="tile" className="fa-activity-detail" id={id}>
      {item.detail}
    </Surface>
  );
}

function PlainFeed({
  items,
  layout,
  ...rest
}: Pick<ActivityFeedProps, "items"> & { layout: Layout } & Omit<ComponentProps<"ol">, "children">) {
  return (
    <ol {...rest}>
      {items.map((item) => (
        <li key={item.id} data-marker={layout.timeline ? markerKind(item) : undefined}>
          {marker(item, layout.timeline)}
          <Line item={item} layout={layout} />
          <Detail item={item} layout={layout} />
          {item.children?.length ? <PlainFeed items={item.children} layout={layout} className="fa-activity-branch" /> : null}
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
  layout,
  selectedId,
  defaultSelectedId,
  onSelectedIdChange,
  onKeyDown,
  ...rest
}: Omit<ActivityFeedProps, "empty" | "variant" | "order" | "timePlacement" | "detailSurface"> & { layout: Layout }) {
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
    // A detail is inside the option, so the option takes its name from the line alone and is
    // described by the detail; otherwise a long post would become the option's name.
    const detail = hasDetail(item);
    const id = elementId(index);
    return (
      // Keys are handled once on the list (roving focus), as Tree does.
      // oxlint-disable-next-line jsx-a11y/click-events-have-key-events
      <div
        id={id}
        role="option"
        aria-selected={isSelected}
        aria-labelledby={detail ? `${id}-line` : undefined}
        aria-describedby={detail ? `${id}-detail` : undefined}
        data-selected={isSelected ? "" : undefined}
        tabIndex={item.id === stop ? 0 : -1}
        className="fa-item fa-activity-row"
        onFocus={() => setFocused(item.id)}
        onClick={(event: MouseEvent) => select(item.id, { reason: "item-press", event: event.nativeEvent, item })}
      >
        {marker(item, layout.timeline)}
        <Line item={item} layout={layout} id={detail ? `${id}-line` : undefined} />
        <Detail item={item} layout={layout} id={detail ? `${id}-detail` : undefined} />
      </div>
    );
  };

  return (
    <ol {...rest} ref={listRef} role="listbox" data-selectable="" onKeyDown={onListKey}>
      {items.map((item) => (
        <li key={item.id} role="none" data-marker={layout.timeline ? markerKind(item) : undefined}>
          {row(item)}
          {item.children?.length ? (
            <ol role="group" aria-labelledby={elementId(flat.indexOf(item))} className="fa-activity-branch">
              {item.children.map((child) => (
                <li key={child.id} role="none" data-marker={layout.timeline ? markerKind(child) : undefined}>
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

/** A stable sort by time; times that do not parse go last, in their given order. */
function sortByTime<T extends Pick<ActivityItem, "at">>(items: readonly T[], order: Exclude<ActivityOrder, "given">): T[] {
  const sign = order === "newest" ? -1 : 1;
  return items
    .map((item, index) => ({ item, index, time: toTime(item.at) }))
    .sort((a, b) => {
      const known = Number.isFinite(a.time), other = Number.isFinite(b.time);
      if (known !== other) return known ? -1 : 1;
      return (known && a.time !== b.time ? (a.time - b.time) * sign : 0) || a.index - b.index;
    })
    .map(({ item }) => item);
}

/** Puts events in the feed's order; branches stay under their parent, sorted among themselves. */
function orderActivity(items: readonly ActivityItem[], order: ActivityOrder = "given"): readonly ActivityItem[] {
  if (order === "given") return items;
  return sortByTime(items, order).map((item) =>
    item.children?.length ? { ...item, children: sortByTime(item.children, order) } : item
  );
}

/**
 * An activity or notification feed using shared relative times and accessible absolute tooltips.
 *
 * As a timeline, such as a version history or a ticket's history, `variant="timeline"` joins the
 * markers with a rail; items take a `tone` for the marker, a `detail` under their line and
 * `children` for one level of branches. Selection makes it a listbox with one tab stop (R11.5):
 * ↑ ↓ Home End move, and a click, Enter or Space selects. Selection does not follow focus,
 * so moving through a long history loads nothing. A plain feed stays an ordinary list.
 */
export function ActivityFeed({
  items: given,
  empty: emptyProp,
  className,
  selectedId,
  defaultSelectedId,
  onSelectedIdChange,
  variant = "feed",
  order = "given",
  timePlacement = "end",
  detailSurface = "inset",
  ...rest
}: ActivityFeedProps) {
  const messages = useMessages(activityFeedMessages)
  const empty = emptyProp ?? messages.noActivity
  const selectable = selectedId !== undefined || defaultSelectedId !== undefined || onSelectedIdChange !== undefined;
  const items = useMemo(() => orderActivity(given, order), [given, order]);
  const timeline = variant === "timeline";
  const inline = timePlacement === "inline";
  const layout = useMemo<Layout>(
    () => (!timeline && !inline && detailSurface === "inset" ? FEED : { timeline, inline, detailSurface }),
    [timeline, inline, detailSurface]
  );
  const variantAttribute = timeline ? "timeline" : undefined;

  if (items.length && selectable)
    return (
      <SelectableFeed
        {...rest}
        data-variant={variantAttribute}
        className={cx("fa-activity-feed", className)}
        items={items}
        layout={layout}
        selectedId={selectedId}
        defaultSelectedId={defaultSelectedId}
        onSelectedIdChange={onSelectedIdChange}
      />
    );
  if (items.length)
    return <PlainFeed {...rest} data-variant={variantAttribute} className={cx("fa-activity-feed", className)} items={items} layout={layout} />;
  return (
    <ol {...rest} className={cx("fa-activity-feed", className)}>
      <li>
        <EmptyState icon={null}>{empty}</EmptyState>
      </li>
    </ol>
  );
}
