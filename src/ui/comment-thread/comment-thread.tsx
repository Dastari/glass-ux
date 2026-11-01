import { useEffect, useId, useRef, useState, type ReactNode } from "react"
import { useAnnounce } from "../../hooks/use-announce.js"
import { IconCheck, IconChat, IconError } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { useMessages } from "../../lib/i18n/index.js"
import { useLocale } from "../../lib/locale/use-locale.js"
import { useControllable } from "../../lib/use-controllable.js"
import { useHeldRows } from "../../lib/use-held-rows.js"
import { AlertDialog } from "../alert-dialog/index.js"
import { Avatar } from "../avatar/index.js"
import { Badge } from "../badge/index.js"
import { Button } from "../button/index.js"
import { EmptyState } from "../empty-state/index.js"
import { Link } from "../link/index.js"
import type { Reaction } from "../reaction-bar/index.js"
import { ScrollArea } from "../scroll-area/index.js"
import { Skeleton } from "../skeleton/index.js"
import { CommentRow } from "./comment-row.js"
import { Composer } from "./composer.js"
import { commentThreadMessages } from "./messages.js"
import type { CommentAbilities, CommentDraft, CommentEntry, CommentThreadProps } from "./types.js"

interface Outgoing {
  id: string
  draft: CommentDraft
  at: number
  status: "pending" | "failed"
}

const reasonOf = (capability: boolean | string | undefined) => (typeof capability === "string" ? capability : undefined)
const NONE: CommentAbilities = {}

function CommentSkeleton() {
  return (
    <div className="fa-comment-list" aria-hidden>
      {[0, 1, 2].map((index) => (
        <div key={index} className="fa-comment">
          <Skeleton.Circle className="fa-comment-avatar" size="var(--avatar-sm, 2rem)" />
          <div className="fa-comment-head">
            <Skeleton.Text type="label" width="40%" />
          </div>
          <div className="fa-comment-body">
            <Skeleton.Text type="body" lines={2} width={`${70 - index * 15}%`} />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Comments and one level of replies with a RichTextInput composer. Bodies are Markdown, and
 * mentions are the composer's. The thread holds no policy: `permissions` says what exists, a
 * string keeps a control disabled with that reason, and the host saves through its callbacks.
 *
 * A send shows at once, as pending, in the place it will keep; a failure stays there with Retry
 * and Discard. New comments from others wait behind a count, so the composer does not move
 * (R17.3). A resolved thread folds behind a button and has no composer. Times tick outside live
 * regions; outcomes are announced politely.
 */
export function CommentThread({
  comments,
  defaultComments = [],
  onCommentsChange,
  currentUser,
  permissions,
  onSubmit,
  onEdit,
  onDelete,
  onReactionsChange,
  resolved,
  defaultResolved = false,
  onResolvedChange,
  anchor,
  anchorHref,
  onAnchorClick,
  mentions,
  renderBody,
  fill = false,
  loading = false,
  error,
  onRetry,
  holdNew = true,
  className,
  "aria-label": label,
}: CommentThreadProps) {
  const messages = useMessages(commentThreadMessages)
  const locale = useLocale()
  const announce = useAnnounce()
  const prefix = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [list, setList] = useControllable(comments, defaultComments, onCommentsChange)
  const uncontrolled = comments === undefined
  const [isResolved, setResolved] = useControllable(resolved, defaultResolved, onResolvedChange)
  const [expanded, setExpanded] = useState(false)
  const [outbox, setOutbox] = useState<readonly Outgoing[]>([])
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<CommentEntry | null>(null)
  const sequence = useRef(0)

  const flat = list.flatMap((comment) => [comment, ...(comment.replies ?? [])])
  const authors = new Map(flat.map((comment) => [comment.id, comment.author.id]))
  const { held, reveal } = useHeldRows(
    flat.map((comment) => comment.id),
    { enabled: holdNew && !loading, appended: "hold", passes: (id) => authors.get(id) === currentUser?.id },
  )
  const total = flat.filter((comment) => !comment.deleted && !held.has(comment.id)).length

  // What is waiting, when it grows: two quick arrivals read "2 new comments".
  const heard = useRef(0)
  useEffect(() => {
    if (held.size > heard.current) announce(messages.arrived(held.size, locale), { key: "comment-arrivals" })
    heard.current = held.size
  }, [held.size, announce, messages, locale])

  const focusComment = (id: string | undefined | null) => {
    const element = id ? rootRef.current?.querySelector<HTMLElement>(`[data-comment-id="${CSS.escape(id)}"]`) : null
    element?.focus()
    element?.scrollIntoView({ block: "nearest" })
  }

  const showNew = () => {
    const first = flat.find((comment) => held.has(comment.id))?.id
    reveal()
    requestAnimationFrame(() => focusComment(first))
  }

  const entryOf = (outgoing: Outgoing): CommentEntry => ({
    id: outgoing.id,
    author: currentUser ?? { id: "", name: "" },
    body: outgoing.draft.body,
    at: outgoing.at,
    status: outgoing.status,
  })

  const addToList = (entry: CommentEntry, parentId: string | null) =>
    setList((current) =>
      parentId
        ? current.map((comment) => (comment.id === parentId ? { ...comment, replies: [...(comment.replies ?? []), entry] } : comment))
        : [...current, entry],
    )

  const attempt = async (outgoing: Outgoing) => {
    try {
      const saved = await onSubmit?.(outgoing.draft)
      if (uncontrolled) addToList(saved ?? { id: outgoing.id, author: entryOf(outgoing).author, body: outgoing.draft.body, at: outgoing.at }, outgoing.draft.parentId)
      setOutbox((current) => current.filter((item) => item.id !== outgoing.id))
      announce(messages.announceSent)
    } catch {
      setOutbox((current) => current.map((item) => (item.id === outgoing.id ? { ...item, status: "failed" } : item)))
      announce(messages.announceFailed)
    }
  }

  const send = (body: string, parentId: string | null) => {
    sequence.current += 1
    const outgoing: Outgoing = { id: `${prefix}-sending-${sequence.current}`, draft: { body, parentId }, at: Date.now(), status: "pending" }
    setOutbox((current) => [...current, outgoing])
    setReplyTo(null)
    void attempt(outgoing)
  }

  const retry = (comment: CommentEntry) => {
    const outgoing = outbox.find((item) => item.id === comment.id)
    if (!outgoing) return
    setOutbox((current) => current.map((item) => (item.id === comment.id ? { ...item, status: "pending" } : item)))
    void attempt(outgoing)
  }

  const discard = (comment: CommentEntry) => {
    const neighbour = outbox.find((item) => item.id !== comment.id)?.id ?? flat.at(-1)?.id
    setOutbox((current) => current.filter((item) => item.id !== comment.id))
    requestAnimationFrame(() => focusComment(neighbour))
  }

  const closeEdit = () => {
    const id = editing
    setEditing(null)
    // The menu that opened the editor is still there; focus goes back to it.
    requestAnimationFrame(() => {
      if (id) rootRef.current?.querySelector<HTMLElement>(`[data-comment-id="${CSS.escape(id)}"] [data-comment-menu]`)?.focus()
    })
  }

  const update = (id: string, change: (comment: CommentEntry) => CommentEntry) =>
    setList((current) =>
      current.map((comment) =>
        comment.id === id
          ? change(comment)
          : comment.replies?.some((reply) => reply.id === id)
            ? { ...comment, replies: comment.replies.map((reply) => (reply.id === id ? change(reply) : reply)) }
            : comment,
      ),
    )

  const saveEdit = async (comment: CommentEntry, body: string) => {
    await onEdit?.(comment, body)
    if (uncontrolled) update(comment.id, (entry) => ({ ...entry, body, editedAt: Date.now() }))
    announce(messages.announceSaved)
    closeEdit()
  }

  const afterDelete = useRef<string | null | undefined>(undefined)
  const confirmDelete = async () => {
    const comment = deleting
    if (!comment) return
    await onDelete?.(comment)
    const index = flat.findIndex((entry) => entry.id === comment.id)
    afterDelete.current = (flat[index + 1] ?? flat[index - 1])?.id ?? null
    if (uncontrolled) {
      if (comment.replies?.length) {
        afterDelete.current = comment.id
        update(comment.id, (entry) => ({ ...entry, deleted: true }))
      } else
        setList((current) =>
          current
            .filter((entry) => entry.id !== comment.id)
            .map((entry) => (entry.replies?.some((reply) => reply.id === comment.id) ? { ...entry, replies: entry.replies.filter((reply) => reply.id !== comment.id) } : entry)),
        )
    }
  }

  const changeReactions = (comment: CommentEntry, reactions: readonly Reaction[]) => {
    if (uncontrolled) update(comment.id, (entry) => ({ ...entry, reactions }))
    onReactionsChange?.(comment, reactions)
  }

  const row = (comment: CommentEntry, isReply: boolean) => {
    const own = outbox.some((item) => item.id === comment.id)
    const abilities = own ? NONE : (permissions?.forComment?.(comment) ?? NONE)
    return (
      <CommentRow
        comment={comment}
        abilities={isReply ? { ...abilities, reply: undefined } : abilities}
        editing={editing === comment.id}
        mentions={mentions}
        renderBody={renderBody}
        onReply={(target) => setReplyTo(target.id)}
        onStartEdit={(target) => setEditing(target.id)}
        onCloseEdit={closeEdit}
        onSaveEdit={saveEdit}
        onDelete={setDeleting}
        onRetry={retry}
        onDiscard={discard}
        onReactionsChange={changeReactions}
      />
    )
  }

  const outgoingFor = (parentId: string | null) => outbox.filter((item) => item.draft.parentId === parentId).map(entryOf)

  const items = (
    <ol className="fa-comment-list" aria-label={anchor ? messages.threadOn(anchor) : messages.comments}>
      {[...list.filter((comment) => !held.has(comment.id)), ...outgoingFor(null)].map((comment) => {
        const replies = [...(comment.replies ?? []).filter((reply) => !held.has(reply.id)), ...outgoingFor(comment.id)]
        return (
          <li key={comment.id} className="fa-comment-item">
            {row(comment, false)}
            {replies.length || replyTo === comment.id ? (
              <div className="fa-comment-branch">
                {replies.length ? (
                  <ol className="fa-comment-list" aria-label={messages.replyLabel(comment.author.name)}>
                    {replies.map((reply) => (
                      <li key={reply.id} className="fa-comment-item">
                        {row(reply, true)}
                      </li>
                    ))}
                  </ol>
                ) : null}
                {replyTo === comment.id ? (
                  <Composer
                    label={messages.replyLabel(comment.author.name)}
                    placeholder={messages.replyPlaceholder}
                    mentions={mentions}
                    focusOnMount
                    onSend={(body) => send(body, comment.id)}
                    onCancel={() => {
                      setReplyTo(null)
                      focusComment(comment.id)
                    }}
                  />
                ) : null}
              </div>
            ) : null}
          </li>
        )
      })}
    </ol>
  )

  const hasRows = list.length > 0 || outbox.length > 0
  const folded = isResolved && !expanded
  const body: ReactNode = error ? (
    <EmptyState icon={<IconError />} tone="danger" action={onRetry ? <Button size="sm" onClick={onRetry}>{messages.retry}</Button> : undefined}>
      {error === true ? messages.loadFailed : error}
    </EmptyState>
  ) : loading ? (
    <CommentSkeleton />
  ) : !hasRows ? (
    <EmptyState icon={<IconChat />}>{messages.empty}</EmptyState>
  ) : folded ? null : (
    items
  )

  const composing = permissions?.comment
  const composer =
    composing && !isResolved && !error ? (
      <div className="fa-comment-compose-row">
        {currentUser ? <Avatar className="fa-comment-avatar" name={currentUser.name} src={currentUser.avatarSrc} size="sm" decorative /> : null}
        <Composer
          label={messages.composerLabel}
          placeholder={messages.composerPlaceholder}
          mentions={mentions}
          disabledReason={reasonOf(composing)}
          onSend={(text) => send(text, null)}
        />
      </div>
    ) : null

  const anchorLabel =
    anchor === undefined ? null : anchorHref !== undefined ? (
      <Link href={anchorHref}>{anchor}</Link>
    ) : onAnchorClick ? (
      <Button variant="ghost" size="xs" onClick={onAnchorClick}>
        {anchor}
      </Button>
    ) : (
      anchor
    )

  const resolve = permissions?.resolve
  return (
    <div
      ref={rootRef}
      className={cx("fa-comment-thread", className)}
      role="region"
      aria-label={label ?? (anchor ? messages.threadOn(anchor) : messages.comments)}
      aria-busy={loading || undefined}
      data-fill={fill ? "" : undefined}
      data-resolved={isResolved ? "" : undefined}
    >
      <div className="fa-comment-header">
        <span className="fa-comment-title">{anchorLabel ?? messages.count(total, locale)}</span>
        {isResolved ? (
          <Badge size="sm" tone="success" icon={<IconCheck />}>
            {messages.resolved}
          </Badge>
        ) : null}
        <span className="fa-comment-new">
          {held.size > 0 ? (
            <Button variant="soft" size="xs" aria-label={messages.showNew(held.size, locale)} tooltip={false} onClick={showNew}>
              {messages.newCount(held.size, locale)}
            </Button>
          ) : null}
        </span>
        {isResolved && hasRows ? (
          <Button variant="ghost" size="xs" aria-expanded={expanded} onClick={() => setExpanded((open) => !open)}>
            {expanded ? messages.hideComments : messages.showComments(total, locale)}
          </Button>
        ) : null}
        {resolve ? (
          <Button
            variant="ghost"
            size="xs"
            disabledReason={reasonOf(resolve)}
            onClick={() => {
              const next = !isResolved
              setResolved(next)
              setExpanded(false)
              announce(next ? messages.announceResolved : messages.announceReopened)
            }}
          >
            {isResolved ? messages.reopen : messages.resolve}
          </Button>
        ) : null}
      </div>
      {fill ? (
        <div className="fa-comment-scroll">
          <ScrollArea>{body}</ScrollArea>
        </div>
      ) : (
        body
      )}
      {composer}
      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        onOpenChangeComplete={(open) => {
          if (open || afterDelete.current === undefined) return
          const target = afterDelete.current
          afterDelete.current = undefined
          if (target) focusComment(target)
          else rootRef.current?.querySelector<HTMLElement>("[contenteditable], button")?.focus()
        }}
        title={messages.deleteTitle(deleting?.author.name ?? "")}
        description={messages.deleteDescription}
        confirmLabel={messages.delete}
        pendingLabel={messages.deleting}
        tone="danger"
        onConfirm={confirmDelete}
      />
    </div>
  )
}
