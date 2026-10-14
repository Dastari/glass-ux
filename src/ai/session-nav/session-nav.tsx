import { useMemo, useRef, useState } from "react"
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
} from "../../icons/generated/icons.js"
import { defineActions } from "../../lib/actions/actions.js"
import { cx } from "../../lib/cx.js"
import { ActionContextMenu, ActionMenu } from "../../ui/actions/index.js"
import { CountBadge } from "../../ui/badge/index.js"
import { Button } from "../../ui/button/index.js"
import { EmptyState } from "../../ui/empty-state/index.js"
import { Input, SearchField } from "../../ui/input/index.js"
import { Skeleton } from "../../ui/skeleton/index.js"
import { formatAbsolute, formatRelative, useNow } from "../format.js"
import type { AiProject, AiSession } from "../types.js"

const DAY = 86_400_000

/** Today · Yesterday · This week · Earlier, by last activity. */
function bucket(time: number, now: number) {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  const today = start.getTime()
  if (time >= today) return "Today"
  if (time >= today - DAY) return "Yesterday"
  if (time >= today - 6 * DAY) return "This week"
  return "Earlier"
}

/** Words that do not make a client code ("Council of the Arts" → "CA"). */
const MINOR = new Set(["of", "the", "and", "for", "&", "at", "on"])

/**
 * Fallback only: a compact client code derived from an organisation's name, for rows whose
 * organisation has no staff-set short code yet ( supplies `code`).
 * "Northstar Studio" → "NST", "Cedar Vale Collective" → "CDV",
 * "Orbit Workspace" → "FA". At most four letters; a one-word name keeps its first three.
 */
export function organisationCode(name: string) {
  const words = name.split(/[\s·,.-]+/).filter((word) => word && !MINOR.has(word.toLowerCase()))
  if (words.length === 1) return words[0]!.slice(0, 3).toUpperCase()
  return words
    .slice(0, 4)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
}

const ACTIVITY_WORDS = {
  working: "Working",
  prompt: "Waiting for you",
  error: "Run failed",
  done: "Answered",
  idle: "",
} as const

export type SessionView = "conversations" | "archived"

export interface SessionNavProps {
  /** Conversations or sessions shown in the navigation. */
  sessions: AiSession[]
  /** Projects offered by the host. */
  projects?: AiProject[]
  /** Stable identifier of the active item. */
  activeId?: string
  /** Currently selected presentation view. */
  view?: SessionView
  /** Called when view change occurs. The callback type specifies its arguments. */
  onViewChange?: (view: SessionView) => void
  /** Counts grouped by category or status. */
  counts?: { conversations: number; archived: number }
  /** Shows loading feedback in the space reserved for the content. */
  loading?: boolean
  /** Called when new chat occurs. The callback type specifies its arguments. */
  onNewChat?: () => void
  /** Called when select occurs. The callback type specifies its arguments. */
  onSelect?: (session: AiSession) => void
  /** Called when rename occurs. The callback type specifies its arguments. */
  onRename?: (session: AiSession, title: string) => void
  /** Called when archive occurs. The callback type specifies its arguments. */
  onArchive?: (session: AiSession) => void
  /** Called when restore occurs. The callback type specifies its arguments. */
  onRestore?: (session: AiSession) => void
  /** Called when delete occurs. The callback type specifies its arguments. */
  onDelete?: (session: AiSession) => Promise<void> | void
  /** Called when open window occurs. The callback type specifies its arguments. */
  onOpenWindow?: (session: AiSession) => void
  /** Called when select project occurs. The callback type specifies its arguments. */
  onSelectProject?: (project: AiProject) => void
  /** Called when open settings occurs. The callback type specifies its arguments. */
  onOpenSettings?: () => void
  /** Start with this search (templates, deep links). */
  initialQuery?: string
  className?: string
}

/**
 * Whose chat it is (R6.9): the organisation's short code as a quiet chip, "All" for a
 * cross-client chat. The code is the staff-set one (`code`); deriving it from the name
 * is the fallback while none is set. The full name is in the tooltip and the row's
 * accessible name.
 * TODO(identity agent a11aac435e6d1b420): swap for the shared organisation identity chip
 * (EntityIdentity, organisation kind, "chip" tier) once it exists.
 */
function SessionOrganisation({ organisation }: { organisation: AiSession["organisation"] }) {
  if (organisation === undefined) return null
  const name = organisation ? organisation.label : "All organisations"
  return (
    <span className="fa-ai-session-org" title={name} aria-hidden data-all={organisation ? undefined : ""}>
      {organisation ? (organisation.code ?? organisationCode(organisation.label)) : "All"}
    </span>
  )
}

/** The session row's state at the trailing edge: spinner, a toned dot, or the time. */
function SessionState({ session, now }: { session: AiSession; now: number }) {
  if (session.activity === "working") {
    return (
      <span className="fa-ai-session-state" data-activity="working" role="img" aria-label="Working">
        <IconSpinner />
      </span>
    )
  }
  return (
    <span className="fa-ai-session-trail">
      {session.activity === "prompt" || session.activity === "error" || session.unread ? (
        <span
          className="fa-ai-session-dot"
          data-activity={session.activity === "prompt" || session.activity === "error" ? session.activity : "unread"}
          role="img"
          aria-label={session.activity === "prompt" ? "Waiting for you" : session.activity === "error" ? "Run failed" : "Unread"}
        />
      ) : null}
      <time dateTime={new Date(session.lastActivityAt).toISOString()} title={formatAbsolute(session.lastActivityAt)} data-numeric suppressHydrationWarning>
        {formatRelative(session.lastActivityAt, now).replace(" ago", "")}
      </time>
    </span>
  )
}

function RenameField({ session, onDone }: { session: AiSession; onDone: (title: string | null) => void }) {
  const [value, setValue] = useState(session.title)
  const done = useRef(false)
  const finish = (title: string | null) => {
    if (done.current) return
    done.current = true
    onDone(title)
  }
  return (
    <Input
      size="sm"
      autoFocus
      value={value}
      aria-label="Conversation title"
      onValueChange={setValue}
      onFocus={(event) => event.currentTarget.select()}
      onBlur={() => finish(value.trim() && value.trim() !== session.title ? value.trim() : null)}
      onKeyDown={(event) => {
        if (event.key === "Enter") finish(value.trim() && value.trim() !== session.title ? value.trim() : null)
        if (event.key === "Escape") finish(null)
      }}
      className="fa-ai-session-rename"
    />
  )
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
  activeId,
  view = "conversations",
  onViewChange,
  counts,
  loading = false,
  onNewChat,
  onSelect,
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
  const now = useNow(true, 60_000)
  const [query, setQuery] = useState(initialQuery)
  const [renaming, setRenaming] = useState<string | null>(null)

  const actions = useMemo(
    () =>
      defineActions<AiSession>("ai-session", [
        { id: "open-window", label: "Open in window", icon: IconPopOut, group: "open", visible: () => Boolean(onOpenWindow), run: ([session]) => onOpenWindow?.(session!) },
        { id: "rename", label: "Rename", icon: IconEdit, group: "organise", shortcut: "f2", visible: () => Boolean(onRename), run: ([session]) => setRenaming(session!.id) },
        {
          id: "archive",
          label: "Archive",
          icon: IconArchive,
          group: "organise",
          visible: ([session]) => Boolean(onArchive) && !session!.archived,
          run: ([session]) => onArchive?.(session!),
          successMessage: ([session]) => `Archived "${session!.title}"`,
        },
        {
          id: "restore",
          label: "Restore",
          icon: IconRestore,
          group: "organise",
          visible: ([session]) => Boolean(onRestore) && Boolean(session!.archived),
          run: ([session]) => onRestore?.(session!),
          successMessage: ([session]) => `Restored "${session!.title}"`,
        },
        {
          id: "delete",
          label: "Delete",
          icon: IconTrash,
          group: "danger",
          visible: () => Boolean(onDelete),
          disabledReason: ([session]) => (session!.activity === "working" ? "Stop the running response first" : null),
          confirm: ([session]) => ({
            title: `Delete "${session!.title}"?`,
            body: "The conversation, its files and its history are removed. This cannot be undone.",
            confirmLabel: "Delete conversation",
            tone: "danger",
          }),
          run: ([session]) => onDelete?.(session!),
          successMessage: ([session]) => `Deleted "${session!.title}"`,
        },
      ]),
    [onOpenWindow, onRename, onArchive, onRestore, onDelete]
  )

  const shown = sessions.filter((session) => (view === "archived" ? session.archived : !session.archived) && (!query.trim() || session.title.toLowerCase().includes(query.trim().toLowerCase())))
  const groups = new Map<string, AiSession[]>()
  for (const session of shown.toSorted((a, b) => b.lastActivityAt - a.lastActivityAt)) {
    const label = bucket(session.lastActivityAt, now)
    groups.set(label, [...(groups.get(label) ?? []), session])
  }

  const row = (session: AiSession) => {
    const active = session.id === activeId
    if (renaming === session.id) {
      return (
        <li key={session.id} className="fa-ai-session" data-renaming="">
          <RenameField
            session={session}
            onDone={(title) => {
              setRenaming(null)
              if (title) onRename?.(session, title)
            }}
          />
        </li>
      )
    }
    const status = ACTIVITY_WORDS[session.activity]
    return (
      <li key={session.id} className="fa-ai-session" data-active={active ? "" : undefined}>
        <ActionContextMenu set={actions} targets={[session]} label={session.title}>
          <button
            type="button"
            className="fa-item fa-ai-session-row"
            aria-current={active ? "page" : undefined}
            aria-label={`${session.title}${session.organisation !== undefined ? `, ${session.organisation ? session.organisation.label : "all organisations"}` : ""}${status ? `, ${status.toLowerCase()}` : ""}${session.unread ? ", unread" : ""}`}
            data-unread={session.unread ? "" : undefined}
            onClick={() => onSelect?.(session)}
            onKeyDown={(event) => {
              if (event.key === "F2" && onRename) {
                event.preventDefault()
                setRenaming(session.id)
              }
            }}
          >
            <span className="fa-item-label fa-ai-session-title">{session.title}</span>
            <SessionOrganisation organisation={session.organisation} />
            <SessionState session={session} now={now} />
          </button>
        </ActionContextMenu>
        <span className="fa-ai-session-menu">
          <ActionMenu set={actions} targets={[session]} label={session.title} />
        </span>
      </li>
    )
  }

  return (
    <div className={cx("fa-ai-sessions", className)}>
      <div className="fa-ai-sessions-top">
        {onNewChat ? (
          <Button variant="primary" block icon={<IconNewChat />} shortcut="mod+shift+o" tooltip={false} onClick={onNewChat}>
            New chat
          </Button>
        ) : null}
        <SearchField size="sm" placeholder="Search conversations" value={query} onValueChange={setQuery} aria-label="Search conversations" />
      </div>
      <div className="fa-ai-sessions-scroll" data-scroll-container>
        <ul className="fa-ai-sessions-views" aria-label="Views">
          <li>
            <button type="button" className="fa-item" aria-current={view === "conversations" ? "page" : undefined} onClick={() => onViewChange?.("conversations")}>
              <IconHistory />
              <span className="fa-item-label">Conversation history</span>
              {counts ? <CountBadge value={counts.conversations} /> : null}
            </button>
          </li>
          <li>
            <button type="button" className="fa-item" aria-current={view === "archived" ? "page" : undefined} onClick={() => onViewChange?.("archived")}>
              <IconArchive />
              <span className="fa-item-label">Archived chats</span>
              {counts ? <CountBadge value={counts.archived} /> : null}
            </button>
          </li>
        </ul>

        {projects.length ? (
          <section className="fa-ai-sessions-group" aria-label="Projects">
            <h3 className="fa-overline fa-ai-sessions-label">Projects</h3>
            <ul>
              {projects.map((project) => (
                <li key={project.id}>
                  <button type="button" className="fa-item" onClick={() => onSelectProject?.(project)}>
                    <IconFolder />
                    <span className="fa-item-label">{project.name}</span>
                    <span className="fa-item-trail">{project.count}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {loading ? (
          <SessionNavSkeleton />
        ) : groups.size === 0 ? (
          <div className="fa-ai-sessions-empty">
            <EmptyState icon={query ? <IconSearch /> : view === "archived" ? <IconArchive /> : <IconChat />}>
              {query ? `No conversations match "${query}"` : view === "archived" ? "No archived conversations" : "No conversations yet"}
            </EmptyState>
          </div>
        ) : (
          [...groups].map(([label, items]) => (
            <section key={label} className="fa-ai-sessions-group" aria-label={label}>
              <h3 className="fa-overline fa-ai-sessions-label">{label}</h3>
              <ul>{items.map(row)}</ul>
            </section>
          ))
        )}
      </div>
      {onOpenSettings ? (
        <div className="fa-ai-sessions-foot">
          <button type="button" className="fa-item" onClick={onOpenSettings}>
            <IconSettings />
            <span className="fa-item-label">AI settings</span>
          </button>
        </div>
      ) : null}
    </div>
  )
}

/** The session list's loading rows: overline and title rows in their final box. */
export function SessionNavSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="fa-ai-sessions-group" aria-hidden>
      <span className="fa-ai-sessions-label">
        <Skeleton.Text type="overline" width="30%" />
      </span>
      <ul>
        {Array.from({ length: rows }, (_, index) => (
          <li key={index} className="fa-ai-session">
            <span className="fa-item fa-ai-session-row">
              <Skeleton.Text type="body" width={`${50 + ((index * 19) % 40)}%`} />
              <Skeleton.Text type="caption" width="var(--space-8)" className="fa-ai-session-skel-time" />
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
