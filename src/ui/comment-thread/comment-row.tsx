import { lazy, Suspense, useId, type ReactNode } from "react"
import { IconMoreHorizontal, IconReply } from "../../icons/generated/icons.js"
import { useMessages } from "../../lib/i18n/index.js"
import { Avatar } from "../avatar/index.js"
import { Button } from "../button/index.js"
import { RelativeTime } from "../data-table/cells/relative-time.js"
import { Menu } from "../menu/index.js"
import { ReactionBar, type Reaction } from "../reaction-bar/index.js"
import type { RichTextMentions } from "../rich-text/index.js"
import { CommentEditor } from "./composer.js"
import { commentThreadMessages } from "./messages.js"
import type { CommentAbilities, CommentCapability, CommentEntry } from "./types.js"

const Markdown = /* @__PURE__ */ lazy(() => import("../../ai/markdown/index.js").then((module) => ({ default: module.Markdown })))

const reasonOf = (capability: CommentCapability | undefined) => (typeof capability === "string" ? capability : undefined)

/** The text as Markdown, loaded on demand; until then the plain text holds its place. */
function DefaultBody({ text }: { text: string }) {
  return (
    <Suspense fallback={<p className="fa-comment-plain">{text}</p>}>
      <Markdown text={text} />
    </Suspense>
  )
}

interface CommentRowProps {
  comment: CommentEntry
  abilities: CommentAbilities
  editing: boolean
  mentions?: RichTextMentions
  renderBody?: (comment: CommentEntry) => ReactNode
  onReply: (comment: CommentEntry) => void
  onStartEdit: (comment: CommentEntry) => void
  onCloseEdit: () => void
  onSaveEdit: (comment: CommentEntry, body: string) => Promise<void>
  onDelete: (comment: CommentEntry) => void
  onRetry: (comment: CommentEntry) => void
  onDiscard: (comment: CommentEntry) => void
  onReactionsChange: (comment: CommentEntry, reactions: readonly Reaction[]) => void
}

/** One comment. The time's place holds the send state, so a failure moves nothing beneath it (R9). */
export function CommentRow({ comment, abilities, editing, mentions, renderBody, onReply, onStartEdit, onCloseEdit, onSaveEdit, onDelete, onRetry, onDiscard, onReactionsChange }: CommentRowProps) {
  const messages = useMessages(commentThreadMessages)
  const { author, status } = comment
  const titleId = useId()
  const live = !status && !comment.deleted
  const edit = live ? abilities.edit : undefined
  const remove = live ? abilities.delete : undefined
  const reply = live ? abilities.reply : undefined
  const react = live ? abilities.react : undefined
  return (
    <article className="fa-comment" aria-labelledby={titleId} tabIndex={-1} data-comment-id={comment.id} data-status={status}>
      <Avatar className="fa-comment-avatar" name={author.name} src={author.avatarSrc} size="sm" decorative />
      <div className="fa-comment-head">
        <strong className="fa-comment-author" id={titleId}>
          {author.name}
        </strong>
        <span className="fa-comment-meta">
          {status === "pending" ? (
            messages.sending
          ) : status === "failed" ? (
            <>
              <span className="fa-comment-failed">{messages.notSent}</span>
              <Button size="xs" onClick={() => onRetry(comment)}>
                {messages.retry}
              </Button>
              <Button variant="ghost" size="xs" onClick={() => onDiscard(comment)}>
                {messages.discard}
              </Button>
            </>
          ) : (
            <>
              <RelativeTime value={comment.at} />
              {comment.editedAt !== undefined ? <span> · {messages.edited}</span> : null}
            </>
          )}
        </span>
        {reply || edit || remove ? (
          <span className="fa-comment-tools">
            {reply ? (
              <Button
                variant="ghost"
                size="xs"
                icon={<IconReply />}
                aria-label={messages.replyLabel(author.name)}
                disabledReason={reasonOf(reply)}
                onClick={() => onReply(comment)}
              />
            ) : null}
            {edit || remove ? (
              <Menu.Root>
                <Menu.Trigger render={<Button variant="ghost" size="xs" data-comment-menu="" icon={<IconMoreHorizontal />} aria-label={messages.actionsFor(author.name)} />} />
                <Menu.Popup align="end">
                  {edit ? (
                    <Menu.Item disabledReason={reasonOf(edit)} onClick={() => onStartEdit(comment)}>
                      {messages.edit}
                    </Menu.Item>
                  ) : null}
                  {edit && remove ? <Menu.Separator /> : null}
                  {remove ? (
                    <Menu.Item tone="danger" disabledReason={reasonOf(remove)} onClick={() => onDelete(comment)}>
                      {messages.delete}
                    </Menu.Item>
                  ) : null}
                </Menu.Popup>
              </Menu.Root>
            ) : null}
          </span>
        ) : null}
      </div>
      <div className="fa-comment-body">
        {comment.deleted ? (
          <p className="fa-comment-deleted">{messages.deleted}</p>
        ) : editing ? (
          <CommentEditor initial={comment.body} mentions={mentions} onSave={(body) => onSaveEdit(comment, body)} onClose={onCloseEdit} />
        ) : (
          (renderBody?.(comment) ?? <DefaultBody text={comment.body} />)
        )}
      </div>
      {live && (comment.reactions?.length || react) ? (
        <ReactionBar
          className="fa-comment-reactions"
          reactions={comment.reactions ?? []}
          readOnly={!react}
          disabledReason={reasonOf(react)}
          onReactionsChange={(reactions) => onReactionsChange(comment, reactions)}
        />
      ) : null}
    </article>
  )
}
