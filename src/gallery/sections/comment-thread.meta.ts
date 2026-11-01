import type { SectionMeta } from "../types.js"

export const meta: SectionMeta = {
  id: "comment-thread",
  title: "CommentThread",
  group: "Components",
  order: 182, // after NotificationList
  summary: "Comments and one level of replies with a rich text composer. Sends show at once and failures stay in place; the host supplies permissions and storage.",
}
