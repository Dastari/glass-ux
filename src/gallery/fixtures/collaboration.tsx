import { IconCalendar, IconFileText, IconShare, IconUpload } from "../../icons/generated/icons.js"
import { Avatar } from "../../ui/avatar/index.js"
import type { CommentAuthor, CommentEntry } from "../../ui/comment-thread/index.js"
import type { NotificationItem } from "../../ui/notification-list/index.js"
import type { RichTextMention, RichTextMentions } from "../../ui/rich-text/index.js"

export const HOUR = 3_600_000
export const DAY = 24 * HOUR

/** Rows of a shared project, newest first, at offsets from `now`. All people and projects are fictional. */
export function sampleNotifications(now: number): NotificationItem[] {
  return [
    {
      id: "n1",
      title: "Mira Rowan commented on Floor plan",
      description: "Can we move the lighting review to Friday?",
      at: now - 0.2 * HOUR,
      icon: <Avatar name="Mira Rowan" size="xs" decorative />,
      group: "Mentions",
      action: { label: "Reply" },
    },
    { id: "n2", title: "Avery Quinn shared Material options with you", at: now - 2 * HOUR, icon: <IconShare />, group: "Shared" },
    { id: "n3", title: "Export of Site survey finished", description: "42 pages, 18 MB", at: now - 5 * HOUR, read: true, icon: <IconFileText />, group: "System", action: { label: "Download" } },
    { id: "n4", title: "Upload of Roof detail failed", description: "The file is larger than the 200 MB limit", at: now - DAY - HOUR, tone: "danger", toneLabel: "Failed", group: "System" },
    { id: "n5", title: "Noor Haddad requested your review", at: now - DAY - 3 * HOUR, read: true, icon: <IconUpload />, group: "Mentions", action: { label: "Review" } },
    { id: "n6", title: "Site visit moved to Thursday", at: now - 3 * DAY, read: true, icon: <IconCalendar />, group: "Calendar" },
    { id: "n7", title: "Jamie Wells joined Studio preview", at: now - 12 * DAY, read: true, group: "Shared" },
  ]
}

/** A further page of older rows, at offsets from `now`. */
export function olderNotifications(now: number, page: number): NotificationItem[] {
  return [0, 1, 2].map((index) => ({
    id: `older-${page}-${index}`,
    title: `Weekly summary ${page * 3 + index + 1} is ready`,
    at: now - (20 + page * 7 + index) * DAY,
    read: true,
    group: "System",
  }))
}

export const MIRA: CommentAuthor = { id: "mira", name: "Mira Rowan" }
export const AVERY: CommentAuthor = { id: "avery", name: "Avery Quinn" }
export const NOOR: CommentAuthor = { id: "noor", name: "Noor Haddad" }
export const JAMIE: CommentAuthor = { id: "jamie", name: "Jamie Wells" }

/** A short discussion, oldest first, at offsets from `now`. */
export function sampleComments(now: number): CommentEntry[] {
  return [
    {
      id: "c1",
      author: MIRA,
      body: "The stair clashes with the **north beam** on this level.",
      at: now - 6 * HOUR,
      reactions: [
        { emoji: "👍", count: 2, people: ["Noor Haddad", "Jamie Wells"] },
        { emoji: "❤️", count: 1, reacted: true, people: ["Avery Quinn"] },
      ],
      replies: [
        { id: "c2", author: NOOR, body: "Moving it 300 mm east clears the beam.", at: now - 5 * HOUR },
        { id: "c3", author: AVERY, body: "That also keeps the landing clear. I'll redraw it.", at: now - 4 * HOUR, editedAt: now - 3.5 * HOUR },
      ],
    },
    { id: "c4", author: JAMIE, body: "Please check the handrail height against the updated section.", at: now - 2 * HOUR },
  ]
}

const PEOPLE: readonly RichTextMention[] = [
  { id: "mira", label: "Mira Rowan", description: "Architect" },
  { id: "noor", label: "Noor Haddad", description: "Engineer" },
  { id: "jamie", label: "Jamie Wells", description: "Surveyor" },
]

/** The composer's mention list: the host does the matching. */
export const SAMPLE_MENTIONS: RichTextMentions = {
  search: (query) => PEOPLE.filter((person) => person.label.toLowerCase().includes(query.toLowerCase())),
  reserveRows: 3,
}
