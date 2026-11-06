import type { ReactNode } from "react"
import type { RichTextMentions } from "../rich-text/rich-text.js"
import type { Reaction } from "../reaction-bar/reaction-bar.js"

/** Who wrote a comment. */
export interface CommentAuthor {
  /** Stable identifier, compared with `currentUser`. */
  id: string
  /** Display name. */
  name: string
  /** Profile image URL; initials fall back when it is absent. */
  avatarSrc?: string
}

/** A comment, or a reply to one. */
export interface CommentEntry {
  /** Stable identifier. */
  id: string
  /** Who wrote it. */
  author: CommentAuthor
  /** The text as Markdown, as the composer writes it. */
  body: string
  /** When it was written, as epoch milliseconds, ISO string or Date. */
  at: Date | number | string
  /** When it last changed. Shows "edited". */
  editedAt?: Date | number | string
  /** Set for a send the host tracks itself. The thread tracks sends from its own composer. */
  status?: "pending" | "failed"
  /** It was deleted but has replies, so its place stays with a line saying so. */
  deleted?: boolean
  /** Its reactions. */
  reactions?: readonly Reaction[]
  /** The composer's choice it was written with (`CommentDraft.choice`), for `renderBadges` to read. The thread sets it on a pending comment and on one it adds itself; a controlled host sets it on what it saves. */
  choice?: string
  /** One level of replies. A reply to a reply joins the same list. */
  replies?: readonly Omit<CommentEntry, "replies">[]
}

/**
 * What a person may do. `true` shows the control; absent or `false` leaves it out; a string
 * shows it disabled, with that reason (R12.3).
 */
export type CommentCapability = boolean | string

/** What a person may do with one comment. */
export interface CommentAbilities {
  /** Reply to it. Replies themselves take none: one level only. */
  reply?: CommentCapability
  /** Change its text. */
  edit?: CommentCapability
  /** Delete it. */
  delete?: CommentCapability
  /** React to it. */
  react?: CommentCapability
}

/** The host's permissions. Absent, the thread is read-only. */
export interface CommentPermissions {
  /** Write a new comment. */
  comment?: CommentCapability
  /** Resolve or reopen the thread. */
  resolve?: CommentCapability
  /** What can be done with a comment. Call your own policy here; the thread holds none. */
  forComment?: (comment: CommentEntry) => CommentAbilities
}

/** What the composer sends. */
export interface CommentDraft {
  /** The text as Markdown. */
  body: string
  /** The comment it replies to, or null for a new comment. */
  parentId: string | null
  /** The composer's choice when it was sent, kept through a retry. Absent when the composer holds none. */
  choice?: string
}

/** Which composer a slot or label is drawn for, and what that composer holds. */
export interface CommentComposerContext {
  /** The comment being replied to, or null for the thread's own composer. */
  parent: CommentEntry | null
  /** This composer's choice. Each composer holds its own. */
  choice: string | undefined
  /** Changes this composer's choice. The thread's composer keeps it after a send; a reply composer starts from `defaultChoice` each time it opens. */
  setChoice: (choice: string) => void
  /** The composer is unavailable (`permissions.comment` is a string), so the control should be too. */
  disabled: boolean
}

/** What every composer in a thread adds to its editor and send button. */
export interface CommentComposerOptions {
  /** The choice a composer starts with, or a function that answers for each composer: a reply can start from `parent.choice`. Default none. */
  defaultChoice?: string | ((parent: CommentEntry | null) => string | undefined)
  /** Draws a control above the editor, such as a Segmented bound to `choice` and `setChoice`. Give it its own accessible name. */
  renderControl?: (composer: CommentComposerContext) => ReactNode
  /** The send button's text in place of "Send", as written, or a function that answers for each composer and choice. */
  sendLabel?: string | ((composer: CommentComposerContext) => string)
}

export interface CommentThreadProps {
  /** The comments, controlled, oldest first. */
  comments?: readonly CommentEntry[]
  /** The comments at first when uncontrolled. The thread then applies sends, edits and deletes itself. */
  defaultComments?: readonly CommentEntry[]
  /** Called with the next comments after a change the thread made itself. */
  onCommentsChange?: (comments: readonly CommentEntry[]) => void
  /** The signed-in person: the pending comment's author, and whose comments show at once. Needed to comment. */
  currentUser?: CommentAuthor
  /** What the person may do. Absent, the thread is read-only. */
  permissions?: CommentPermissions
  /** Saves a comment or reply. Resolve to finish; a throw marks it failed, with Retry. Uncontrolled, resolve with the saved comment to keep its id. */
  onSubmit?: (draft: CommentDraft) => Promise<CommentEntry | void> | CommentEntry | void
  /** Saves an edit. A throw keeps the editor open with the text. */
  onEdit?: (comment: CommentEntry, body: string) => Promise<void> | void
  /** Deletes a comment. A throw keeps the confirmation open and shows a toast. */
  onDelete?: (comment: CommentEntry) => Promise<void> | void
  /** Called when a person adds or removes a reaction, with the comment's next reactions. */
  onReactionsChange?: (comment: CommentEntry, reactions: readonly Reaction[]) => void
  /** Whether the thread is resolved, controlled. */
  resolved?: boolean
  /** Whether the thread starts resolved when uncontrolled. */
  defaultResolved?: boolean
  /** Called with the next resolved state. */
  onResolvedChange?: (resolved: boolean) => void
  /** What the thread is about: "Floor plan, page 3". It also names the thread. */
  anchor?: string
  /** Makes `anchor` a link. */
  anchorHref?: string
  /** Makes `anchor` a button. */
  onAnchorClick?: () => void
  /** The mention list for the composers. */
  mentions?: RichTextMentions
  /** A control above each composer's editor, the choice it holds and the send button's text. Default: none of them, and the button says "Send". */
  composer?: CommentComposerOptions
  /** Draws a comment's text. Default: Markdown, loaded on demand. */
  renderBody?: (comment: CommentEntry) => ReactNode
  /** Draws badges beside the author's name. Not called for a deleted comment. A pending comment carries the `choice` it was sent with. Default none. */
  renderBadges?: (comment: CommentEntry) => ReactNode
  /** Draws attachments under the comment's text, above its reactions. Not called for a deleted comment. Default none. */
  renderAttachments?: (comment: CommentEntry) => ReactNode
  /** The comments scroll inside the thread and the composer stays at its foot. Give the parent a height. Default false: the thread takes the height it needs. */
  fill?: boolean
  /** First load: skeleton comments in the list's place. */
  loading?: boolean
  /** Why the thread failed, shown in the list's place. Pass `true` for a factual line. */
  error?: ReactNode
  /** Offers Retry after `error`, and calls it. */
  onRetry?: () => void
  /** New comments wait behind a count until asked for, so the composer does not move (R17.3); the person's own show at once. `false` shows every one at once. Default true. */
  holdNew?: boolean
  /** Names the thread. Default "Comments", or the anchor. */
  "aria-label"?: string
  /** Layout classes. */
  className?: string
}
