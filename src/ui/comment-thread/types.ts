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
  /** Draws a comment's text. Default: Markdown, loaded on demand. */
  renderBody?: (comment: CommentEntry) => ReactNode
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
