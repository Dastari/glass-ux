# CommentThread

`glass-ux/comment-thread` ·
[Live component catalogue](https://dastari.github.io/glass-ux/components/comment-thread)

Comments and one level of replies, with a `RichTextInput` composer. The host supplies the
comments, the permissions and every save. Bodies are Markdown.

```tsx
import { CommentThread } from "glass-ux/comment-thread"

<CommentThread
  anchor="Floor plan, level 2"
  comments={comments}
  currentUser={me}
  mentions={{ search: (query, { signal }) => people.search(query, { signal }) }}
  permissions={{
    comment: true,
    resolve: canResolve || "Only the project lead can resolve this thread",
    forComment: (comment) => ({
      reply: true,
      react: true,
      edit: comment.author.id === me.id,
      delete: comment.author.id === me.id,
    }),
  }}
  onSubmit={async (draft) => {
    const saved = await api.post(draft)
    setComments((rows) => add(rows, saved, draft.parentId))
  }}
  onEdit={(comment, body) => api.edit(comment.id, body)}
  onDelete={(comment) => api.remove(comment.id)}
  onReactionsChange={(comment, reactions) => api.react(comment.id, reactions)}
  onResolvedChange={setResolved}
/>
```

## Permissions

`permissions` is the only source of what a person may do. Without it the thread is read-only.

| Value            | Result                                        |
| ---------------- | --------------------------------------------- |
| `true`           | The control is there.                         |
| absent, `false`  | The control does not exist.                   |
| a string         | The control is there, disabled, and says why. |

`comment` and `resolve` are for the thread. `forComment` answers per comment for `reply`, `edit`,
`delete` and `react`. A reply takes no replies: one level only.

## Sending

A send shows at once, as pending, in the place it will keep, and the composer clears. `onSubmit`
resolves to finish, and the comment becomes the host's. A throw marks it failed in that place, with
Retry and Discard. The send state takes the time's place, so nothing beneath it moves.

For a controlled thread, add the comment to `comments` before `onSubmit` resolves. Uncontrolled,
return the saved comment to keep its id. A host that tracks sends itself sets `status` on an entry.

## Keeping things where they are

New comments from others wait behind a count, so the composer does not move (R17.3); `currentUser`'s
own show at once. The arrival is announced politely. `holdNew={false}` shows every comment at once.
With `fill`, the comments scroll and the composer stays at the foot: give the parent a height.

## Other behaviour

- **Edit** happens in place. A failed save keeps the editor and its text, with the reason in a
  reserved line. Escape leaves an unchanged edit or an empty reply.
- **Delete** asks through AlertDialog (R12.4). A host keeps the place of a comment with replies by
  setting `deleted`; the replies stay. Focus moves to a neighbour.
- **Resolved** threads fold behind a button and have no composer.
- **`anchor`** names what the thread is about, and the region. `anchorHref` makes it a link,
  and `onAnchorClick` a button.
- **`renderBody`** replaces the default Markdown, which loads on demand with the plain text
  holding its place. The composer's editor loads on demand too.
- **Times** tick outside live regions, through `RelativeTime`.
- Ctrl or ⌘ Enter sends or saves.
