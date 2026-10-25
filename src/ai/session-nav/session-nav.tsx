import { useLocale } from "../../lib/locale/use-locale.js"
import { useMessages } from "../../lib/i18n/index.js"
import { sessionNavMessages } from "./messages.js"
import { useMemo, useRef, useState } from "react";
import {
  IconArchive,
  IconChat,
  IconEdit,
  IconFolder,
  IconHistory,
  IconNewChat,
  IconPopOut,
  IconRestore,
  IconSearch,
  IconSettings,
  IconSpinner,
  IconTrash,
} from "../../icons/generated/icons.js";
import { defineActions } from "../../lib/actions/actions.js";
import { cx } from "../../lib/cx.js";
import {
  useSelectedId,
  type SelectionChangeDetails,
} from "../../lib/use-selected-id.js";
import { contextCode } from "../../shell/context-switcher/model.js";
import { ActionContextMenu, ActionMenu } from "../../ui/actions/index.js";
import { CountBadge } from "../../ui/badge/index.js";
import { Button } from "../../ui/button/index.js";
import { RelativeTime } from "../../ui/data-table/cells/relative-time.js";
import { EmptyState } from "../../ui/empty-state/index.js";
import { Input, SearchField } from "../../ui/input/index.js";
import { ListRow } from "../../ui/list-row/index.js";
import { Skeleton } from "../../ui/skeleton/index.js";
import { ToneDot } from "../../ui/tone-dot/index.js";
import { Tooltip } from "../../ui/tooltip/index.js";
import { useNow } from "../format.js";
import type { AiProject, AiSession } from "../types.js";

const DAY = 86_400_000;

/** Today · Yesterday · This week · Earlier, by last activity. */
function bucket(time: number, now: number, messages: typeof sessionNavMessages.defaults) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const today = start.getTime();
  if (time >= today) return messages.today;
  if (time >= today - DAY) return messages.yesterday;
  if (time >= today - 6 * DAY) return messages.thisWeek;
  return messages.earlier;
}

/** Words that do not make a client code ("Council of the Arts" → "CA"). */
/** The same fallback short code as the shell organisation switcher. */
export function organisationCode(name: string) {
  return contextCode({ name });
}

function getACTIVITY_WORDS(messages: typeof sessionNavMessages.defaults) { return {
  working: messages.working,
  prompt: messages.waitingForYou,
  error: messages.runFailed,
  done: messages.answered,
  idle: "",
} as const }


export type SessionView = "conversations" | "archived";

export interface SessionNavProps {
  /** Conversations or sessions shown in the navigation. */
  sessions: AiSession[];
  /** Projects offered by the host. */
  projects?: AiProject[];
  /** The current session's id, or null for none; its row is marked current. Controlled while defined; leave it undefined to use `defaultSelectedId`. */
  selectedId?: string | null;
  /** The session current at first when the selection is uncontrolled. */
  defaultSelectedId?: string | null;
  /** Currently selected presentation view. */
  view?: SessionView;
  /** Called with `conversations` or `archived` when the person picks Conversation history or Archived chats. Pair with `view` to switch the list. */
  onViewChange?: (view: SessionView) => void;
  /** Counts grouped by category or status. */
  counts?: { conversations: number; archived: number };
  /** Shows loading feedback in the space reserved for the content. */
  loading?: boolean;
  /** Called from New chat; the button is shown only when this is supplied. */
  onNewChat?: () => void;
  /**
   * Called with the id of the session whose row is clicked or activated with Enter, and
   * details whose `item` is the session; not called for the session already current.
   */
  onSelectedIdChange?: (
    id: string | null,
    details: SelectionChangeDetails<AiSession>,
  ) => void;
  /** Called with the session and its new trimmed title when an inline rename (Rename or F2) is committed with Enter or blur; not called when the title is empty, unchanged or the edit is cancelled with Esc. Supplying it enables renaming. */
  onRename?: (session: AiSession, title: string) => void;
  /** Called with the session from its Archive action, offered for sessions that are not archived. */
  onArchive?: (session: AiSession) => void;
  /** Called with the session from its Restore action, offered for archived sessions. */
  onRestore?: (session: AiSession) => void;
  /** Called with the session after the person confirms Delete; unavailable while its response is working. A returned promise keeps the action pending until it settles. */
  onDelete?: (session: AiSession) => Promise<void> | void;
  /** Called with the session from its Open in window action; the action is shown only when this is supplied. */
  onOpenWindow?: (session: AiSession) => void;
  /** Called with the project whose row is pressed in the Projects group. */
  onSelectProject?: (project: AiProject) => void;
  /** Called from the AI settings row at the foot of the list; the row is shown only when this is supplied. */
  onOpenSettings?: () => void;
  /** Start with this search (templates, deep links). */
  initialQuery?: string;
  className?: string;
}

/**
 * Whose chat it is (R6.9): the organisation's short code as a quiet chip, "All" for a
 * cross-client chat. The code is the staff-set one (`code`); deriving it from the name
 * is the fallback while none is set. The full name is in the tooltip and the row's
 * accessible name.
 */
function SessionOrganisation({
  organisation,
}: {
  organisation: AiSession["organisation"];
}) {
  const messages = useMessages(sessionNavMessages)
  const locale = useLocale()

  if (organisation === undefined) return null;
  const name = organisation ? organisation.label : messages.allOrganisations;
  return (
    <Tooltip content={name}>
      <span
        className="fa-ai-session-org"
        data-all={organisation ? undefined : ""}
      >
        {organisation
          ? (organisation.code ?? organisationCode(organisation.label))
          : messages.all}
      </span>
    </Tooltip>
  );
}

/** The session row's state at the trailing edge: spinner, a toned dot, or the time. */
function SessionState({ session }: { session: AiSession }) {
  const messages = useMessages(sessionNavMessages)
  const locale = useLocale()

  if (session.activity === "working") {
    return (
      <span
        className="fa-ai-session-state"
        data-activity="working"
        role="img"
        aria-label={messages.working}
      >
        <IconSpinner />
      </span>
    );
  }
  return (
    <span className="fa-ai-session-trail">
      {session.activity === "prompt" ||
      session.activity === "error" ||
      session.unread ? (
        <ToneDot
          tone={
            session.activity === "error"
              ? "danger"
              : session.activity === "prompt"
                ? "warning"
                : "accent"
          }
          label={
            session.activity === "prompt"
              ? messages.waitingForYou
              : session.activity === "error"
                ? messages.runFailed
                : messages.unread
          }
        />
      ) : null}
      <RelativeTime value={session.lastActivityAt} />
    </span>
  );
}

function RenameField({
  session,
  onDone,
}: {
  session: AiSession;
  /** Called once with the new trimmed title, or `null` when the edit is cancelled with Esc or the title is empty or unchanged. */
  onDone: (title: string | null) => void;
}) {
  const messages = useMessages(sessionNavMessages)
  const locale = useLocale()

  const [value, setValue] = useState(session.title);
  const done = useRef(false);
  const finish = (title: string | null) => {
    if (done.current) return;
    done.current = true;
    onDone(title);
  };
  return (
    <Input
      size="sm"
      autoFocus
      value={value}
      aria-label={messages.conversationTitle}
      onValueChange={setValue}
      onFocus={(event) => event.currentTarget.select()}
      onBlur={() =>
        finish(
          value.trim() && value.trim() !== session.title ? value.trim() : null,
        )
      }
      onKeyDown={(event) => {
        if (event.key === "Enter")
          finish(
            value.trim() && value.trim() !== session.title
              ? value.trim()
              : null,
          );
        if (event.key === "Escape") finish(null);
      }}
      className="fa-ai-session-rename"
    />
  );
}

/**
 * The Assistant section drawer's content: New chat, search, the two views (conversations,
 * archived) with counts, projects, and the sessions grouped by day. Each row shows its
 * title, whose chat it is (the organisation's code, or All: history is never filtered by the
 * organisation switcher, R6.9), last activity, and what it needs — a spinner while working,
 * a warning dot when it waits for you (approval), a danger dot after a failed run, an accent
 * dot when unread. The title truncates first. Rows carry the session actions (R12): the ⋯
 * menu and right-click read one definition. The drawer decides the width (any width from its
 * narrowest up); the content never widens it.
 */
export function SessionNav({
  sessions,
  projects = [],
  selectedId: selectedIdProp,
  defaultSelectedId,
  view = "conversations",
  onViewChange,
  counts,
  loading = false,
  onNewChat,
  onSelectedIdChange,
  onRename,
  onArchive,
  onRestore,
  onDelete,
  onOpenWindow,
  onSelectProject,
  onOpenSettings,
  initialQuery = "",
  className,
}: SessionNavProps) {
  const messages = useMessages(sessionNavMessages)
  const locale = useLocale()

  const now = useNow(true, 60_000);
  const [query, setQuery] = useState(initialQuery);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [selectedId, select] = useSelectedId(
    selectedIdProp,
    defaultSelectedId,
    onSelectedIdChange,
  );

  const actions = useMemo(
    () =>
      defineActions<AiSession>("ai-session", [
        {
          id: "open-window",
          label: messages.openInWindow,
          icon: IconPopOut,
          group: "open",
          visible: () => Boolean(onOpenWindow),
          run: ([session]) => onOpenWindow?.(session!),
        },
        {
          id: "rename",
          label: messages.rename,
          icon: IconEdit,
          group: "organise",
          shortcut: "f2",
          visible: () => Boolean(onRename),
          run: ([session]) => setRenaming(session!.id),
        },
        {
          id: "archive",
          label: messages.archive,
          icon: IconArchive,
          group: "organise",
          visible: ([session]) => Boolean(onArchive) && !session!.archived,
          run: ([session]) => onArchive?.(session!),
          successMessage: ([session]) => messages.archived(session!.title),
        },
        {
          id: "restore",
          label: messages.restore,
          icon: IconRestore,
          group: "organise",
          visible: ([session]) =>
            Boolean(onRestore) && Boolean(session!.archived),
          run: ([session]) => onRestore?.(session!),
          successMessage: ([session]) => messages.restored(session!.title),
        },
        {
          id: "delete",
          label: messages.deleteAction,
          icon: IconTrash,
          group: "danger",
          visible: () => Boolean(onDelete),
          disabledReason: ([session]) =>
            session!.activity === "working"
              ? messages.stopTheRunningResponseFirst
              : null,
          confirm: ([session]) => ({
            title: messages.delete(session!.title),
            body: messages.deleteDescription,
            confirmLabel: messages.deleteConversation,
            tone: "danger",
          }),
          run: ([session]) => onDelete?.(session!),
          successMessage: ([session]) => messages.deleted(session!.title),
        },
      ]),
    [onOpenWindow, onRename, onArchive, onRestore, onDelete],
  );

  const shown = sessions.filter(
    (session) =>
      (view === "archived" ? session.archived : !session.archived) &&
      (!query.trim() ||
        session.title.toLowerCase().includes(query.trim().toLowerCase())),
  );
  const groups = new Map<string, AiSession[]>();
  for (const session of shown.toSorted(
    (a, b) => b.lastActivityAt - a.lastActivityAt,
  )) {
    const label = bucket(session.lastActivityAt, now, messages);
    groups.set(label, [...(groups.get(label) ?? []), session]);
  }

  const row = (session: AiSession) => {
    const active = session.id === selectedId;
    if (renaming === session.id) {
      return (
        <li key={session.id} className="fa-ai-session" data-renaming="">
          <RenameField
            session={session}
            onDone={(title) => {
              setRenaming(null);
              if (title) onRename?.(session, title);
            }}
          />
        </li>
      );
    }
    const status = getACTIVITY_WORDS(messages)[session.activity];
    return (
      <li
        key={session.id}
        className="fa-ai-session"
        data-active={active ? "" : undefined}
      >
        <ActionContextMenu
          set={actions}
          targets={[session]}
          label={session.title}
        >
          <ListRow
            title={<span className="fa-ai-session-title">{session.title}</span>}
            trailing={
              <>
                <SessionOrganisation organisation={session.organisation} />
                <SessionState session={session} />
              </>
            }
            selected={active}
            className="fa-ai-session-row"
            aria-current={active ? "page" : undefined}
            aria-label={(session.unread ? messages.unreadLabel : (label: string) => label)(new Intl.ListFormat(locale, { type: "unit" }).format([session.title, session.organisation !== undefined ? session.organisation ? session.organisation.label : messages.allScopes : "", status?.toLowerCase() ?? ""].filter(Boolean)))}
            data-unread={session.unread ? "" : undefined}
            onClick={(event) =>
              select(session.id, {
                reason: "item-press",
                event: event.nativeEvent,
                item: session,
              })
            }
            onKeyDown={(event) => {
              if (event.key === "F2" && onRename) {
                event.preventDefault();
                setRenaming(session.id);
              }
            }}
          />
        </ActionContextMenu>
        <span className="fa-ai-session-menu">
          <ActionMenu set={actions} targets={[session]} label={session.title} />
        </span>
      </li>
    );
  };

  return (
    <div className={cx("fa-ai-sessions", className)}>
      <div className="fa-ai-sessions-top">
        {onNewChat ? (
          <Button
            variant="primary"
            block
            icon={<IconNewChat />}
            shortcut="mod+shift+o"
            tooltip={false}
            onClick={onNewChat}
          >
            {messages.newChat} </Button>
        ) : null}
        <SearchField
          size="sm"
          placeholder={messages.searchConversations}
          value={query}
          onValueChange={setQuery}
          aria-label={messages.searchConversations}
        />
      </div>
      <div className="fa-ai-sessions-scroll" data-scroll-container>
        <ul className="fa-ai-sessions-views" aria-label={messages.views}>
          <li>
            <ListRow
              title={messages.conversationHistory}
              icon={<IconHistory />}
              aria-current={view === "conversations" ? "page" : undefined}
              onClick={() => onViewChange?.("conversations")}
              trailing={
                counts ? <CountBadge value={counts.conversations} /> : undefined
              }
            />
          </li>
          <li>
            <ListRow
              title={messages.archivedChats}
              icon={<IconArchive />}
              aria-current={view === "archived" ? "page" : undefined}
              onClick={() => onViewChange?.("archived")}
              trailing={
                counts ? <CountBadge value={counts.archived} /> : undefined
              }
            />
          </li>
        </ul>

        {projects.length ? (
          <section className="fa-ai-sessions-group" aria-label={messages.projects}>
            <h3 className="fa-overline fa-ai-sessions-label">{messages.projects}</h3>
            <ul>
              {projects.map((project) => (
                <li key={project.id}>
                  <ListRow
                    title={project.name}
                    icon={<IconFolder />}
                    onClick={() => onSelectProject?.(project)}
                    trailing={<CountBadge value={project.count} />}
                  />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {loading ? (
          <SessionNavSkeleton />
        ) : groups.size === 0 ? (
          <div className="fa-ai-sessions-empty">
            <EmptyState
              icon={
                query ? (
                  <IconSearch />
                ) : view === "archived" ? (
                  <IconArchive />
                ) : (
                  <IconChat />
                )
              }
            >
              {query
                ? messages.noConversationsMatch(query)
                : view === "archived"
                  ? messages.noArchivedConversations
                  : messages.noConversationsYet}
            </EmptyState>
          </div>
        ) : (
          [...groups].map(([label, items]) => (
            <section
              key={label}
              className="fa-ai-sessions-group"
              aria-label={label}
            >
              <h3 className="fa-overline fa-ai-sessions-label">{label}</h3>
              <ul>{items.map(row)}</ul>
            </section>
          ))
        )}
      </div>
      {onOpenSettings ? (
        <div className="fa-ai-sessions-foot">
          <ListRow
            title={messages.aiSettings}
            icon={<IconSettings />}
            onClick={onOpenSettings}
          />
        </div>
      ) : null}
    </div>
  );
}

/** The session list's loading rows: overline and title rows in their final box. */
export function SessionNavSkeleton({ rows = 6 }: {
  /** Number of placeholder title rows. Defaults to 6. */
  rows?: number;
}) {
  return (
    <div className="fa-ai-sessions-group" aria-hidden>
      <span className="fa-ai-sessions-label">
        <Skeleton.Text type="overline" width="30%" />
      </span>
      <ul>
        {Array.from({ length: rows }, (_, index) => (
          <li key={index} className="fa-ai-session">
            <span className="fa-item fa-ai-session-row">
              <Skeleton.Text
                type="body"
                width={`${50 + ((index * 19) % 40)}%`}
              />
              <Skeleton.Text
                type="caption"
                width="var(--space-8)"
                className="fa-ai-session-skel-time"
              />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
