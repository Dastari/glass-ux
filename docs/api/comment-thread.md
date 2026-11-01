# CommentThread

Comments and one level of replies with a RichTextInput composer. Bodies are Markdown, and
mentions are the composer's. The thread holds no policy: `permissions` says what exists, a
string keeps a control disabled with that reason, and the host saves through its callbacks.

A send shows at once, as pending, in the place it will keep; a failure stays there with Retry
and Discard. New comments from others wait behind a count, so the composer does not move
(R17.3). A resolved thread folds behind a button and has no composer. Times tick outside live
regions; outcomes are announced politely.

`import { CommentThread } from "glass-ux/comment-thread"`

[Live examples](https://dastari.github.io/glass-ux/components/comment-thread)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| anchor | `string \| undefined` | See type | no | — | What the thread is about: "Floor plan, page 3". It also names the thread. |
| anchorHref | `string \| undefined` | See type | no | — | Makes `anchor` a link. |
| aria-label | `string \| undefined` | See type | no | — | Names the thread. Default "Comments", or the anchor. |
| className | `string \| undefined` | See type | no | — | Layout classes. |
| comments | `readonly CommentEntry[] \| undefined` | See type | no | — | The comments, controlled, oldest first. |
| currentUser | `CommentAuthor \| undefined` | See type | no | — | The signed-in person: the pending comment's author, and whose comments show at once. Needed to comment. |
| defaultComments | `readonly CommentEntry[] \| undefined` | See type | no | [] | The comments at first when uncontrolled. The thread then applies sends, edits and deletes itself. |
| defaultResolved | `boolean \| undefined` | false, true | no | false | Whether the thread starts resolved when uncontrolled. |
| error | `ReactNode` | See type | no | — | Why the thread failed, shown in the list's place. Pass `true` for a factual line. |
| fill | `boolean \| undefined` | false, true | no | false | The comments scroll inside the thread and the composer stays at its foot. Give the parent a height. Default false: the thread takes the height it needs. |
| holdNew | `boolean \| undefined` | false, true | no | true | New comments wait behind a count until asked for, so the composer does not move (R17.3); the person's own show at once. `false` shows every one at once. Default true. |
| loading | `boolean \| undefined` | false, true | no | false | First load: skeleton comments in the list's place. |
| mentions | `RichTextMentions \| undefined` | See type | no | — | The mention list for the composers. |
| onAnchorClick | `(() => void) \| undefined` | See type | no | — | Makes `anchor` a button. |
| onCommentsChange | `((comments: readonly CommentEntry[]) => void) \| undefined` | See type | no | — | Called with the next comments after a change the thread made itself. |
| onDelete | `((comment: CommentEntry) => Promise<void> \| void) \| undefined` | See type | no | — | Deletes a comment. A throw keeps the confirmation open and shows a toast. |
| onEdit | `((comment: CommentEntry, body: string) => Promise<void> \| void) \| undefined` | See type | no | — | Saves an edit. A throw keeps the editor open with the text. |
| onReactionsChange | `((comment: CommentEntry, reactions: readonly Reaction[]) => void) \| undefined` | See type | no | — | Called when a person adds or removes a reaction, with the comment's next reactions. |
| onResolvedChange | `((resolved: boolean) => void) \| undefined` | See type | no | — | Called with the next resolved state. |
| onRetry | `(() => void) \| undefined` | See type | no | — | Offers Retry after `error`, and calls it. |
| onSubmit | `((draft: CommentDraft) => Promise<CommentEntry \| void> \| CommentEntry \| void) \| undefined` | See type | no | — | Saves a comment or reply. Resolve to finish; a throw marks it failed, with Retry. Uncontrolled, resolve with the saved comment to keep its id. |
| permissions | `CommentPermissions \| undefined` | See type | no | — | What the person may do. Absent, the thread is read-only. |
| renderBody | `((comment: CommentEntry) => ReactNode) \| undefined` | See type | no | — | Draws a comment's text. Default: Markdown, loaded on demand. |
| resolved | `boolean \| undefined` | false, true | no | — | Whether the thread is resolved, controlled. |
